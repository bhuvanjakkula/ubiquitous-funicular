from api import infer_endpoint, InferRequest
import json

req = InferRequest(scenario="a2ad", target_agent="Enemy-Commander")
try:
    res = infer_endpoint(req)
    print(json.dumps(res, indent=2))
except Exception as e:
    import traceback
    traceback.print_exc()
