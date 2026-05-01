import json

from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt

from nullpay import NullPay, NullPayError

client = NullPay({"secretKey": "sk_test_..."})


@csrf_exempt
def create_checkout(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

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
        return JsonResponse(session)
    except NullPayError as exc:
        return JsonResponse({"error": str(exc)}, status=400)


@csrf_exempt
def nullpay_webhook(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    payload = request.body.decode("utf-8")
    signature = request.headers.get("x-nullpay-signature", "")

    try:
        event = client.webhooks.construct_event(payload, signature)
    except NullPayError as exc:
        return JsonResponse({"error": str(exc)}, status=400)

    return JsonResponse({"ok": True, "event_id": event["id"], "status": event["status"]})
