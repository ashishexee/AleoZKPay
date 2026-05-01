from fastapi import FastAPI, Header, HTTPException, Request

from nullpay import NullPay, NullPayError

app = FastAPI()
client = NullPay({"secretKey": "sk_test_..."})


@app.post("/checkout")
def create_checkout() -> dict:
    try:
        return client.checkout.sessions.create(
            {
                "nullpay_invoice_name": "basic-usdcx",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel",
            }
        )
    except NullPayError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/webhooks/nullpay")
async def nullpay_webhook(request: Request, x_nullpay_signature: str = Header(default="")) -> dict:
    payload = (await request.body()).decode("utf-8")

    try:
        event = client.webhooks.construct_event(payload, x_nullpay_signature)
    except NullPayError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"ok": True, "event_id": event["id"], "status": event["status"]}
