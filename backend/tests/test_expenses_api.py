from fastapi.testclient import TestClient

VALID_EXPENSE = {
    "description": "Kitchen tiles",
    "amount": "1250.00",
    "category": "materials",
    "payment_method": "credit_card",
    "payee": "Tile Depot",
    "incurred_on": "2026-01-15",
}


def test_list_expenses_returns_empty_list_when_none_exist(client: TestClient) -> None:
    response = client.get("/expenses")

    assert response.status_code == 200
    assert response.json() == []


def test_create_expense_returns_201_with_generated_fields(client: TestClient) -> None:
    response = client.post("/expenses", json=VALID_EXPENSE)

    assert response.status_code == 201
    body = response.json()
    assert body["description"] == "Kitchen tiles"
    assert body["amount"] == "1250.00"
    assert body["status"] == "paid"
    assert "id" in body
    assert "created_at" in body
    assert "updated_at" in body


def test_create_expense_rejects_missing_required_field(client: TestClient) -> None:
    payload = {key: value for key, value in VALID_EXPENSE.items() if key != "payee"}

    response = client.post("/expenses", json=payload)

    assert response.status_code == 422


def test_create_expense_rejects_non_positive_amount(client: TestClient) -> None:
    payload = {**VALID_EXPENSE, "amount": "0"}

    response = client.post("/expenses", json=payload)

    assert response.status_code == 422


def test_create_expense_rejects_invalid_category(client: TestClient) -> None:
    payload = {**VALID_EXPENSE, "category": "not_a_category"}

    response = client.post("/expenses", json=payload)

    assert response.status_code == 422


def test_create_expense_rejects_unknown_field(client: TestClient) -> None:
    payload = {**VALID_EXPENSE, "unexpected_field": "surprise"}

    response = client.post("/expenses", json=payload)

    assert response.status_code == 422


def test_list_expenses_returns_created_expense(client: TestClient) -> None:
    client.post("/expenses", json=VALID_EXPENSE)

    response = client.get("/expenses")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_get_expense_returns_matching_expense(client: TestClient) -> None:
    created = client.post("/expenses", json=VALID_EXPENSE).json()

    response = client.get(f"/expenses/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_expense_returns_404_for_unknown_id(client: TestClient) -> None:
    response = client.get("/expenses/unknown-id")

    assert response.status_code == 404


def test_update_expense_returns_200_with_changed_field(client: TestClient) -> None:
    created = client.post("/expenses", json=VALID_EXPENSE).json()

    response = client.patch(f"/expenses/{created['id']}", json={"description": "Bathroom tiles"})

    assert response.status_code == 200
    assert response.json()["description"] == "Bathroom tiles"


def test_update_expense_rejects_empty_body(client: TestClient) -> None:
    created = client.post("/expenses", json=VALID_EXPENSE).json()

    response = client.patch(f"/expenses/{created['id']}", json={})

    assert response.status_code == 400


def test_update_expense_returns_404_for_unknown_id(client: TestClient) -> None:
    response = client.patch("/expenses/unknown-id", json={"description": "Anything"})

    assert response.status_code == 404


def test_update_expense_rejects_unknown_field(client: TestClient) -> None:
    created = client.post("/expenses", json=VALID_EXPENSE).json()

    response = client.patch(f"/expenses/{created['id']}", json={"not_a_field": "value"})

    assert response.status_code == 422


def test_delete_expense_returns_204_and_removes_it(client: TestClient) -> None:
    created = client.post("/expenses", json=VALID_EXPENSE).json()

    delete_response = client.delete(f"/expenses/{created['id']}")

    assert delete_response.status_code == 204
    assert client.get(f"/expenses/{created['id']}").status_code == 404


def test_delete_expense_returns_404_for_unknown_id(client: TestClient) -> None:
    response = client.delete("/expenses/unknown-id")

    assert response.status_code == 404
