from __future__ import annotations

import hmac
import json
import secrets
import time
from hashlib import sha256
from pathlib import Path
from typing import Any, Literal, Mapping, cast
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .types import CheckoutSession, CreateCheckoutSessionParams, NullPayConfig, NullPayInvoice, NullPayJson, WebhookEvent

DEFAULT_BASE_URL = "https://nullpay-backend-ib5q4.ondigitalocean.app/api"
PROVABLE_SALT_TO_INVOICE_URL = "https://api.provable.com/v2/testnet/program/zk_pay_proofs_privacy_v29.aleo/mapping/salt_to_invoice/{salt}"


class NullPayError(Exception):
    pass


class NullPayAPIError(NullPayError):
    def __init__(self, status: int, message: str, body: str | None = None) -> None:
        super().__init__(message)
        self.status = status
        self.message = message
        self.body = body or ""


def load_nullpay_config(project_root: str | Path | None = None, config_path: str | Path | None = None) -> NullPayJson | None:
    file_path = Path(config_path) if config_path else Path(project_root or Path.cwd()) / "nullpay.json"
    if not file_path.exists():
        return None

    try:
        return cast(NullPayJson, json.loads(file_path.read_text(encoding="utf-8")))
    except json.JSONDecodeError as exc:
        raise NullPayError(f"Failed to parse nullpay.json at {file_path}. Ensure it is valid JSON.") from exc


def _coerce_config(config: NullPayConfig | Mapping[str, Any]) -> NullPayConfig:
    if isinstance(config, NullPayConfig):
        return config

    if not isinstance(config, Mapping):
        raise TypeError("NullPay config must be a NullPayConfig or mapping.")

    secret_key = cast(str | None, config.get("secret_key") or config.get("secretKey"))
    if not secret_key:
        raise NullPayError("NullPay API Key is required.")

    return NullPayConfig(
        secret_key=secret_key,
        base_url=cast(str, config.get("base_url") or config.get("baseURL") or DEFAULT_BASE_URL),
        project_root=cast(str | Path | None, config.get("project_root") or config.get("projectRoot")),
        config_path=cast(str | Path | None, config.get("config_path") or config.get("configPath")),
        timeout=float(config.get("timeout", 30.0)),
    )


class _InvoicesAPI:
    def __init__(self, client: NullPay) -> None:
        self._client = client

    def get_all(self) -> list[NullPayInvoice]:
        config = load_nullpay_config(self._client.project_root, self._client.config_path)
        if not config:
            resolved_path = Path(self._client.config_path) if self._client.config_path else Path(self._client.project_root or Path.cwd()) / "nullpay.json"
            raise NullPayError(f"nullpay.json not found at {resolved_path}. Run the onboard flow first or pass project_root/config_path to the SDK.")
        return config["invoices"]

    def get_by_index(self, index: int) -> NullPayInvoice:
        invoices = self.get_all()
        if index < 0 or index >= len(invoices):
            raise NullPayError(f"Invoice index {index} is out of range. nullpay.json has {len(invoices)} invoice(s).")
        return invoices[index]

    def get_by_name(self, name: str) -> NullPayInvoice:
        invoices = self.get_all()
        for invoice in invoices:
            if invoice["name"] == name:
                return invoice
        available = ", ".join(f'"{invoice["name"]}"' for invoice in invoices)
        raise NullPayError(f"Invoice \"{name}\" not found in nullpay.json. Available: {available}")

    def get_by_type(self, type_name: Literal["multipay", "donation"]) -> list[NullPayInvoice]:
        """
        Return all invoices matching the specified type.
        Mirrors Node SDK: invoices.getByType('multipay' | 'donation')
        """
        return [inv for inv in self.get_all() if inv.get("type") == type_name]


