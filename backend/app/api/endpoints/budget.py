from fastapi import APIRouter, status

from app.api.dependencies import BudgetServiceDep
from app.src.models.budget import Budget, BudgetSummary, BudgetUpdate

router = APIRouter(prefix="/budget")


@router.get("", status_code=status.HTTP_200_OK)
async def get_budget(service: BudgetServiceDep) -> Budget:
    return service.get()


@router.put("", status_code=status.HTTP_200_OK)
async def update_budget(payload: BudgetUpdate, service: BudgetServiceDep) -> Budget:
    return service.update(payload)


@router.get("/summary", status_code=status.HTTP_200_OK)
async def get_budget_summary(service: BudgetServiceDep) -> BudgetSummary:
    return service.summary()
