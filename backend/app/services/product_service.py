import json
import os
import re
from typing import Any

import httpx

from app.models.schemas import (
    ConflictResult,
    IngredientConflict,
    ProductSearchResult,
    ShelfProduct,
    ShelfProductCreate,
)
from app.services.llm_client import generate_json, has_gemini_api_key
from app.services.mock_data import MOCK_PRODUCT, use_mock_ai
from app.services.supabase_service import get_supabase

OBF_BASE = "https://world.openbeautyfacts.org"
# Same source used for shelf products with clean Target/Walmart pack shots.
# Set UPCITEMDB_API_KEY to use the paid /prod/v1 endpoint (trial is ~100 req/day).
_UPC_KEY = os.getenv("UPCITEMDB_API_KEY", "").strip()
UPCITEMDB_BASE = (
    "https://api.upcitemdb.com/prod/v1" if _UPC_KEY else "https://api.upcitemdb.com/prod/trial"
)

# Short-lived cache so retries don't burn the trial quota
_SEARCH_CACHE: dict[str, list[ProductSearchResult]] = {}
_SEARCH_CACHE_ORDER: list[str] = []
_SEARCH_CACHE_MAX = 40

CONFLICT_RULES: list[dict[str, Any]] = [
    {
        "group_a": ["retinol", "retinal", "retinaldehyde", "tretinoin", "adapalene"],
        "group_b": [
            "glycolic acid",
            "lactic acid",
            "mandelic acid",
            "salicylic acid",
            "aha",
            "bha",
            "benzoyl peroxide",
        ],
        "severity": "severe",
        "message": "Retinoids should not be used in the same routine as AHAs, BHAs, or benzoyl peroxide — they can cause irritation and reduce efficacy.",
    },
    {
        "group_a": ["vitamin c", "ascorbic acid", "l-ascorbic acid"],
        "group_b": ["benzoyl peroxide"],
        "severity": "moderate",
        "message": "Vitamin C and benzoyl peroxide can deactivate each other. Use at different times of day.",
    },
    {
        "group_a": ["niacinamide"],
        "group_b": ["vitamin c", "ascorbic acid", "l-ascorbic acid"],
        "severity": "mild",
        "message": "Niacinamide and pure Vitamin C at high concentrations may cause flushing in some users. Consider separating AM/PM.",
    },
]


def _normalize_ingredient(value: str) -> str:
    return value.strip().lower()


def _parse_obf_ingredients(product: dict[str, Any]) -> list[str]:
    ingredients_text = product.get("ingredients_text") or ""
    if not ingredients_text and product.get("ingredients"):
        ingredients_text = ", ".join(
            i.get("text", "") for i in product["ingredients"] if i.get("text")
        )
    if not ingredients_text:
        return []
    return [
        part.strip()
        for part in ingredients_text.replace(";", ",").split(",")
        if part.strip()
    ]


def _strip_product_size(name: str) -> str:
    """Remove retail size suffixes like '5.5 oz', '100 ml', '(16 fl oz)'."""
    cleaned = re.sub(
        r"(?i)[\s,;\-–—/]*\(?\d+(?:\.\d+)?\s*(?:fl\.?\s*)?oz\.?e?s?\.?\)?",
        " ",
        name,
    )
    cleaned = re.sub(
        r"(?i)[\s,;\-–—/]*\(?\d+(?:\.\d+)?\s*(?:ml|mL|g|kg|l|L)\.?\)?",
        " ",
        cleaned,
    )
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" -–,;/|")
    return cleaned or name


_SKIN_TYPE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bmature\s+skin\b", re.I), "Mature skin"),
    (re.compile(r"\bdry\s+skin\b", re.I), "Dry skin"),
    (re.compile(r"\boily\s+skin\b", re.I), "Oily skin"),
    (re.compile(r"\bsensitive\s+skin\b", re.I), "Sensitive skin"),
    (re.compile(r"\bcombination\s+skin\b", re.I), "Combination skin"),
    (re.compile(r"\bacne[-\s]?prone\b", re.I), "Acne-prone"),
    (re.compile(r"\bnormal\s+skin\b", re.I), "Normal skin"),
    (re.compile(r"\ball\s+skin\s+types?\b", re.I), "All skin types"),
]

