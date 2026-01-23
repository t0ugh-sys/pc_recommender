import json
import os
from pathlib import Path

from app.crud import upsert_config
from app.db import SessionLocal, init_db


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def main() -> None:
    init_db()
    data_dir = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parents[3] / "data"))
    components_path = data_dir / "components.json"
    rules_path = data_dir / "rules.json"

    if not components_path.exists() or not rules_path.exists():
        raise FileNotFoundError("components.json or rules.json not found")

    components = load_json(components_path)
    rules = load_json(rules_path)

    db = SessionLocal()
    try:
        upsert_config(db, "components", components)
        upsert_config(db, "rules", rules)
    finally:
        db.close()


if __name__ == "__main__":
    main()
