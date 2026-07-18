import os

from app.models.schemas import ProductSearchResult, ScanMetric, ScanResult


def use_mock_ai() -> bool:
    flag = os.getenv("USE_MOCK_AI", "").strip().lower()
    return flag in {"1", "true", "yes", "on"}


MOCK_SCAN_RESULT = ScanResult(
    overall_score=65,
    summary="Your scan shows several areas to focus on — dehydration, breakouts, and uneven tone are the main priorities.",
    conditions=[
        {
            "name": "Dehydration",
            "severity": "moderate",
            "explanation": "Fine lines around the eye area and slight dullness suggest your skin barrier could use more hydration. This is common and very treatable with the right moisturizer.",
            "recommendations": [
                {
                    "name": "Hydrating Facial Moisturizer",
                    "brand": "CeraVe",
                    "reason": "It may help with restoring your moisture barrier thanks to ceramides and hyaluronic acid.",
                    "affiliate_url": "https://skins.app/shop/cerave-moisturizer",
                    "image_url": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=240&h=240&fit=crop",
                }
            ],
        },
        {
            "name": "Excess sebum production",
            "severity": "mild",
            "explanation": "Your T-zone shows mild shine and enlarged pores, suggesting slightly elevated oil production. A gentle cleanser and lightweight moisturizer can help balance things.",
            "recommendations": [
                {
                    "name": "Oil Control Moisturizer SPF 30",
                    "brand": "Cetaphil",
                    "reason": "It may help with mattifying shine while keeping skin hydrated and protected.",
                    "affiliate_url": "https://skins.app/shop/cetaphil-oil-control",
                    "image_url": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=240&h=240&fit=crop",
                }
            ],
        },
        {
            "name": "Active breakouts",
            "severity": "moderate",
            "explanation": "Several inflamed spots are visible on the cheeks and jawline. Consistent cleansing and targeted treatment can reduce active blemishes within a few weeks.",
            "recommendations": [
                {
                    "name": "Adapalene Gel 0.1%",
                    "brand": "Differin",
                    "reason": "It may help with preventing clogged pores and clearing persistent acne over time.",
                    "affiliate_url": "https://skins.app/shop/differin-gel",
                    "image_url": "https://images.unsplash.com/photo-1608248543801-ba977f7cb8fd?w=240&h=240&fit=crop",
                }
            ],
        },
        {
            "name": "Skin sensitivity and redness",
            "severity": "mild",
            "explanation": "Mild redness across the cheeks suggests your barrier may be slightly compromised. Gentle, fragrance-free products can help calm irritation.",
            "recommendations": [
                {
                    "name": "Toleriane Double Repair Moisturizer",
                    "brand": "La Roche-Posay",
                    "reason": "It may help with soothing redness and reinforcing a sensitive skin barrier.",
                    "affiliate_url": "https://skins.app/shop/lrp-toleriane",
                    "image_url": "https://images.unsplash.com/photo-1571875257727-256c39da42af?w=240&h=240&fit=crop",
                }
            ],
        },
        {
            "name": "Uneven skin tone",
            "severity": "mild",
            "explanation": "Subtle dark spots and redness suggest mild hyperpigmentation. Consistent SPF and a brightening serum can help even things out over 4-8 weeks.",
            "recommendations": [
                {
                    "name": "Vitamin C Serum",
                    "brand": "La Roche-Posay",
                    "reason": "It may help with brightening uneven tone and protecting against further dark spots.",
                    "affiliate_url": "https://skins.app/shop/lrp-vitamin-c",
                    "image_url": "https://images.unsplash.com/photo-1620916560425-325fe040e167?w=240&h=240&fit=crop",
                }
            ],
        },
        {
            "name": "Rough skin texture",
            "severity": "mild",
            "explanation": "Slight bumpiness and visible pores on the cheeks suggest uneven texture. Gentle chemical exfoliation can smooth the surface over time.",
            "recommendations": [
                {
                    "name": "Daily Microfoliant",
                    "brand": "Dermalogica",
                    "reason": "It may help with polishing rough patches and refining the look of pores.",
                    "affiliate_url": "https://skins.app/shop/dermalogica-microfoliant",
                    "image_url": "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=240&h=240&fit=crop",
                }
            ],
        },
    ],
    metrics=[
        ScanMetric(
            id="dryness",
            label="Dryness",
            score=48,
            regions=[{"x": 0.5, "y": 0.2, "r": 0.1}],
        ),
        ScanMetric(
            id="oiliness",
            label="Oiliness",
            score=62,
            regions=[{"x": 0.5, "y": 0.4, "r": 0.09}],
        ),
        ScanMetric(
            id="acne",
            label="Acne",
            score=42,
            regions=[
                {"x": 0.34, "y": 0.72, "r": 0.08},
                {"x": 0.66, "y": 0.7, "r": 0.06},
            ],
        ),
        ScanMetric(
            id="redness",
            label="Redness",
            score=58,
            regions=[
                {"x": 0.72, "y": 0.63, "r": 0.09},
                {"x": 0.26, "y": 0.6, "r": 0.07},
            ],
        ),
        ScanMetric(
            id="fine_lines",
            label="Fine lines",
            score=55,
            regions=[{"x": 0.5, "y": 0.28, "r": 0.08}],
        ),
        ScanMetric(
            id="texture",
            label="Texture",
            score=52,
            regions=[{"x": 0.58, "y": 0.55, "r": 0.07}],
        ),
    ],
)

MOCK_PRODUCT = ProductSearchResult(
    name="Hydrating Facial Cleanser",
    brand="CeraVe",
    ingredients=["aqua", "glycerin", "ceramide np", "hyaluronic acid", "niacinamide"],
)