_MARKETING_FLUFF = re.compile(
    r"\b(for\s+face|face|paraben[-\s]?free|sulfate[-\s]?free|fragrance[-\s]?free|"
    r"dermatologist(?:\s+tested)?|non[-\s]?comedogenic|cruelty[-\s]?free|"
    r"oil[-\s]?free|alcohol[-\s]?free)\b",
    re.I,
)


def _shorten_product_name(name: str, brand: str | None = None) -> str:
    """Keep title + skin type; drop marketing copy and size noise."""
    text = _strip_product_size(name)
    if brand:
        text = re.sub(
            rf"(?i)^{re.escape(brand)}\s*[-–—:]?\s*",
            "",
            text,
        )

    parts = re.split(r"\s*[:|]\s*", text)
    title = (parts[0] if parts else text).strip()
    suffix = " ".join(parts[1:])
    title = re.sub(
        r"(?i)\s+[-–—]\s+(travel\s+size|value\s+size|refill|duo|set)\b.*$",
        "",
        title,
    )

    skin_type = None
    haystack = f"{suffix} {text}"
    for pattern, label in _SKIN_TYPE_PATTERNS:
        if pattern.search(haystack):
            skin_type = label
            break

    title = _MARKETING_FLUFF.sub(" ", title)
    title = re.sub(r"\s*[,;]\s*", " ", title)
    title = re.sub(r"\s{2,}", " ", title).strip(" -–,;/|")
    if len(title) > 42:
        cut = title[:42]
        space = cut.rfind(" ")
        title = (cut[:space] if space > 20 else cut).strip()

    if skin_type and skin_type.lower() not in title.lower():
        return f"{title} · {skin_type}"
    return title or _strip_product_size(name)


# Prefer studio / retailer pack shots (same CDNs as your shelf PanOxyl / CeraVe cards)
_CLEAN_RETAIL_HOSTS = (
    "target.scene7.com",
    "scene7.com",
    "walmartimages.com",
    "i5.walmartimages.com",
    "pics.drugstore.com",
    "media.ulta.com",
    "ulta.com",
    "sephora.com",
    "images-na.ssl-images-amazon.com",
    "m.media-amazon.com",
    "media-amazon.com",
    "images.albertsons-media.com",
    "i.shgcdn.com",
    "cdn.shopify.com",
)


def _upc_headers() -> dict[str, str]:
    headers = {"Accept": "application/json", "User-Agent": "skins-app/1.0"}
    if _UPC_KEY:
        headers["user_key"] = _UPC_KEY
        headers["key_type"] = "3scale"
    return headers


def _image_host_rank(url: str) -> int:
    lower = url.lower()
    for i, host in enumerate(_CLEAN_RETAIL_HOSTS):
        if host in lower:
            return i
    return len(_CLEAN_RETAIL_HOSTS) + 1


def _best_retail_image(images: list[Any] | None) -> str | None:
    """Prefer Target/Walmart-style pack shots; otherwise use any UPCItemDB image."""
    urls = [u for u in (images or []) if isinstance(u, str) and u.startswith("http")]
    if not urls:
        return None

    urls_sorted = sorted(urls, key=_image_host_rank)
    url = urls_sorted[0]
    if "walmartimages.com" in url.lower() and "odnHeight" not in url:
        return f"{url}{'&' if '?' in url else '?'}odnHeight=450&odnWidth=450&odnBg=ffffff"
    return url


def _upgrade_obf_image(url: str | None) -> str | None:
    if not url:
        return None
    return re.sub(r"\.\d+\.jpg$", ".full.jpg", url)


def _best_obf_image(product: dict[str, Any]) -> str | None:
    selected = product.get("selected_images") or {}
    front = selected.get("front") or {}
    for size_key in ("display", "small", "thumb"):
        size_map = front.get(size_key)
        if isinstance(size_map, dict):
            for lang in ("en", "fr", "de", "es"):
                if size_map.get(lang):
                    return _upgrade_obf_image(size_map[lang])
            for value in size_map.values():
                if value:
                    return _upgrade_obf_image(value)
    return _upgrade_obf_image(product.get("image_front_url") or product.get("image_url"))


