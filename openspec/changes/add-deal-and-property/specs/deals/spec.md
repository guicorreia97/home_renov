# Delta: Deals and properties

**Change ID:** `add-deal-and-property`
**Affects:** `backend/app/src/models/`, `backend/app/src/repositories/`,
`backend/app/src/services/`, `backend/app/api/endpoints/`, `frontend/src/api/`

> Written against the post-`redesign-flip-desk-skin` app (PART 1). That change
> builds the shell this one gives destinations to, and the derived summary
> figures that become per-deal here.

---

## Purpose

What a deal and its property are, how deals are listed and one is selected, and
which records belong to a deal rather than to the application as a whole. This
is the spine every later PART attaches to: works phases, line items, acquisition
costs, financing and contractors all hang off a deal.

## ADDED Requirements

### Requirement: A deal is the unit of work the application manages

The system SHALL model a **deal** as one property being evaluated, acquired,
renovated and sold. A deal SHALL own the records that describe that work, so
that no expense and no budget exists outside a deal.

A deal SHALL carry the property it concerns, a status, an acquisition date, a
target exit date, and a works window expressed as a start date and a planned
duration in whole months. Every date and the works window MAY be unset while a
deal is still being evaluated.

The money figures describing a deal — purchase price, planned budget and target
sale price — SHALL remain on that deal's budget and SHALL NOT be duplicated onto
the deal, so that exactly one record is the source of truth for each figure.

#### Scenario: Creating a deal
- GIVEN no deal exists for a property
- WHEN a deal is created with that property and no dates
- THEN it is stored with the default status and an empty budget
- AND its budget figures read as unset rather than as zero

#### Scenario: Money is not duplicated onto the deal
- GIVEN a deal with a purchase price recorded
- WHEN the deal and its budget are read
- THEN the purchase price appears on the budget only, and the deal carries no
  second copy of it

#### Scenario: An evaluation-stage deal
- GIVEN a deal being evaluated, with no acquisition date and no works window
- WHEN it is read
- THEN those fields are absent rather than defaulted to a date

### Requirement: A property describes what is being bought

A deal SHALL reference exactly one property, and the property SHALL carry the
address, the locality, the floor area in square metres, the typology and the
year the building was built.

The address and locality SHALL be treated as user content: they are never
written to a log line, in keeping with the project's logging rule. Identifiers
and counts may be logged; the address may not.

#### Scenario: A property is recorded
- WHEN a property is created with an address, locality, area, typology and year
- THEN all five are stored and returned with the deal

#### Scenario: The address never reaches the logs
- GIVEN a deal is created, read, updated or deleted
- WHEN the operation is logged
- THEN the log line carries the deal identifier and no address, locality or
  other property detail

### Requirement: A deal reports where it stands

A deal SHALL carry a status drawn from a closed set covering evaluation, offer,
acquisition, works, sale and closure. The status SHALL be set explicitly rather
than inferred from which dates happen to be filled in.

Where a deal has a works window and is in works, the system SHALL be able to
report the current month of that window and its total planned duration, so the
interface can state progress without computing it from raw dates in the client.

#### Scenario: Progress through the works window
- GIVEN a deal whose works window began four months ago with a planned duration
  of eight months
- WHEN the deal is read
- THEN it reports the current month as five and the duration as eight

#### Scenario: No works window
- GIVEN a deal with no works window set
- WHEN the deal is read
- THEN no month-of-window figure is reported, rather than a zero or a first month

#### Scenario: The window has been exceeded
- GIVEN a deal whose planned works window has fully elapsed
- WHEN the deal is read
- THEN the reported current month exceeds the planned duration rather than being
  capped at it, so an overrun is visible

### Requirement: Deals are listed and exactly one is selected

The system SHALL expose the deals it holds as a list, each carrying enough to
identify it without a second request: the property address, the status, and the
budget position already computed for that deal.

The client SHALL always operate against exactly one selected deal. Selecting a
deal SHALL replace what is displayed rather than merge it with the previous
deal's records.

#### Scenario: Listing deals
- GIVEN three deals exist
- WHEN the list is requested
- THEN all three are returned, each with its address, status and budget position

#### Scenario: Switching the selected deal
- GIVEN deal A is selected and its expenses are displayed
- WHEN deal B is selected
- THEN the displayed expenses, budget and summary are those of deal B
- AND no record belonging to deal A remains on screen

#### Scenario: No deals exist
- GIVEN a fresh install with no deals
- WHEN the list is requested
- THEN an empty list is returned and the interface offers to create the first
  deal, rather than presenting an empty expense table

### Requirement: Every expense and budget belongs to exactly one deal

Expenses and budgets SHALL be addressed through the deal that owns them. A
request that names a deal SHALL only ever read or write records belonging to
that deal.

A budget SHALL exist once per deal. It SHALL keep its current behaviour of being
created empty on first read rather than by an explicit creation request, but
that behaviour now applies per deal instead of once for the application.

#### Scenario: Expenses are isolated between deals
- GIVEN deal A has four expenses and deal B has one
- WHEN deal A's expenses are listed
- THEN exactly those four are returned

#### Scenario: A budget is created empty on first read
- GIVEN a newly created deal whose budget has never been read
- WHEN its budget is requested
- THEN an empty budget is returned for that deal and no other deal's budget is
  affected

#### Scenario: A summary covers one deal only
- GIVEN expenses on two deals
- WHEN the summary for one deal is requested
- THEN every total, remaining figure and per-category total covers that deal's
  expenses alone

### Requirement: A request naming an unknown deal is refused

The system SHALL reject a request addressing a deal that does not exist with a
not-found response, and SHALL NOT fall back to a default deal, create the deal
implicitly, or return another deal's records.

#### Scenario: An unknown deal identifier
- WHEN expenses are requested for a deal identifier that does not exist
- THEN the response is 404 and no records are returned

#### Scenario: A record from another deal
- GIVEN an expense belonging to deal B
- WHEN it is requested through deal A
- THEN the response is 404 rather than the expense

### Requirement: Deleting a deal takes its records with it

Deleting a deal SHALL delete the expenses and budget belonging to it, leaving no
record addressable through a deal that no longer exists.

#### Scenario: Deleting a deal with records
- GIVEN a deal with expenses and a budget
- WHEN the deal is deleted
- THEN the deal, its expenses and its budget are all gone
- AND other deals' records are untouched

### Requirement: Existing data is migrated into a default deal, not discarded

**BREAKING.** The on-disk format changes: expenses and budgets become keyed by
deal. Data already stored under the single-deal format SHALL be migrated into
one deal created for the purpose, and SHALL NOT be orphaned or deleted.

The migration SHALL be idempotent — running it against already-migrated data
SHALL leave that data unchanged — and SHALL preserve every expense identifier, so
that a record's identity survives the move.

#### Scenario: Existing expenses survive the migration
- GIVEN a store holding expenses and a budget in the single-deal format
- WHEN the application starts after this change
- THEN a default deal exists, and every expense and the budget belong to it with
  their identifiers and amounts unchanged

#### Scenario: Running the migration twice
- GIVEN a store that has already been migrated
- WHEN the migration runs again
- THEN the data is unchanged and no second default deal is created

#### Scenario: A fresh install
- GIVEN a store with no data at all
- WHEN the application starts
- THEN no default deal is invented, and the interface offers to create the first
  deal
