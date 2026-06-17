from app.pipeline.normalize import normalize_currency, normalize_sku


def test_normalize_sku_standardizes_aliases_to_canonical_shape():
    assert normalize_sku(" ani001 ") == "SKU-ANI-001"
    assert normalize_sku("SKU_hoodie_black") == "SKU-HOODIE-BLACK"


def test_normalize_currency_uppercases_values():
    assert normalize_currency(" usd ") == "USD"