def _cache_get(query: str) -> list[ProductSearchResult] | None:
    key = query.strip().lower()
    cached = _SEARCH_CACHE.get(key)
    if cached is None:
        return None
    return [item.model_copy(deep=True) for item in cached]


def _cache_set(query: str, results: list[ProductSearchResult]) -> None:
    key = query.strip().lower()
    if key in _SEARCH_CACHE:
        _SEARCH_CACHE_ORDER.remove(key)
    _SEARCH_CACHE[key] = [item.model_copy(deep=True) for item in results]
    _SEARCH_CACHE_ORDER.append(key)
    while len(_SEARCH_CACHE_ORDER) > _SEARCH_CACHE_MAX:
        old = _SEARCH_CACHE_ORDER.pop(0)
        _SEARCH_CACHE.pop(old, None)


def _map_upcitemdb_item(item: dict[str, Any]) -> ProductSearchResult | None:
    title = (item.get("title") or "").strip()
    if not title:
        return None

    image_url = _best_retail_image(item.get("images"))
    if not image_url:
        return None

    brand = (item.get("brand") or "").strip() or "Unknown"
    barcode = item.get("ean") or item.get("upc") or item.get("gtin")

    return ProductSearchResult(
        name=_shorten_product_name(title, brand),
        brand=brand,
        barcode=str(barcode) if barcode else None,
        ingredients=[],
        image_url=image_url,
    )


def _map_obf_product(data: dict[str, Any]) -> ProductSearchResult | None:
    product = data.get("product")
    if not product:
        return None

    name = product.get("product_name") or product.get("generic_name")
    if not name:
        return None

    brand = product.get("brands", "").split(",")[0].strip() or "Unknown"
    return ProductSearchResult(
        name=_shorten_product_name(name, brand),
        brand=brand,
        barcode=product.get("code") or product.get("_id"),
        ingredients=_parse_obf_ingredients(product),
        image_url=_best_obf_image(product),
    )


async def _obf_ingredients_for_barcode(
    client: httpx.AsyncClient, barcode: str | None
) -> list[str]:
    if not barcode:
        return []
    try:
        response = await client.get(f"{OBF_BASE}/api/v2/product/{barcode}.json")
        if response.status_code != 200:
            return []
        product = (response.json() or {}).get("product") or {}
        return _parse_obf_ingredients(product)
    except Exception:
        return []


async def _search_upcitemdb(query: str, limit: int) -> list[ProductSearchResult]:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{UPCITEMDB_BASE}/search",
            params={"s": query, "match_mode": 0, "type": "product"},
            headers=_upc_headers(),
        )
        if response.status_code == 429:
            return []
        if response.status_code >= 400:
            return []
        payload = response.json()
        if payload.get("code") in {"EXCEED_LIMIT", "TOO_FAST"}:
            return []

    results: list[ProductSearchResult] = []
    seen: set[str] = set()
    items = list(payload.get("items") or [])
    # Prefer items that already have clean retail CDN images
    items.sort(
        key=lambda it: min(
            (_image_host_rank(u) for u in (it.get("images") or []) if isinstance(u, str)),
            default=999,
        )
    )

    for item in items:
        mapped = _map_upcitemdb_item(item)
        if not mapped or not mapped.image_url:
            continue
        key = (mapped.barcode or mapped.name).lower()
        if key in seen:
            continue
        seen.add(key)
        results.append(mapped)
        if len(results) >= limit:
            break

    if results:
        async with httpx.AsyncClient(timeout=10) as client:
            for result in results:
                if result.barcode and not result.ingredients:
                    result.ingredients = await _obf_ingredients_for_barcode(
                        client, result.barcode
                    )

    return results


async def _search_obf(query: str, limit: int) -> list[ProductSearchResult]:
    params = {
        "search_terms": query,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": max(limit * 3, 15),
        "fields": (
            "code,product_name,generic_name,brands,ingredients_text,"
            "ingredients,image_front_url,image_url,selected_images"
        ),
    }
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f"{OBF_BASE}/cgi/search.pl", params=params)
        response.raise_for_status()
        payload = response.json()

    results: list[ProductSearchResult] = []
    for item in payload.get("products", []):
        mapped = _map_obf_product({"product": item})
        if mapped and mapped.image_url:
            results.append(mapped)
        if len(results) >= limit:
            break
    return results


