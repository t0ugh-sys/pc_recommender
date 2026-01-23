import asyncio
from dataclasses import dataclass
from datetime import datetime
import logging

from app.core.config import settings

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


def run_sync_once() -> None:
    """
    TODO: Replace with real crawling/import logic.
    """
    logger.info("Sync job started")
    state.last_run_at = datetime.utcnow()
    state.last_status = "success"
    state.last_message = "sync placeholder completed"


async def sync_loop() -> None:
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
