from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ConfigPayload(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)


class ConfigResponse(BaseModel):
    key: str
    payload: dict[str, Any]
    updated_at: datetime | None = None
