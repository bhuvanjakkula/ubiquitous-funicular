from datetime import date
from typing import Literal
from pathlib import Path
from pydantic import BaseModel, Field, StrictInt, field_validator, model_validator
from ledgertrace.money import LIMIT


class JobConfig(BaseModel):
    entity_name: str = Field(min_length=1)
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    cash_account_ids: list[str] = Field(min_length=1)
    period_start: date
    period_end: date
    period_close_date: date | None = None
    expected_opening_cash_cents: StrictInt | None = Field(default=None, ge=-LIMIT, le=LIMIT)
    expected_closing_cash_cents: StrictInt | None = Field(default=None, ge=-LIMIT, le=LIMIT)
    expected_bank_statement_ending_cents: StrictInt | None = Field(default=None, ge=-LIMIT, le=LIMIT)
    export_dialect: Literal["generic", "qbo", "xero"] = "generic"
    software_version: str = "0.1.0"

    @field_validator("entity_name")
    @classmethod
    def entity_not_blank(cls, value):
        if not value.strip(): raise ValueError("entity_name cannot be blank")
        return value

    @field_validator("cash_account_ids")
    @classmethod
    def accounts_not_blank(cls, values):
        if any(not value.strip() for value in values):
            raise ValueError("cash account IDs cannot be blank")
        return values

    @model_validator(mode="after")
    def valid_period(self):
        if self.period_end < self.period_start:
            raise ValueError("period_end must be on or after period_start")
        return self


def load_job_config(path) -> JobConfig:
    return JobConfig.model_validate_json(Path(path).read_bytes())
