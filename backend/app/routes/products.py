from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth import get_current_user_id
from app.models.schemas import (
    ConflictResult,
    ProductSearchResult,
    ShelfProduct,
    ShelfProductCreate,
    TrackingInsightsResult,
)
from app.services.product_service import (
    check_ingredient_conflicts,
    delete_shelf_product,
    identify_product_from_image,
    list_shelf_products,
    lookup_barcode,
    save_shelf_product,
    search_products,
)
from app.services.tracking_service import analyze_shelf_tracking

router = APIRouter()


@router.get("/search", response_model=list[ProductSearchResult])
async def search(q: str, limit: int = 10) -> list[ProductSearchResult]:
    if len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
    return await search_products(q.strip(), limit)


@router.get("/barcode/{barcode}", response_model=ProductSearchResult)
async def barcode_lookup(barcode: str) -> ProductSearchResult:
    product = await lookup_barcode(barcode)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/identify", response_model=ProductSearchResult)
async def identify_product(image: UploadFile = File(...)) -> ProductSearchResult:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file")

    return identify_product_from_image(image_bytes, image.content_type)


@router.get("/shelf", response_model=list[ShelfProduct])
def get_shelf(user_id: str = Depends(get_current_user_id)) -> list[ShelfProduct]:
    return list_shelf_products(user_id)


@router.post("/shelf", response_model=ShelfProduct)
def add_to_shelf(
    product: ShelfProductCreate,
    user_id: str = Depends(get_current_user_id),
) -> ShelfProduct:
    try:
        return save_shelf_product(user_id, product)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/shelf/{product_id}")
def remove_from_shelf(
    product_id: str,
    user_id: str = Depends(get_current_user_id),
) -> dict[str, bool]:
    try:
        delete_shelf_product(user_id, product_id)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/conflicts", response_model=ConflictResult)
def get_conflicts(user_id: str = Depends(get_current_user_id)) -> ConflictResult:
    products = list_shelf_products(user_id)
    return check_ingredient_conflicts(products)


@router.get("/tracking/insights", response_model=TrackingInsightsResult)
def tracking_insights(user_id: str = Depends(get_current_user_id)) -> TrackingInsightsResult:
    try:
        return analyze_shelf_tracking(user_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
