import os
import ssl
import time
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from nullpay import NullPay, load_nullpay_config, NullPayError
from urllib.request import urlopen, Request
import json

app = FastAPI(title="NullPay Python SDK Backend [DEBUG]")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Configuration ──────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).parent
config = load_nullpay_config(project_root=BACKEND_DIR) or {}
invoices = config.get("invoices", [])

secret_key = os.getenv("NULLPAY_SECRET_KEY", "sk_test_bb8c865db17348c2f5659450d09a1632e1df4690c4015c68")
base_url = os.getenv("NULLPAY_BASE_URL", "https://nullpay-backend-ib5q4.ondigitalocean.app/api")

print(f"🔑 Secret Key: {secret_key[:10]}...")
print(f"🌐 Backend URL: {base_url}")
print(f"📄 Loaded {len(invoices)} invoices")

# ✅ FIX: Create SSL context that works on Windows
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE  # ⚠️ For testing only

client = NullPay({
    "secret_key": secret_key,
    "base_url": base_url,
    "project_root": str(BACKEND_DIR),
    "timeout": 120.0,  # 2 minutes timeout for debugging
})

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

def build_success_type(inv: dict) -> str:
    t = inv.get("type", "")
    return "donation" if t == "donation" else ("subscription" if t == "multipay" else "invoice")

# ─── DEBUG: Test connectivity to NullPay backend ─────────────────────────────
@app.get("/api/debug/connectivity")
def debug_connectivity():
    """Test if we can reach the NullPay backend API"""
    results = {}
    
    # Test 1: Raw urllib request
    try:
        req = Request(f"{base_url}/health", headers={"Authorization": f"Bearer {secret_key}"})
        start = time.time()
        with urlopen(req, timeout=30, context=ssl_context) as resp:
            results["urllib"] = {
                "status": resp.status,
                "time_ms": round((time.time() - start) * 1000, 2),
                "success": True
            }
    except Exception as e:
        results["urllib"] = {"error": str(e), "success": False}
    
    # Test 2: SDK health check via /checkout/sessions (minimal)
    try:
        start = time.time()
        # Just test auth, don't create a real session
        req = Request(
            f"{base_url}/checkout/sessions",
            headers={
                "Authorization": f"Bearer {secret_key}",
                "Content-Type": "application/json"
            },
            data=b"{}",
            method="POST"
        )
        with urlopen(req, timeout=30, context=ssl_context) as resp:
            results["sdk_post"] = {
                "status": resp.status,
                "time_ms": round((time.time() - start) * 1000, 2),
                "success": True
            }
    except Exception as e:
        results["sdk_post"] = {"error": str(e), "success": False}
    
    return results

# ─── Routes ──────────────────────────────────────────────────────────────────
@app.post("/api/{invoice_name}")
def create_named_session(invoice_name: str):
    print(f"📥 [DEBUG] Creating session for: {invoice_name}")
    
    target = next((inv for inv in invoices if inv["name"] == invoice_name), None)
    if not target:
        available = ", ".join(inv["name"] for inv in invoices)
        raise HTTPException(
            status_code=404, 
            detail=f"Invoice '{invoice_name}' not found. Available: {available}"
        )
    
    print(f"🔍 Found invoice: {target.get('name')} | type: {target.get('type')} | currency: {target.get('currency')}")
    
    try:
        print(f"🚀 Calling NullPay API: {base_url}/checkout/sessions")
        start = time.time()
        
        session = client.checkout.sessions.create({
            "nullpay_invoice_name": invoice_name,
            "success_url": f"{FRONTEND_URL}?session_id={{CHECKOUT_SESSION_ID}}&type={build_success_type(target)}",
            "cancel_url": f"{FRONTEND_URL}?cancel=true"
        })
        
        elapsed = time.time() - start
        print(f"✅ Session created in {elapsed:.2f}s: {session.get('id')}")
        print(f"🔗 Checkout URL: {session.get('checkout_url')}")
        
        return {"checkout_url": session["checkout_url"], "session_id": session.get("id"), "debug_time_sec": round(elapsed, 2)}
        
    except NullPayError as e:
        print(f"❌ NullPayError: status={getattr(e, 'status', 'N/A')}, message={e}")
        raise HTTPException(status_code=500, detail=f"NullPay API error: {str(e)}")
    except TimeoutError as e:
        print(f"❌ TimeoutError: {e}")
        raise HTTPException(status_code=504, detail=f"Connection to NullPay backend timed out. Try /api/debug/connectivity to diagnose.")
    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.post("/api/checkout/variable")
def create_variable_session(payload: dict = Body(...)):
    amount = payload.get("amount")
    if not amount or amount <= 0:
        raise HTTPException(status_code=400, detail="amount must be > 0")
    try:
        session = client.checkout.sessions.create({
            "amount": amount,
            "currency": payload.get("currency", "CREDITS"),
            "type": payload.get("type", "multipay"),
            "success_url": f"{FRONTEND_URL}?session_id={{CHECKOUT_SESSION_ID}}&type=invoice",
            "cancel_url": f"{FRONTEND_URL}?cancel=true"
        })
        return {"checkout_url": session["checkout_url"]}
    except NullPayError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/verify-session")
def verify_session(session_id: str = Query(...)):
    try:
        session = client.checkout.sessions.retrieve(session_id)
        return {
            "success": session.get("status") == "SETTLED",
            "status": session.get("status"),
            "tx_id": session.get("tx_id"),
            "amount": session.get("amount"),
            "tokenType": session.get("currency"),
            "invoiceName": session.get("nullpay_invoice_name")
        }
    except NullPayError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "sdk": "python",
        "invoices_loaded": len(invoices),
        "backend_url": base_url,
        "python_version": os.sys.version,
        "ssl_available": hasattr(ssl, "create_default_context")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4001)