class _CheckoutSessionsAPI:
    def __init__(self, client: NullPay) -> None:
        self._client = client

    def create(self, params: CreateCheckoutSessionParams) -> CheckoutSession:
        resolved_params: dict[str, Any] = dict(params)

        if "nullpay_invoice_name" in params or "nullpay_invoice_index" in params:
            if "nullpay_invoice_name" in params:
                invoice = self._client.invoices.get_by_name(cast(str, params["nullpay_invoice_name"]))
            else:
                invoice = self._client.invoices.get_by_index(cast(int, params["nullpay_invoice_index"]))

            resolved_params.update(
                {
                    "invoice_hash": resolved_params.get("invoice_hash") or invoice.get("hash") or invoice.get("invoice_hash"),
                    "salt": resolved_params.get("salt") or invoice["salt"],
                    "type": resolved_params.get("type") or invoice["type"],
                    "amount": resolved_params["amount"] if "amount" in resolved_params else invoice.get("amount"),
                    "currency": resolved_params.get("currency") or invoice["currency"],
                    "title": resolved_params.get("title") or invoice.get("title"),
                }
            )
            resolved_params.pop("nullpay_invoice_name", None)
            resolved_params.pop("nullpay_invoice_index", None)

        is_donation = resolved_params.get("type") == "donation"
        amount = resolved_params.get("amount")

        if not is_donation and (amount is None or float(amount) <= 0):
            raise NullPayError("Amount is required and must be greater than 0 for standard invoices.")

        final_invoice_hash = cast(str | None, resolved_params.get("invoice_hash"))
        final_salt = cast(str | None, resolved_params.get("salt"))

        if not final_invoice_hash or not final_salt:
            final_salt = self._client._generate_salt()
            invoice_type_num = 2 if resolved_params.get("type") == "donation" else 1 if resolved_params.get("type") == "multipay" else 0

            try:
                relayer_data = self._client._request_json(
                    "POST",
                    f"{self._client.base_url}/dps/relayer/create-invoice",
                    headers=self._client._auth_headers(),
                    body={
                        "amount": 0 if is_donation else resolved_params.get("amount"),
                        "currency": resolved_params.get("currency") or "CREDITS",
                        "salt": final_salt,
                        "title": resolved_params.get("title") or "",
                        "invoice_type": invoice_type_num,
                    },
                )
            except NullPayAPIError as exc:
                raise NullPayError(f"NullPay Relayer Pre-gen Error: {exc.status} - {exc.message}") from exc

            merchant_address = cast(str, relayer_data.get("merchant_address", ""))
            creation_tx_id = relayer_data.get("tx_id")
            final_invoice_hash = self._client._poll_for_invoice_hash(final_salt)

            try:
                self._client._request_json(
                    "POST",
                    f"{self._client.base_url}/invoices",
                    headers=self._client._auth_headers(),
                    body={
                        "invoice_hash": final_invoice_hash,
                        "merchant_address": merchant_address,
                        "currency": resolved_params.get("currency") or "CREDITS",
                        "salt": final_salt,
                        "invoice_transaction_id": creation_tx_id,
                        "invoice_type": invoice_type_num,
                        "for_sdk": True,
                        "status": "PENDING",
                    },
                )
            except NullPayError:
                pass

        session_payload = dict(resolved_params)
        session_payload["amount"] = 0 if is_donation else resolved_params.get("amount")
        session_payload["invoice_hash"] = final_invoice_hash
        session_payload["salt"] = final_salt

        try:
            response = self._client._request_json(
                "POST",
                f"{self._client.base_url}/checkout/sessions",
                headers=self._client._auth_headers(),
                body=session_payload,
            )
        except NullPayAPIError as exc:
            raise NullPayError(f"NullPay API Error: {exc.status} - {exc.message}") from exc

        return cast(CheckoutSession, response)

    def retrieve(self, session_id: str) -> CheckoutSession:
        try:
            response = self._client._request_json(
                "GET",
                f"{self._client.base_url}/checkout/sessions/{session_id}",
                headers=self._client._auth_headers(),
            )
        except NullPayAPIError as exc:
            raise NullPayError(f"NullPay API Error: {exc.status} - {exc.message}") from exc

        return cast(CheckoutSession, response)


class _CheckoutAPI:
    def __init__(self, client: NullPay) -> None:
        self.sessions = _CheckoutSessionsAPI(client)


class _WebhooksAPI:
    def __init__(self, client: NullPay) -> None:
        self._client = client

    def verify_signature(self, payload: str, signature: str) -> bool:
        if not payload or not signature:
            return False

        try:
            expected = hmac.new(self._client.secret_key.encode("utf-8"), payload.encode("utf-8"), sha256).hexdigest()
            return hmac.compare_digest(signature, expected)
        except Exception:
            return False

    def construct_event(self, payload: str, signature: str) -> WebhookEvent:
        if not self.verify_signature(payload, signature):
            raise NullPayError("Invalid NullPay Webhook Signature. This request might be spoofed.")
        return cast(WebhookEvent, json.loads(payload))


class NullPay:
    def __init__(self, config: NullPayConfig | Mapping[str, Any]) -> None:
        resolved = _coerce_config(config)
        self.secret_key = resolved.secret_key
        self.base_url = resolved.base_url or DEFAULT_BASE_URL
        self.project_root = resolved.project_root
        self.config_path = resolved.config_path
        self.timeout = resolved.timeout
        self.invoices = _InvoicesAPI(self)
        self.checkout = _CheckoutAPI(self)
        self.webhooks = _WebhooksAPI(self)

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.secret_key}"}

    def _request_json(
        self,
        method: str,
        url: str,
        *,
        headers: Mapping[str, str] | None = None,
        body: Mapping[str, Any] | None = None,
    ) -> Any:
        request_headers = {"Accept": "application/json", **dict(headers or {})}
        payload: bytes | None = None

        if body is not None:
            request_headers["Content-Type"] = "application/json"
            payload = json.dumps(body).encode("utf-8")

        request = Request(url, data=payload, headers=request_headers, method=method.upper())

        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
                return self._decode_json(raw)
        except HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            message = self._extract_error_message(raw) or str(exc.reason)
            raise NullPayAPIError(exc.code, message, raw) from exc
        except URLError as exc:
            raise NullPayError(f"Network error calling NullPay API: {exc.reason}") from exc

    def _poll_for_invoice_hash(self, salt: str, *, max_retries: int = 60, interval_seconds: float = 2.0) -> str:
        for _ in range(max_retries):
            time.sleep(interval_seconds)
            try:
                value = self._request_json("GET", PROVABLE_SALT_TO_INVOICE_URL.format(salt=salt))
            except NullPayError:
                continue

            invoice_hash = self._normalize_mapping_value(value)
            if invoice_hash:
                return invoice_hash

        raise NullPayError("Timed out waiting for Aleo network blockchain confirmation. Invoice was sent, but hash was not resolved.")

    @staticmethod
    def _normalize_mapping_value(value: Any) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            return value.replace("'", "").replace('"', "")
        return str(value).replace("'", "").replace('"', "")

    @staticmethod
    def _extract_error_message(raw: str) -> str | None:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return raw.strip() or None

        if isinstance(data, dict):
            error = data.get("error") or data.get("message")
            if error:
                return str(error)
        if isinstance(data, str):
            return data
        return None

    @staticmethod
    def _decode_json(raw: str) -> Any:
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw

    @staticmethod
    def _generate_salt() -> str:
        return f"{int.from_bytes(secrets.token_bytes(16), byteorder='big')}field"
