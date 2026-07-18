from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user_id
from app.models.schemas import DashboardData, ScanDetail, ScanHistoryItem
from app.services.dashboard_service import get_dashboard, get_scan_for_date, list_scan_details, list_scans

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


@router.get("/history/detail", response_model=list[ScanDetail])
def scan_history_detail(
    user_id: str = Depends(get_current_user_id),
    limit: int = Query(default=30, le=50),
) -> list[ScanDetail]:
    return list_scan_details(user_id, limit)


@router.get("/by-date", response_model=ScanDetail)
def scan_by_date(
    date: date,
    user_id: str = Depends(get_current_user_id),
) -> ScanDetail:
    detail = get_scan_for_date(user_id, date)
    if not detail:
        raise HTTPException(status_code=404, detail="No scan found for this date")
    return detail
