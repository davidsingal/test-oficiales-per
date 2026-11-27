"""DATA-1 / DATA-4: sources.json is consistent and its overrides are well formed."""

import re

import pytest

import sources
from common import LICENCES

SESSIONS = sources.load()


def test_sessions_are_unique_and_in_order():
    names = [session.session for session in SESSIONS]
    assert all(re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", name) for name in names)
    assert names == sorted(set(names))


def test_documents_point_to_pdfs():
    for session in SESSIONS:
        for kind in sources.DOC_KINDS:
            for doc in getattr(session, kind):
                assert doc.url.startswith("https://"), doc.url
                assert doc.url.lower().endswith(".pdf"), doc.url


OVERRIDES = [(session, override) for session in SESSIONS for override in session.overrides]


@pytest.mark.parametrize(
    "session,override", OVERRIDES, ids=[f"{s.session}-{o.get('licence', 'PER')}-t{o['test']}-q{o['question']}" for s, o in OVERRIDES]
)
def test_override_is_well_formed(session, override):
    licence = LICENCES.get(override.get("licence", "PER"))
    assert licence is not None, f"unknown licence {override.get('licence')!r}"
    assert 1 <= override["question"] <= licence.questions
    assert override["test"] >= 1
    answers = override["answers"]
    assert answers == ["ANULADA"] or (answers and set(answers) <= set("ABCD")), answers
    # Each override cites a modification document of its own session.
    assert override["source"] in {doc.url for doc in session.modifications}


def test_py_letters_are_transcribed():
    """The 2021-12 and 2022-12 letters only change PY; they were once marked reviewed."""
    py = {(s.session, o["test"], o["question"]): o["answers"] for s, o in OVERRIDES if o.get("licence") == "PY"}
    assert py[("2021-12", 1, 39)] == ["A", "D"]
    assert py[("2021-12", 3, 36)] == ["A", "D"]
    assert py[("2022-12", 1, 37)] == ["ANULADA"]
    assert py[("2022-12", 2, 31)] == ["ANULADA"]
