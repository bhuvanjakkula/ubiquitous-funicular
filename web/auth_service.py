"""
Authentication and Subscription Management Service
Handles Sign Up, Sign In, Pro Tiers ($99 Individual, $199 Business), and Owner Admin Access.
Owner Email: bhuvanjakkula@gmail.com (Lifetime free VIP access & user management)
"""

from typing import Dict, List, Any, Optional
import time
import hashlib

OWNER_EMAIL = "bhuvanjakkula@gmail.com"

def hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode('utf-8')).hexdigest()

# In-memory User Database with pre-seeded owner and demo users
USERS_DB: Dict[str, Dict[str, Any]] = {
    OWNER_EMAIL: {
        "id": "owner-1",
        "name": "Bhuvan Jakkula (Platform Owner)",
        "email": OWNER_EMAIL,
        "countryCode": "+971",
        "mobileNumber": "501234567",
        "passwordHash": hash_pw("admin123"), # default owner pass, can login directly
        "role": "owner",
        "plan": "owner_vip", # Lifetime free VIP
        "planName": "Owner SuperAdmin VIP",
        "priceMonthly": 0,
        "status": "active",
        "isLocked": False,
        "createdAt": "2026-09-01T00:00:00Z",
        "searchesCount": 142
    },
    "demo.user@example.com": {
        "id": "user-demo-1",
        "name": "Alex Mercer",
        "email": "demo.user@example.com",
        "countryCode": "+1",
        "mobileNumber": "4155550198",
        "passwordHash": hash_pw("demo123"),
        "role": "customer",
        "plan": "trial",
        "planName": "Free Trial (Active)",
        "priceMonthly": 0,
        "status": "trial",
        "isLocked": False,
        "createdAt": "2026-09-20T10:15:00Z",
        "searchesCount": 28
    },
    "maria.santos@gmail.com": {
        "id": "user-demo-2",
        "name": "Maria Santos",
        "email": "maria.santos@gmail.com",
        "countryCode": "+63",
        "mobileNumber": "9171234567",
        "passwordHash": hash_pw("maria123"),
        "role": "customer",
        "plan": "individual",
        "planName": "Pro Individual ($99/mo)",
        "priceMonthly": 99,
        "status": "active",
        "isLocked": False,
        "createdAt": "2026-09-15T08:30:00Z",
        "searchesCount": 115
    },
    "corporate@globalfin.com": {
        "id": "user-demo-3",
        "name": "Global Treasury Corp",
        "email": "corporate@globalfin.com",
        "countryCode": "+44",
        "mobileNumber": "7911123456",
        "passwordHash": hash_pw("corp123"),
        "role": "customer",
        "plan": "business",
        "planName": "Pro Business ($199/mo)",
        "priceMonthly": 199,
        "status": "active",
        "isLocked": False,
        "createdAt": "2026-09-10T14:20:00Z",
        "searchesCount": 384
    }
}

# Global trial lock flag: if True, users without Pro ($99 or $199) or owner cannot access search
GLOBAL_TRIAL_LOCK = False

def sign_up_user(name: str, email: str, country_code: str, mobile: str, password: str) -> Dict[str, Any]:
    norm_email = email.strip().lower()
    if norm_email in USERS_DB:
        raise ValueError("An account with this email already exists. Please Sign In.")
    
    is_owner = (norm_email == OWNER_EMAIL.lower())
    
    new_user = {
        "id": f"user-{int(time.time()*1000)}",
        "name": name.strip(),
        "email": norm_email,
        "countryCode": country_code.strip(),
        "mobileNumber": mobile.strip(),
        "passwordHash": hash_pw(password),
        "role": "owner" if is_owner else "customer",
        "plan": "owner_vip" if is_owner else "trial",
        "planName": "Owner SuperAdmin VIP" if is_owner else "Free Trial (Active)",
        "priceMonthly": 0,
        "status": "active" if is_owner else "trial",
        "isLocked": False,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "searchesCount": 0
    }
    
    USERS_DB[norm_email] = new_user
    
    # Return user profile without password hash
    profile = {k: v for k, v in new_user.items() if k != "passwordHash"}
    profile["isOwner"] = is_owner
    return profile

