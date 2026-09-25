from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import random
from typing import Optional, List, Dict, Any

from models import (
    TransferSearch, RateAlertRequest, SignUpRequest, SignInRequest,
    UpgradeRequest, LockToggleRequest
)
from global_data import (
    ALL_COUNTRIES, USD_RATES, get_cross_rate, normalize_country_code, GLOBAL_PROVIDERS_CATALOG
)
from engine import find_transfer_options, get_architecture_trace
from auth_service import (
    sign_up_user, sign_in_user, upgrade_user_plan,
    get_all_users_for_admin, toggle_user_lock, OWNER_EMAIL,
    GLOBAL_TRIAL_LOCK, USERS_DB
)

app = FastAPI(
    title="Global Money Transfer Search API",
    description="Intelligent search and pricing comparison platform across all global remittance corridors with authentication and Pro tiers.",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "Global Transfer Search",
        "totalCountries": len(ALL_COUNTRIES),
        "totalProviders": len(GLOBAL_PROVIDERS_CATALOG),
        "ownerEmail": OWNER_EMAIL,
        "globalTrialLock": GLOBAL_TRIAL_LOCK,
        "version": "2.1.0"
    }

# --- Authentication Endpoints ---

@app.post("/api/auth/signup")
def api_signup(req: SignUpRequest):
    try:
        user = sign_up_user(
            name=req.name,
            email=req.email,
            country_code=req.countryCode,
            mobile=req.mobileNumber,
            password=req.password
        )
        return {"success": True, "user": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/signin")
def api_signin(req: SignInRequest):
    try:
        user = sign_in_user(email=req.email, password=req.password)
        return {"success": True, "user": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/upgrade")
def api_upgrade(req: UpgradeRequest):
    try:
        user = upgrade_user_plan(email=req.email, plan=req.plan)
        return {
            "success": True,
            "message": f"Successfully upgraded to {user['planName']}!",
            "user": user
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/pricing/plans")
def get_pricing_plans():
    return {
        "plans": [
            {
                "id": "individual",
                "name": "Pro Individual",
                "priceUSD": 99,
                "interval": "month",
                "stripeUrl": "https://buy.stripe.com/test_4gM28j1T84dLg9x1VY2oE0d",
                "features": [
                    "Unlimited 195+ Country Searches",
                    "Real-Time FX Rate Feed & Alerts",
                    "Arbitrage & Hidden Markup Calculator",
                    "Instant Payout Verification",
                    "Direct Remittance Links to 25 Providers"
                ]
            },
            {
                "id": "business",
                "name": "Pro Business",
                "priceUSD": 199,
                "interval": "month",
                "stripeUrl": "https://buy.stripe.com/test_bJe3cn55k4dL5uTeIK2oE0e",
                "features": [
                    "Everything in Individual",
                    "Multi-Entity Corporate Transfers",
                    "Treasury Bulk Remittance Routing",
                    "Full REST API & Webhook Access",
                    "Dedicated FX Broker Desk"
                ]
            }
        ]
    }

# --- Admin & Owner Endpoints ---

@app.get("/api/admin/users")
def api_admin_users(email: str = Query(...)):
    try:
        data = get_all_users_for_admin(email)
        return data
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/admin/toggle-lock")
def api_toggle_lock(req: LockToggleRequest):
    try:
        res = toggle_user_lock(
            admin_email=req.adminEmail,
            target_user_id=req.targetUserId,
            is_locked=req.isLocked
        )
        return res
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Corridor & Search Endpoints ---

@app.get("/api/countries")
def get_countries():
    return {
        "count": len(ALL_COUNTRIES),
        "countries": ALL_COUNTRIES
    }

@app.get("/api/providers")
def get_providers():
    return {
        "count": len(GLOBAL_PROVIDERS_CATALOG),
        "providers": GLOBAL_PROVIDERS_CATALOG
    }

@app.post("/api/search")
def api_search(search: TransferSearch, x_user_email: Optional[str] = Header(None)):
    # Check if user is locked by admin
    if x_user_email:
        clean_email = x_user_email.strip().lower()
        if clean_email in USERS_DB:
            u = USERS_DB[clean_email]
            if u.get("isLocked", False):
                raise HTTPException(status_code=403, detail="Your account search access has been locked by admin. Please upgrade or contact support.")
            if GLOBAL_TRIAL_LOCK and u.get("role") != "owner" and u.get("plan") not in ["individual", "business"]:
                raise HTTPException(status_code=403, detail="Free trial period has ended. Please upgrade to Pro Individual ($99/mo) or Pro Business ($199/mo) to continue.")
            u["searchesCount"] = u.get("searchesCount", 0) + 1

    try:
        results = find_transfer_options(None, search)
        return {
            "query": search.dict(),
            "totalFound": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/architecture/trace")
def api_architecture_trace(search: TransferSearch):
    try:
        trace = get_architecture_trace(search)
        return trace
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/rates/history")
def get_rate_history(
    sendCurrency: str = Query("AED"),
    receiveCurrency: str = Query("PHP"),
    days: int = Query(30)
):
    base_rate = get_cross_rate(sendCurrency, receiveCurrency)
    history = []
    current_val = base_rate * 0.985
    
    for i in range(days):
        day_index = days - i
        noise = (random.random() - 0.48) * (base_rate * 0.008)
        current_val = max(base_rate * 0.95, min(base_rate * 1.05, current_val + noise))
        history.append({
            "day": f"Day -{day_index}",
            "date": f"2026-09-{max(1, 25 - day_index + 1):02d}",
            "rate": round(current_val, 4)
        })
        
    history[-1]["rate"] = base_rate
    
    return {
        "pair": f"{sendCurrency.upper()}_{receiveCurrency.upper()}",
        "currentRate": base_rate,
        "change30d": round(((base_rate - history[0]["rate"]) / history[0]["rate"]) * 100, 2),
        "high": max(h["rate"] for h in history),
        "low": min(h["rate"] for h in history),
        "history": history
    }

@app.post("/api/alerts/subscribe")
def subscribe_rate_alert(req: RateAlertRequest):
    return {
        "success": True,
        "message": f"Rate alert active! We will notify {req.email} when 1 {req.sendCurrency} hits {req.targetRate} {req.receiveCurrency}.",
        "subscription": req.dict()
    }

# Mount static files
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
