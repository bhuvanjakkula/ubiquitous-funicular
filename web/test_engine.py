import sys
import io

# Set standard output to UTF-8
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from models import TransferSearch
from engine import find_transfer_options, get_architecture_trace
from database import PROVIDERS

def test_search():
    search = TransferSearch(
        fromCountry="UAE",
        toCountry="Philippines",
        amount=5000.0,
        sendCurrency="AED",
        receiveCurrency="PHP",
        priority="most_received"
    )

    results = find_transfer_options(PROVIDERS, search)
    print(f"=== SEARCH RESULTS ({len(results)} found) ===")
    for r in results:
        print(f"[{r['providerName']}] Gets: PHP {r['recipientGets']:,.2f} | Fee: AED {r['fee']} | Rate: {r['exchangeRate']} | Time: {r['speedLabel']}")

    trace = get_architecture_trace(search)
    print("\n=== ARCHITECTURE TRACE ===")
    print("Step 1 Query:", trace["step1_user_query"])
    print("Step 2 DB Lookup:", trace["step2_databases"]["providers_matching_route"])
    print("Step 3 Rules Passed:", trace["step3_rules_engine"]["passed_providers"])
    print("Step 4 Pricing Top Payout:", trace["step4_pricing_engine"]["top_recipient_payout"])

if __name__ == "__main__":
    test_search()
