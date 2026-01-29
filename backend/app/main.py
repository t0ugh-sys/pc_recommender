import asyncio
from contextlib import asynccontextmanager, suppress
import logging

from fastapi import FastAPI

from app.api.routes import router
from app.core.config import settings
from app.db import init_db
from app.services import sync

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    task = None
    if settings.sync_enabled:
        task = asyncio.create_task(sync.sync_loop())
    yield
    sync.stop_sync_loop()
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="PC Recommender API", lifespan=lifespan)
app.include_router(router)
