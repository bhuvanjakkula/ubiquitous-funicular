from typing import List, Dict, Any
from models import TransferProvider, TransferCorridor, TransferRequirements

# Country Code & Alias mapping dictionary
COUNTRY_ALIASES: Dict[str, str] = {
    "AE": "AE", "UAE": "AE", "UNITED ARAB EMIRATES": "AE",
    "PH": "PH", "PHILIPPINES": "PH",
    "IN": "IN", "INDIA": "IN",
    "PK": "PK", "PAKISTAN": "PK",
    "BD": "BD", "BANGLADESH": "BD",
    "EG": "EG", "EGYPT": "EG",
    "US": "US", "USA": "US", "UNITED STATES": "US",
    "MX": "MX", "MEXICO": "MX",
    "GB": "GB", "UK": "GB", "UNITED KINGDOM": "GB",
    "SA": "SA", "KSA": "SA", "SAUDI ARABIA": "SA",
    "CA": "CA", "CANADA": "CA",
    "SG": "SG", "SINGAPORE": "SG",
    "EU": "EU", "EUROZONE": "EU", "EUROPE": "EU",
    "AU": "AU", "AUSTRALIA": "AU",
}

def normalize_country(c: str) -> str:
    if not c:
        return ""
    clean = c.strip().upper()
    return COUNTRY_ALIASES.get(clean, clean)

# Benchmark Mid-Market Rates (Corridor DB)
MID_MARKET_RATES: Dict[str, float] = {
    "AED_PHP": 15.38,   # 1 AED = 15.38 PHP
    "AED_INR": 22.75,   # 1 AED = 22.75 INR
    "AED_PKR": 75.80,   # 1 AED = 75.80 PKR
    "AED_BDT": 32.65,   # 1 AED = 32.65 BDT
    "AED_EGP": 13.25,   # 1 AED = 13.25 EGP
    
    "USD_PHP": 56.45,   # 1 USD = 56.45 PHP
    "USD_MXN": 18.20,   # 1 USD = 18.20 MXN
    "USD_INR": 83.50,   # 1 USD = 83.50 INR
    
    "GBP_PHP": 71.85,   # 1 GBP = 71.85 PHP
    "GBP_INR": 106.20,  # 1 GBP = 106.20 INR
    "GBP_PKR": 354.50,  # 1 GBP = 354.50 PKR
    
    "SAR_PHP": 15.05,   # 1 SAR = 15.05 PHP
    "SAR_EGP": 12.95,   # 1 SAR = 12.95 EGP
    "SAR_INR": 22.25,   # 1 SAR = 22.25 INR
    
    "EUR_PHP": 61.40,   # 1 EUR = 61.40 PHP
    "CAD_PHP": 41.60,   # 1 CAD = 41.60 PHP
    "SGD_PHP": 42.15,   # 1 SGD = 42.15 PHP
    "AUD_PHP": 37.80,   # 1 AUD = 37.80 PHP
}

