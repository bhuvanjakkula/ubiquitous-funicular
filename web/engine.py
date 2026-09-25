from typing import List, Dict, Any, Optional
from models import TransferProvider, TransferSearch, TransferCorridor
from global_data import (
    ALL_COUNTRIES, COUNTRY_BY_CODE, USD_RATES, get_cross_rate,
    normalize_country_code, GLOBAL_PROVIDERS_CATALOG
)

def find_transfer_options(
    providers: Any,
    search: TransferSearch
) -> List[Dict[str, Any]]:
    """
    Comprehensive Global Transfer Search Algorithm:
    - Supports sending from ALL 75+ countries and sending to ALL 75+ countries worldwide.
    - Evaluates 18 global remittance providers for corridor eligibility.
    - Uses exact cross-currency rates and provider margin models.
    - Sorts by 'most_received', 'cheapest', or 'fastest'.
    """
    results = []

    from_code = normalize_country_code(search.fromCountry)
    to_code = normalize_country_code(search.toCountry)

    from_info = COUNTRY_BY_CODE.get(from_code, {"currency": "USD", "name": search.fromCountry})
    to_info = COUNTRY_BY_CODE.get(to_code, {"currency": "PHP", "name": search.toCountry})

    send_curr = search.sendCurrency.upper() if search.sendCurrency else from_info["currency"]
    recv_curr = search.receiveCurrency.upper() if search.receiveCurrency else to_info["currency"]

    # Calculate real-world mid-market benchmark rate
    mid_market_rate = get_cross_rate(send_curr, recv_curr)

    # Conversion rate from USD to Send Currency
    usd_to_send = USD_RATES.get(send_curr, 1.0)

    for prov in GLOBAL_PROVIDERS_CATALOG:
        # 1. Eligibility Check: Sending Country
        if not prov.get("globalSend", False):
            if from_code not in prov.get("sendCountries", []):
                continue

        # 2. Eligibility Check: Receiving Country
        if not prov.get("globalReceive", False):
            if to_code not in prov.get("receiveCountries", []):
                continue

        # 3. Eligibility Check: Receive Method Filter
        if search.receiveMethod:
            if search.receiveMethod not in prov.get("receiveMethods", []):
                continue

        # 4. Pricing & Fee Math
        # Calculate fee in Send Currency
        fee_pct = prov.get("feePct", 0.0)
        flat_fee_send = prov.get("flatFeeUSD", 0.0) * usd_to_send
        total_fee = round((search.amount * fee_pct) + flat_fee_send, 2)

        # Min amount check (must have something left after fee)
        if search.amount <= total_fee:
            continue

        # Calculate Provider Exchange Rate with FX Margin
        markup_pct = prov.get("fxMarkupPct", 0.0)
        provider_rate = round(mid_market_rate * (1.0 - markup_pct), 4)

        amount_after_fee = search.amount - total_fee
        recipient_gets = round(amount_after_fee * provider_rate, 2)

        est_minutes = prov.get("estimatedMinutes", 30)
        speed_label = prov.get("speedLabel")
        if not speed_label:
            if est_minutes <= 5:
                speed_label = "⚡ Instant (~5 mins)"
            elif est_minutes <= 60:
                speed_label = f"🕒 Within {est_minutes} mins"
            elif est_minutes <= 1440:
                speed_label = "📅 Same Day (~few hours)"
            else:
                days = round(est_minutes / 1440)
                speed_label = f"🗓️ {days} Business Days"

        # Generate direct deep-link
        raw_template = prov.get("urlTemplate", prov["website"])
        transfer_url = raw_template.replace("{from}", from_code).replace("{to}", to_code).replace("{amount}", str(int(search.amount)))

        # Analytics
        hidden_fx_cost = round(amount_after_fee * (mid_market_rate - provider_rate), 2)
        total_cost = round(total_fee + (hidden_fx_cost / mid_market_rate if mid_market_rate > 0 else 0), 2)

        results.append({
            "providerId": prov["id"],
            "providerName": prov["name"],
            "providerWebsite": prov["website"],
            "logoText": prov.get("logoText", prov["name"][:4]),
            "logoColor": prov.get("logoColor", "#3b82f6"),
            "fee": total_fee,
            "exchangeRate": provider_rate,
            "recipientGets": recipient_gets,
            "estimatedMinutes": est_minutes,
            "speedLabel": speed_label,
            "transferMethods": prov.get("transferMethods", ["bank", "card"]),
            "receiveMethods": prov.get("receiveMethods", ["bank", "wallet"]),
            "requirements": prov.get("requirements", {}),
            "transferUrl": transfer_url,
            "midMarketRate": mid_market_rate,
            "fxMarkupPercentage": round(markup_pct * 100, 2),
            "hiddenFxCost": hidden_fx_cost,
            "totalCost": total_cost,
            "badges": []
        })

    # Sort according to priority
    if search.priority == "cheapest":
        results.sort(key=lambda x: x["fee"])
    elif search.priority == "fastest":
        results.sort(key=lambda x: x["estimatedMinutes"])
    elif search.priority == "most_received":
        results.sort(key=lambda x: x["recipientGets"], reverse=True)
    else:
        results.sort(key=lambda x: x["recipientGets"], reverse=True)

    # Dynamic Badging
    if results:
        max_payout = max(r["recipientGets"] for r in results)
        min_fee = min(r["fee"] for r in results)
        min_time = min(r["estimatedMinutes"] for r in results)

        for r in results:
            if r["recipientGets"] == max_payout:
                r["badges"].append("🏆 Most Received")
            if r["fee"] == 0:
                r["badges"].append("🏷️ Zero Transfer Fee")
            elif r["fee"] == min_fee and min_fee > 0:
                r["badges"].append("💰 Lowest Fee")
            if r["estimatedMinutes"] == min_time and min_time <= 10:
                r["badges"].append("⚡ Fastest Delivery")
            if r["fxMarkupPercentage"] == 0:
                r["badges"].append("🛡️ True Mid-Market Rate")

    return results

def get_architecture_trace(search: TransferSearch) -> Dict[str, Any]:
    from_code = normalize_country_code(search.fromCountry)
    to_code = normalize_country_code(search.toCountry)
    results = find_transfer_options(None, search)

    return {
        "step1_user_query": {
            "fromCountry": search.fromCountry,
            "fromCode": from_code,
            "toCountry": search.toCountry,
            "toCode": to_code,
            "sendAmount": search.amount,
            "sendCurrency": search.sendCurrency,
            "receiveCurrency": search.receiveCurrency,
            "receiveMethodFilter": search.receiveMethod or "all",
            "priority": search.priority or "most_received"
        },
        "step2_databases": {
            "total_countries_available": len(ALL_COUNTRIES),
            "total_global_providers": len(GLOBAL_PROVIDERS_CATALOG),
            "providers_matching_route": len(results),
            "cross_rate": get_cross_rate(search.sendCurrency, search.receiveCurrency)
        },
        "step3_rules_engine": {
            "eligible_providers_count": len(results),
            "passed_providers": [r["providerName"] for r in results]
        },
        "step4_pricing_engine": {
            "formula": "recipientGets = (amount - fee) * exchangeRate",
            "top_recipient_payout": results[0]["recipientGets"] if results else 0,
            "currency": search.receiveCurrency
        },
        "step5_ranked_results": results
    }
