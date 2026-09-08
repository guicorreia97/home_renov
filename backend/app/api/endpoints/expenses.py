from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import ExpenseServiceDep
from app.src.exceptions import EmptyUpdateError, ExpenseNotFoundError
from app.src.models.expense import Expense, ExpenseCreate, ExpenseUpdate

router = APIRouter(prefix="/expenses")


@router.get("", status_code=status.HTTP_200_OK)
async def list_expenses(service: ExpenseServiceDep) -> list[Expense]:
    return service.list()


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_expense(payload: ExpenseCreate, service: ExpenseServiceDep) -> Expense:
    return service.create(payload)


@router.get("/{expense_id}", status_code=status.HTTP_200_OK)
async def get_expense(expense_id: str, service: ExpenseServiceDep) -> Expense:
    try:
        return service.get(expense_id)
    except ExpenseNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.patch("/{expense_id}", status_code=status.HTTP_200_OK)
async def update_expense(
    expense_id: str, payload: ExpenseUpdate, service: ExpenseServiceDep
) -> Expense:
    try:
        return service.update(expense_id, payload)
    except EmptyUpdateError as error:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except ExpenseNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(expense_id: str, service: ExpenseServiceDep) -> None:
    try:
        service.delete(expense_id)
    except ExpenseNotFoundError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(error)) from error