# Rich Country Directory
COUNTRIES = [
    {"code": "AE", "name": "UAE", "fullName": "United Arab Emirates", "currency": "AED", "flag": "🇦🇪", "isSend": True, "isReceive": False},
    {"code": "PH", "name": "Philippines", "fullName": "Philippines", "currency": "PHP", "flag": "🇵🇭", "isSend": False, "isReceive": True},
    {"code": "IN", "name": "India", "fullName": "India", "currency": "INR", "flag": "🇮🇳", "isSend": False, "isReceive": True},
    {"code": "PK", "name": "Pakistan", "fullName": "Pakistan", "currency": "PKR", "flag": "🇵🇰", "isSend": False, "isReceive": True},
    {"code": "BD", "name": "Bangladesh", "fullName": "Bangladesh", "currency": "BDT", "flag": "🇧🇩", "isSend": False, "isReceive": True},
    {"code": "EG", "name": "Egypt", "fullName": "Egypt", "currency": "EGP", "flag": "🇪🇬", "isSend": False, "isReceive": True},
    {"code": "US", "name": "USA", "fullName": "United States", "currency": "USD", "flag": "🇺🇸", "isSend": True, "isReceive": False},
    {"code": "MX", "name": "Mexico", "fullName": "Mexico", "currency": "MXN", "flag": "🇲🇽", "isSend": False, "isReceive": True},
    {"code": "GB", "name": "UK", "fullName": "United Kingdom", "currency": "GBP", "flag": "🇬🇧", "isSend": True, "isReceive": False},
    {"code": "SA", "name": "Saudi Arabia", "fullName": "Saudi Arabia", "currency": "SAR", "flag": "🇸🇦", "isSend": True, "isReceive": False},
    {"code": "CA", "name": "Canada", "fullName": "Canada", "currency": "CAD", "flag": "🇨🇦", "isSend": True, "isReceive": False},
    {"code": "SG", "name": "Singapore", "fullName": "Singapore", "currency": "SGD", "flag": "🇸🇬", "isSend": True, "isReceive": True},
    {"code": "EU", "name": "Eurozone", "fullName": "European Union", "currency": "EUR", "flag": "🇪🇺", "isSend": True, "isReceive": False},
    {"code": "AU", "name": "Australia", "fullName": "Australia", "currency": "AUD", "flag": "🇦🇺", "isSend": True, "isReceive": False},
]

