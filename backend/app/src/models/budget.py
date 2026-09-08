from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.src.models.expense import ExpenseCategory
from app.src.models.money import Money, SignedMoney


class BudgetUpdate(BaseModel):
    """Partial update of the renovation's financial targets."""

    model_config = ConfigDict(extra="forbid")

    target_sale_price: Money | None = None
    purchase_price: Money | None = None
    planned_budget: Money | None = None


class Budget(BaseModel):
    """The renovation's financial targets.

    Single-user, single-property: exactly one budget exists, and it is created
    empty on first read rather than by an explicit POST.
    """

    target_sale_price: Money | None = None
    purchase_price: Money | None = None
    planned_budget: Money | None = None
    updated_at: datetime


class CategoryTotal(BaseModel):
    """Committed spend for one category."""

    category: ExpenseCategory
    amount: Money


class BudgetSummary(BaseModel):
    """Targets and actuals side by side — the answer to "where do we stand?"."""

    currency: str

    target_sale_price: Money | None = None
    purchase_price: Money | None = None
    planned_budget: Money | None = None

    total_paid: Money
    total_committed: Money = Field(description="Paid plus invoiced-but-unpaid.")
    total_planned: Money = Field(description="Estimates not yet committed.")
    total_forecast: Money = Field(description="Committed plus planned.")

    remaining_budget: SignedMoney | None = Field(
        default=None, description="planned_budget minus total_forecast; None without a budget."
    )
    budget_used_percent: float | None = None
    over_budget: bool = False

    projected_profit: SignedMoney | None = Field(
        default=None,
        description="target_sale_price minus purchase_price minus total_forecast.",
    )

    expense_count: int
    by_category: list[CategoryTotal]
