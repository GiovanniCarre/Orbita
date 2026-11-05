from typing import Literal

from pydantic import BaseModel


class Integration(BaseModel):
    id: str
    label: str
    status: Literal["not_configured"] = "not_configured"
    description: str


def list_integrations() -> list[Integration]:
    return [
        Integration(id="sportcooks", label="SportCooks", description="Statistiques et rapports"),
        Integration(id="monitoring", label="Supervision", description="État des applications"),
        Integration(
            id="notifications", label="Notifications", description="Alertes sur vos appareils"
        ),
    ]
