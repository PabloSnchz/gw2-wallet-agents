#!/usr/bin/env python3
"""
_fetch_thematic_prices.py — Phase 2B: Fetch TP prices for all 206 legendary items
Uses https://api.guildwars2.com/v2/commerce/prices?ids=...
Caches results to _legendary_prices_cache.json
"""
import json
import os
import sys
import urllib.request
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRICES_CACHE = os.path.join(BASE_DIR, "_legendary_prices_cache.json")
INPUT_FILE = os.path.join(BASE_DIR, "_legendary_items_full.json")
BATCH_SIZE = 200  # GW2 API max is 200 IDs per request
API_BASE = "https://api.guildwars2.com/v2"


def fetch_prices(item_ids):
    """Fetch commerce prices for a list of item IDs (up to 200)."""
    ids_str = ",".join(str(i) for i in item_ids)
    url = f"{API_BASE}/commerce/prices?ids={ids_str}"
    req = urllib.request.Request(url, headers={"User-Agent": "gw2-legendary-data-builder/1.0"})
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  ⚠️  Fetch error for batch of {len(item_ids)} items: {e}")
        return []


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    # Load item IDs
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        items_raw = json.load(f)

    item_ids = []
    for k, v in items_raw.items():
        if v.get("name_en"):
            item_ids.append(v["id"])

    print(f"📦 Fetching TP prices for {len(item_ids)} items")

    # Check cache
    if os.path.exists(PRICES_CACHE):
        with open(PRICES_CACHE, "r", encoding="utf-8") as f:
            prices = json.load(f)
        cached = len(prices)
    else:
        prices = {}
        cached = 0

    fetched = 0
    for i in range(0, len(item_ids), BATCH_SIZE):
        batch = item_ids[i:i + BATCH_SIZE]
        # Skip items already cached
        batch_new = [id_ for id_ in batch if str(id_) not in prices]
        batch_cached = [id_ for id_ in batch if str(id_) in prices]

        if batch_new:
            print(f"  Batch {i//BATCH_SIZE + 1}: fetching {len(batch_new)} new + {len(batch_cached)} cached")
            results = fetch_prices(batch_new)
            for entry in results:
                if isinstance(entry, str):
                    # API returns "NotFound" string for items without price data
                    continue
                if not isinstance(entry, dict):
                    continue
                item_id = str(entry["id"])
                prices[item_id] = {
                    "buy": entry.get("buys", {}).get("unit_price", 0),
                    "sell": entry.get("sells", {}).get("unit_price", 0),
                    "buy_listings": entry.get("buys", {}).get("quantity", 0),
                    "sell_listings": entry.get("sells", {}).get("quantity", 0),
                    "whitelisted": entry.get("whitelisted", False)
                }
                fetched += 1
            time.sleep(0.2)  # Rate limit courtesy
        else:
            print(f"  Batch {i//BATCH_SIZE + 1}: all {len(batch)} cached")

    # Save cache
    with open(PRICES_CACHE, "w", encoding="utf-8") as f:
        json.dump(prices, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Phase 2B complete: {len(prices)} price entries cached")
    print(f"   Cache file: {PRICES_CACHE}")

    # Verify all items have prices
    missing = [id_ for id_ in item_ids if str(id_) not in prices]
    if missing:
        print(f"   ⚠️ Missing prices for {len(missing)} items: {missing[:10]}...")
    else:
        print(f"   ✅ All {len(item_ids)} items have prices")


if __name__ == "__main__":
    main()