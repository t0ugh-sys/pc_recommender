import asyncio
from dataclasses import dataclass
from datetime import datetime
import json
import logging
import os
from pathlib import Path

from app.core.config import settings
from app.crud import upsert_config
from app.db import SessionLocal, init_db

logger = logging.getLogger(__name__)


@dataclass
class SyncState:
    last_run_at: datetime | None = None
    last_status: str = "never"
    last_message: str = ""


state = SyncState()
_stop_event = asyncio.Event()


def stop_sync_loop() -> None:
    _stop_event.set()


def get_state() -> SyncState:
    return state


def _resolve_data_dir() -> Path:
    env_dir = os.getenv("DATA_DIR")
    if env_dir:
        return Path(env_dir)
    return Path(__file__).resolve().parents[3] / "data"


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _resolve_public_dir() -> Path | None:
    env_dir = os.getenv("PUBLIC_DATA_DIR")
    if not env_dir:
        return None
    return Path(env_dir)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def run_sync_once() -> None:
    logger.info("Sync job started")
    state.last_run_at = datetime.utcnow()
    try:
        data_dir = _resolve_data_dir()
        components_path = data_dir / "components.json"
        rules_path = data_dir / "rules.json"

        missing = [
            path.name for path in (components_path, rules_path) if not path.exists()
        ]
        if missing:
            missing_list = ", ".join(missing)
            raise FileNotFoundError(
                f"Missing data files: {missing_list} / "
                f"\u7f3a\u5c11\u6570\u636e\u6587\u4ef6: {missing_list}"
            )

        components = _load_json(components_path)
        rules = _load_json(rules_path)

        init_db()
        db = SessionLocal()
        try:
            upsert_config(db, "components", components)
            upsert_config(db, "rules", rules)
        finally:
            db.close()

        public_dir = _resolve_public_dir()
        if public_dir:
            _write_json(public_dir / "components.json", components)
            _write_json(public_dir / "rules.json", rules)

        state.last_status = "success"
        state.last_message = (
            "Sync completed: components, rules / "
            "\u540c\u6b65\u5b8c\u6210\uff1acomponents\u3001rules"
        )
    except Exception as exc:
        logger.exception("Sync failed")
        state.last_status = "failed"
        state.last_message = str(exc)


async def sync_loop() -> None:
    _stop_event.clear()
    while not _stop_event.is_set():
        if settings.sync_enabled:
            try:
                run_sync_once()
            except Exception as exc:
                logger.exception("Sync failed")
                state.last_run_at = datetime.utcnow()
                state.last_status = "failed"
                state.last_message = str(exc)
        await asyncio.wait(
            [
                _stop_event.wait(),
                asyncio.sleep(settings.sync_interval_seconds),
            ],
            return_when=asyncio.FIRST_COMPLETED,
        )
