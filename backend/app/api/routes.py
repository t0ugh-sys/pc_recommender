from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.api.deps import get_db, require_admin
from app.services import sync

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


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


@router.put("/configs/{key}", response_model=schemas.ConfigResponse, dependencies=[Depends(require_admin)])
async def upsert_config(
    key: str, payload: schemas.ConfigPayload, db: Session = Depends(get_db)
):
    item = crud.upsert_config(db, key, payload.payload)
    return schemas.ConfigResponse(key=item.key, payload=item.payload, updated_at=item.updated_at)


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
