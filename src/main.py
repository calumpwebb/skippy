import json
from pathlib import Path

import httpx

API_URL = "https://metaforge.app/api/arc-raiders/items"
CACHE_DIR = Path("../data")
CACHE_FILE = CACHE_DIR / "items.json"


def download_items():
    """Download all items from the Arc Raiders API with pagination."""
    all_items = []
    page = 1

    while True:
        print(f"Fetching page {page} from {API_URL}...")

        response = httpx.get(API_URL, params={"page": page}, timeout=30.0, follow_redirects=True)
        response.raise_for_status()

        data = response.json()
        items = data.get("data", [])
        pagination = data.get("pagination", {})

        all_items.extend(items)
        print(f"  Downloaded {len(items)} items (total: {len(all_items)})")

        if not pagination.get("hasNextPage", False):
            break

        page += 1

    print(f"Downloaded {len(all_items)} items across {page} pages")
    return all_items


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
