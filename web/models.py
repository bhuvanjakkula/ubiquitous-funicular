from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

TransferMethodType = Literal["bank", "card", "cash", "wallet"]
ReceiveMethodType = Literal["bank", "cash", "wallet"]
PriorityType = Literal["cheapest", "fastest", "most_received"]

class TransferRequirements(BaseModel):
    sender: Optional[List[str]] = Field(default_factory=list)
    recipient: Optional[List[str]] = Field(default_factory=list)

class TransferCorridor(BaseModel):
    fromCountry: str
    toCountry: str
    sendCurrency: str
    receiveCurrency: str
    minAmount: float
    maxAmount: float
    transferMethods: Optional[List[TransferMethodType]] = Field(default_factory=lambda: ["bank", "card"])
    receiveMethods: List[ReceiveMethodType] = Field(default_factory=lambda: ["bank", "cash", "wallet"])
    fee: float
    exchangeRate: float
    estimatedMinutes: int
    requirements: TransferRequirements = Field(default_factory=TransferRequirements)
    transferUrl: str

class TransferProvider(BaseModel):
    id: str
    name: str
    website: str
    logoUrl: Optional[str] = None
    corridors: List[TransferCorridor] = Field(default_factory=list)

class TransferSearch(BaseModel):
    fromCountry: str
    toCountry: str
    amount: float
    sendCurrency: str
    receiveCurrency: str
    receiveMethod: Optional[ReceiveMethodType] = None
    priority: Optional[PriorityType] = "most_received"

class RateAlertRequest(BaseModel):
    email: str
    fromCountry: str
    toCountry: str
    sendCurrency: str
    receiveCurrency: str
    targetRate: float

# --- Authentication & Subscription Models ---

class SignUpRequest(BaseModel):
    name: str
    email: str
    countryCode: str = "+971"
    mobileNumber: str
    password: str

class SignInRequest(BaseModel):
    email: str
    password: str

class UpgradeRequest(BaseModel):
    email: str
    plan: Literal["individual", "business"] # $99 or $199
    cardNumber: Optional[str] = "4242••••••••4242"

class LockToggleRequest(BaseModel):
    adminEmail: str
    targetUserId: Optional[str] = None
    isLocked: bool
