from datetime import datetime
from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field

Severity = Literal["mild", "moderate", "severe"]


class ProductRecommendation(BaseModel):
    name: str
    brand: str
    reason: str
    affiliate_url: str
    image_url: str | None = None


class SkinCondition(BaseModel):
    name: str
    severity: Severity
    explanation: str
    recommendations: list[ProductRecommendation] = Field(default_factory=list)


class MetricRegion(BaseModel):
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    r: float = Field(ge=0.02, le=0.5)


class ScanMetric(BaseModel):
    id: str
    label: str
    score: int = Field(ge=0, le=100)
    regions: list[MetricRegion] = Field(default_factory=list)


class ScanImageUrls(BaseModel):
    front: str | None = None
    left: str | None = None
    right: str | None = None


class ScanResult(BaseModel):
    scan_id: str = Field(default_factory=lambda: str(uuid4()))
    overall_score: int = Field(ge=0, le=100)
    summary: str
    conditions: list[SkinCondition]
    metrics: list[ScanMetric] = Field(default_factory=list)
    scanned_at: datetime = Field(default_factory=datetime.utcnow)
    image_urls: ScanImageUrls | None = None


class ScanQuota(BaseModel):
    plan: str
    limit: int
    used: int
    remaining: int


class ProductSearchResult(BaseModel):
    name: str
    brand: str
    barcode: str | None = None
    ingredients: list[str] = Field(default_factory=list)
    image_url: str | None = None


ProductSource = Literal["photo", "barcode", "manual"]


UsageTime = Literal["morning", "night", "both"]


class ShelfProductCreate(BaseModel):
    name: str
    brand: str | None = None
    barcode: str | None = None
    ingredients: list[str] = Field(default_factory=list)
    source: ProductSource
    image_url: str | None = None
    tracking_enabled: bool = True
    trial_days: int | None = None
    usage_time: UsageTime | None = None
    times_per_week: int | None = None


class ShelfProduct(ShelfProductCreate):
    id: str
    user_id: str
    created_at: datetime


class IngredientConflict(BaseModel):
    products: list[str]
    severity: Severity
    message: str
    when: str | None = None


class ConflictResult(BaseModel):
    conflicts: list[IngredientConflict]
    has_conflicts: bool


class TrackingInsight(BaseModel):
    product_id: str
    status: Literal["working", "on_track", "check_this"]
    status_label: str
    summary: str
    advice: str | None = None


class TrackingInsightsResult(BaseModel):
    insights: list[TrackingInsight]


Period = Literal["AM", "PM"]
RoutineStatus = Literal["READY", "INCOMPLETE"]


class RoutineStep(BaseModel):
    order: int
    product_id: str
    product_name: str
    brand: str | None = None
    category: str
    reason: str


class UserRoutine(BaseModel):
    period: Period
    steps: list[RoutineStep]
    status: RoutineStatus
    updated_at: datetime | None = None


class RoutineSaveRequest(BaseModel):
    period: Period
    steps: list[RoutineStep]


class ScanHistoryItem(BaseModel):
    scan_id: str
    overall_score: int
    summary: str
    conditions: list[SkinCondition]
    scanned_at: datetime


class ScanDetail(ScanHistoryItem):
    image_urls: ScanImageUrls = Field(default_factory=ScanImageUrls)


class DashboardMetric(BaseModel):
    id: str
    value: str
    label: str
    progress: float
    severity: Severity | None = None


class DashboardData(BaseModel):
    skin_score: int
    weekly_change: int
    streak: int
    metrics: list[DashboardMetric]
    latest_scan_at: datetime | None = None
    latest_scan_summary: str | None = None
    latest_scan_image_url: str | None = None
    latest_scan_image_urls: ScanImageUrls = Field(default_factory=ScanImageUrls)
    latest_scan_conditions: list[SkinCondition] = Field(default_factory=list)


class ProgressCheckin(BaseModel):
    id: str
    overall_score: int
    checkin_at: datetime


class ProgressWeekPoint(BaseModel):
    label: str
    score: int


class ProgressSummary(BaseModel):
    current_score: int
    starting_score: int
    total_change: int
    weeks_active: int
    streak: int
    chart_points: list[ProgressWeekPoint]
    checkins: list[ProgressCheckin]
