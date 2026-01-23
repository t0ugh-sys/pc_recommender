from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ConfigStore


def get_config(db: Session, key: str) -> ConfigStore | None:
    return db.execute(select(ConfigStore).where(ConfigStore.key == key)).scalar_one_or_none()


def list_configs(db: Session) -> list[ConfigStore]:
    return list(db.execute(select(ConfigStore).order_by(ConfigStore.key)).scalars().all())


def upsert_config(db: Session, key: str, payload: dict) -> ConfigStore:
    current = get_config(db, key)
    if current:
        current.payload = payload
        db.add(current)
    else:
        current = ConfigStore(key=key, payload=payload)
        db.add(current)
    db.commit()
    db.refresh(current)
    return current
