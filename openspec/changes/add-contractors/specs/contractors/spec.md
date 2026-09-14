# Delta: Contractors

**Change ID:** `add-contractors`
**Affects:** `backend/app/src/models/`, `backend/app/src/repositories/`,
`backend/app/src/services/`, `backend/app/api/endpoints/`, `frontend/src/api/`

> Written against the post-`add-deal-and-property` app (PART 2), which makes
> `deal_id` the spine every expense hangs off and moves storage to a directory
> per deal. This delta's migration runs **after** PART 2's, and assumes PART 1
> has archived, since its per-status `CategoryTotal` breakdown is the shape the
> contractor rollup here mirrors.

---

## Purpose

What a contractor is, how an expense attributes spend to exactly one of them,
how the free-text payees recorded before this change become real records, and
what a contractor's spend rollup means. A contractor outlives any single deal:
the same electrician is paid on three flips, and the point of the entity is that
this is one party, not three strings.

## ADDED Requirements

### Requirement: A contractor is a party the renovation pays

The system SHALL model a **contractor** as one party money is paid to: a name, a
trade, contact details, and free-text notes. The name SHALL be required and
everything else optional, so a contractor can be recorded the moment a name is
known.

A contractor SHALL carry a kind distinguishing a party awarded works from a
party goods are simply bought from. The kind SHALL be explicit rather than
inferred from what has been paid, because the same party can be both.

Contractors SHALL belong to the application rather than to a deal. One
contractor record SHALL be attributable from any deal, so that the same party
paid across several deals is one record with one spend history.

#### Scenario: Recording a contractor
- GIVEN no contractor exists for a party
- WHEN one is created with a name and no other details
- THEN it is stored, and its trade, contact details and notes read as unset
  rather than as empty strings

#### Scenario: A contractor is paid from two deals
- GIVEN one contractor and two deals
- WHEN an expense on each deal attributes to that contractor
- THEN both attributions succeed against the same contractor record
- AND neither deal holds a private copy of the contractor

#### Scenario: A name is required
- WHEN a contractor is created with a blank name
- THEN the request is rejected, and no record is stored

### Requirement: An expense attributes to exactly one contractor

**BREAKING.** An expense SHALL carry a reference to the contractor it paid, and
SHALL NOT carry a free-text payee. The free-text field SHALL be removed rather
than kept alongside the reference: two fields describing who was paid is the
ambiguity this change exists to end, and a record carrying both would have no
answer to which one is true.

The reference SHALL be required. An expense is money that left the account, so
there is always a party on the other side; recording one without a payee was
never possible before this change and SHALL NOT become possible through it.

An expense SHALL NOT be attributable to a contractor that does not exist. A
request naming an unknown contractor SHALL be refused rather than silently
storing a dangling reference or creating the contractor implicitly.

#### Scenario: Recording an expense against a contractor
- GIVEN a contractor exists
- WHEN an expense is created naming it
- THEN the expense is stored carrying that contractor's identifier
- AND the expense carries no free-text payee field

#### Scenario: An unknown contractor
- WHEN an expense is created naming a contractor identifier that does not exist
- THEN the request is refused and no expense is stored
- AND no contractor is created as a side effect

#### Scenario: No contractor named
- WHEN an expense is created with no contractor
- THEN the request is refused, rather than stored with the attribution unset

#### Scenario: Re-attributing an expense
- GIVEN an expense attributed to contractor A
- WHEN it is updated to name contractor B
- THEN the expense reads as B's, and both contractors' spend rollups reflect the
  move

### Requirement: Contractors are listed for selection

The system SHALL expose the contractors it holds as a list carrying enough to
tell two apart without a second request: the name, the trade and the kind.

A contractor SHALL be able to be archived. An archived contractor SHALL remain
attributable to the expenses already referencing it and SHALL keep appearing in
spend rollups, but SHALL be excluded by default from the list offered for new
attributions, so that a party no longer used stops cluttering the choice without
rewriting history.

