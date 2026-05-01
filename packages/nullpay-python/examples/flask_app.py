from flask import Flask, jsonify, request

from nullpay import NullPay, NullPayError

app = Flask(__name__)
client = NullPay({"secretKey": "sk_test_..."})


@app.post("/checkout")
def create_checkout():
    try:
        session = client.checkout.sessions.create(
            {
                "amount": 10,
                "currency": "USDCX",
                "type": "multipay",
                "success_url": "https://example.com/success",
                "cancel_url": "https://example.com/cancel",
            }
        )
        return jsonify(session)
    except NullPayError as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/webhooks/nullpay")
def nullpay_webhook():
    payload = request.get_data(as_text=True)
    signature = request.headers.get("x-nullpay-signature", "")

    try:
        event = client.webhooks.construct_event(payload, signature)
    except NullPayError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify({"ok": True, "event_id": event["id"], "status": event["status"]})
