"""Pipeline tests. Run in the pipeline container:

    docker compose run --rm --entrypoint python pipeline -m pytest
"""

import sys
from pathlib import Path

# The pipeline modules import each other as top-level modules (`import exams`).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
