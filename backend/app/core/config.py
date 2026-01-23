from dataclasses import dataclass
import os


def _to_bool(value: str, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/pc_recommender",
    )
    sync_interval_seconds: int = int(os.getenv("SYNC_INTERVAL_SECONDS", "86400"))
    sync_enabled: bool = _to_bool(os.getenv("SYNC_ENABLED"), True)


settings = Settings()
