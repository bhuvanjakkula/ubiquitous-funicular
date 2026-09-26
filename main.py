import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="GOX Platform")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
if not os.path.exists(PUBLIC_DIR):
    PUBLIC_DIR = BASE_DIR

@app.get("/health")
def health():
    return {"status": "ok", "platform": "GOX Institutional Liquidity Platform"}

@app.get("/v1/overview")
def overview():
    return {
        "stats": {
            "settledVolumeMinor": 2400000000,
            "totalSecurities": 4,
            "verifiedParticipants": 4,
            "activeOrders": 5
        }
    }

@app.get("/{full_path:path}")
def catch_all(full_path: str = ""):
    if full_path:
        target = os.path.join(PUBLIC_DIR, full_path)
        if os.path.isfile(target):
            return FileResponse(target)
    index_file = os.path.join(PUBLIC_DIR, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    return JSONResponse({"status": "running", "service": "GOX Platform"})