async def search_products(query: str, limit: int = 10) -> list[ProductSearchResult]:
    """Search Open Beauty Facts (primary)."""
    cached = _cache_get(query)
    if cached:
        return cached[:limit]

    try:
        results = await _search_obf(query, limit)
        if results:
            _cache_set(query, results)
            return results[:limit]
    except Exception:
        pass

    # Fallback if OBF fails
    try:
        results = await _search_upcitemdb(query, limit)
        if results:
            _cache_set(query, results)
        return results[:limit]
    except Exception:
        return []


async def _lookup_upcitemdb(barcode: str) -> ProductSearchResult | None:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{UPCITEMDB_BASE}/lookup",
            params={"upc": barcode},
            headers=_upc_headers(),
        )
        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            return None
        payload = response.json()
        if payload.get("code") in {"EXCEED_LIMIT", "TOO_FAST"}:
            return None

    items = payload.get("items") or []
    if not items:
        return None

    mapped = _map_upcitemdb_item(items[0])
    if not mapped:
        return None

    async with httpx.AsyncClient(timeout=10) as client:
        ingredients = await _obf_ingredients_for_barcode(client, barcode)
        if ingredients:
            mapped.ingredients = ingredients
    return mapped


async def lookup_barcode(barcode: str) -> ProductSearchResult | None:
    try:
        result = await _lookup_upcitemdb(barcode)
        if result:
            return result
    except Exception:
        pass

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f"{OBF_BASE}/api/v2/product/{barcode}.json")
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return _map_obf_product(response.json())


def _product_has_ingredient(product: ShelfProduct, keywords: list[str]) -> bool:
    for ingredient in product.ingredients:
        normalized = _normalize_ingredient(ingredient)
        if any(keyword in normalized for keyword in keywords):
            return True
    # Also check product name for common actives when ingredients are missing.
    name = _normalize_ingredient(f"{product.name} {product.brand or ''}")
    return any(keyword in name for keyword in keywords)


def _usage_periods(usage_time: str | None) -> set[str]:
    if not usage_time or usage_time == "both":
        return {"morning", "night"}
    if usage_time in {"morning", "night"}:
        return {usage_time}
    return {"morning", "night"}


def _usage_overlaps(a: ShelfProduct, b: ShelfProduct) -> bool:
    return bool(_usage_periods(a.usage_time) & _usage_periods(b.usage_time))


def _overlap_label(a: ShelfProduct, b: ShelfProduct) -> str:
    shared = sorted(_usage_periods(a.usage_time) & _usage_periods(b.usage_time))
    if shared == ["morning", "night"]:
        return "same routine (AM & PM)"
    if shared == ["morning"]:
        return "morning"
    if shared == ["night"]:
        return "night"
    return "same routine"


def _rule_based_conflicts(products: list[ShelfProduct]) -> list[IngredientConflict]:
    conflicts: list[IngredientConflict] = []

    for rule in CONFLICT_RULES:
        group_a = [p for p in products if _product_has_ingredient(p, rule["group_a"])]
        group_b = [p for p in products if _product_has_ingredient(p, rule["group_b"])]
        if not group_a or not group_b:
            continue

        for a in group_a:
            for b in group_b:
                if a.id == b.id:
                    continue
                if not _usage_overlaps(a, b):
                    continue
                when = _overlap_label(a, b)
                conflicts.append(
                    IngredientConflict(
                        products=[a.name, b.name],
                        severity=rule["severity"],
                        message=f"{rule['message']} These two are both used in the {when}.",
                        when=when,
                    )
                )

    # Deduplicate by product pair + message stem
    unique: list[IngredientConflict] = []
    seen: set[tuple[str, ...]] = set()
    for conflict in conflicts:
        key = tuple(sorted(conflict.products)) + (conflict.severity,)
        if key in seen:
            continue
        seen.add(key)
        unique.append(conflict)
    return unique