#### Scenario: Listing contractors for a new expense
- GIVEN four active contractors and one archived
- WHEN the list for attribution is requested
- THEN the four active ones are returned and the archived one is not

#### Scenario: An archived contractor keeps its history
- GIVEN an archived contractor with expenses attributed to it
- WHEN those expenses are read and the deal's rollup is requested
- THEN the attributions stand and the contractor's spend is still reported

#### Scenario: No contractors yet
- GIVEN a store with no contractors
- WHEN the list is requested
- THEN an empty list is returned, and the interface offers to create the first
  contractor rather than presenting an empty picker

### Requirement: Duplicate contractors are merged deliberately, never guessed

The system SHALL provide a way to merge one contractor into another. Merging
SHALL re-attribute every expense referencing the merged-away contractor to the
surviving one, and SHALL then remove the merged-away record, leaving no expense
pointing at a contractor that no longer exists.

The system SHALL NOT merge contractors automatically on the basis of similar
names. Merging is destructive — the distinct spelling that evidenced the
duplicate is gone afterwards — so it SHALL only ever happen on an explicit
instruction naming both records.

#### Scenario: Merging two spellings of one party
- GIVEN contractors "Silva & Filhos" and "Silva e Filhos" with expenses on each
- WHEN the second is merged into the first
- THEN every expense from both reads as the first contractor's
- AND the second contractor no longer exists

#### Scenario: The surviving contractor's rollup absorbs the other
- GIVEN two contractors with spend of `1000.00` and `250.00` on one deal
- WHEN one is merged into the other
- THEN the surviving contractor's spend for that deal is `1250.00`

#### Scenario: Similar names are left alone
- GIVEN two contractors whose names differ only by punctuation
- WHEN the contractor list is read and expenses are recorded
- THEN they remain two records until a merge is explicitly requested

### Requirement: A contractor with spend attributed to it cannot be deleted

Deleting a contractor SHALL be refused while any expense references it, because
deleting it would leave that expense describing a payment to nobody. The refusal
SHALL say that spend is attributed, so the choice between merging and archiving
is clear.

A contractor with no expenses referencing it SHALL be deletable.

#### Scenario: Deleting a contractor that has been paid
- GIVEN a contractor with two expenses attributed to it
- WHEN its deletion is requested
- THEN the request is refused and both expenses are untouched

#### Scenario: Deleting an unused contractor
- GIVEN a contractor with no expenses attributed to it
- WHEN its deletion is requested
- THEN it is deleted

#### Scenario: Deleting a deal leaves contractors standing
- GIVEN a deal whose expenses name several contractors
- WHEN the deal is deleted
- THEN its expenses are gone and every contractor record remains
- AND those contractors' spend on other deals is unchanged

### Requirement: Contractor spend rolls up per deal

The system SHALL report, for a given deal, how much has been attributed to each
contractor with spend on it. Each contractor's figures SHALL be broken down the
same way the per-category figures already are — planned, pending and paid, with
a committed total excluding planned spend — so that the two breakdowns of the
same expenses reconcile with each other and with the deal's totals.

Every figure SHALL be computed server-side as an exact decimal. No client may
sum a contractor's expenses to produce one.

A rollup SHALL cover one deal's expenses alone. A contractor paid on two deals
SHALL report each deal's spend separately rather than a single combined figure,
because a deal's arithmetic must not be moved by another deal's spend.

#### Scenario: Spend attributed to each contractor
- GIVEN a deal with paid expenses of `100.00` and `50.00` to one contractor and
  `75.00` to another
- WHEN the deal's rollup is requested
- THEN the first contractor reports `150.00` paid and the second `75.00`

#### Scenario: The breakdown reconciles with the deal's totals
- GIVEN a deal with expenses across several contractors, including a planned one
- WHEN the per-contractor figures are summed across all contractors
- THEN planned, pending and paid each sum to the deal's corresponding total

#### Scenario: A contractor with no spend on this deal
- GIVEN a contractor paid only on deal B
- WHEN deal A's rollup is requested
- THEN that contractor does not appear, rather than appearing with zeroes

