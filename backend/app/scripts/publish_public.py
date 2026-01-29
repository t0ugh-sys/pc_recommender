import json
import os
from pathlib import Path

from app.crud import get_config
from app.db import SessionLocal, init_db


def _resolve_data_dir() -> Path:
    env_dir = os.getenv("DATA_DIR")
    if env_dir:
        return Path(env_dir)
    return Path(__file__).resolve().parents[3] / "data"


def _resolve_public_dir() -> Path:
    env_dir = os.getenv("PUBLIC_DATA_DIR")
    if env_dir:
        return Path(env_dir)
    return Path(__file__).resolve().parents[3] / "app" / "public" / "data"


def _load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def _load_from_db() -> tuple[dict | None, dict | None]:
    init_db()
    db = SessionLocal()
    try:
        components = get_config(db, "components")
        rules = get_config(db, "rules")
        return (
            components.payload if components else None,
            rules.payload if rules else None,
        )
    finally:
        db.close()


def _load_from_data() -> tuple[dict, dict]:
    data_dir = _resolve_data_dir()
    components_path = data_dir / "components.json"
    rules_path = data_dir / "rules.json"

    if not components_path.exists() or not rules_path.exists():
        raise FileNotFoundError(
            "Missing components.json or rules.json / "
            "\u7f3a\u5c11 components.json \u6216 rules.json"
        )

    return _load_json(components_path), _load_json(rules_path)


def main() -> None:
    components, rules = _load_from_db()
    source = "db"
    if components is None or rules is None:
        components, rules = _load_from_data()
        source = "data"

    public_dir = _resolve_public_dir()
    _write_json(public_dir / "components.json", components)
    _write_json(public_dir / "rules.json", rules)

    print(
        f"Published configs from {source} to {public_dir} / "
        f"\u5df2\u4ece {source} \u53d1\u5e03\u5230 {public_dir}"
    )


if __name__ == "__main__":
    main()
