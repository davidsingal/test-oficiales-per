# Data Generation

This folder contains scripts to build CSV datasets from source PDF exams.

## Prerequisites

- `pdftotext` installed and available in `PATH`

Check:

```bash
command -v pdftotext
```

## Folder Structure

- `../public/examenes-oficiales/`: source exam PDFs
- `../public/correcciones/`: source correction PDFs
- `extracted/`: generated `.txt` files
- `outputs/`: generated CSV files
- `extract-txt-from-pdf.sh`: converts PDFs to TXT
- `generate-exams-answers-csv.sh`: generates `questions.csv` and `answers.csv` from extracted exam TXT files
- `generate-corrections-csv.sh`: generates `corrections.csv` from extracted answer-template TXT files
- `run-data-pipeline.sh`: runs all steps in order

## Generate Data (Single Command)

From this `data/` folder:

```bash
./run-data-pipeline.sh
```

This will:

1. Convert PDFs from `../public/` into TXT files under `extracted/`
2. Generate `outputs/questions.csv`
3. Generate `outputs/answers.csv`
4. Generate `outputs/corrections.csv`

## Run Steps Manually

1. Extract TXT:

```bash
./extract-txt-from-pdf.sh ../public extracted
```

2. Generate CSV:

```bash
./generate-exams-answers-csv.sh extracted/examenes-oficiales outputs/questions.csv outputs/answers.csv
```

3. Generate corrections CSV:

```bash
./generate-corrections-csv.sh extracted/correcciones outputs/corrections.csv
```

## Notes

- Scripts overwrite output CSV files on each run.
