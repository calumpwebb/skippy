import json
from pathlib import Path

import httpx

BASE_API_URL = "https://metaforge.app/api/arc-raiders"


def find_project_root():
    """Find project root by walking up from this file looking for marker files."""
    current = Path(__file__).resolve().parent

    # Walk up directory tree
    for parent in [current] + list(current.parents):
        # Check for project root markers
        if (parent / "pyproject.toml").exists():
            return parent
        if (parent / ".git").exists():
            return parent

    # Fallback: assume script is in src/, so parent is root
    return current.parent


DATA_DIR = find_project_root() / "data"


def download_endpoint(endpoint_name, limit=50):
    """Download data from an endpoint, handling pagination automatically if present."""
    url = f"{BASE_API_URL}/{endpoint_name}"
    page = 1

    print(f"Fetching {endpoint_name}...")

    # First request
    response = httpx.get(
        url, params={"page": page, "limit": limit}, timeout=30.0, follow_redirects=True
    )
    response.raise_for_status()
    data = response.json()

    # Check if this endpoint uses pagination
    if "pagination" in data and "data" in data:
        # Paginated endpoint - collect all pages
        all_data = []
        all_data.extend(data.get("data", []))
        print(f"  Page {page}: {len(data['data'])} items (total: {len(all_data)})")

        while data.get("pagination", {}).get("hasNextPage", False):
            page += 1
            print(f"Fetching {endpoint_name} page {page}...")
            response = httpx.get(
                url, params={"page": page, "limit": limit}, timeout=30.0, follow_redirects=True
            )
            response.raise_for_status()
            data = response.json()
            all_data.extend(data.get("data", []))
            print(f"  Page {page}: {len(data['data'])} items (total: {len(all_data)})")

        print(f"Downloaded {len(all_data)} {endpoint_name} across {page} pages")
        return all_data
    else:
        # Non-paginated endpoint - extract data if present
        print(f"  Downloaded {endpoint_name}")
        return data.get("data", data)


def save_data(endpoint_name, data):
    """Save data to local data file."""
    DATA_DIR.mkdir(exist_ok=True)
    data_file = DATA_DIR / f"{endpoint_name}.json"

    with data_file.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Data saved to {data_file}")


def main():
    """Download all Arc Raiders API endpoints and save to local data."""
    try:
        endpoints = ["items", "arcs", "quests", "traders", "events-schedule"]

        for endpoint in endpoints:
            data = download_endpoint(endpoint)
            save_data(endpoint, data)
            print(f"✓ {endpoint} saved successfully\n")

        print("✓ All data updated successfully")
    except httpx.HTTPError as e:
        print(f"✗ HTTP error: {e}")
        raise SystemExit(1) from e
    except OSError as e:
        print(f"✗ File error: {e}")
        raise SystemExit(1) from e


if __name__ == "__main__":
    main()
