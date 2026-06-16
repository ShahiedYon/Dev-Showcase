from pathlib import Path
import json

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BRAND_CONFIG_PATH = PROJECT_ROOT / "brand.config.json"


def load_brand_config() -> dict[str, str]:
    with BRAND_CONFIG_PATH.open("r", encoding="utf-8") as file:
        return json.load(file)
