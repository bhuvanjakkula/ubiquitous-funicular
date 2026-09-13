
from fastapi import HTTPException

# In a real app, you would make an HTTP request to your external server
# e.g., https://my-license-server.com/verify?key={license_key}
def validate_license_key(license_key: str | None) -> bool:
    if not license_key:
        raise HTTPException(status_code=402, detail=dict(error="Payment Required: Missing License Key", code="LICENSE_MISSING"))
    
    # Mocking external Stripe/License Server validation
    # Real validation would check if the key corresponds to a paid Stripe Checkout Session
    if license_key.startswith("test_") or license_key.startswith("sk_"):
        return True
    
    raise HTTPException(status_code=402, detail=dict(error="Payment Required: Invalid or Expired License Key", code="LICENSE_INVALID"))
