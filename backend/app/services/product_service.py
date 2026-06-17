import json
import os
from typing import Any

import httpx
from openai import OpenAI

from app.models.schemas import (
    ConflictResult,
    IngredientConflict,
    ProductSearchResult,
    ShelfProduct,
    ShelfProductCreate,
)
from app.services.supabase_service import get_supabase

OBF_BASE = "https://world.openbeautyfacts.org"

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
        "severity": "high",
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


def _map_obf_product(data: dict[str, Any]) -> ProductSearchResult | None:
    product = data.get("product")
    if not product:
        return None

    name = product.get("product_name") or product.get("generic_name")
    if not name:
        return None

    return ProductSearchResult(
        name=name,
        brand=product.get("brands", "").split(",")[0].strip() or "Unknown",
        barcode=product.get("code") or product.get("_id"),
        ingredients=_parse_obf_ingredients(product),
        image_url=product.get("image_front_url"),
    )


async def search_products(query: str, limit: int = 10) -> list[ProductSearchResult]:
    params = {
        "search_terms": query,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": limit,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(f"{OBF_BASE}/cgi/search.pl", params=params)
        response.raise_for_status()
        payload = response.json()

    results: list[ProductSearchResult] = []
    for item in payload.get("products", []):
        mapped = _map_obf_product({"product": item})
        if mapped:
            results.append(mapped)
    return results


async def lookup_barcode(barcode: str) -> ProductSearchResult | None:
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
    return False


def check_ingredient_conflicts(products: list[ShelfProduct]) -> ConflictResult:
    conflicts: list[IngredientConflict] = []

    for rule in CONFLICT_RULES:
        group_a = [p for p in products if _product_has_ingredient(p, rule["group_a"])]
        group_b = [p for p in products if _product_has_ingredient(p, rule["group_b"])]

        if not group_a or not group_b:
            continue

        products_involved = list(dict.fromkeys([p.name for p in group_a + group_b]))
        conflicts.append(
            IngredientConflict(
                products=products_involved,
                severity=rule["severity"],
                message=rule["message"],
            )
        )

    return ConflictResult(conflicts=conflicts, has_conflicts=len(conflicts) > 0)


def identify_product_from_image(image_bytes: bytes, content_type: str) -> ProductSearchResult:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return ProductSearchResult(
            name="Hydrating Cleanser",
            brand="CeraVe",
            ingredients=["aqua", "glycerin", "ceramide np", "hyaluronic acid"],
        )

    client = OpenAI(api_key=api_key)
    encoded = __import__("base64").b64encode(image_bytes).decode("utf-8")
    data_url = f"data:{content_type};base64,{encoded}"

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                "content": (
                    "Identify the skincare product from the packaging photo. "
                    "Return ONLY JSON: "
                    '{"name":"...","brand":"...","ingredients":["..."]}'
                ),
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "What product is this?"},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ],
        response_format={"type": "json_object"},
        max_tokens=500,
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    return ProductSearchResult(
        name=data.get("name", "Unknown product"),
        brand=data.get("brand", "Unknown"),
        ingredients=data.get("ingredients", []),
    )


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
