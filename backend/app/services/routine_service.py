import json
import os
from datetime import datetime, timezone

from openai import OpenAI

from app.models.schemas import Period, RoutineStep, RoutineStatus, ShelfProduct, UserRoutine
from app.services.product_service import list_shelf_products
from app.services.dashboard_service import get_latest_scan, list_scans
from app.services.supabase_service import get_supabase

ROUTINE_ORDER = ["cleanser", "toner", "serum", "moisturizer", "spf", "other"]


def _guess_category(name: str, ingredients: list[str]) -> str:
    text = f"{name} {' '.join(ingredients)}".lower()
    if "spf" in text or "sunscreen" in text:
        return "spf"
    if "cleanser" in text or "cleansing" in text:
        return "cleanser"
    if "toner" in text:
        return "toner"
    if "serum" in text or "niacinamide" in text or "retinol" in text:
        return "serum"
    if "moistur" in text or "cream" in text:
        return "moisturizer"
    return "other"


def _routine_status(period: Period, steps: list[RoutineStep]) -> RoutineStatus:
    if not steps:
        return "INCOMPLETE"
    if period == "AM":
        has_spf = any(s.category == "spf" for s in steps)
        if not has_spf:
            return "INCOMPLETE"
    return "READY"


def _fallback_build(period: Period, products: list[ShelfProduct]) -> list[RoutineStep]:
    categorized: list[tuple[int, ShelfProduct, str]] = []
    for product in products:
        cat = _guess_category(product.name, product.ingredients)
        if period == "AM" and cat == "spf":
            order_idx = ROUTINE_ORDER.index("spf")
        elif period == "PM" and cat == "spf":
            continue
        else:
            order_idx = ROUTINE_ORDER.index(cat) if cat in ROUTINE_ORDER else 99
        categorized.append((order_idx, product, cat))

    categorized.sort(key=lambda x: x[0])
    steps: list[RoutineStep] = []
    for i, (_, product, cat) in enumerate(categorized[:6]):
        steps.append(
            RoutineStep(
                order=i + 1,
                product_id=product.id,
                product_name=product.name,
                brand=product.brand,
                category=cat,
                reason=f"Apply as your {cat} step.",
            )
        )
    return steps


def build_routine(user_id: str, period: Period) -> UserRoutine:
    products = list_shelf_products(user_id)
    if not products:
        return UserRoutine(period=period, steps=[], status="INCOMPLETE")

    latest = get_latest_scan(user_id)
    scan_context = ""
    if latest:
        conditions = ", ".join(c.name for c in latest.conditions)
        scan_context = f"Skin score: {latest.overall_score}. Conditions: {conditions}. Summary: {latest.summary}"

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        steps = _fallback_build(period, products)
        status = _routine_status(period, steps)
        return UserRoutine(period=period, steps=steps, status=status)

    shelf_json = [
        {
            "id": p.id,
            "name": p.name,
            "brand": p.brand,
            "ingredients": p.ingredients,
            "category": _guess_category(p.name, p.ingredients),
        }
        for p in products
    ]

    prompt = f"""Build a {period} skincare routine using ONLY products from the user's shelf.
{scan_context}

Shelf products: {json.dumps(shelf_json)}

Rules:
- Use only product IDs from the shelf list
- Order: cleanser → toner → serum → moisturizer → SPF (SPF only for AM, last step)
- PM routine: no SPF unless user only has SPF (skip it)
- Avoid layering conflicts (no retinol + AHA/BHA same routine)
- Return JSON: {{"steps": [{{"order": 1, "product_id": "...", "product_name": "...", "brand": "...", "category": "...", "reason": "..."}}]}}
- Include 2-5 steps max"""

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a skincare routine expert. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        max_tokens=1000,
    )

    raw = response.choices[0].message.content or "{}"
    data = json.loads(raw)
    product_map = {p.id: p for p in products}

    steps: list[RoutineStep] = []
    for item in data.get("steps", []):
        pid = item.get("product_id")
        if pid not in product_map:
            continue
        steps.append(
            RoutineStep(
                order=item.get("order", len(steps) + 1),
                product_id=pid,
                product_name=item.get("product_name", product_map[pid].name),
                brand=item.get("brand", product_map[pid].brand),
                category=item.get("category", _guess_category(product_map[pid].name, product_map[pid].ingredients)),
                reason=item.get("reason", "Recommended for your skin."),
            )
        )

    if not steps:
        steps = _fallback_build(period, products)

    steps.sort(key=lambda s: s.order)
    status = _routine_status(period, steps)
    return UserRoutine(period=period, steps=steps, status=status)


def get_routine(user_id: str, period: Period) -> UserRoutine | None:
    supabase = get_supabase()
    if not supabase:
        return None

    result = (
        supabase.table("user_routines")
        .select("*")
        .eq("user_id", user_id)
        .eq("period", period)
        .maybe_single()
        .execute()
    )

    if not result.data:
        return None

    row = result.data
    steps = [RoutineStep(**s) for s in row.get("steps", [])]
    return UserRoutine(
        period=row["period"],
        steps=steps,
        status=row["status"],
        updated_at=row.get("updated_at"),
    )


def save_routine(user_id: str, period: Period, steps: list[RoutineStep]) -> UserRoutine:
    supabase = get_supabase()
    if not supabase:
        raise RuntimeError("Supabase is not configured")

    status = _routine_status(period, steps)
    payload = {
        "user_id": user_id,
        "period": period,
        "steps": [s.model_dump() for s in steps],
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    supabase.table("user_routines").upsert(payload, on_conflict="user_id,period").execute()
    return UserRoutine(period=period, steps=steps, status=status, updated_at=datetime.now(timezone.utc))
