# NullPay Python SDK

`nullpay-python` is the Python equivalent of `@nullpay/node`.

It follows the same backend-first architecture:

- reads `nullpay.json` locally for named invoice lookup
- calls the NullPay backend to create and retrieve checkout sessions
- uses the NullPay relayer flow for invoice pre-generation when `invoice_hash` or `salt` is missing
- verifies webhook signatures locally with HMAC-SHA256

The smart-contract and Provable SDK work stays on the NullPay backend. This package is a thin Python client for FastAPI, Flask, Django, and plain Python services.

## Install

```bash
pip install ./packages/nullpay-python
```

## Basic usage

```python
from nullpay import NullPay

client = NullPay({
    "secretKey": "sk_test_...",
    "baseURL": "https://nullpay-backend-ib5q4.ondigitalocean.app/api",
})

session = client.checkout.sessions.create({
    "amount": 10,
    "currency": "USDCX",
    "type": "multipay",
    "success_url": "https://example.com/success",
    "cancel_url": "https://example.com/cancel",
})

print(session["checkout_url"])
```

## API surface

### `NullPay(config)`

Supported config keys:

- `secretKey` or `secret_key`
- `baseURL` or `base_url`
- `projectRoot` or `project_root`
- `configPath` or `config_path`
- `timeout`

### `load_nullpay_config(project_root=None, config_path=None)`

Loads `nullpay.json` from the provided project root or explicit path.

### `client.invoices`

- `get_all()`
- `get_by_index(i)`
- `get_by_name(name)`
- `get_by_type(type_name)`

### `client.checkout.sessions`

- `create(params)`
- `retrieve(session_id)`

`create(...)` mirrors the Node SDK behavior:

- accepts `nullpay_invoice_name` and `nullpay_invoice_index`
- auto-generates a salt if `invoice_hash` or `salt` is missing
- calls `/dps/relayer/create-invoice`
- polls the Provable `salt_to_invoice` mapping
- performs best-effort dashboard sync via `/invoices`
- finally creates the hosted checkout session via `/checkout/sessions`

### `client.webhooks`

- `verify_signature(payload, signature)`
- `construct_event(payload, signature)`

## Framework examples

See `examples/` for:

- FastAPI
- Flask
- Django

## Tests

Run from this package directory:

```bash
python -m unittest discover -s tests
```
