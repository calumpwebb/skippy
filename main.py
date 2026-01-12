import json
from pathlib import Path

import httpx

API_URL = "https://metaforge.app/api/arc-raiders/items"
CACHE_DIR = Path("cache")
CACHE_FILE = CACHE_DIR / "arc-raiders-items.json"


def download_items():
    """Download items from the Arc Raiders API."""
    print(f"Fetching data from {API_URL}...")

    response = httpx.get(API_URL, timeout=30.0, follow_redirects=True)
    response.raise_for_status()

    data = response.json()
    items = data.get("data", [])

    print(f"Downloaded {len(items)} items")
    return items


def save_cache(items):
    """Save items to local cache, replacing existing cache."""
    CACHE_DIR.mkdir(exist_ok=True)

    with CACHE_FILE.open("w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)

    print(f"Cache saved to {CACHE_FILE}")


def main():
    """Download Arc Raiders items and save to local cache."""
    try:
        items = download_items()
        save_cache(items)
        print("✓ Cache updated successfully")
    except httpx.HTTPError as e:
        print(f"✗ HTTP error: {e}")
        raise SystemExit(1) from e
    except OSError as e:
        print(f"✗ File error: {e}")
        raise SystemExit(1) from e


if __name__ == "__main__":
    main()
