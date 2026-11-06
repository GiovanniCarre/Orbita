"""Serve the compiled SvelteKit app (``npm run build``) from the API process in production."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

IMMUTABLE_PREFIX = "_app/immutable/"


def mount_frontend(application: FastAPI, directory: str) -> None:
    root = Path(directory).resolve()
    index = root / "index.html"
    if not index.is_file():
        raise RuntimeError(f"ORBITA_STATIC_DIR has no index.html: {root}")

    @application.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404)
        candidate = (root / path).resolve()
        if path and candidate.is_relative_to(root) and candidate.is_file():
            headers = (
                {"Cache-Control": "public, max-age=31536000, immutable"}
                if path.startswith(IMMUTABLE_PREFIX)
                else None
            )
            return FileResponse(candidate, headers=headers)
        # Client-side routes (/social, …) all load the single-page app.
        return FileResponse(index, headers={"Cache-Control": "no-cache"})
