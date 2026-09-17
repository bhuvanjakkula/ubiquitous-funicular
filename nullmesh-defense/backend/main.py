from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from api import CDTRequest, run_analysis, find_repair, InferRequest, infer_endpoint
import auth
import stripe_webhook

app = FastAPI(title="NULLMESH Defense Engine", version="v0")

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(stripe_webhook.router, prefix="/api/v1/webhooks", tags=["webhooks"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "message": "NULLMESH Defense Engine API. Visit /docs for Swagger UI."}

@app.post("/api/v1/analyze", dependencies=[Depends(auth.require_subscription)])
def analyze(req: CDTRequest):
    return run_analysis(req)

@app.post("/api/v1/repair", dependencies=[Depends(auth.require_subscription)])
async def repair_endpoint(req: CDTRequest):
    return find_repair(req)

@app.post("/api/v1/infer", dependencies=[Depends(auth.require_subscription)])
async def inference_endpoint(req: InferRequest):
    return infer_endpoint(req)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
