from dataclasses import dataclass
import os


def _to_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _to_str_tuple(value: str | None) -> tuple[str, ...]:
    if not value:
        return ()
    items = [item.strip() for item in value.split(",")]
    return tuple(item for item in items if item)


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/pc_recommender",
    )
    sync_interval_seconds: int = int(os.getenv("SYNC_INTERVAL_SECONDS", "86400"))
    sync_enabled: bool = _to_bool(os.getenv("SYNC_ENABLED"), True)
    admin_token: str = os.getenv("ADMIN_TOKEN", "")
    cors_origins: tuple[str, ...] = _to_str_tuple(os.getenv("CORS_ORIGINS"))
    gzip_minimum_size: int = int(os.getenv("GZIP_MINIMUM_SIZE", "1000"))


settings = Settings()

