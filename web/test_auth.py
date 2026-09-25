import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import urllib.request
import json

def test_auth_and_admin():
    print("=== TESTING AUTH & OWNER ADMIN ACCESS ===")

    # 1. Owner Sign In
    owner_payload = json.dumps({
        "email": "bhuvanjakkula@gmail.com",
        "password": "admin123"
    }).encode('utf-8')

    req = urllib.request.Request("http://127.0.0.1:8000/api/auth/signin", data=owner_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        user = res["user"]
        assert user["isOwner"] == True
        assert user["plan"] == "owner_vip"
        assert user["priceMonthly"] == 0
        print("[PASS] 1. Owner bhuvanjakkula@gmail.com Sign In OK (Role: owner, Price: $0 VIP)")

    # 2. Owner Admin Users Telemetry
    req_admin = urllib.request.Request("http://127.0.0.1:8000/api/admin/users?email=bhuvanjakkula@gmail.com")
    with urllib.request.urlopen(req_admin) as resp:
        admin_data = json.loads(resp.read().decode('utf-8'))
        assert admin_data["ownerEmail"] == "bhuvanjakkula@gmail.com"
        print(f"[PASS] 2. Owner Dashboard Telemetry OK: {admin_data['totalUsers']} users, {admin_data['activeSubscribers']} subscribers, ${admin_data['totalRevenueMonthlyUSD']} MRR")

    # 3. New Customer Sign Up with Country Code & Mobile
    import time
    customer_payload = json.dumps({
        "name": "Sarah Connor",
        "email": f"sarah.c_{int(time.time()*1000)}@test.com",
        "countryCode": "+971",
        "mobileNumber": "509876543",
        "password": "password123"
    }).encode('utf-8')

    req_signup = urllib.request.Request("http://127.0.0.1:8000/api/auth/signup", data=customer_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req_signup) as resp:
        new_u = json.loads(resp.read().decode('utf-8'))["user"]
        assert new_u["plan"] == "trial"
        print(f"[PASS] 3. Customer Sign Up OK: {new_u['name']} ({new_u['countryCode']} {new_u['mobileNumber']}), Plan: {new_u['plan']}")

    # 4. Customer Upgrade to Pro Individual ($99 USD/mo)
    upgrade_payload = json.dumps({
        "email": new_u["email"],
        "plan": "individual"
    }).encode('utf-8')

    req_up = urllib.request.Request("http://127.0.0.1:8000/api/auth/upgrade", data=upgrade_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req_up) as resp:
        up_res = json.loads(resp.read().decode('utf-8'))["user"]
        assert up_res["plan"] == "individual"
        assert up_res["priceMonthly"] == 99
        print(f"[PASS] 4. Pro Upgrade OK: {up_res['planName']}, Price: ${up_res['priceMonthly']}/mo")

    # 5. Owner Toggle Trial Lock
    lock_payload = json.dumps({
        "adminEmail": "bhuvanjakkula@gmail.com",
        "targetUserId": "GLOBAL",
        "isLocked": False
    }).encode('utf-8')

    req_lock = urllib.request.Request("http://127.0.0.1:8000/api/admin/toggle-lock", data=lock_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req_lock) as resp:
        lock_res = json.loads(resp.read().decode('utf-8'))
        assert lock_res["success"] == True
        print("[PASS] 5. Owner Global Trial Lock Toggle OK:", lock_res["message"])

    print("\nALL AUTH, PRO SUBSCRIPTION, AND OWNER ADMIN TESTS PASSED! 🚀")

if __name__ == "__main__":
    test_auth_and_admin()
