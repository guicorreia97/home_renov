from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from app.src.models.money import PositiveMoney


class ExpenseCategory(StrEnum):
    """What the money was spent on."""

    MATERIALS = "materials"
    LABOUR = "labour"
    APPLIANCES = "appliances"
    FURNITURE_AND_FIXTURES = "furniture_and_fixtures"
    TOOLS_AND_EQUIPMENT = "tools_and_equipment"
    PERMITS_AND_FEES = "permits_and_fees"
    DESIGN_AND_PROFESSIONAL = "design_and_professional"
    TRANSPORT_AND_DELIVERY = "transport_and_delivery"
    WASTE_DISPOSAL = "waste_disposal"
    UTILITIES = "utilities"
    OTHER = "other"


class PaymentMethod(StrEnum):
    """How the expense was settled."""

    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    DEBIT_CARD = "debit_card"
    CREDIT_CARD = "credit_card"
    DIRECT_DEBIT = "direct_debit"
    FINANCING = "financing"
    OTHER = "other"


class ExpenseStatus(StrEnum):
    """Where the expense sits in the cash-flow cycle.

    PLANNED money is an estimate, PENDING is owed but unpaid, PAID has left the
    account. Committed spend is PENDING + PAID.
    """

    PLANNED = "planned"
    PENDING = "pending"
    PAID = "paid"


class ExpenseCreate(BaseModel):
    """Client-supplied fields for a new expense."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    description: str = Field(min_length=1, max_length=200)
    amount: PositiveMoney
    category: ExpenseCategory
    payment_method: PaymentMethod
    payee: str = Field(min_length=1, max_length=120)
    incurred_on: date
    status: ExpenseStatus = ExpenseStatus.PAID
    room: str | None = Field(default=None, max_length=80)
    invoice_reference: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=1000)


class ExpenseUpdate(BaseModel):
    """Partial update. Every field is optional; unset fields are left alone."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    description: str | None = Field(default=None, min_length=1, max_length=200)
    amount: PositiveMoney | None = None
    category: ExpenseCategory | None = None
    payment_method: PaymentMethod | None = None
    payee: str | None = Field(default=None, min_length=1, max_length=120)
    incurred_on: date | None = None
    status: ExpenseStatus | None = None
    room: str | None = Field(default=None, max_length=80)
    invoice_reference: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=1000)


class Expense(ExpenseCreate):
    """A stored expense, as returned by the API."""

    id: str
    created_at: datetime
    updated_at: datetime
