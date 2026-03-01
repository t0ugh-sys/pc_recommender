from __future__ import annotations

from datetime import datetime, timezone
import hashlib

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api.deps import get_db, require_admin
from app.services import sync

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


def _make_config_etag(key: str, updated_at: datetime | None) -> str:
    # Weak ETag is enough here: we only need client-side caching for config snapshots.
    token = updated_at.isoformat() if updated_at else "none"
    digest = hashlib.sha256(f"{key}:{token}".encode("utf-8")).hexdigest()
    return f'W/"{digest}"'


@router.get("/configs", response_model=list[schemas.ConfigResponse], dependencies=[Depends(require_admin)])
async def list_configs(db: Session = Depends(get_db)):
    items = crud.list_configs(db)
    return [
        schemas.ConfigResponse(key=item.key, payload=item.payload, updated_at=item.updated_at)
        for item in items
    ]


@router.get("/configs/{key}", response_model=schemas.ConfigResponse, dependencies=[Depends(require_admin)])
async def get_config(key: str, db: Session = Depends(get_db)):
    item = crud.get_config(db, key)
    if not item:
        raise HTTPException(status_code=404, detail="config not found")
    return schemas.ConfigResponse(key=item.key, payload=item.payload, updated_at=item.updated_at)


@router.get(
    "/public/configs/{key}",
    response_model=schemas.ConfigResponse,
    responses={304: {"description": "Not Modified"}},
)
async def get_public_config(
    key: str,
    response: Response,
    if_none_match: str | None = Header(default=None, alias="If-None-Match"),
    db: Session = Depends(get_db),
):
    item = crud.get_config(db, key)
    if not item:
        raise HTTPException(status_code=404, detail="config not found")

    etag = _make_config_etag(item.key, item.updated_at)
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "public, max-age=60"

    if if_none_match and if_none_match == etag:
        return Response(status_code=304)

    return schemas.ConfigResponse(key=item.key, payload=item.payload, updated_at=item.updated_at)


@router.put("/configs/{key}", response_model=schemas.ConfigResponse, dependencies=[Depends(require_admin)])
async def upsert_config(key: str, payload: schemas.ConfigPayload, db: Session = Depends(get_db)):
    item = crud.upsert_config(db, key, payload.payload)
    return schemas.ConfigResponse(key=item.key, payload=item.payload, updated_at=item.updated_at)


@router.post("/public/recommendations", response_model=schemas.RecommendationShareResponse)
async def create_recommendation_share(
    payload: schemas.RecommendationSharePayload, db: Session = Depends(get_db)
):
    item = crud.create_recommendation_share(db, payload.payload, payload.title)
    return schemas.RecommendationShareResponse(
        id=item.id,
        title=item.title,
        payload=item.payload,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("/public/recommendations/{share_id}", response_model=schemas.RecommendationShareResponse)
async def get_recommendation_share(share_id: str, db: Session = Depends(get_db)):
    item = crud.get_recommendation_share(db, share_id)
    if not item:
        raise HTTPException(status_code=404, detail="share not found")
    return schemas.RecommendationShareResponse(
        id=item.id,
        title=item.title,
        payload=item.payload,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.post("/sync/run", dependencies=[Depends(require_admin)])
async def run_sync() -> dict:
    sync.run_sync_once()
    return {"status": sync.get_state().last_status, "message": sync.get_state().last_message}


@router.get("/sync/status", dependencies=[Depends(require_admin)])
async def sync_status() -> dict:
    state = sync.get_state()
    return {
        "last_run_at": state.last_run_at.isoformat() if state.last_run_at else None,
        "last_status": state.last_status,
        "last_message": state.last_message,
    }

