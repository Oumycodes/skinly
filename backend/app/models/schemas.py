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


class SkinCondition(BaseModel):
    name: str
    severity: Severity
    explanation: str
    recommendations: list[ProductRecommendation] = Field(default_factory=list)


class ScanResult(BaseModel):
    scan_id: str = Field(default_factory=lambda: str(uuid4()))
    overall_score: int = Field(ge=0, le=100)
    summary: str
    conditions: list[SkinCondition]
    scanned_at: datetime = Field(default_factory=datetime.utcnow)


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


class ShelfProductCreate(BaseModel):
    name: str
    brand: str | None = None
    barcode: str | None = None
    ingredients: list[str] = Field(default_factory=list)
    source: ProductSource
    image_url: str | None = None


class ShelfProduct(ShelfProductCreate):
    id: str
    user_id: str
    created_at: datetime


class IngredientConflict(BaseModel):
    products: list[str]
    severity: Severity
    message: str


class ConflictResult(BaseModel):
    conflicts: list[IngredientConflict]
    has_conflicts: bool


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
