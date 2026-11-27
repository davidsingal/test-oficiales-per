"""DATA-2 / DATA-3: section detection, question and answer-key parsing."""

from common import PER, PY, Issues
from corrections import ANSWER_RE, normalize_answer, parse_override
from exams import as_topic_heading, is_full_exam, parse_questions
from sections import detect_header


def test_detects_the_licence_and_test_of_each_section():
    assert detect_header(["EXAMEN DE PATRÓN DE YATE", "Código de Test 01"]) == ("PY", 1)
    assert detect_header(["EXAMEN DE PATRÓN DE EMBARCACIONES DE RECREO", "Código de Test 03"]) == ("PER", 3)
    # Broken words in some PDFs; Capitán de Yate must not be read as Patrón de Yate.
    assert detect_header(["EXAMEN DE CAPITÁNDE YATE", "Código de Test 02"]) == ("CY", 2)
    assert detect_header(["EXAMEN DE PATRÓN PARA NAVEGACIÓN BÁSICA", "Código de Test 04"]) == ("PNB", 4)
    assert detect_header(["Una página cualquiera"]) is None


def test_topic_headings_belong_to_their_licence():
    assert as_topic_heading("Navegación carta", PY) == "Navegación carta"
    assert as_topic_heading("Navegación carta", PER) is None
    assert as_topic_heading("Meteorología.", PER) == "Meteorología"
    assert as_topic_heading("Meteorología", PY) == "Meteorología"
    # A wrapped option line in lower case is not a heading.
    assert as_topic_heading("meteorología", PY) is None


def _py_section() -> list[list[str]]:
    """A PY test: headings, wrapped lines and page footers, as pdfplumber returns them."""
    lines = ["EXAMEN DE PATRÓN DE YATE", "Código de Test 01"]
    for number in range(1, 41):
        heading = {1: "Seguridad en la mar", 11: "Meteorología", 21: "Teoría de navegación", 31: "Navegación carta"}
        if number in heading:
            lines.append(heading[number])
        lines += [f"{number} Pregunta número {number}", "que sigue en otra línea."]
        lines += [f"{letter}) Opción {letter}" for letter in "abcd"]
    lines.append("SUBDIRECCIÓN GENERAL DE SEGURIDAD, CONTAMINACIÓN E INSPECCIÓN MARÍTIMA")
    return [lines[:120], lines[120:]]


def test_parses_a_full_py_test():
    issues = Issues()
    questions = parse_questions(_py_section(), PY, "test", issues)

    assert issues.errors == [] and issues.warnings == []
    assert [q.number for q in questions] == list(range(1, 41))
    assert questions[0].text == "Pregunta número 1 que sigue en otra línea."
    assert questions[0].options == {"A": "Opción a", "B": "Opción b", "C": "Opción c", "D": "Opción d"}
    assert [questions[n].topic for n in (0, 10, 20, 30, 39)] == [
        "Seguridad en la mar",
        "Meteorología",
        "Teoría de navegación",
        "Navegación carta",
        "Navegación carta",
    ]
    assert is_full_exam(questions, PY)


def test_flags_questions_without_four_options():
    pages = _py_section()
    # Drop the last question's option D (a missing D earlier would swallow the
    # following question, which then shows up as a gap in the numbering).
    last_d = max(i for i, line in enumerate(pages[1]) if line == "d) Opción d")
    del pages[1][last_d]
    issues = Issues()
    parse_questions(pages, PY, "test", issues)
    assert issues.errors == ["test: q40: expected options A-D, got ['A', 'B', 'C']"]


def _per_section(numbers: range) -> list[list[str]]:
    lines = ["Código de Test 01"]
    for n in numbers:
        lines += [f"{n} Pregunta {n}", "a) 1", "b) 2", "c) 3", "d) 4"]
    return [lines]


def test_only_keeps_full_per_tests():
    assert is_full_exam(parse_questions(_per_section(range(1, 46)), PER, "test", Issues()), PER)
    # A "PER" section that ends at q27 is a mislabelled PNB test.
    assert not is_full_exam(parse_questions(_per_section(range(1, 28)), PER, "test", Issues()), PER)
    # The PNB-holders part starts at q28 and repeats a full test.
    assert not is_full_exam(parse_questions(_per_section(range(28, 46)), PER, "test", Issues()), PER)


def test_reads_answer_key_lines():
    assert ANSWER_RE.match("8 B y D")["answer"] == "B y D"
    assert ANSWER_RE.match("32C")["number"] == "32"
    assert normalize_answer("B y D") == ["B", "D"]
    assert normalize_answer("A nulada (todas las respuestas válidas)") == ["ANULADA"]
    assert normalize_answer("c") == ["C"]


def test_reads_rectifications_stored_as_garbled_utf16():
    # Some PDFs store "ANULADA ..." as single-byte text read as UTF-16 ("乁䱕䑁⁁").
    garbled = "ANULADA ".encode("latin-1").decode("utf-16-le")
    assert garbled != "ANULADA "
    assert parse_override(garbled)["answer"].startswith("ANULADA")
    assert parse_override("A y C")["answer"] == "A y C"
    assert parse_override("nota del tribunal") is None
