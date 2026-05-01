from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal, NotRequired, TypedDict


@dataclass(slots=True)
class NullPayConfig:
    secret_key: str
    base_url: str = "https://nullpay-backend-ib5q4.ondigitalocean.app/api"
    project_root: str | Path | None = None
    config_path: str | Path | None = None
    timeout: float = 30.0


class NullPayInvoice(TypedDict, total=False):
    name: str
    type: Literal["multipay", "donation"]
    amount: float | None
    currency: str
    title: NotRequired[str]
    label: NotRequired[str]
    hash: str
    salt: str


class NullPayJson(TypedDict):
    merchant: str
    generated_at: str
    invoices: list[NullPayInvoice]


class CreateCheckoutSessionParams(TypedDict, total=False):
    amount: float
    currency: Literal["CREDITS", "USDCX", "USAD", "ANY"]
    type: Literal["standard", "donation", "multipay"]
    title: str
    success_url: str
    cancel_url: str
    invoice_hash: str
    salt: str
    nullpay_invoice_name: str
    nullpay_invoice_index: int


class CheckoutSession(TypedDict, total=False):
    id: str
    checkout_url: str
    status: str
    invoice_hash: NotRequired[str]
    salt: NotRequired[str]


class WebhookEvent(TypedDict):
    id: str
    amount: float
    token_type: str
    status: Literal["SETTLED", "FAILED", "PROCESSING", "PENDING"]
    tx_id: str | None
    timestamp: str
