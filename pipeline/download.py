"""Local cache of the original PDFs listed in sources.json.

The PDFs are only needed while parsing, so they live in a gitignored cache
(data/cache/) that can be deleted at any time; missing files are fetched from
the CDN on demand. The ministry sometimes re-publishes a file under the same
name (e.g. adding rectifications), so each run compares the remote size with
the cached copy (one HEAD request per file) and re-downloads it if it changed.
The new sha256 is recorded in sources.json, so the change shows up in git.
"""

from __future__ import annotations

import hashlib
import time
import urllib.request
from pathlib import Path

from common import Issues
from discover import DELAY_SECONDS, USER_AGENT
from sources import Document


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fetch(url: str, target: Path) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    tmp = target.with_suffix(target.suffix + ".part")
    with urllib.request.urlopen(request, timeout=120) as response, tmp.open("wb") as out:
        while chunk := response.read(1 << 20):
            out.write(chunk)
    with tmp.open("rb") as f:
        if f.read(5) != b"%PDF-":
            tmp.unlink()
            raise ValueError("downloaded file is not a PDF")
    tmp.rename(target)
    time.sleep(DELAY_SECONDS)


def remote_size(url: str) -> int | None:
    request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            length = response.headers.get("Content-Length")
            return int(length) if length else None
    except Exception:  # noqa: BLE001 - offline or CDN hiccup: keep using the cached copy
        return None
    finally:
        time.sleep(DELAY_SECONDS)


def ensure_cached(doc: Document, cache_dir: Path, issues: Issues) -> Path | None:
    """Returns an up-to-date cached copy of `doc` (None if unavailable) and keeps
    its sha256 in `doc` current."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    target = cache_dir / doc.filename

    stale = target.exists() and remote_size(doc.url) not in (None, target.stat().st_size)
    if not target.exists() or stale:
        try:
            fetch(doc.url, target)
        except Exception as error:  # noqa: BLE001 - report and continue with the rest
            if target.exists():
                issues.warn(doc.filename, f"could not check for a newer version ({error}); using the cached copy")
                return target
            hint = (
                " The ministry blocks automated downloads from this host: open the URL in a browser "
                f"and save the file as data/cache/{doc.filename}"
                if "403" in str(error)
                else ""
            )
            issues.error(doc.filename, f"download failed: {error}.{hint}")
            return None
        print(f"  {'re-downloaded (changed on the CDN)' if stale else 'downloaded'} {doc.filename}")

    digest = sha256_of(target)
    if doc.sha256 and doc.sha256 != digest:
        issues.warn(doc.filename, "re-published by the ministry: using the new version (sha256 updated)")
    doc.sha256 = digest
    return target
