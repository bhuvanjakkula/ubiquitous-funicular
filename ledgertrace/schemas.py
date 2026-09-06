from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, Field, StrictInt, field_validator, model_validator

class JobConfig(BaseModel):
    entity_name: str = Field(min_length=1, max_length=200)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    cash_account_ids: list[str]
    period_start: date
    period_end: date
    period_close_date: date | None = None
    expected_opening_cash_cents: StrictInt | None = Field(default=None, ge=-(2**63-1), le=2**63-1)
    expected_closing_cash_cents: StrictInt | None = Field(default=None, ge=-(2**63-1), le=2**63-1)

    @field_validator("period_start", "period_end", "period_close_date", mode="before")
    @classmethod
    def civil_dates(cls, v):
        if v is None or type(v) is date:
            return v
        if not isinstance(v, str) or len(v) != 10:
            raise ValueError("Use YYYY-MM-DD calendar dates")
        return date.fromisoformat(v)

    @model_validator(mode="after")
    def valid_period(self):
        if self.period_start > self.period_end:
            raise ValueError("period_start must be on or before period_end")
        if len(set(self.cash_account_ids)) != len(self.cash_account_ids) or any(not x.strip() or x == "__CASH_TOTAL__" for x in self.cash_account_ids):
            raise ValueError("Cash account IDs must be unique, nonempty, and not reserved")
        return self

class BankRow(BaseModel):
    bank_line_id: str
    posted_date: date
    amount_cents: StrictInt
    description: str
    value_date: date | None = None
    account_ref: str | None = None
    currency: str = "USD"
    fitid: str | None = None
    type: Literal["ACH", "CHECK", "CARD", "WIRE", "FEE", "OTHER"] = "OTHER"
    check_number: str | None = None
    file_row: int

class GLRow(BaseModel):
    line_id: str
    journal_id: str
    txn_date: date
    account_id: str
    account_name: str | None = None
    debit_cents: StrictInt = Field(ge=0)
    credit_cents: StrictInt = Field(ge=0)
    created_at: datetime
    modified_at: datetime
    created_by: str | None = None
    modified_by: str | None = None
    memo: str | None = None
    source: Literal["MANUAL", "BANK_FEED", "IMPORTED", "ADJUSTING", "UNKNOWN"] = "UNKNOWN"
    cleared_flag: bool | None = None
    cleared_date: date | None = None
    recon_id: str | None = None
    period_close_date: date | None = None
    is_void: bool = False
    reverses_journal_id: str | None = None
    currency: str = "USD"
    file_row: int

    @model_validator(mode="after")
    def one_side(self):
        if (self.debit_cents > 0) == (self.credit_cents > 0):
            raise ValueError("Exactly one of debit/credit must be nonzero")
        return self

class Finding(BaseModel):
    id: str = ""
    detector_id: str
    severity: Literal["FAIL", "UNKNOWN", "INFO"]
    title: str
    amount_cents: StrictInt | None = None
    cite_bank_ids: list[str] = Field(default_factory=list)
    cite_line_ids: list[str] = Field(default_factory=list)
    cite_entry_ids: list[str] = Field(default_factory=list)
    payload: dict = Field(default_factory=dict)

    @model_validator(mode="after")
    def cites_required(self):
        if self.severity in ("FAIL", "UNKNOWN") and not (self.cite_bank_ids or self.cite_line_ids or self.cite_entry_ids):
            raise ValueError("FAIL/UNKNOWN requires source row citations")
        return self