#### Scenario: Spend is not combined across deals
- GIVEN one contractor paid `400.00` on deal A and `600.00` on deal B
- WHEN each deal's rollup is requested
- THEN deal A reports `400.00` and deal B reports `600.00`

### Requirement: Free-text payees migrate into contractors by exact match

**BREAKING.** The on-disk format changes: an expense's free-text payee becomes a
reference to a contractor record. Payees already stored SHALL be migrated into
created contractors and SHALL NOT be discarded, so that no expense loses who it
paid.

Payees SHALL be matched **exactly**, after trimming surrounding whitespace,
collapsing runs of internal whitespace, and ignoring letter case. Two payees
equal under that comparison SHALL become one contractor; two that differ by
anything more SHALL become two. The migration SHALL NOT merge on similarity,
accents, or punctuation: leaving a duplicate for the user to merge is visible
and reversible, and wrongly merging two real contractors is neither.

Every contractor the migration creates SHALL be recorded as a party goods were
bought from rather than as a party awarded works, because which of the two a
payee string described is not something the stored data says.

An expense whose payee is absent or blank SHALL be attributed to a single
explicitly-named unattributed contractor, created only if such an expense exists.
A store with no such expense SHALL NOT gain that record.

The migration SHALL be idempotent, SHALL preserve every expense identifier and
amount, and SHALL run after the migration that moves records into per-deal
storage, so that it reads each deal's expenses where that change has already put
them. Its already-run signal SHALL be that no stored expense still carries a
free-text payee — not the presence of contractor records, which the user may
have created by hand before any migration ran.

#### Scenario: Distinct spellings of one contractor
- GIVEN expenses with payees `"Stone & Co"`, `"stone & co"` and `" Stone  & Co "`
- WHEN the migration runs
- THEN one contractor is created and all three expenses attribute to it

#### Scenario: Genuinely different payees
- GIVEN expenses with payees `"Silva & Filhos"` and `"Silva e Filhos"`
- WHEN the migration runs
- THEN two contractors are created, and neither expense is re-attributed to the
  other's
- AND the user is able to merge them afterwards

#### Scenario: Payees across two deals become one contractor
- GIVEN deal A and deal B each hold an expense with the payee `"Eletro Tejo"`
- WHEN the migration runs
- THEN one contractor is created and both deals' expenses attribute to it

#### Scenario: An expense with no payee
- GIVEN a stored expense whose payee is absent or blank
- WHEN the migration runs
- THEN it is attributed to one explicitly-named unattributed contractor rather
  than being left without an attribution or dropped

#### Scenario: A store with no blank payees
- GIVEN every stored expense carries a payee
- WHEN the migration runs
- THEN no unattributed contractor is created

#### Scenario: Running the migration twice
- GIVEN a store that has already been migrated
- WHEN the migration runs again
- THEN no contractor is created, no expense is re-attributed, and the data is
  unchanged

#### Scenario: A fresh install
- GIVEN a store with no expenses
- WHEN the application starts
- THEN no contractor is invented

#### Scenario: Identifiers survive
- GIVEN a populated store in the pre-migration format
- WHEN the migration runs
- THEN every expense identifier, amount and timestamp is unchanged

### Requirement: Contractor details never reach the logs

Contractor names, trades, contact details and notes are user content. The system
SHALL NOT write any of them to a log line. Log records concerning contractors
SHALL carry identifiers and counts only.

This SHALL hold for the migration in particular, which reads every stored payee
string: it SHALL log how many contractors it created and how many expenses it
attributed, and SHALL NOT log the payee strings it read or the names it derived
from them.

#### Scenario: A contractor is created, updated or deleted
- WHEN the operation is logged
- THEN the log line carries the contractor identifier and no name, trade,
  contact detail or note

#### Scenario: The migration logs its work
- WHEN the migration runs over a populated store
- THEN it logs counts of contractors created and expenses attributed
- AND no payee string and no contractor name appears in any log line

#### Scenario: A merge is logged
- WHEN one contractor is merged into another
- THEN the log line carries both identifiers and the number of expenses
  re-attributed, and neither name
