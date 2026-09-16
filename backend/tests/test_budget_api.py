from fastapi.testclient import TestClient

VALID_EXPENSE = {
    "description": "Kitchen tiles",
    "amount": "1250.00",
    "category": "materials",
    "payment_method": "credit_card",
    "payee": "Tile Depot",
    "incurred_on": "2026-01-15",
    "status": "paid",
}


def test_get_budget_returns_empty_budget_when_none_set(client: TestClient) -> None:
    response = client.get("/budget")

    assert response.status_code == 200
    body = response.json()
    assert body["target_sale_price"] is None
    assert body["purchase_price"] is None
    assert body["planned_budget"] is None
    assert "updated_at" in body


def test_update_budget_returns_200_with_changed_fields(client: TestClient) -> None:
    response = client.put("/budget", json={"planned_budget": "50000.00"})

    assert response.status_code == 200
    assert response.json()["planned_budget"] == "50000.00"


def test_update_budget_rejects_unknown_field(client: TestClient) -> None:
    response = client.put("/budget", json={"not_a_field": "value"})

    assert response.status_code == 422


def test_update_budget_rejects_negative_amount(client: TestClient) -> None:
    response = client.put("/budget", json={"planned_budget": "-1.00"})

    assert response.status_code == 422


def test_get_budget_summary_returns_zeros_when_no_expenses(client: TestClient) -> None:
    response = client.get("/budget/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["total_paid"] == "0.00"
    assert body["total_committed"] == "0.00"
    assert body["total_planned"] == "0.00"
    assert body["total_forecast"] == "0.00"
    assert body["expense_count"] == 0
    assert body["by_category"] == []
    assert body["remaining_budget"] is None
    assert body["projected_profit"] is None
    assert body["over_budget"] is False


def test_get_budget_summary_reflects_created_expenses(client: TestClient) -> None:
    client.put("/budget", json={"planned_budget": "1000.00"})
    client.post("/expenses", json=VALID_EXPENSE)

    response = client.get("/budget/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["total_paid"] == "1250.00"
    assert body["expense_count"] == 1
    assert body["over_budget"] is True
    assert body["by_category"] == [
        {
            "category": "materials",
            "amount": "1250.00",
            "planned": "0.00",
            "pending": "0.00",
            "paid": "1250.00",
            "share": 100.0,
        }
    ]


def test_get_budget_summary_returns_the_derived_profitability_figures(
    client: TestClient,
) -> None:
    client.put("/budget", json={"purchase_price": "300000.00", "target_sale_price": "465000.00"})
    client.post("/expenses", json={**VALID_EXPENSE, "amount": "120000.00"})

    response = client.get("/budget/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["projected_profit"] == "45000.00"
    assert body["break_even_sale_price"] == "420000.00"
    assert body["margin_percent"] == 9.68
    assert body["return_on_cost_percent"] == 10.71


def test_get_budget_summary_sends_money_as_strings_and_ratios_as_numbers(
    client: TestClient,
) -> None:
    client.put("/budget", json={"purchase_price": "300000.00", "target_sale_price": "465000.00"})
    client.post("/expenses", json={**VALID_EXPENSE, "amount": "120000.00"})

    body = client.get("/budget/summary").json()

    assert isinstance(body["break_even_sale_price"], str)
    assert isinstance(body["by_category"][0]["paid"], str)
    assert isinstance(body["margin_percent"], float)
    assert isinstance(body["return_on_cost_percent"], float)
    assert isinstance(body["by_category"][0]["share"], float)


def test_get_budget_summary_omits_profitability_figures_without_targets(
    client: TestClient,
) -> None:
    client.post("/expenses", json=VALID_EXPENSE)

    body = client.get("/budget/summary").json()

    assert body["margin_percent"] is None
    assert body["return_on_cost_percent"] is None
    assert body["break_even_sale_price"] is None
