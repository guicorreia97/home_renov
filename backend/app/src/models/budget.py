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
    """Spend for one category, split by status.

    `amount` keeps its original meaning — committed spend, paid plus pending,
    excluding planned — so the breakdown arriving beside it changes nothing for
    an existing consumer. A category holding only planned spend reports `0.00`
    there rather than being left out, so the per-category figures reconcile with
    the grand totals.
    """

    category: ExpenseCategory
    amount: Money = Field(description="Committed spend: paid plus pending, excluding planned.")
    planned: Money = Field(description="Estimates not yet committed.")
    pending: Money = Field(description="Invoiced but not yet paid.")
    paid: Money
    share: float = Field(
        description="Percentage of all committed spend; 0 when nothing is committed anywhere."
    )


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
    margin_percent: float | None = Field(
        default=None,
        description="projected_profit over target_sale_price; None when either is unset.",
    )
    return_on_cost_percent: float | None = Field(
        default=None,
        description=(
            "projected_profit over purchase_price plus total_forecast; "
            "None without a profit or against a zero cost base."
        ),
    )
    break_even_sale_price: Money | None = Field(
        default=None,
        description=(
            "purchase_price plus total_forecast — the sale price at which profit "
            "is zero. None without a purchase price; it does not need a target."
        ),
    )

    expense_count: int
    by_category: list[CategoryTotal]
