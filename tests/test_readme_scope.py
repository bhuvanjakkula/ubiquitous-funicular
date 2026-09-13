from pathlib import Path


def test_scope_freeze():
    root = Path(__file__).resolve().parents[1]
    readme = (root / "README.md").read_text(encoding="utf-8")
    assert "Does not certify GAAP" in readme
    assert "Does not post" in readme
    assert "Local only" in readme
    assert "Not a compliance certificate" in readme
    assert "QBO connector" not in readme
    assert "QuickBooks" in (root / "SCOPE.md").read_text()
