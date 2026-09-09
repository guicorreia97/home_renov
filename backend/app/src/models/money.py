from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated

from pydantic import AfterValidator, Field

_CENTS = Decimal("0.01")


def quantize_money(value: Decimal) -> Decimal:
    """Round a monetary amount to two decimal places, half-up."""
    return value.quantize(_CENTS, rounding=ROUND_HALF_UP)


Money = Annotated[Decimal, Field(ge=0, max_digits=12), AfterValidator(quantize_money)]
"""A non-negative amount: a cost, a price, a total."""

SignedMoney = Annotated[Decimal, Field(max_digits=12), AfterValidator(quantize_money)]
"""An amount that may be negative: a remainder, a profit, a variance."""

PositiveMoney = Annotated[Decimal, Field(gt=0, max_digits=12), AfterValidator(quantize_money)]