def _ai_conflict_check(products: list[ShelfProduct]) -> list[IngredientConflict]:
    from app.services.llm_client import generate_json, has_gemini_api_key

    if not has_gemini_api_key() or len(products) < 2:
        return []

    payload = [
        {
            "name": p.name,
            "brand": p.brand,
            "ingredients": p.ingredients[:25],
            "usage_time": p.usage_time or "both",
            "times_per_week": p.times_per_week,
        }
        for p in products
    ]

    data = generate_json(
        system=(
            "You are a skincare safety assistant. Find ingredient conflicts ONLY when "
            "products are used at the same time of day (morning/night/both). "
            "If one is morning-only and the other night-only, that is NOT a conflict. "
            "Return JSON: "
            '{"conflicts":[{"products":["A","B"],"severity":"mild|moderate|severe",'
            '"message":"...","when":"morning|night|same routine"}]}'
        ),
        user_text=(
            "Check these shelf products for simultaneous-use ingredient conflicts:\n"
            + json.dumps(payload)
        ),
        max_output_tokens=1200,
    )

    out: list[IngredientConflict] = []
    for item in data.get("conflicts") or []:
        if not isinstance(item, dict):
            continue
        names = item.get("products") or []
        severity = item.get("severity") or "moderate"
        if severity not in {"mild", "moderate", "severe"}:
            severity = "moderate"
        message = item.get("message") or "These products may conflict when used together."
        when = item.get("when")
        if len(names) >= 2:
            out.append(
                IngredientConflict(
                    products=[str(n) for n in names[:4]],
                    severity=severity,
                    message=str(message),
                    when=str(when) if when else None,
                )
            )
    return out


def check_ingredient_conflicts(products: list[ShelfProduct]) -> ConflictResult:
    conflicts = _rule_based_conflicts(products)

    try:
        from app.services.mock_data import use_mock_ai

        if not use_mock_ai():
            ai_conflicts = _ai_conflict_check(products)
            # Prefer AI messages when they cover the same pair; keep unique pairs.
            by_pair = {tuple(sorted(c.products)): c for c in conflicts}
            for conflict in ai_conflicts:
                key = tuple(sorted(conflict.products))
                by_pair[key] = conflict
            conflicts = list(by_pair.values())
    except Exception:
        pass

    return ConflictResult(conflicts=conflicts, has_conflicts=len(conflicts) > 0)


def identify_product_from_image(image_bytes: bytes, content_type: str) -> ProductSearchResult:
    if use_mock_ai() or not has_gemini_api_key():
        return MOCK_PRODUCT.model_copy(deep=True)

    try:
        data = generate_json(
            system=(
                "Identify the skincare product from the packaging photo. "
                "Return ONLY JSON: "
                '{"name":"...","brand":"...","ingredients":["..."]}'
            ),
            user_text="What product is this?",
            images=[(image_bytes, content_type or "image/jpeg")],
            max_output_tokens=500,
        )
        return ProductSearchResult(
            name=data.get("name", "Unknown product"),
            brand=data.get("brand", "Unknown"),
            ingredients=data.get("ingredients", []),
        )
    except Exception:
        return MOCK_PRODUCT.model_copy(deep=True)


def save_shelf_product(user_id: str, product: ShelfProductCreate) -> ShelfProduct:
    supabase = get_supabase()
    if not supabase:
        raise RuntimeError("Supabase is not configured")

    row = {
        "user_id": user_id,
        "name": product.name,
        "brand": product.brand,
        "barcode": product.barcode,
        "ingredients": product.ingredients,
        "source": product.source,
        "image_url": product.image_url,
        "tracking_enabled": product.tracking_enabled,
        "trial_days": product.trial_days,
        "usage_time": product.usage_time,
        "times_per_week": product.times_per_week,
    }
    result = supabase.table("shelf_products").insert(row).execute()
    data = result.data[0]
    return ShelfProduct(**data)


def list_shelf_products(user_id: str) -> list[ShelfProduct]:
    supabase = get_supabase()
    if not supabase:
        return []

    result = (
        supabase.table("shelf_products")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [ShelfProduct(**row) for row in result.data]


def delete_shelf_product(user_id: str, product_id: str) -> None:
    supabase = get_supabase()
    if not supabase:
        raise RuntimeError("Supabase is not configured")

    supabase.table("shelf_products").delete().eq("id", product_id).eq(
        "user_id", user_id
    ).execute()
