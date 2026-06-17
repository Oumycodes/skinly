from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user_id
from app.models.schemas import Period, RoutineSaveRequest, UserRoutine
from app.services.routine_service import build_routine, get_routine, save_routine

router = APIRouter()


@router.get("", response_model=UserRoutine)
def fetch_routine(
    period: Period,
    user_id: str = Depends(get_current_user_id),
) -> UserRoutine:
    routine = get_routine(user_id, period)
    if not routine:
        return UserRoutine(period=period, steps=[], status="INCOMPLETE")
    return routine


@router.post("/build", response_model=UserRoutine)
def auto_build_routine(
    period: Period,
    user_id: str = Depends(get_current_user_id),
) -> UserRoutine:
    try:
        return build_routine(user_id, period)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("", response_model=UserRoutine)
def save_user_routine(
    body: RoutineSaveRequest,
    user_id: str = Depends(get_current_user_id),
) -> UserRoutine:
    try:
        return save_routine(user_id, body.period, body.steps)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