def sign_in_user(email: str, password: str) -> Dict[str, Any]:
    norm_email = email.strip().lower()
    is_owner = (norm_email == OWNER_EMAIL.lower())
    
    # If owner logging in for the first time, auto-create account if not present
    if is_owner and norm_email not in USERS_DB:
        return sign_up_user("Bhuvan Jakkula (Owner)", OWNER_EMAIL, "+971", "501234567", password)
        
    if norm_email not in USERS_DB:
        raise ValueError("No account found with this email. Please Sign Up.")
        
    user = USERS_DB[norm_email]
    
    # Special password bypass for owner or match hash
    if not is_owner and user["passwordHash"] != hash_pw(password):
        raise ValueError("Incorrect password. Please try again.")
        
    profile = {k: v for k, v in user.items() if k != "passwordHash"}
    profile["isOwner"] = is_owner
    return profile

def upgrade_user_plan(email: str, plan: str) -> Dict[str, Any]:
    norm_email = email.strip().lower()
    if norm_email not in USERS_DB:
        raise ValueError("User not found.")
        
    user = USERS_DB[norm_email]
    if user["email"] == OWNER_EMAIL:
        return user # Owner already has permanent VIP free access
        
    if plan == "individual":
        user["plan"] = "individual"
        user["planName"] = "Pro Individual ($99/mo)"
        user["priceMonthly"] = 99
        user["status"] = "active"
        user["isLocked"] = False
    elif plan == "business":
        user["plan"] = "business"
        user["planName"] = "Pro Business ($199/mo)"
        user["priceMonthly"] = 199
        user["status"] = "active"
        user["isLocked"] = False
    else:
        raise ValueError("Invalid plan. Choose 'individual' ($99) or 'business' ($199).")
        
    return {k: v for k, v in user.items() if k != "passwordHash"}

def get_all_users_for_admin(admin_email: str) -> Dict[str, Any]:
    norm_email = admin_email.strip().lower()
    if norm_email != OWNER_EMAIL.lower():
        raise PermissionError("Access denied. Only the platform owner (bhuvanjakkula@gmail.com) can access this dashboard.")
        
    user_list = []
    for u in USERS_DB.values():
        clean = {k: v for k, v in u.items() if k != "passwordHash"}
        user_list.append(clean)
        
    return {
        "ownerEmail": OWNER_EMAIL,
        "globalTrialLock": GLOBAL_TRIAL_LOCK,
        "totalUsers": len(user_list),
        "activeSubscribers": len([u for u in user_list if u["plan"] in ["individual", "business"]]),
        "totalRevenueMonthlyUSD": sum(u["priceMonthly"] for u in user_list),
        "users": user_list
    }

def toggle_user_lock(admin_email: str, target_user_id: Optional[str], is_locked: bool) -> Dict[str, Any]:
    norm_email = admin_email.strip().lower()
    if norm_email != OWNER_EMAIL.lower():
        raise PermissionError("Access denied. Only the platform owner can lock or unlock users.")
        
    global GLOBAL_TRIAL_LOCK
    
    if target_user_id == "GLOBAL":
        GLOBAL_TRIAL_LOCK = is_locked
        return {
            "success": True,
            "message": f"Global trial lock set to: {is_locked}. {'Free trial users are now locked and must upgrade.' if is_locked else 'All users can access search for trial.'}",
            "globalTrialLock": GLOBAL_TRIAL_LOCK
        }
        
    found = False
    for u in USERS_DB.values():
        if u["id"] == target_user_id or u["email"].lower() == target_user_id.lower():
            if u["email"].lower() == OWNER_EMAIL.lower():
                raise ValueError("Cannot lock the platform owner.")
            u["isLocked"] = is_locked
            found = True
            break
            
    if not found:
        raise ValueError(f"User '{target_user_id}' not found.")
        
    return {
        "success": True,
        "message": f"User status updated. Locked: {is_locked}",
        "targetUserId": target_user_id,
        "isLocked": is_locked
    }
