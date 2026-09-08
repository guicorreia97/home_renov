/**
 * Money as the API actually sends it.
 *
 * The backend types amounts as Python `Decimal`, and Pydantic serialises those
 * to JSON *strings* — `"250.50"`, never `250.5`. That is deliberate: a decimal
 * amount cannot survive a round trip through an IEEE-754 double intact, and
 * 0.1 + 0.2 === 0.30000000000000004 is not an acceptable answer to "what did
 * the tiles cost".
 *
 * So money stays a string end to end. Typing it as `string` rather than `number`
 * makes the dangerous operation unwriteable: `total + expense.amount` is a type
 * error instead of a silent rounding bug that only shows up in the third decimal
 * place after a few dozen expenses.
 *
 * Formatting for display is the only thing the client does with these. Summing,
 * comparing and forecasting all happen server-side — that is why
 * `GET /budget/summary` exists.
 */
export type Money = string

/** An amount that may be negative — a remainder, a variance, a profit. */
export type SignedMoney = string

/** ISO-8601 date, no time component: `2026-09-01`. */
export type IsoDate = string

/** ISO-8601 timestamp, UTC: `2026-09-08T19:42:39.279923Z`. */
export type IsoDateTime = string
