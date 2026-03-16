# Data Generation

This folder contains scripts to build CSV datasets from source PDF exams.

## Prerequisites

- `pdftotext` installed and available in `PATH`

Check:

```bash
command -v pdftotext
```

## Folder Structure

- `origin/`: source PDFs
- `extracted/`: generated `.txt` files (same structure as `origin/`)
- `outputs/`: generated CSV files
- `extract-txt-from-pdf.sh`: converts PDFs to TXT
- `generate-exams-csv.sh`: generates `questions.csv` and `answers.csv` from extracted exam TXT files
- `run-data-pipeline.sh`: runs both steps in order

## Generate Data (Single Command)

From this `data/` folder:

```bash
./run-data-pipeline.sh
```

This will:

1. Convert PDFs from `origin/` into TXT files under `extracted/`
2. Generate:
   - `outputs/questions.csv`
   - `outputs/answers.csv`

## Run Steps Manually

1. Extract TXT:

```bash
./extract-txt-from-pdf.sh origin extracted
```

2. Generate CSV:

```bash
./generate-exams-csv.sh extracted/exams outputs/questions.csv outputs/answers.csv
```

## Notes

- `answers.csv` leaves `is_correct` empty on purpose.
- Scripts overwrite output CSV files on each run.
