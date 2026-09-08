import json
import os
import threading
from pathlib import Path
from typing import Any

_WRITE_LOCK = threading.Lock()


class JsonStore:
    """Reads and writes one JSON document per collection file.

    The whole file is read and rewritten per operation: O(n) and deliberately so
    at v1 scale. Writes go to a temp file in the same directory and are moved
    into place with ``os.replace`` so an interrupted write cannot truncate the
    collection.
    """

    def __init__(self, data_dir: Path, name: str) -> None:
        self._path = data_dir / f"{name}.json"

    @property
    def path(self) -> Path:
        return self._path

    def read(self, default: Any) -> Any:
        """Return the stored document, or ``default`` when the file is absent."""
        if not self._path.exists():
            return default
        with self._path.open(encoding="utf-8") as handle:
            return json.load(handle)

    def write(self, document: Any) -> None:
        """Replace the stored document atomically."""
        with _WRITE_LOCK:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = self._path.with_suffix(".json.tmp")
            with temp_path.open("w", encoding="utf-8") as handle:
                json.dump(document, handle, indent=2, ensure_ascii=False)
            os.replace(temp_path, self._path)
