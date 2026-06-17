from fastapi import APIRouter, Depends, Query

from app.auth import get_current_user_id
from app.models.schemas import DashboardData, ScanHistoryItem
from app.services.dashboard_service import get_dashboard, list_scans

router = APIRouter()


@router.get("/dashboard", response_model=DashboardData)
def dashboard(user_id: str = Depends(get_current_user_id)) -> DashboardData:
    return get_dashboard(user_id)


@router.get("/history", response_model=list[ScanHistoryItem])
def scan_history(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(default=20, le=50),
) -> list[ScanHistoryItem]:
    return list_scans(user_id, limit)
