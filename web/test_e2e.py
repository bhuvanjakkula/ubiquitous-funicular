import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import urllib.request
import json

def run_e2e_tests():
    print("========================================")
    print("GLOBAL TRANSFER SEARCH - E2E API & UI TEST")
    print("========================================")

    # 1. Health check
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health") as resp:
        health = json.loads(resp.read().decode('utf-8'))
        assert health["status"] == "healthy"
        print("[PASS] 1. API Health Check OK:", health)

    # 2. Static HTML check
    with urllib.request.urlopen("http://127.0.0.1:8000/") as resp:
        html = resp.read().decode('utf-8')
        assert "Global Transfer Search" in html
        assert "Sending from" in html
        assert "Sending to" in html
        assert "Amount" in html
        assert "Recipient receives via" in html
        assert "Priority" in html
        assert "SEARCH TRANSFERS" in html
        print("[PASS] 2. Frontend HTML & UI Controls OK")

    # 3. Search API Test (UAE -> Philippines, AED 5000)
    search_payload = {
        "fromCountry": "UAE",
        "toCountry": "Philippines",
        "amount": 5000,
        "sendCurrency": "AED",
        "receiveCurrency": "PHP",
        "priority": "most_received"
    }

    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/search",
        data=json.dumps(search_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        search_res = json.loads(resp.read().decode('utf-8'))
        results = search_res["results"]
        assert len(results) > 0
        print(f"[PASS] 3. Search API OK: {len(results)} providers returned for UAE ➔ PH (AED 5,000)")
        
        top = results[0]
        print(f"       Top Provider: {top['providerName']}")
        print(f"       Recipient Gets: PHP {top['recipientGets']:,.2f}")
        print(f"       Fee: AED {top['fee']} | Rate: {top['exchangeRate']}")
        print(f"       Speed: {top['speedLabel']}")
        print(f"       Transfer URL: {top['transferUrl']}")

    # 4. Architecture Trace Test
    req_trace = urllib.request.Request(
        "http://127.0.0.1:8000/api/architecture/trace",
        data=json.dumps(search_payload).encode('utf-8'),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req_trace) as resp:
        trace_res = json.loads(resp.read().decode('utf-8'))
        assert "step1_user_query" in trace_res
        assert "step2_databases" in trace_res
        assert "step3_rules_engine" in trace_res
        assert "step4_pricing_engine" in trace_res
        assert "step5_ranked_results" in trace_res
        print("[PASS] 4. Pipeline Architecture Trace OK (5 steps verified)")

    # 5. Rate History Test
    with urllib.request.urlopen("http://127.0.0.1:8000/api/rates/history?sendCurrency=AED&receiveCurrency=PHP&days=30") as resp:
        history = json.loads(resp.read().decode('utf-8'))
        assert len(history["history"]) == 30
        print(f"[PASS] 5. FX Rate History OK (Current: 1 AED = {history['currentRate']} PHP)")

    print("\nALL SYSTEM TESTS PASSED SUCCESSFULLY! 🚀")

if __name__ == "__main__":
    run_e2e_tests()
