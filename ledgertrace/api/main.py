from fastapi import FastAPI
from ledgertrace import __version__

app = FastAPI(title="LedgerTrace", version=__version__)

@app.get("/health")
def health():
    return {"ok": True, "version": __version__}
