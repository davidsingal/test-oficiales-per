"""Collect every PER exam and answer key into one dataset.

Sources: the original ministry PDFs listed in sources.json, fetched into a
local cache, plus the overrides transcribed from modification letters.

Each PDF is parsed in its own process (text extraction is CPU bound), then the
results are merged in a fixed order so the output is deterministic.
"""

from __future__ import annotations

import os
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

import pdfplumber

import corrections
import exams
import sources
from common import MONTHS, Issues
from download import ensure_cached
from sections import PER, page_lines, split_sections

Key = tuple[int, int, int]  # (year, month, test)



@dataclass
class Job:
    """One PDF to parse."""

    path: Path
    kind: str  # "exams" | "answers"
    year: int
    month: int
    source: str  # path shown in reports and stored in the dataset
    url: str | None = None
    hints: dict[int, dict] | None = None
    rectification: bool = False  # a later answer document of the same session
    modification: bool = False  # a "Modificación de respuestas" document
    letter_handled: bool = False  # if it is a letter: transcribed into overrides / reviewed


@dataclass
class Parsed:
    """The PER sections found in one PDF, plus the issues worth reporting."""

    job: Job
    exams: list[exams.Exam] = field(default_factory=list)
    answers: list[tuple[int, corrections.Answers, str]] = field(default_factory=list)  # (test, answers, where)
    overrides: int = 0
    issues: Issues = field(default_factory=Issues)


def parse_job(job: Job) -> Parsed:
    result = Parsed(job=job)
    with pdfplumber.open(job.path) as pdf:
        sections = []
        for section in split_sections(pdf, job.hints):
            where = f"{job.source} p{section.start_page}"
            if section.licence not in (PER, None):
                continue
            if section.test is None:
                if section.licence == PER:
                    result.issues.error(where, "test number unreadable; add a hint in sources.json")
                continue
            sections.append((section.test, section.start_page, section.pages))

        for test, start_page, pages in sections:
            where = f"{job.source} p{start_page}"
            # Issues of sections that turn out to be skipped are not reported.
            local = Issues()
            if job.kind == "exams":
                questions = exams.parse_questions([page_lines(p) for p in pages], where, local)
                if not exams.is_full_per_exam(questions):
                    # The PNB-holders part (from q28) repeats questions of a full test.
                    if questions and questions[0].number == 1:
                        result.issues.warn(where, f"test {test:02d} ends at q{questions[-1].number} (PNB-length), skipped")
                    continue
                exam = exams.Exam(
                    year=job.year,
                    month=job.month,
                    test=test,
                    source=job.source,
                    page=start_page,
                    # Official PDF opened at the test's first page.
                    url=f"{job.url}#page={start_page}",
                    questions=questions,
                )
                exams.check_complete(exam, where, local)
                result.exams.append(exam)
            else:
                answers, overrides = corrections.parse_answers(pages, where, local)
                if 1 not in answers:
                    continue  # PNB-holders part (from q28): same answers as the full test
                corrections.check_complete(answers, where, local)
                result.answers.append((test, answers, where))
                result.overrides += overrides
            result.issues.warnings += local.warnings
            result.issues.errors += local.errors
    return result


def plan_jobs(cache_dir: Path, issues: Issues) -> tuple[list[Job], list[sources.Session]]:
    jobs: list[Job] = []

    session_list = sources.load()
    for session in session_list:
        # Order matters: modifications are applied after the answer keys they amend.
        for kind in sources.DOC_KINDS:
            for index, doc in enumerate(getattr(session, kind)):
                path = ensure_cached(doc, cache_dir, issues)
                if path is None:
                    continue
                modification = kind == "modifications"
                jobs.append(
                    Job(
                        path=path,
                        kind="answers" if modification else kind,
                        year=session.year,
                        month=session.month,
                        source=doc.filename,
                        url=doc.url,
                        hints=doc.hints,
                        rectification=modification or index > 0,
                        modification=modification,
                        letter_handled=bool(doc.reviewed)
                        or any(o.get("source") == doc.url for o in session.overrides),
                    )
                )

    sources.save(session_list)  # keeps the sha256 of each cached file current

    return jobs, session_list


def build(cache_dir: Path, issues: Issues) -> tuple[list[dict], int]:
    jobs, session_list = plan_jobs(cache_dir, issues)
    with ProcessPoolExecutor(max_workers=os.cpu_count()) as pool:
        results = list(pool.map(parse_job, jobs))

    all_exams: dict[Key, exams.Exam] = {}
    all_answers: dict[Key, corrections.Answers] = {}
    overrides = 0
    for result in results:
        issues.warnings += result.issues.warnings
        issues.errors += result.issues.errors
        overrides += result.overrides
        job = result.job
        if job.modification and not result.answers and not job.letter_handled:
            issues.warn(
                job.source,
                "modification letter not transcribed yet: add its PER changes to the session's "
                '"overrides" in sources.json (citing it as "source"), or mark it "reviewed": true',
            )
        for exam in result.exams:
            key = (job.year, job.month, exam.test)
            if key in all_exams:
                issues.error(job.source, f"test {exam.test:02d} appears twice in {job.year}-{job.month:02d}")
                continue
            all_exams[key] = exam
        for test, answers, where in result.answers:
            key = (job.year, job.month, test)
            if key in all_answers and not job.rectification:
                issues.error(where, f"test {test:02d} appears twice in {job.year}-{job.month:02d}")
                continue
            # A later document of the same session (a rectification) wins.
            all_answers.setdefault(key, {}).update(answers)

    # Changes announced in modification letters, transcribed by hand.
    for session in session_list:
        for override in session.overrides:
            key = (session.year, session.month, override["test"])
            where = f"sources.json {session.session} override"
            if key not in all_answers:
                issues.error(where, f"test {override['test']:02d} has no answer key to override")
                continue
            all_answers[key][override["question"]] = sorted(override["answers"])
            overrides += 1

    for year, month, test in sorted(set(all_answers) - set(all_exams)):
        issues.warn(f"{year}-{month:02d}", f"test {test:02d} has answers but no exam")

    dataset = []
    for key in sorted(all_exams):
        exam = all_exams[key]
        answers = all_answers.get(key)
        if answers is None:
            issues.warn(exam.source, f"test {exam.test:02d}: no answers found; correctAnswers left empty")
            answers = {}
        dataset.append(
            {
                "year": exam.year,
                "month": MONTHS[exam.month],
                "testNumber": exam.test,
                "source": exam.source,
                "sourceUrl": exam.url,
                "questions": [
                    {
                        "questionNumber": q.number,
                        "topic": q.topic,
                        "questionText": q.text,
                        "answers": [{"answerId": k, "answerText": v} for k, v in sorted(q.options.items())],
                        "correctAnswers": answers.get(q.number, []),
                    }
                    for q in exam.questions
                ],
            }
        )
    return dataset, overrides
