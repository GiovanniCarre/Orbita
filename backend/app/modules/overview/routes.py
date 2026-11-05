from fastapi import APIRouter

from app.modules.overview.service import Integration, list_integrations

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/integrations", response_model=list[Integration])
def integrations() -> list[Integration]:
    return list_integrations()