# Provider DB with ISO country codes and full corridor specifications
PROVIDERS: List[TransferProvider] = [
    # 1. WISE
    TransferProvider(
        id="wise",
        name="Wise (TransferWise)",
        website="https://wise.com",
        logoUrl="https://assets.streamlinehq.com/image/private/w_300,h_300,ar_1:1,c_fill,f_auto/v1/icons/logos/wise-19069502.png",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=10.0,
                maxAmount=100000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank", "wallet"],
                fee=14.50,
                exchangeRate=15.380, # True mid-market rate
                estimatedMinutes=15,
                requirements=TransferRequirements(
                    sender=["Emirates ID / Passport", "UAE Bank Account or Debit Card"],
                    recipient=["Philippine Bank Account (BDO, BPI, Metrobank) or GCash / Maya Mobile Number"]
                ),
                transferUrl="https://wise.com/send?from=AED&to=PHP&amount=5000"
            ),
            TransferCorridor(
                fromCountry="AE",
                toCountry="IN",
                sendCurrency="AED",
                receiveCurrency="INR",
                minAmount=10.0,
                maxAmount=150000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank", "wallet"],
                fee=12.00,
                exchangeRate=22.750,
                estimatedMinutes=10,
                requirements=TransferRequirements(
                    sender=["Emirates ID", "UAE Bank Details"],
                    recipient=["Indian Bank Account (IFSC) or UPI ID"]
                ),
                transferUrl="https://wise.com/send?from=AED&to=INR&amount=5000"
            ),
            TransferCorridor(
                fromCountry="US",
                toCountry="PH",
                sendCurrency="USD",
                receiveCurrency="PHP",
                minAmount=5.0,
                maxAmount=50000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank", "wallet"],
                fee=4.80,
                exchangeRate=56.450,
                estimatedMinutes=15,
                requirements=TransferRequirements(
                    sender=["SSN/ITIN", "US Bank Account or Debit Card"],
                    recipient=["Bank Account or GCash / Maya Mobile Number"]
                ),
                transferUrl="https://wise.com/send?from=USD&to=PHP&amount=1000"
            ),
            TransferCorridor(
                fromCountry="GB",
                toCountry="PH",
                sendCurrency="GBP",
                receiveCurrency="PHP",
                minAmount=5.0,
                maxAmount=50000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank", "wallet"],
                fee=3.50,
                exchangeRate=71.850,
                estimatedMinutes=10,
                requirements=TransferRequirements(
                    sender=["UK ID / Driving License", "UK Bank Account"],
                    recipient=["Bank Account or GCash / Maya Mobile"]
                ),
                transferUrl="https://wise.com/send?from=GBP&to=PHP&amount=1000"
            ),
        ]
    ),

    # 2. REMITLY
    TransferProvider(
        id="remitly",
        name="Remitly",
        website="https://remitly.com",
        logoUrl="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Remitly_Logo_2022.svg/320px-Remitly_Logo_2022.svg.png",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=20.0,
                maxAmount=40000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=0.0, # Zero fee promo on express!
                exchangeRate=15.340,
                estimatedMinutes=5, # Instant
                requirements=TransferRequirements(
                    sender=["Emirates ID", "Mobile Phone Verification"],
                    recipient=["Full legal name matching Philippine Gov ID", "GCash/Maya number or Cash Pickup Agent (Cebuana, Palawan Express, MLhuillier)"]
                ),
                transferUrl="https://www.remitly.com/ae/en/philippines?amount=5000&send_currency=AED"
            ),
            TransferCorridor(
                fromCountry="US",
                toCountry="PH",
                sendCurrency="USD",
                receiveCurrency="PHP",
                minAmount=10.0,
                maxAmount=30000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=1.99,
                exchangeRate=56.280,
                estimatedMinutes=5,
                requirements=TransferRequirements(
                    sender=["US Gov ID / SSN"],
                    recipient=["Government ID for Cash Pickup / Bank / GCash"]
                ),
                transferUrl="https://www.remitly.com/us/en/philippines?amount=1000"
            ),
            TransferCorridor(
                fromCountry="US",
                toCountry="MX",
                sendCurrency="USD",
                receiveCurrency="MXN",
                minAmount=10.0,
                maxAmount=30000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=2.99,
                exchangeRate=18.150,
                estimatedMinutes=5,
                requirements=TransferRequirements(
                    sender=["US Phone", "Debit Card / Bank"],
                    recipient=["INE / IFE ID for OXXO or Elektra pickup, or CLABE for bank"]
                ),
                transferUrl="https://www.remitly.com/us/en/mexico?amount=1000"
            ),
        ]
    ),

    # 3. AL ANSARI EXCHANGE (UAE Leading Remittance Specialist)
    TransferProvider(
        id="al-ansari",
        name="Al Ansari Exchange",
        website="https://alansariexchange.com",
        logoUrl="https://alansariexchange.com/wp-content/themes/alansari/assets/images/logo.svg",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=50.0,
                maxAmount=100000.0,
                transferMethods=["bank", "card", "cash"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=15.00,
                exchangeRate=15.365,
                estimatedMinutes=30,
                requirements=TransferRequirements(
                    sender=["Original Emirates ID", "UAE mobile number"],
                    recipient=["Valid Philippine ID (Passport, UMID, Driver's License)", "Cash pickup at Cebuana Lhuillier / Palawan / M Lhuillier or GCash account"]
                ),
                transferUrl="https://alansariexchange.com/online-remittance?from=AED&to=PHP&val=5000"
            ),
            TransferCorridor(
                fromCountry="AE",
                toCountry="IN",
                sendCurrency="AED",
                receiveCurrency="INR",
                minAmount=50.0,
                maxAmount=200000.0,
                transferMethods=["bank", "card", "cash"],
                receiveMethods=["bank", "cash"],
                fee=15.00,
                exchangeRate=22.710,
                estimatedMinutes=15,
                requirements=TransferRequirements(
                    sender=["Emirates ID", "Source of funds declaration if > AED 20,000"],
                    recipient=["Bank account number + IFSC code"]
                ),
                transferUrl="https://alansariexchange.com/online-remittance?from=AED&to=INR&val=5000"
            ),
            TransferCorridor(
                fromCountry="AE",
                toCountry="PK",
                sendCurrency="AED",
                receiveCurrency="PKR",
                minAmount=50.0,
                maxAmount=100000.0,
                transferMethods=["bank", "card", "cash"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=15.00,
                exchangeRate=75.60,
                estimatedMinutes=20,
                requirements=TransferRequirements(
                    sender=["Emirates ID"],
                    recipient=["CNIC ID for cash pickup / Easypaisa / JazzCash / Bank IBAN"]
                ),
                transferUrl="https://alansariexchange.com/online-remittance?from=AED&to=PKR&val=5000"
            ),
        ]
    ),

    # 4. LULU EXCHANGE
    TransferProvider(
        id="lulu-exchange",
        name="LuLu Exchange (LuLu Money)",
        website="https://luluexchange.com",
        logoUrl="https://luluexchange.com/wp-content/themes/lulu/assets/images/logo.png",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=50.0,
                maxAmount=75000.0,
                transferMethods=["bank", "card", "cash"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=12.00,
                exchangeRate=15.350,
                estimatedMinutes=45,
                requirements=TransferRequirements(
                    sender=["Emirates ID", "LuLu Money Verified Profile"],
                    recipient=["Valid Government ID, BDO/BPI account or GCash/Maya number"]
                ),
                transferUrl="https://luluexchange.com/send-money?country=PH&amount=5000"
            ),
            TransferCorridor(
                fromCountry="AE",
                toCountry="IN",
                sendCurrency="AED",
                receiveCurrency="INR",
                minAmount=50.0,
                maxAmount=150000.0,
                transferMethods=["bank", "card", "cash"],
                receiveMethods=["bank", "wallet"],
                fee=10.00,
                exchangeRate=22.720,
                estimatedMinutes=30,
                requirements=TransferRequirements(
                    sender=["Emirates ID"],
                    recipient=["Account Number, IFSC Code"]
                ),
                transferUrl="https://luluexchange.com/send-money?country=IN&amount=5000"
            ),
        ]
    ),

    # 5. WESTERN UNION
    TransferProvider(
        id="western-union",
        name="Western Union",
        website="https://westernunion.com",
        logoUrl="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Western_Union_logo.svg/320px-Western_Union_logo.svg.png",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=10.0,
                maxAmount=30000.0,
                transferMethods=["bank", "card", "cash", "wallet"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=15.00,
                exchangeRate=15.220,
                estimatedMinutes=5,
                requirements=TransferRequirements(
                    sender=["Emirates ID / WU Plus Account"],
                    recipient=["Government Photo ID, MTCN Tracking Number for cash pickup or GCash wallet"]
                ),
                transferUrl="https://www.westernunion.com/ae/en/web/send-money/start?receiveCountry=PH"
            ),
            TransferCorridor(
                fromCountry="US",
                toCountry="PH",
                sendCurrency="USD",
                receiveCurrency="PHP",
                minAmount=5.0,
                maxAmount=50000.0,
                transferMethods=["bank", "card", "cash"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=5.00,
                exchangeRate=55.900,
                estimatedMinutes=5,
                requirements=TransferRequirements(
                    sender=["US ID", "Credit/Debit Card or Bank"],
                    recipient=["Photo ID + MTCN for 500,000+ Agent locations worldwide"]
                ),
                transferUrl="https://www.westernunion.com/us/en/web/send-money/start?receiveCountry=PH"
            ),
            TransferCorridor(
                fromCountry="SA",
                toCountry="PH",
                sendCurrency="SAR",
                receiveCurrency="PHP",
                minAmount=20.0,
                maxAmount=30000.0,
                transferMethods=["bank", "card", "cash"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=16.00,
                exchangeRate=14.880,
                estimatedMinutes=10,
                requirements=TransferRequirements(
                    sender=["Iqama ID", "Saudi Bank/Card"],
                    recipient=["Gov Photo ID, GCash or Cash Pickup Agent"]
                ),
                transferUrl="https://www.westernunion.com/sa/en/web/send-money/start?receiveCountry=PH"
            )
        ]
    ),

    # 6. MONEYGRAM
    TransferProvider(
        id="moneygram",
        name="MoneyGram",
        website="https://moneygram.com",
        logoUrl="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/MoneyGram_logo.svg/320px-MoneyGram_logo.svg.png",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=25.0,
                maxAmount=35000.0,
                transferMethods=["bank", "card", "cash"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=18.00,
                exchangeRate=15.280,
                estimatedMinutes=10,
                requirements=TransferRequirements(
                    sender=["Emirates ID", "Payment Card / Account"],
                    recipient=["Reference Number + Valid Philippine Photo ID or GCash wallet"]
                ),
                transferUrl="https://www.moneygram.com/mgo/ae/en/send/money/philippines"
            ),
            TransferCorridor(
                fromCountry="US",
                toCountry="MX",
                sendCurrency="USD",
                receiveCurrency="MXN",
                minAmount=10.0,
                maxAmount=10000.0,
                transferMethods=["bank", "card", "cash"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=3.99,
                exchangeRate=18.050,
                estimatedMinutes=10,
                requirements=TransferRequirements(
                    sender=["US ID / Debit Card"],
                    recipient=["INE ID / OXXO Cash Pickup or Bank Deposit"]
                ),
                transferUrl="https://www.moneygram.com/mgo/us/en/send/money/mexico"
            )
        ]
    ),

    # 7. TAPTAP SEND
    TransferProvider(
        id="taptap-send",
        name="TapTap Send",
        website="https://taptapsend.com",
        logoUrl="https://images.crunchbase.com/image/upload/c_lpad,h_170,w_170,f_auto,b_white,q_auto:eco,dpr_1/jvxm1kug34s24k9f3j7t",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=10.0,
                maxAmount=25000.0,
                transferMethods=["card", "wallet"],
                receiveMethods=["wallet", "bank"],
                fee=0.0, # Zero fee guarantee
                exchangeRate=15.355,
                estimatedMinutes=5,
                requirements=TransferRequirements(
                    sender=["Emirates ID", "UAE Debit Card"],
                    recipient=["GCash, Maya, or Coins.ph Account Name & Mobile Number"]
                ),
                transferUrl="https://www.taptapsend.com/corridors/ae-to-ph"
            ),
            TransferCorridor(
                fromCountry="GB",
                toCountry="PK",
                sendCurrency="GBP",
                receiveCurrency="PKR",
                minAmount=5.0,
                maxAmount=15000.0,
                transferMethods=["card", "wallet"],
                receiveMethods=["wallet", "bank", "cash"],
                fee=0.0,
                exchangeRate=353.80,
                estimatedMinutes=5,
                requirements=TransferRequirements(
                    sender=["UK Debit Card"],
                    recipient=["Easypaisa / JazzCash / Raast ID"]
                ),
                transferUrl="https://www.taptapsend.com/corridors/gb-to-pk"
            ),
        ]
    ),

    # 8. INSTAREM
    TransferProvider(
        id="instarem",
        name="Instarem",
        website="https://instarem.com",
        logoUrl="https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Instarem_logo.png/320px-Instarem_logo.png",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=50.0,
                maxAmount=100000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank", "wallet"],
                fee=8.00,
                exchangeRate=15.370,
                estimatedMinutes=15,
                requirements=TransferRequirements(
                    sender=["Emirates ID", "Instarem Account"],
                    recipient=["Bank Account (PESONet/InstaPay) or GCash"]
                ),
                transferUrl="https://www.instarem.com/en-ae/transfer-money-to-philippines"
            ),
            TransferCorridor(
                fromCountry="AE",
                toCountry="IN",
                sendCurrency="AED",
                receiveCurrency="INR",
                minAmount=50.0,
                maxAmount=150000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank"],
                fee=7.00,
                exchangeRate=22.740,
                estimatedMinutes=15,
                requirements=TransferRequirements(
                    sender=["Emirates ID"],
                    recipient=["Account Number, IFSC Code"]
                ),
                transferUrl="https://www.instarem.com/en-ae/transfer-money-to-india"
            ),
        ]
    ),

    # 9. WORLDREMIT
    TransferProvider(
        id="worldremit",
        name="WorldRemit",
        website="https://worldremit.com",
        logoUrl="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/WorldRemit_logo.svg/320px-WorldRemit_logo.svg.png",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=15.0,
                maxAmount=20000.0,
                transferMethods=["card", "wallet"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=11.99,
                exchangeRate=15.310,
                estimatedMinutes=10,
                requirements=TransferRequirements(
                    sender=["Emirates ID", "Debit/Credit Card"],
                    recipient=["Valid Gov ID for M Lhuillier / Cebuana pickup, or Bank / GCash account"]
                ),
                transferUrl="https://www.worldremit.com/en/philippines?send=AED"
            ),
            TransferCorridor(
                fromCountry="GB",
                toCountry="PH",
                sendCurrency="GBP",
                receiveCurrency="PHP",
                minAmount=5.0,
                maxAmount=20000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=2.99,
                exchangeRate=71.40,
                estimatedMinutes=10,
                requirements=TransferRequirements(
                    sender=["UK ID / Card"],
                    recipient=["GCash, Maya, Bank or Cash Pickup"]
                ),
                transferUrl="https://www.worldremit.com/en/philippines?send=GBP"
            )
        ]
    ),

    # 10. RIA MONEY TRANSFER
    TransferProvider(
        id="ria",
        name="Ria Money Transfer",
        website="https://riamoneytransfer.com",
        logoUrl="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Ria_Money_Transfer_logo.svg/320px-Ria_Money_Transfer_logo.svg.png",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=25.0,
                maxAmount=40000.0,
                transferMethods=["bank", "card", "cash"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=12.50,
                exchangeRate=15.300,
                estimatedMinutes=20,
                requirements=TransferRequirements(
                    sender=["Emirates ID"],
                    recipient=["Valid Philippine Gov ID + PIN for cash pickup, or GCash details"]
                ),
                transferUrl="https://www.riamoneytransfer.com/en-ae/philippines"
            ),
            TransferCorridor(
                fromCountry="US",
                toCountry="PH",
                sendCurrency="USD",
                receiveCurrency="PHP",
                minAmount=10.0,
                maxAmount=25000.0,
                transferMethods=["bank", "card"],
                receiveMethods=["bank", "cash", "wallet"],
                fee=3.00,
                exchangeRate=56.10,
                estimatedMinutes=15,
                requirements=TransferRequirements(
                    sender=["US ID"],
                    recipient=["Cash Pickup at Cebuana / Palawan / Tambunting or Bank"]
                ),
                transferUrl="https://www.riamoneytransfer.com/us/en/philippines"
            )
        ]
    ),

    # 11. REVOLUT
    TransferProvider(
        id="revolut",
        name="Revolut",
        website="https://revolut.com",
        logoUrl="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Revolut_2020_Logo.svg/320px-Revolut_2020_Logo.svg.png",
        corridors=[
            TransferCorridor(
                fromCountry="GB",
                toCountry="PH",
                sendCurrency="GBP",
                receiveCurrency="PHP",
                minAmount=1.0,
                maxAmount=100000.0,
                transferMethods=["bank", "card", "wallet"],
                receiveMethods=["bank", "wallet"],
                fee=0.0,
                exchangeRate=71.75,
                estimatedMinutes=30,
                requirements=TransferRequirements(
                    sender=["Revolut UK / EU Account"],
                    recipient=["Bank account or GCash mobile wallet"]
                ),
                transferUrl="https://revolut.com/send-money-to-philippines"
            ),
            TransferCorridor(
                fromCountry="EU",
                toCountry="PH",
                sendCurrency="EUR",
                receiveCurrency="PHP",
                minAmount=1.0,
                maxAmount=100000.0,
                transferMethods=["bank", "card", "wallet"],
                receiveMethods=["bank", "wallet"],
                fee=0.0,
                exchangeRate=61.30,
                estimatedMinutes=30,
                requirements=TransferRequirements(
                    sender=["Revolut EU Account"],
                    recipient=["Bank account or GCash wallet"]
                ),
                transferUrl="https://revolut.com/send-money-to-philippines"
            )
        ]
    ),

    # 12. HUBPAY (UAE FinTech)
    TransferProvider(
        id="hubpay",
        name="Hubpay UAE",
        website="https://hubpay.ae",
        logoUrl="https://hubpay.ae/images/logo.svg",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=20.0,
                maxAmount=30000.0,
                transferMethods=["wallet", "bank", "card"],
                receiveMethods=["bank", "wallet", "cash"],
                fee=7.50,
                exchangeRate=15.360,
                estimatedMinutes=10,
                requirements=TransferRequirements(
                    sender=["Emirates ID (ADGM / UAE Central Bank Licensed)"],
                    recipient=["GCash, Maya or Philippine Bank Account"]
                ),
                transferUrl="https://hubpay.ae/remittance/philippines"
            ),
            TransferCorridor(
                fromCountry="AE",
                toCountry="IN",
                sendCurrency="AED",
                receiveCurrency="INR",
                minAmount=20.0,
                maxAmount=50000.0,
                transferMethods=["wallet", "bank", "card"],
                receiveMethods=["bank", "wallet"],
                fee=5.00,
                exchangeRate=22.730,
                estimatedMinutes=10,
                requirements=TransferRequirements(
                    sender=["Emirates ID"],
                    recipient=["Bank Account / UPI"]
                ),
                transferUrl="https://hubpay.ae/remittance/india"
            ),
            TransferCorridor(
                fromCountry="AE",
                toCountry="PK",
                sendCurrency="AED",
                receiveCurrency="PKR",
                minAmount=20.0,
                maxAmount=40000.0,
                transferMethods=["wallet", "bank", "card"],
                receiveMethods=["bank", "wallet", "cash"],
                fee=6.00,
                exchangeRate=75.70,
                estimatedMinutes=10,
                requirements=TransferRequirements(
                    sender=["Emirates ID"],
                    recipient=["Bank IBAN or JazzCash / Easypaisa"]
                ),
                transferUrl="https://hubpay.ae/remittance/pakistan"
            )
        ]
    ),

    # 13. PYYPL
    TransferProvider(
        id="pyypl",
        name="Pyypl (GCC Digital Card & Wallet)",
        website="https://pyypl.com",
        logoUrl="https://pyypl.com/favicon.ico",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=10.0,
                maxAmount=15000.0,
                transferMethods=["wallet", "card"],
                receiveMethods=["wallet", "bank"],
                fee=5.00,
                exchangeRate=15.345,
                estimatedMinutes=5,
                requirements=TransferRequirements(
                    sender=["Pyypl UAE App Account + Emirates ID"],
                    recipient=["GCash or Maya Mobile Number"]
                ),
                transferUrl="https://pyypl.com/send-philippines"
            )
        ]
    ),

    # 14. OFX
    TransferProvider(
        id="ofx",
        name="OFX Global Currency",
        website="https://ofx.com",
        logoUrl="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/OFX_Logo.svg/320px-OFX_Logo.svg.png",
        corridors=[
            TransferCorridor(
                fromCountry="AE",
                toCountry="PH",
                sendCurrency="AED",
                receiveCurrency="PHP",
                minAmount=1000.0,
                maxAmount=500000.0,
                transferMethods=["bank"],
                receiveMethods=["bank"],
                fee=0.0,
                exchangeRate=15.330,
                estimatedMinutes=1440,
                requirements=TransferRequirements(
                    sender=["UAE Passport/Emirates ID", "Proof of Address", "Bank Statement"],
                    recipient=["SWIFT/BIC Code, Bank Account Number, Bank Branch"]
                ),
                transferUrl="https://www.ofx.com/en-ae/transfer-money-to-philippines"
            ),
            TransferCorridor(
                fromCountry="US",
                toCountry="IN",
                sendCurrency="USD",
                receiveCurrency="INR",
                minAmount=1000.0,
                maxAmount=500000.0,
                transferMethods=["bank"],
                receiveMethods=["bank"],
                fee=0.0,
                exchangeRate=83.35,
                estimatedMinutes=1440,
                requirements=TransferRequirements(
                    sender=["US Bank Account", "SSN"],
                    recipient=["Indian Bank Account & IFSC Code"]
                ),
                transferUrl="https://www.ofx.com/en-us/transfer-money-to-india"
            )
        ]
    )
]
