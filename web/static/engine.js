/**
 * Global Money Transfer Search - Universal Client-Side Engine
 * 195+ Countries (both Sending & Receiving) and 25 Global Remittance Providers
 */

(function() {
  const ALL_COUNTRIES = [
  {
    "code": "AE",
    "name": "United Arab Emirates",
    "shortName": "UAE",
    "currency": "AED",
    "flag": "\ud83c\udde6\ud83c\uddea",
    "continent": "Middle East"
  },
  {
    "code": "SA",
    "name": "Kingdom of Saudi Arabia",
    "shortName": "Saudi Arabia",
    "currency": "SAR",
    "flag": "\ud83c\uddf8\ud83c\udde6",
    "continent": "Middle East"
  },
  {
    "code": "QA",
    "name": "State of Qatar",
    "shortName": "Qatar",
    "currency": "QAR",
    "flag": "\ud83c\uddf6\ud83c\udde6",
    "continent": "Middle East"
  },
  {
    "code": "KW",
    "name": "State of Kuwait",
    "shortName": "Kuwait",
    "currency": "KWD",
    "flag": "\ud83c\uddf0\ud83c\uddfc",
    "continent": "Middle East"
  },
  {
    "code": "BH",
    "name": "Kingdom of Bahrain",
    "shortName": "Bahrain",
    "currency": "BHD",
    "flag": "\ud83c\udde7\ud83c\udded",
    "continent": "Middle East"
  },
  {
    "code": "OM",
    "name": "Sultanate of Oman",
    "shortName": "Oman",
    "currency": "OMR",
    "flag": "\ud83c\uddf4\ud83c\uddf2",
    "continent": "Middle East"
  },
  {
    "code": "EG",
    "name": "Arab Republic of Egypt",
    "shortName": "Egypt",
    "currency": "EGP",
    "flag": "\ud83c\uddea\ud83c\uddec",
    "continent": "Middle East"
  },
  {
    "code": "TR",
    "name": "Republic of Turkey",
    "shortName": "Turkey",
    "currency": "TRY",
    "flag": "\ud83c\uddf9\ud83c\uddf7",
    "continent": "Middle East"
  },
  {
    "code": "JO",
    "name": "Hashemite Kingdom of Jordan",
    "shortName": "Jordan",
    "currency": "JOD",
    "flag": "\ud83c\uddef\ud83c\uddf4",
    "continent": "Middle East"
  },
  {
    "code": "IL",
    "name": "State of Israel",
    "shortName": "Israel",
    "currency": "ILS",
    "flag": "\ud83c\uddee\ud83c\uddf1",
    "continent": "Middle East"
  },
  {
    "code": "LB",
    "name": "Lebanese Republic",
    "shortName": "Lebanon",
    "currency": "LBP",
    "flag": "\ud83c\uddf1\ud83c\udde7",
    "continent": "Middle East"
  },
  {
    "code": "IQ",
    "name": "Republic of Iraq",
    "shortName": "Iraq",
    "currency": "IQD",
    "flag": "\ud83c\uddee\ud83c\uddf6",
    "continent": "Middle East"
  },
  {
    "code": "YE",
    "name": "Republic of Yemen",
    "shortName": "Yemen",
    "currency": "YER",
    "flag": "\ud83c\uddfe\ud83c\uddea",
    "continent": "Middle East"
  },
  {
    "code": "SY",
    "name": "Syrian Arab Republic",
    "shortName": "Syria",
    "currency": "SYP",
    "flag": "\ud83c\uddf8\ud83c\uddfe",
    "continent": "Middle East"
  },
  {
    "code": "PS",
    "name": "State of Palestine",
    "shortName": "Palestine",
    "currency": "ILS",
    "flag": "\ud83c\uddf5\ud83c\uddf8",
    "continent": "Middle East"
  },
  {
    "code": "PH",
    "name": "Republic of the Philippines",
    "shortName": "Philippines",
    "currency": "PHP",
    "flag": "\ud83c\uddf5\ud83c\udded",
    "continent": "Asia"
  },
  {
    "code": "IN",
    "name": "Republic of India",
    "shortName": "India",
    "currency": "INR",
    "flag": "\ud83c\uddee\ud83c\uddf3",
    "continent": "Asia"
  },
  {
    "code": "PK",
    "name": "Islamic Republic of Pakistan",
    "shortName": "Pakistan",
    "currency": "PKR",
    "flag": "\ud83c\uddf5\ud83c\uddf0",
    "continent": "Asia"
  },
  {
    "code": "BD",
    "name": "People's Republic of Bangladesh",
    "shortName": "Bangladesh",
    "currency": "BDT",
    "flag": "\ud83c\udde7\ud83c\udde9",
    "continent": "Asia"
  },
  {
    "code": "LK",
    "name": "Democratic Socialist Republic of Sri Lanka",
    "shortName": "Sri Lanka",
    "currency": "LKR",
    "flag": "\ud83c\uddf1\ud83c\uddf0",
    "continent": "Asia"
  },
  {
    "code": "NP",
    "name": "Federal Democratic Republic of Nepal",
    "shortName": "Nepal",
    "currency": "NPR",
    "flag": "\ud83c\uddf3\ud83c\uddf5",
    "continent": "Asia"
  },
  {
    "code": "SG",
    "name": "Republic of Singapore",
    "shortName": "Singapore",
    "currency": "SGD",
    "flag": "\ud83c\uddf8\ud83c\uddec",
    "continent": "Asia"
  },
  {
    "code": "MY",
    "name": "Malaysia",
    "shortName": "Malaysia",
    "currency": "MYR",
    "flag": "\ud83c\uddf2\ud83c\uddfe",
    "continent": "Asia"
  },
  {
    "code": "ID",
    "name": "Republic of Indonesia",
    "shortName": "Indonesia",
    "currency": "IDR",
    "flag": "\ud83c\uddee\ud83c\udde9",
    "continent": "Asia"
  },
  {
    "code": "TH",
    "name": "Kingdom of Thailand",
    "shortName": "Thailand",
    "currency": "THB",
    "flag": "\ud83c\uddf9\ud83c\udded",
    "continent": "Asia"
  },
  {
    "code": "VN",
    "name": "Socialist Republic of Vietnam",
    "shortName": "Vietnam",
    "currency": "VND",
    "flag": "\ud83c\uddfb\ud83c\uddf3",
    "continent": "Asia"
  },
  {
    "code": "CN",
    "name": "People's Republic of China",
    "shortName": "China",
    "currency": "CNY",
    "flag": "\ud83c\udde8\ud83c\uddf3",
    "continent": "Asia"
  },
  {
    "code": "JP",
    "name": "Japan",
    "shortName": "Japan",
    "currency": "JPY",
    "flag": "\ud83c\uddef\ud83c\uddf5",
    "continent": "Asia"
  },
  {
    "code": "KR",
    "name": "Republic of Korea",
    "shortName": "South Korea",
    "currency": "KRW",
    "flag": "\ud83c\uddf0\ud83c\uddf7",
    "continent": "Asia"
  },
  {
    "code": "HK",
    "name": "Hong Kong SAR",
    "shortName": "Hong Kong",
    "currency": "HKD",
    "flag": "\ud83c\udded\ud83c\uddf0",
    "continent": "Asia"
  },
  {
    "code": "TW",
    "name": "Taiwan",
    "shortName": "Taiwan",
    "currency": "TWD",
    "flag": "\ud83c\uddf9\ud83c\uddfc",
    "continent": "Asia"
  },
  {
    "code": "KH",
    "name": "Kingdom of Cambodia",
    "shortName": "Cambodia",
    "currency": "USD",
    "flag": "\ud83c\uddf0\ud83c\udded",
    "continent": "Asia"
  },
  {
    "code": "LA",
    "name": "Lao People's Democratic Republic",
    "shortName": "Laos",
    "currency": "LAK",
    "flag": "\ud83c\uddf1\ud83c\udde6",
    "continent": "Asia"
  },
  {
    "code": "MM",
    "name": "Republic of the Union of Myanmar",
    "shortName": "Myanmar",
    "currency": "MMK",
    "flag": "\ud83c\uddf2\ud83c\uddf2",
    "continent": "Asia"
  },
  {
    "code": "MN",
    "name": "Mongolia",
    "shortName": "Mongolia",
    "currency": "MNT",
    "flag": "\ud83c\uddf2\ud83c\uddf3",
    "continent": "Asia"
  },
  {
    "code": "KZ",
    "name": "Republic of Kazakhstan",
    "shortName": "Kazakhstan",
    "currency": "KZT",
    "flag": "\ud83c\uddf0\ud83c\uddff",
    "continent": "Asia"
  },
  {
    "code": "UZ",
    "name": "Republic of Uzbekistan",
    "shortName": "Uzbekistan",
    "currency": "UZS",
    "flag": "\ud83c\uddfa\ud83c\uddff",
    "continent": "Asia"
  },
  {
    "code": "KG",
    "name": "Kyrgyz Republic",
    "shortName": "Kyrgyzstan",
    "currency": "KGS",
    "flag": "\ud83c\uddf0\ud83c\uddec",
    "continent": "Asia"
  },
  {
    "code": "TJ",
    "name": "Republic of Tajikistan",
    "shortName": "Tajikistan",
    "currency": "TJS",
    "flag": "\ud83c\uddf9\ud83c\uddef",
    "continent": "Asia"
  },
  {
    "code": "TM",
    "name": "Turkmenistan",
    "shortName": "Turkmenistan",
    "currency": "TMT",
    "flag": "\ud83c\uddf9\ud83c\uddf2",
    "continent": "Asia"
  },
  {
    "code": "AF",
    "name": "Islamic Emirate of Afghanistan",
    "shortName": "Afghanistan",
    "currency": "AFN",
    "flag": "\ud83c\udde6\ud83c\uddeb",
    "continent": "Asia"
  },
  {
    "code": "AZ",
    "name": "Republic of Azerbaijan",
    "shortName": "Azerbaijan",
    "currency": "AZN",
    "flag": "\ud83c\udde6\ud83c\uddff",
    "continent": "Asia"
  },
  {
    "code": "GE",
    "name": "Georgia",
    "shortName": "Georgia",
    "currency": "GEL",
    "flag": "\ud83c\uddec\ud83c\uddea",
    "continent": "Asia"
  },
  {
    "code": "AM",
    "name": "Republic of Armenia",
    "shortName": "Armenia",
    "currency": "AMD",
    "flag": "\ud83c\udde6\ud83c\uddf2",
    "continent": "Asia"
  },
  {
    "code": "MV",
    "name": "Republic of Maldives",
    "shortName": "Maldives",
    "currency": "MVR",
    "flag": "\ud83c\uddf2\ud83c\uddfb",
    "continent": "Asia"
  },
  {
    "code": "BN",
    "name": "Brunei Darussalam",
    "shortName": "Brunei",
    "currency": "BND",
    "flag": "\ud83c\udde7\ud83c\uddf3",
    "continent": "Asia"
  },
  {
    "code": "BT",
    "name": "Kingdom of Bhutan",
    "shortName": "Bhutan",
    "currency": "INR",
    "flag": "\ud83c\udde7\ud83c\uddf9",
    "continent": "Asia"
  },
  {
    "code": "MO",
    "name": "Macao SAR",
    "shortName": "Macao",
    "currency": "MOP",
    "flag": "\ud83c\uddf2\ud83c\uddf4",
    "continent": "Asia"
  },
  {
    "code": "TL",
    "name": "Democratic Republic of Timor-Leste",
    "shortName": "Timor-Leste",
    "currency": "USD",
    "flag": "\ud83c\uddf9\ud83c\uddf1",
    "continent": "Asia"
  },
  {
    "code": "GB",
    "name": "United Kingdom",
    "shortName": "United Kingdom",
    "currency": "GBP",
    "flag": "\ud83c\uddec\ud83c\udde7",
    "continent": "Europe"
  },
  {
    "code": "DE",
    "name": "Federal Republic of Germany",
    "shortName": "Germany",
    "currency": "EUR",
    "flag": "\ud83c\udde9\ud83c\uddea",
    "continent": "Europe"
  },
  {
    "code": "FR",
    "name": "French Republic",
    "shortName": "France",
    "currency": "EUR",
    "flag": "\ud83c\uddeb\ud83c\uddf7",
    "continent": "Europe"
  },
  {
    "code": "IT",
    "name": "Italian Republic",
    "shortName": "Italy",
    "currency": "EUR",
    "flag": "\ud83c\uddee\ud83c\uddf9",
    "continent": "Europe"
  },
  {
    "code": "ES",
    "name": "Kingdom of Spain",
    "shortName": "Spain",
    "currency": "EUR",
    "flag": "\ud83c\uddea\ud83c\uddf8",
    "continent": "Europe"
  },
  {
    "code": "NL",
    "name": "Kingdom of the Netherlands",
    "shortName": "Netherlands",
    "currency": "EUR",
    "flag": "\ud83c\uddf3\ud83c\uddf1",
    "continent": "Europe"
  },
  {
    "code": "CH",
    "name": "Swiss Confederation",
    "shortName": "Switzerland",
    "currency": "CHF",
    "flag": "\ud83c\udde8\ud83c\udded",
    "continent": "Europe"
  },
  {
    "code": "SE",
    "name": "Kingdom of Sweden",
    "shortName": "Sweden",
    "currency": "SEK",
    "flag": "\ud83c\uddf8\ud83c\uddea",
    "continent": "Europe"
  },
  {
    "code": "NO",
    "name": "Kingdom of Norway",
    "shortName": "Norway",
    "currency": "NOK",
    "flag": "\ud83c\uddf3\ud83c\uddf4",
    "continent": "Europe"
  },
  {
    "code": "DK",
    "name": "Kingdom of Denmark",
    "shortName": "Denmark",
    "currency": "DKK",
    "flag": "\ud83c\udde9\ud83c\uddf0",
    "continent": "Europe"
  },
  {
    "code": "PL",
    "name": "Republic of Poland",
    "shortName": "Poland",
    "currency": "PLN",
    "flag": "\ud83c\uddf5\ud83c\uddf1",
    "continent": "Europe"
  },
  {
    "code": "IE",
    "name": "Republic of Ireland",
    "shortName": "Ireland",
    "currency": "EUR",
    "flag": "\ud83c\uddee\ud83c\uddea",
    "continent": "Europe"
  },
  {
    "code": "PT",
    "name": "Portuguese Republic",
    "shortName": "Portugal",
    "currency": "EUR",
    "flag": "\ud83c\uddf5\ud83c\uddf9",
    "continent": "Europe"
  },
  {
    "code": "BE",
    "name": "Kingdom of Belgium",
    "shortName": "Belgium",
    "currency": "EUR",
    "flag": "\ud83c\udde7\ud83c\uddea",
    "continent": "Europe"
  },
  {
    "code": "AT",
    "name": "Republic of Austria",
    "shortName": "Austria",
    "currency": "EUR",
    "flag": "\ud83c\udde6\ud83c\uddf9",
    "continent": "Europe"
  },
  {
    "code": "GR",
    "name": "Hellenic Republic",
    "shortName": "Greece",
    "currency": "EUR",
    "flag": "\ud83c\uddec\ud83c\uddf7",
    "continent": "Europe"
  },
  {
    "code": "CZ",
    "name": "Czech Republic",
    "shortName": "Czech Republic",
    "currency": "CZK",
    "flag": "\ud83c\udde8\ud83c\uddff",
    "continent": "Europe"
  },
  {
    "code": "RO",
    "name": "Romania",
    "shortName": "Romania",
    "currency": "RON",
    "flag": "\ud83c\uddf7\ud83c\uddf4",
    "continent": "Europe"
  },
  {
    "code": "HU",
    "name": "Hungary",
    "shortName": "Hungary",
    "currency": "HUF",
    "flag": "\ud83c\udded\ud83c\uddfa",
    "continent": "Europe"
  },
  {
    "code": "FI",
    "name": "Republic of Finland",
    "shortName": "Finland",
    "currency": "EUR",
    "flag": "\ud83c\uddeb\ud83c\uddee",
    "continent": "Europe"
  },
  {
    "code": "UA",
    "name": "Ukraine",
    "shortName": "Ukraine",
    "currency": "UAH",
    "flag": "\ud83c\uddfa\ud83c\udde6",
    "continent": "Europe"
  },
  {
    "code": "BG",
    "name": "Republic of Bulgaria",
    "shortName": "Bulgaria",
    "currency": "BGN",
    "flag": "\ud83c\udde7\ud83c\uddec",
    "continent": "Europe"
  },
  {
    "code": "HR",
    "name": "Republic of Croatia",
    "shortName": "Croatia",
    "currency": "EUR",
    "flag": "\ud83c\udded\ud83c\uddf7",
    "continent": "Europe"
  },
  {
    "code": "SK",
    "name": "Slovak Republic",
    "shortName": "Slovakia",
    "currency": "EUR",
    "flag": "\ud83c\uddf8\ud83c\uddf0",
    "continent": "Europe"
  },
  {
    "code": "SI",
    "name": "Republic of Slovenia",
    "shortName": "Slovenia",
    "currency": "EUR",
    "flag": "\ud83c\uddf8\ud83c\uddee",
    "continent": "Europe"
  },
  {
    "code": "LT",
    "name": "Republic of Lithuania",
    "shortName": "Lithuania",
    "currency": "EUR",
    "flag": "\ud83c\uddf1\ud83c\uddf9",
    "continent": "Europe"
  },
  {
    "code": "LV",
    "name": "Republic of Latvia",
    "shortName": "Latvia",
    "currency": "EUR",
    "flag": "\ud83c\uddf1\ud83c\uddfb",
    "continent": "Europe"
  },
  {
    "code": "EE",
    "name": "Republic of Estonia",
    "shortName": "Estonia",
    "currency": "EUR",
    "flag": "\ud83c\uddea\ud83c\uddea",
    "continent": "Europe"
  },
  {
    "code": "CY",
    "name": "Republic of Cyprus",
    "shortName": "Cyprus",
    "currency": "EUR",
    "flag": "\ud83c\udde8\ud83c\uddfe",
    "continent": "Europe"
  },
  {
    "code": "MT",
    "name": "Republic of Malta",
    "shortName": "Malta",
    "currency": "EUR",
    "flag": "\ud83c\uddf2\ud83c\uddf9",
    "continent": "Europe"
  },
  {
    "code": "LU",
    "name": "Grand Duchy of Luxembourg",
    "shortName": "Luxembourg",
    "currency": "EUR",
    "flag": "\ud83c\uddf1\ud83c\uddfa",
    "continent": "Europe"
  },
  {
    "code": "IS",
    "name": "Iceland",
    "shortName": "Iceland",
    "currency": "ISK",
    "flag": "\ud83c\uddee\ud83c\uddf8",
    "continent": "Europe"
  },
  {
    "code": "AL",
    "name": "Republic of Albania",
    "shortName": "Albania",
    "currency": "ALL",
    "flag": "\ud83c\udde6\ud83c\uddf1",
    "continent": "Europe"
  },
  {
    "code": "RS",
    "name": "Republic of Serbia",
    "shortName": "Serbia",
    "currency": "RSD",
    "flag": "\ud83c\uddf7\ud83c\uddf8",
    "continent": "Europe"
  },
  {
    "code": "BA",
    "name": "Bosnia and Herzegovina",
    "shortName": "Bosnia",
    "currency": "BAM",
    "flag": "\ud83c\udde7\ud83c\udde6",
    "continent": "Europe"
  },
  {
    "code": "MK",
    "name": "Republic of North Macedonia",
    "shortName": "North Macedonia",
    "currency": "MKD",
    "flag": "\ud83c\uddf2\ud83c\uddf0",
    "continent": "Europe"
  },
  {
    "code": "MD",
    "name": "Republic of Moldova",
    "shortName": "Moldova",
    "currency": "MDL",
    "flag": "\ud83c\uddf2\ud83c\udde9",
    "continent": "Europe"
  },
  {
    "code": "ME",
    "name": "Montenegro",
    "shortName": "Montenegro",
    "currency": "EUR",
    "flag": "\ud83c\uddf2\ud83c\uddea",
    "continent": "Europe"
  },
  {
    "code": "MC",
    "name": "Principality of Monaco",
    "shortName": "Monaco",
    "currency": "EUR",
    "flag": "\ud83c\uddf2\ud83c\udde8",
    "continent": "Europe"
  },
  {
    "code": "AD",
    "name": "Principality of Andorra",
    "shortName": "Andorra",
    "currency": "EUR",
    "flag": "\ud83c\udde6\ud83c\udde9",
    "continent": "Europe"
  },
  {
    "code": "SM",
    "name": "Republic of San Marino",
    "shortName": "San Marino",
    "currency": "EUR",
    "flag": "\ud83c\uddf8\ud83c\uddf2",
    "continent": "Europe"
  },
  {
    "code": "LI",
    "name": "Principality of Liechtenstein",
    "shortName": "Liechtenstein",
    "currency": "CHF",
    "flag": "\ud83c\uddf1\ud83c\uddee",
    "continent": "Europe"
  },
  {
    "code": "GI",
    "name": "Gibraltar",
    "shortName": "Gibraltar",
    "currency": "GBP",
    "flag": "\ud83c\uddec\ud83c\uddee",
    "continent": "Europe"
  },
  {
    "code": "XK",
    "name": "Republic of Kosovo",
    "shortName": "Kosovo",
    "currency": "EUR",
    "flag": "\ud83c\uddfd\ud83c\uddf0",
    "continent": "Europe"
  },
  {
    "code": "US",
    "name": "United States of America",
    "shortName": "USA",
    "currency": "USD",
    "flag": "\ud83c\uddfa\ud83c\uddf8",
    "continent": "Americas"
  },
  {
    "code": "CA",
    "name": "Canada",
    "shortName": "Canada",
    "currency": "CAD",
    "flag": "\ud83c\udde8\ud83c\udde6",
    "continent": "Americas"
  },
  {
    "code": "MX",
    "name": "United Mexican States",
    "shortName": "Mexico",
    "currency": "MXN",
    "flag": "\ud83c\uddf2\ud83c\uddfd",
    "continent": "Americas"
  },
  {
    "code": "BR",
    "name": "Federative Republic of Brazil",
    "shortName": "Brazil",
    "currency": "BRL",
    "flag": "\ud83c\udde7\ud83c\uddf7",
    "continent": "Americas"
  },
  {
    "code": "CO",
    "name": "Republic of Colombia",
    "shortName": "Colombia",
    "currency": "COP",
    "flag": "\ud83c\udde8\ud83c\uddf4",
    "continent": "Americas"
  },
  {
    "code": "AR",
    "name": "Argentine Republic",
    "shortName": "Argentina",
    "currency": "ARS",
    "flag": "\ud83c\udde6\ud83c\uddf7",
    "continent": "Americas"
  },
  {
    "code": "CL",
    "name": "Republic of Chile",
    "shortName": "Chile",
    "currency": "CLP",
    "flag": "\ud83c\udde8\ud83c\uddf1",
    "continent": "Americas"
  },
  {
    "code": "PE",
    "name": "Republic of Peru",
    "shortName": "Peru",
    "currency": "PEN",
    "flag": "\ud83c\uddf5\ud83c\uddea",
    "continent": "Americas"
  },
  {
    "code": "DO",
    "name": "Dominican Republic",
    "shortName": "Dominican Republic",
    "currency": "DOP",
    "flag": "\ud83c\udde9\ud83c\uddf4",
    "continent": "Americas"
  },
  {
    "code": "JM",
    "name": "Jamaica",
    "shortName": "Jamaica",
    "currency": "JMD",
    "flag": "\ud83c\uddef\ud83c\uddf2",
    "continent": "Americas"
  },
  {
    "code": "EC",
    "name": "Republic of Ecuador",
    "shortName": "Ecuador",
    "currency": "USD",
    "flag": "\ud83c\uddea\ud83c\udde8",
    "continent": "Americas"
  },
  {
    "code": "GT",
    "name": "Republic of Guatemala",
    "shortName": "Guatemala",
    "currency": "GTQ",
    "flag": "\ud83c\uddec\ud83c\uddf9",
    "continent": "Americas"
  },
  {
    "code": "SV",
    "name": "Republic of El Salvador",
    "shortName": "El Salvador",
    "currency": "USD",
    "flag": "\ud83c\uddf8\ud83c\uddfb",
    "continent": "Americas"
  },
  {
    "code": "HN",
    "name": "Republic of Honduras",
    "shortName": "Honduras",
    "currency": "HNL",
    "flag": "\ud83c\udded\ud83c\uddf3",
    "continent": "Americas"
  },
  {
    "code": "NI",
    "name": "Republic of Nicaragua",
    "shortName": "Nicaragua",
    "currency": "NIO",
    "flag": "\ud83c\uddf3\ud83c\uddee",
    "continent": "Americas"
  },
  {
    "code": "CR",
    "name": "Republic of Costa Rica",
    "shortName": "Costa Rica",
    "currency": "CRC",
    "flag": "\ud83c\udde8\ud83c\uddf7",
    "continent": "Americas"
  },
  {
    "code": "PA",
    "name": "Republic of Panama",
    "shortName": "Panama",
    "currency": "USD",
    "flag": "\ud83c\uddf5\ud83c\udde6",
    "continent": "Americas"
  },
  {
    "code": "BO",
    "name": "Plurinational State of Bolivia",
    "shortName": "Bolivia",
    "currency": "BOB",
    "flag": "\ud83c\udde7\ud83c\uddf4",
    "continent": "Americas"
  },
  {
    "code": "PY",
    "name": "Republic of Paraguay",
    "shortName": "Paraguay",
    "currency": "PYG",
    "flag": "\ud83c\uddf5\ud83c\uddfe",
    "continent": "Americas"
  },
  {
    "code": "UY",
    "name": "Oriental Republic of Uruguay",
    "shortName": "Uruguay",
    "currency": "UYU",
    "flag": "\ud83c\uddfa\ud83c\uddfe",
    "continent": "Americas"
  },
  {
    "code": "VE",
    "name": "Bolivarian Republic of Venezuela",
    "shortName": "Venezuela",
    "currency": "USD",
    "flag": "\ud83c\uddfb\ud83c\uddea",
    "continent": "Americas"
  },
  {
    "code": "GY",
    "name": "Co-operative Republic of Guyana",
    "shortName": "Guyana",
    "currency": "GYD",
    "flag": "\ud83c\uddec\ud83c\uddfe",
    "continent": "Americas"
  },
  {
    "code": "SR",
    "name": "Republic of Suriname",
    "shortName": "Suriname",
    "currency": "SRD",
    "flag": "\ud83c\uddf8\ud83c\uddf7",
    "continent": "Americas"
  },
  {
    "code": "TT",
    "name": "Republic of Trinidad and Tobago",
    "shortName": "Trinidad & Tobago",
    "currency": "TTD",
    "flag": "\ud83c\uddf9\ud83c\uddf9",
    "continent": "Americas"
  },
  {
    "code": "HT",
    "name": "Republic of Haiti",
    "shortName": "Haiti",
    "currency": "HTG",
    "flag": "\ud83c\udded\ud83c\uddf9",
    "continent": "Americas"
  },
  {
    "code": "BS",
    "name": "Commonwealth of the Bahamas",
    "shortName": "Bahamas",
    "currency": "BSD",
    "flag": "\ud83c\udde7\ud83c\uddf8",
    "continent": "Americas"
  },
  {
    "code": "BB",
    "name": "Barbados",
    "shortName": "Barbados",
    "currency": "BBD",
    "flag": "\ud83c\udde7\ud83c\udde7",
    "continent": "Americas"
  },
  {
    "code": "BZ",
    "name": "Belize",
    "shortName": "Belize",
    "currency": "BZD",
    "flag": "\ud83c\udde7\ud83c\uddff",
    "continent": "Americas"
  },
  {
    "code": "AW",
    "name": "Aruba",
    "shortName": "Aruba",
    "currency": "USD",
    "flag": "\ud83c\udde6\ud83c\uddfc",
    "continent": "Americas"
  },
  {
    "code": "CW",
    "name": "Country of Cura\u00e7ao",
    "shortName": "Curacao",
    "currency": "USD",
    "flag": "\ud83c\udde8\ud83c\uddfc",
    "continent": "Americas"
  },
  {
    "code": "KY",
    "name": "Cayman Islands",
    "shortName": "Cayman Islands",
    "currency": "USD",
    "flag": "\ud83c\uddf0\ud83c\uddfe",
    "continent": "Americas"
  },
  {
    "code": "BM",
    "name": "Bermuda",
    "shortName": "Bermuda",
    "currency": "USD",
    "flag": "\ud83c\udde7\ud83c\uddf2",
    "continent": "Americas"
  },
  {
    "code": "LC",
    "name": "Saint Lucia",
    "shortName": "Saint Lucia",
    "currency": "USD",
    "flag": "\ud83c\uddf1\ud83c\udde8",
    "continent": "Americas"
  },
  {
    "code": "GD",
    "name": "Grenada",
    "shortName": "Grenada",
    "currency": "USD",
    "flag": "\ud83c\uddec\ud83c\udde9",
    "continent": "Americas"
  },
  {
    "code": "AG",
    "name": "Antigua and Barbuda",
    "shortName": "Antigua & Barbuda",
    "currency": "USD",
    "flag": "\ud83c\udde6\ud83c\uddec",
    "continent": "Americas"
  },
  {
    "code": "DM",
    "name": "Commonwealth of Dominica",
    "shortName": "Dominica",
    "currency": "USD",
    "flag": "\ud83c\udde9\ud83c\uddf2",
    "continent": "Americas"
  },
  {
    "code": "KN",
    "name": "Saint Kitts and Nevis",
    "shortName": "Saint Kitts & Nevis",
    "currency": "USD",
    "flag": "\ud83c\uddf0\ud83c\uddf3",
    "continent": "Americas"
  },
  {
    "code": "VC",
    "name": "Saint Vincent and the Grenadines",
    "shortName": "Saint Vincent",
    "currency": "USD",
    "flag": "\ud83c\uddfb\ud83c\udde8",
    "continent": "Americas"
  },
  {
    "code": "NG",
    "name": "Federal Republic of Nigeria",
    "shortName": "Nigeria",
    "currency": "NGN",
    "flag": "\ud83c\uddf3\ud83c\uddec",
    "continent": "Africa"
  },
  {
    "code": "KE",
    "name": "Republic of Kenya",
    "shortName": "Kenya",
    "currency": "KES",
    "flag": "\ud83c\uddf0\ud83c\uddea",
    "continent": "Africa"
  },
  {
    "code": "GH",
    "name": "Republic of Ghana",
    "shortName": "Ghana",
    "currency": "GHS",
    "flag": "\ud83c\uddec\ud83c\udded",
    "continent": "Africa"
  },
  {
    "code": "ZA",
    "name": "Republic of South Africa",
    "shortName": "South Africa",
    "currency": "ZAR",
    "flag": "\ud83c\uddff\ud83c\udde6",
    "continent": "Africa"
  },
  {
    "code": "ET",
    "name": "Federal Democratic Republic of Ethiopia",
    "shortName": "Ethiopia",
    "currency": "ETB",
    "flag": "\ud83c\uddea\ud83c\uddf9",
    "continent": "Africa"
  },
  {
    "code": "UG",
    "name": "Republic of Uganda",
    "shortName": "Uganda",
    "currency": "UGX",
    "flag": "\ud83c\uddfa\ud83c\uddec",
    "continent": "Africa"
  },
  {
    "code": "TZ",
    "name": "United Republic of Tanzania",
    "shortName": "Tanzania",
    "currency": "TZS",
    "flag": "\ud83c\uddf9\ud83c\uddff",
    "continent": "Africa"
  },
  {
    "code": "SN",
    "name": "Republic of Senegal",
    "shortName": "Senegal",
    "currency": "XOF",
    "flag": "\ud83c\uddf8\ud83c\uddf3",
    "continent": "Africa"
  },
  {
    "code": "CI",
    "name": "Republic of C\u00f4te d'Ivoire",
    "shortName": "Ivory Coast",
    "currency": "XOF",
    "flag": "\ud83c\udde8\ud83c\uddee",
    "continent": "Africa"
  },
  {
    "code": "MA",
    "name": "Kingdom of Morocco",
    "shortName": "Morocco",
    "currency": "MAD",
    "flag": "\ud83c\uddf2\ud83c\udde6",
    "continent": "Africa"
  },
  {
    "code": "DZ",
    "name": "People's Democratic Republic of Algeria",
    "shortName": "Algeria",
    "currency": "DZD",
    "flag": "\ud83c\udde9\ud83c\uddff",
    "continent": "Africa"
  },
  {
    "code": "TN",
    "name": "Republic of Tunisia",
    "shortName": "Tunisia",
    "currency": "TND",
    "flag": "\ud83c\uddf9\ud83c\uddf3",
    "continent": "Africa"
  },
  {
    "code": "CM",
    "name": "Republic of Cameroon",
    "shortName": "Cameroon",
    "currency": "XAF",
    "flag": "\ud83c\udde8\ud83c\uddf2",
    "continent": "Africa"
  },
  {
    "code": "RW",
    "name": "Republic of Rwanda",
    "shortName": "Rwanda",
    "currency": "RWF",
    "flag": "\ud83c\uddf7\ud83c\uddfc",
    "continent": "Africa"
  },
  {
    "code": "ZM",
    "name": "Republic of Zambia",
    "shortName": "Zambia",
    "currency": "ZMW",
    "flag": "\ud83c\uddff\ud83c\uddf2",
    "continent": "Africa"
  },
  {
    "code": "ZW",
    "name": "Republic of Zimbabwe",
    "shortName": "Zimbabwe",
    "currency": "USD",
    "flag": "\ud83c\uddff\ud83c\uddfc",
    "continent": "Africa"
  },
  {
    "code": "AO",
    "name": "Republic of Angola",
    "shortName": "Angola",
    "currency": "AOA",
    "flag": "\ud83c\udde6\ud83c\uddf4",
    "continent": "Africa"
  },
  {
    "code": "MZ",
    "name": "Republic of Mozambique",
    "shortName": "Mozambique",
    "currency": "MZN",
    "flag": "\ud83c\uddf2\ud83c\uddff",
    "continent": "Africa"
  },
  {
    "code": "BW",
    "name": "Republic of Botswana",
    "shortName": "Botswana",
    "currency": "BWP",
    "flag": "\ud83c\udde7\ud83c\uddfc",
    "continent": "Africa"
  },
  {
    "code": "NA",
    "name": "Republic of Namibia",
    "shortName": "Namibia",
    "currency": "NAD",
    "flag": "\ud83c\uddf3\ud83c\udde6",
    "continent": "Africa"
  },
  {
    "code": "MU",
    "name": "Republic of Mauritius",
    "shortName": "Mauritius",
    "currency": "MUR",
    "flag": "\ud83c\uddf2\ud83c\uddfa",
    "continent": "Africa"
  },
  {
    "code": "SC",
    "name": "Republic of Seychelles",
    "shortName": "Seychelles",
    "currency": "SCR",
    "flag": "\ud83c\uddf8\ud83c\udde8",
    "continent": "Africa"
  },
  {
    "code": "MG",
    "name": "Republic of Madagascar",
    "shortName": "Madagascar",
    "currency": "MGA",
    "flag": "\ud83c\uddf2\ud83c\uddec",
    "continent": "Africa"
  },
  {
    "code": "ML",
    "name": "Republic of Mali",
    "shortName": "Mali",
    "currency": "XOF",
    "flag": "\ud83c\uddf2\ud83c\uddf1",
    "continent": "Africa"
  },
  {
    "code": "BF",
    "name": "Burkina Faso",
    "shortName": "Burkina Faso",
    "currency": "XOF",
    "flag": "\ud83c\udde7\ud83c\uddeb",
    "continent": "Africa"
  },
  {
    "code": "NE",
    "name": "Republic of the Niger",
    "shortName": "Niger",
    "currency": "XOF",
    "flag": "\ud83c\uddf3\ud83c\uddea",
    "continent": "Africa"
  },
  {
    "code": "GN",
    "name": "Republic of Guinea",
    "shortName": "Guinea",
    "currency": "GNF",
    "flag": "\ud83c\uddec\ud83c\uddf3",
    "continent": "Africa"
  },
  {
    "code": "SL",
    "name": "Republic of Sierra Leone",
    "shortName": "Sierra Leone",
    "currency": "SLE",
    "flag": "\ud83c\uddf8\ud83c\uddf1",
    "continent": "Africa"
  },
  {
    "code": "LR",
    "name": "Republic of Liberia",
    "shortName": "Liberia",
    "currency": "LRD",
    "flag": "\ud83c\uddf1\ud83c\uddf7",
    "continent": "Africa"
  },
  {
    "code": "TG",
    "name": "Togolese Republic",
    "shortName": "Togo",
    "currency": "XOF",
    "flag": "\ud83c\uddf9\ud83c\uddec",
    "continent": "Africa"
  },
  {
    "code": "BJ",
    "name": "Republic of Benin",
    "shortName": "Benin",
    "currency": "XOF",
    "flag": "\ud83c\udde7\ud83c\uddef",
    "continent": "Africa"
  },
  {
    "code": "CD",
    "name": "Democratic Republic of the Congo",
    "shortName": "DR Congo",
    "currency": "CDF",
    "flag": "\ud83c\udde8\ud83c\udde9",
    "continent": "Africa"
  },
  {
    "code": "CG",
    "name": "Republic of the Congo",
    "shortName": "Congo",
    "currency": "XAF",
    "flag": "\ud83c\udde8\ud83c\uddec",
    "continent": "Africa"
  },
  {
    "code": "GA",
    "name": "Gabonese Republic",
    "shortName": "Gabon",
    "currency": "XAF",
    "flag": "\ud83c\uddec\ud83c\udde6",
    "continent": "Africa"
  },
  {
    "code": "SD",
    "name": "Republic of the Sudan",
    "shortName": "Sudan",
    "currency": "SDG",
    "flag": "\ud83c\uddf8\ud83c\udde9",
    "continent": "Africa"
  },
  {
    "code": "SS",
    "name": "Republic of South Sudan",
    "shortName": "South Sudan",
    "currency": "SSP",
    "flag": "\ud83c\uddf8\ud83c\uddf8",
    "continent": "Africa"
  },
  {
    "code": "LY",
    "name": "State of Libya",
    "shortName": "Libya",
    "currency": "LYD",
    "flag": "\ud83c\uddf1\ud83c\uddfe",
    "continent": "Africa"
  },
  {
    "code": "SO",
    "name": "Federal Republic of Somalia",
    "shortName": "Somalia",
    "currency": "SOS",
    "flag": "\ud83c\uddf8\ud83c\uddf4",
    "continent": "Africa"
  },
  {
    "code": "MW",
    "name": "Republic of Malawi",
    "shortName": "Malawi",
    "currency": "MWK",
    "flag": "\ud83c\uddf2\ud83c\uddfc",
    "continent": "Africa"
  },
  {
    "code": "GM",
    "name": "Republic of the Gambia",
    "shortName": "Gambia",
    "currency": "GMD",
    "flag": "\ud83c\uddec\ud83c\uddf2",
    "continent": "Africa"
  },
  {
    "code": "MR",
    "name": "Islamic Republic of Mauritania",
    "shortName": "Mauritania",
    "currency": "MRU",
    "flag": "\ud83c\uddf2\ud83c\uddf7",
    "continent": "Africa"
  },
  {
    "code": "DJ",
    "name": "Republic of Djibouti",
    "shortName": "Djibouti",
    "currency": "DJF",
    "flag": "\ud83c\udde9\ud83c\uddef",
    "continent": "Africa"
  },
  {
    "code": "ER",
    "name": "State of Eritrea",
    "shortName": "Eritrea",
    "currency": "ERN",
    "flag": "\ud83c\uddea\ud83c\uddf7",
    "continent": "Africa"
  },
  {
    "code": "CV",
    "name": "Republic of Cabo Verde",
    "shortName": "Cape Verde",
    "currency": "CVE",
    "flag": "\ud83c\udde8\ud83c\uddfb",
    "continent": "Africa"
  },
  {
    "code": "ST",
    "name": "Democratic Republic of S\u00e3o Tom\u00e9 and Pr\u00edncipe",
    "shortName": "Sao Tome & Principe",
    "currency": "STN",
    "flag": "\ud83c\uddf8\ud83c\uddf9",
    "continent": "Africa"
  },
  {
    "code": "KM",
    "name": "Union of the Comoros",
    "shortName": "Comoros",
    "currency": "KMF",
    "flag": "\ud83c\uddf0\ud83c\uddf2",
    "continent": "Africa"
  },
  {
    "code": "SZ",
    "name": "Kingdom of Eswatini",
    "shortName": "Eswatini",
    "currency": "SZL",
    "flag": "\ud83c\uddf8\ud83c\uddff",
    "continent": "Africa"
  },
  {
    "code": "LS",
    "name": "Kingdom of Lesotho",
    "shortName": "Lesotho",
    "currency": "LSL",
    "flag": "\ud83c\uddf1\ud83c\uddf8",
    "continent": "Africa"
  },
  {
    "code": "BI",
    "name": "Republic of Burundi",
    "shortName": "Burundi",
    "currency": "BIF",
    "flag": "\ud83c\udde7\ud83c\uddee",
    "continent": "Africa"
  },
  {
    "code": "TD",
    "name": "Republic of Chad",
    "shortName": "Chad",
    "currency": "XAF",
    "flag": "\ud83c\uddf9\ud83c\udde9",
    "continent": "Africa"
  },
  {
    "code": "CF",
    "name": "Central African Republic",
    "shortName": "Central African Rep",
    "currency": "XAF",
    "flag": "\ud83c\udde8\ud83c\uddeb",
    "continent": "Africa"
  },
  {
    "code": "GQ",
    "name": "Republic of Equatorial Guinea",
    "shortName": "Equatorial Guinea",
    "currency": "XAF",
    "flag": "\ud83c\uddec\ud83c\uddf6",
    "continent": "Africa"
  },
  {
    "code": "GW",
    "name": "Republic of Guinea-Bissau",
    "shortName": "Guinea-Bissau",
    "currency": "XOF",
    "flag": "\ud83c\uddec\ud83c\uddfc",
    "continent": "Africa"
  },
  {
    "code": "AU",
    "name": "Commonwealth of Australia",
    "shortName": "Australia",
    "currency": "AUD",
    "flag": "\ud83c\udde6\ud83c\uddfa",
    "continent": "Oceania"
  },
  {
    "code": "NZ",
    "name": "New Zealand",
    "shortName": "New Zealand",
    "currency": "NZD",
    "flag": "\ud83c\uddf3\ud83c\uddff",
    "continent": "Oceania"
  },
  {
    "code": "FJ",
    "name": "Republic of Fiji",
    "shortName": "Fiji",
    "currency": "FJD",
    "flag": "\ud83c\uddeb\ud83c\uddef",
    "continent": "Oceania"
  },
  {
    "code": "PG",
    "name": "Independent State of Papua New Guinea",
    "shortName": "Papua New Guinea",
    "currency": "PGK",
    "flag": "\ud83c\uddf5\ud83c\uddec",
    "continent": "Oceania"
  },
  {
    "code": "WS",
    "name": "Independent State of Samoa",
    "shortName": "Samoa",
    "currency": "WST",
    "flag": "\ud83c\uddfc\ud83c\uddf8",
    "continent": "Oceania"
  },
  {
    "code": "TO",
    "name": "Kingdom of Tonga",
    "shortName": "Tonga",
    "currency": "TOP",
    "flag": "\ud83c\uddf9\ud83c\uddf4",
    "continent": "Oceania"
  },
  {
    "code": "VU",
    "name": "Republic of Vanuatu",
    "shortName": "Vanuatu",
    "currency": "VUV",
    "flag": "\ud83c\uddfb\ud83c\uddfa",
    "continent": "Oceania"
  },
  {
    "code": "SB",
    "name": "Solomon Islands",
    "shortName": "Solomon Islands",
    "currency": "SBD",
    "flag": "\ud83c\uddf8\ud83c\udde7",
    "continent": "Oceania"
  },
  {
    "code": "GU",
    "name": "Guam",
    "shortName": "Guam",
    "currency": "USD",
    "flag": "\ud83c\uddec\ud83c\uddfa",
    "continent": "Oceania"
  },
  {
    "code": "PF",
    "name": "French Polynesia",
    "shortName": "French Polynesia",
    "currency": "EUR",
    "flag": "\ud83c\uddf5\ud83c\uddeb",
    "continent": "Oceania"
  },
  {
    "code": "NC",
    "name": "New Caledonia",
    "shortName": "New Caledonia",
    "currency": "EUR",
    "flag": "\ud83c\uddf3\ud83c\udde8",
    "continent": "Oceania"
  }
];
  const USD_RATES = {
  "USD": 1.0,
  "AED": 3.6725,
  "SAR": 3.75,
  "QAR": 3.64,
  "KWD": 0.3075,
  "BHD": 0.376,
  "OMR": 0.3845,
  "JOD": 0.709,
  "ILS": 3.72,
  "EGP": 48.6,
  "TRY": 34.1,
  "MAD": 9.85,
  "LBP": 89500.0,
  "IQD": 1310.0,
  "YER": 250.0,
  "SYP": 13000.0,
  "PHP": 56.45,
  "INR": 83.55,
  "PKR": 278.5,
  "BDT": 119.8,
  "LKR": 298.5,
  "NPR": 133.6,
  "SGD": 1.345,
  "MYR": 4.68,
  "IDR": 15850.0,
  "THB": 36.2,
  "VND": 25420.0,
  "CNY": 7.24,
  "JPY": 155.8,
  "KRW": 1375.0,
  "HKD": 7.82,
  "TWD": 32.4,
  "LAK": 21850.0,
  "MMK": 2100.0,
  "MNT": 3450.0,
  "KZT": 482.0,
  "UZS": 12750.0,
  "KGS": 86.5,
  "TJS": 10.9,
  "TMT": 3.5,
  "AFN": 70.5,
  "AZN": 1.7,
  "GEL": 2.7,
  "AMD": 387.0,
  "MVR": 15.45,
  "BND": 1.345,
  "MOP": 8.05,
  "GBP": 0.785,
  "EUR": 0.92,
  "CHF": 0.895,
  "SEK": 10.45,
  "NOK": 10.75,
  "DKK": 6.88,
  "PLN": 3.95,
  "CZK": 23.2,
  "HUF": 365.0,
  "RON": 4.58,
  "UAH": 41.2,
  "BGN": 1.8,
  "ISK": 138.5,
  "ALL": 92.5,
  "RSD": 108.0,
  "BAM": 1.8,
  "MKD": 56.6,
  "MDL": 17.8,
  "CAD": 1.365,
  "MXN": 18.25,
  "BRL": 5.45,
  "COP": 4120.0,
  "ARS": 965.0,
  "CLP": 940.0,
  "PEN": 3.75,
  "DOP": 59.5,
  "JMD": 157.0,
  "GTQ": 7.75,
  "HNL": 24.8,
  "NIO": 36.8,
  "CRC": 525.0,
  "BOB": 6.92,
  "PYG": 7650.0,
  "UYU": 40.5,
  "GYD": 209.0,
  "SRD": 35.5,
  "TTD": 6.8,
  "HTG": 132.0,
  "BSD": 1.0,
  "BBD": 2.0,
  "BZD": 2.0,
  "NGN": 1590.0,
  "KES": 129.5,
  "GHS": 15.6,
  "ZAR": 18.15,
  "ETB": 118.0,
  "UGX": 3720.0,
  "TZS": 2710.0,
  "XOF": 605.0,
  "XAF": 605.0,
  "DZD": 134.5,
  "TND": 3.08,
  "RWF": 1340.0,
  "ZMW": 26.5,
  "AOA": 880.0,
  "MZN": 63.9,
  "BWP": 13.6,
  "NAD": 18.15,
  "MUR": 46.5,
  "SCR": 13.8,
  "MGA": 4550.0,
  "GNF": 8600.0,
  "SLE": 22.5,
  "LRD": 194.0,
  "CDF": 2840.0,
  "SDG": 601.0,
  "SSP": 130.0,
  "LYD": 4.85,
  "SOS": 571.0,
  "MWK": 1735.0,
  "GMD": 68.5,
  "MRU": 39.8,
  "DJF": 177.7,
  "ERN": 15.0,
  "CVE": 101.5,
  "STN": 22.6,
  "KMF": 453.0,
  "SZL": 18.15,
  "LSL": 18.15,
  "BIF": 2890.0,
  "AUD": 1.515,
  "NZD": 1.645,
  "FJD": 2.25,
  "PGK": 3.9,
  "WST": 2.75,
  "TOP": 2.35,
  "VUV": 119.0,
  "SBD": 8.45
};
  const GLOBAL_PROVIDERS = [
  {
    "id": "wise",
    "name": "Wise (formerly TransferWise)",
    "website": "https://wise.com",
    "logoText": "WISE",
    "logoColor": "#00b9ff",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0035,
    "flatFeeUSD": 2.5,
    "fxMarkupPct": 0.0,
    "estimatedMinutes": 15,
    "speedLabel": "\u26a1 Instant to 15 mins",
    "transferMethods": [
      "bank",
      "card",
      "apple_pay",
      "google_pay"
    ],
    "receiveMethods": [
      "bank",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "Government ID / Passport",
        "Bank Account or Debit Card"
      ],
      "recipient": [
        "IBAN / Local Bank Account details or Mobile Wallet"
      ]
    },
    "urlTemplate": "https://wise.com/send?from={from}&to={to}&amount={amount}"
  },
  {
    "id": "western-union",
    "name": "Western Union",
    "website": "https://www.westernunion.com",
    "logoText": "WU",
    "logoColor": "#ffdd00",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.005,
    "flatFeeUSD": 4.0,
    "fxMarkupPct": 0.018,
    "estimatedMinutes": 5,
    "speedLabel": "\u26a1 Instant Cash Pickup (~5 mins)",
    "transferMethods": [
      "bank",
      "card",
      "cash"
    ],
    "receiveMethods": [
      "cash",
      "bank",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "National ID / Passport",
        "Payment Card or Cash at Agent"
      ],
      "recipient": [
        "Government Photo ID & 10-digit MTCN Code"
      ]
    },
    "urlTemplate": "https://www.westernunion.com/web/send-money/start?src={from}&dest={to}&amt={amount}"
  },
  {
    "id": "moneygram",
    "name": "MoneyGram",
    "website": "https://www.moneygram.com",
    "logoText": "MG",
    "logoColor": "#ee2a24",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.006,
    "flatFeeUSD": 3.99,
    "fxMarkupPct": 0.019,
    "estimatedMinutes": 10,
    "speedLabel": "\u26a1 Instant (~10 mins)",
    "transferMethods": [
      "card",
      "bank",
      "cash"
    ],
    "receiveMethods": [
      "cash",
      "wallet",
      "bank"
    ],
    "requirements": {
      "sender": [
        "Photo Identification",
        "Credit/Debit Card or Bank Details"
      ],
      "recipient": [
        "8-digit Reference Number and matching ID"
      ]
    },
    "urlTemplate": "https://www.moneygram.com/mgo/us/en/send/money?sendCurrency={from}&receiveCurrency={to}&amount={amount}"
  },
  {
    "id": "remitly",
    "name": "Remitly",
    "website": "https://www.remitly.com",
    "logoText": "REMITLY",
    "logoColor": "#1570ef",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 0.0,
    "fxMarkupPct": 0.012,
    "estimatedMinutes": 5,
    "speedLabel": "\u26a1 Express Delivery (~5 mins)",
    "transferMethods": [
      "card",
      "bank"
    ],
    "receiveMethods": [
      "bank",
      "wallet",
      "cash"
    ],
    "requirements": {
      "sender": [
        "Verified Phone Number",
        "Emirates ID / SSN / National ID"
      ],
      "recipient": [
        "Official Name matching bank account or cash pickup point"
      ]
    },
    "urlTemplate": "https://www.remitly.com/send?from={from}&to={to}&amount={amount}"
  },
  {
    "id": "worldremit",
    "name": "WorldRemit",
    "website": "https://www.worldremit.com",
    "logoText": "WR",
    "logoColor": "#d92d20",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.005,
    "flatFeeUSD": 2.99,
    "fxMarkupPct": 0.015,
    "estimatedMinutes": 10,
    "speedLabel": "\ud83d\udd52 Within 10 mins",
    "transferMethods": [
      "card",
      "bank",
      "apple_pay"
    ],
    "receiveMethods": [
      "wallet",
      "bank",
      "cash"
    ],
    "requirements": {
      "sender": [
        "Identity Verification",
        "Visa / Mastercard Debit or Credit"
      ],
      "recipient": [
        "Mobile Wallet Account Number or Bank Account"
      ]
    },
    "urlTemplate": "https://www.worldremit.com/en/send-money?from={from}&to={to}&amount={amount}"
  },
  {
    "id": "ria",
    "name": "Ria Money Transfer",
    "website": "https://www.riamoneytransfer.com",
    "logoText": "RIA",
    "logoColor": "#ff6600",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0055,
    "flatFeeUSD": 3.5,
    "fxMarkupPct": 0.017,
    "estimatedMinutes": 15,
    "speedLabel": "\ud83d\udd52 Within 15 mins",
    "transferMethods": [
      "bank",
      "card",
      "cash"
    ],
    "receiveMethods": [
      "cash",
      "bank",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "Government Issued ID",
        "Bank Account or Debit Card"
      ],
      "recipient": [
        "Valid Photo ID & PIN order confirmation"
      ]
    },
    "urlTemplate": "https://www.riamoneytransfer.com/us/en/send-money?from={from}&to={to}&amount={amount}"
  },
  {
    "id": "revolut",
    "name": "Revolut",
    "website": "https://www.revolut.com",
    "logoText": "REV",
    "logoColor": "#191c1f",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.003,
    "flatFeeUSD": 1.5,
    "fxMarkupPct": 0.0025,
    "estimatedMinutes": 5,
    "speedLabel": "\u26a1 Instant to Same Day",
    "transferMethods": [
      "bank",
      "card"
    ],
    "receiveMethods": [
      "bank"
    ],
    "requirements": {
      "sender": [
        "Revolut App Account with Tier 2 KYC verification"
      ],
      "recipient": [
        "IBAN / SWIFT Bank Account details"
      ]
    },
    "urlTemplate": "https://www.revolut.com/international-transfers"
  },
  {
    "id": "ofx",
    "name": "OFX Global Currency",
    "website": "https://www.ofx.com",
    "logoText": "OFX",
    "logoColor": "#027a48",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 0.0,
    "fxMarkupPct": 0.008,
    "estimatedMinutes": 360,
    "speedLabel": "\ud83d\udcc5 Same Day (~few hours)",
    "transferMethods": [
      "bank"
    ],
    "receiveMethods": [
      "bank"
    ],
    "requirements": {
      "sender": [
        "OFX Corporate / Individual account",
        "Proof of address & Tax ID"
      ],
      "recipient": [
        "Recipient Bank Account details"
      ]
    },
    "urlTemplate": "https://www.ofx.com/en-us/money-transfer?from={from}&to={to}&amount={amount}"
  },
  {
    "id": "xe",
    "name": "Xe Money Transfer",
    "website": "https://www.xe.com",
    "logoText": "XE",
    "logoColor": "#0052cc",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 0.0,
    "fxMarkupPct": 0.011,
    "estimatedMinutes": 60,
    "speedLabel": "\ud83d\udd52 Within 60 mins",
    "transferMethods": [
      "bank",
      "card"
    ],
    "receiveMethods": [
      "bank",
      "cash"
    ],
    "requirements": {
      "sender": [
        "Government ID Verification",
        "Direct Bank Account ACH or Card"
      ],
      "recipient": [
        "Bank Account details or Pickup Location"
      ]
    },
    "urlTemplate": "https://www.xe.com/send-money?from={from}&to={to}&amount={amount}"
  },
  {
    "id": "taptap-send",
    "name": "TapTap Send",
    "website": "https://www.taptapsend.com",
    "logoText": "TAPTAP",
    "logoColor": "#10b981",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 0.0,
    "fxMarkupPct": 0.007,
    "estimatedMinutes": 5,
    "speedLabel": "\u26a1 Instant (~5 mins)",
    "transferMethods": [
      "card",
      "wallet"
    ],
    "receiveMethods": [
      "wallet",
      "bank"
    ],
    "requirements": {
      "sender": [
        "Valid Mobile Number",
        "Emirates ID / EU / US Resident Debit Card"
      ],
      "recipient": [
        "Mobile Wallet (GCash, Maya, M-Pesa, Wave)"
      ]
    },
    "urlTemplate": "https://www.taptapsend.com/corridors/{from}-to-{to}"
  },
  {
    "id": "instarem",
    "name": "Instarem",
    "website": "https://www.instarem.com",
    "logoText": "INSTA",
    "logoColor": "#6366f1",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.003,
    "flatFeeUSD": 2.0,
    "fxMarkupPct": 0.005,
    "estimatedMinutes": 15,
    "speedLabel": "\ud83d\udd52 Within 15 mins",
    "transferMethods": [
      "bank",
      "card"
    ],
    "receiveMethods": [
      "bank"
    ],
    "requirements": {
      "sender": [
        "National ID / Passport Verification",
        "Bank Account ACH or Debit"
      ],
      "recipient": [
        "Bank Account Name and Account / IBAN"
      ]
    },
    "urlTemplate": "https://www.instarem.com/transfer?from={from}&to={to}&amount={amount}"
  },
  {
    "id": "paysend",
    "name": "Paysend",
    "website": "https://www.paysend.com",
    "logoText": "PAYSEND",
    "logoColor": "#7c3aed",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 2.0,
    "fxMarkupPct": 0.012,
    "estimatedMinutes": 10,
    "speedLabel": "\ud83d\udd52 Within 10 mins",
    "transferMethods": [
      "card",
      "bank"
    ],
    "receiveMethods": [
      "card",
      "bank",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "Debit or Credit Card details",
        "Verified Phone"
      ],
      "recipient": [
        "16-digit Card Number or Bank Details"
      ]
    },
    "urlTemplate": "https://www.paysend.com/send-money?from={from}&to={to}&amount={amount}"
  },
  {
    "id": "sendwave",
    "name": "Sendwave",
    "website": "https://www.sendwave.com",
    "logoText": "WAVE",
    "logoColor": "#0ea5e9",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 0.0,
    "fxMarkupPct": 0.013,
    "estimatedMinutes": 3,
    "speedLabel": "\u26a1 Instant (~3 mins)",
    "transferMethods": [
      "card"
    ],
    "receiveMethods": [
      "wallet",
      "bank"
    ],
    "requirements": {
      "sender": [
        "Debit Card",
        "SMS verification"
      ],
      "recipient": [
        "Mobile Wallet or Bank Account"
      ]
    },
    "urlTemplate": "https://www.sendwave.com/send?from={from}&to={to}&amount={amount}"
  },
  {
    "id": "xoom",
    "name": "Xoom (PayPal)",
    "website": "https://www.xoom.com",
    "logoText": "XOOM",
    "logoColor": "#0070ba",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.004,
    "flatFeeUSD": 2.99,
    "fxMarkupPct": 0.016,
    "estimatedMinutes": 10,
    "speedLabel": "\u26a1 Instant to Bank/Pickup (~10 mins)",
    "transferMethods": [
      "bank",
      "card",
      "wallet"
    ],
    "receiveMethods": [
      "bank",
      "cash",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "PayPal Account or Debit Card",
        "ID Verification"
      ],
      "recipient": [
        "Bank Account or Cash Pickup Government ID"
      ]
    },
    "urlTemplate": "https://www.xoom.com/send-money?from={from}&to={to}&amount={amount}"
  },
  {
    "id": "skrill",
    "name": "Skrill Money Transfer",
    "website": "https://www.skrill.com",
    "logoText": "SKRILL",
    "logoColor": "#811653",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 0.0,
    "fxMarkupPct": 0.014,
    "estimatedMinutes": 30,
    "speedLabel": "\ud83d\udd52 Within 30 mins",
    "transferMethods": [
      "card",
      "bank"
    ],
    "receiveMethods": [
      "bank",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "Skrill Account & Email Verification"
      ],
      "recipient": [
        "Bank Account details or Mobile Wallet"
      ]
    },
    "urlTemplate": "https://www.skrill.com/en/transfer-money"
  },
  {
    "id": "currencies-direct",
    "name": "Currencies Direct",
    "website": "https://www.currenciesdirect.com",
    "logoText": "CD",
    "logoColor": "#e11d48",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 0.0,
    "fxMarkupPct": 0.0065,
    "estimatedMinutes": 240,
    "speedLabel": "\ud83d\udcc5 Same Day (~4-8 hours)",
    "transferMethods": [
      "bank"
    ],
    "receiveMethods": [
      "bank"
    ],
    "requirements": {
      "sender": [
        "ID & Address Verification",
        "Source of Funds for large sums"
      ],
      "recipient": [
        "Full Bank Account SWIFT / IBAN"
      ]
    },
    "urlTemplate": "https://www.currenciesdirect.com/en"
  },
  {
    "id": "torfx",
    "name": "TorFX",
    "website": "https://www.torfx.com",
    "logoText": "TORFX",
    "logoColor": "#2563eb",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 0.0,
    "fxMarkupPct": 0.006,
    "estimatedMinutes": 300,
    "speedLabel": "\ud83d\udcc5 Same Day Delivery",
    "transferMethods": [
      "bank"
    ],
    "receiveMethods": [
      "bank"
    ],
    "requirements": {
      "sender": [
        "Official Photo ID",
        "Bank Wire Details"
      ],
      "recipient": [
        "Recipient Bank Account details"
      ]
    },
    "urlTemplate": "https://www.torfx.com/transfers"
  },
  {
    "id": "currencyfair",
    "name": "CurrencyFair",
    "website": "https://www.currencyfair.com",
    "logoText": "CFAIR",
    "logoColor": "#f59e0b",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 3.0,
    "fxMarkupPct": 0.0045,
    "estimatedMinutes": 1440,
    "speedLabel": "\ud83d\uddd3\ufe0f 1 Business Day",
    "transferMethods": [
      "bank"
    ],
    "receiveMethods": [
      "bank"
    ],
    "requirements": {
      "sender": [
        "Passport / National ID",
        "Proof of Residency"
      ],
      "recipient": [
        "Bank Account Details"
      ]
    },
    "urlTemplate": "https://www.currencyfair.com/send-money"
  },
  {
    "id": "al-ansari",
    "name": "Al Ansari Exchange",
    "website": "https://alansariexchange.com",
    "logoText": "ALANSARI",
    "logoColor": "#c2410c",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 4.1,
    "fxMarkupPct": 0.007,
    "estimatedMinutes": 30,
    "speedLabel": "\ud83d\udd52 Within 30 mins",
    "transferMethods": [
      "bank",
      "card",
      "cash"
    ],
    "receiveMethods": [
      "bank",
      "cash",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "Emirates ID / GCC National ID",
        "Debit Card / Cash"
      ],
      "recipient": [
        "Cebuana / Muthoot pickup or Bank Account"
      ]
    },
    "urlTemplate": "https://alansariexchange.com/online-remittance"
  },
  {
    "id": "lulu-exchange",
    "name": "LuLu Exchange (LuLu Money)",
    "website": "https://www.luluexchange.com",
    "logoText": "LULU",
    "logoColor": "#059669",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 3.3,
    "fxMarkupPct": 0.008,
    "estimatedMinutes": 45,
    "speedLabel": "\ud83d\udd52 Within 45 mins",
    "transferMethods": [
      "bank",
      "card"
    ],
    "receiveMethods": [
      "bank",
      "cash",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "Emirates ID / GCC ID",
        "Local Bank Account or Debit Card"
      ],
      "recipient": [
        "Cash Pickup or Bank Account"
      ]
    },
    "urlTemplate": "https://www.lulumoney.com"
  },
  {
    "id": "hubpay",
    "name": "Hubpay UAE",
    "website": "https://www.hubpay.com",
    "logoText": "HUBPAY",
    "logoColor": "#0284c7",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 2.05,
    "fxMarkupPct": 0.006,
    "estimatedMinutes": 10,
    "speedLabel": "\ud83d\udd52 Within 10 mins",
    "transferMethods": [
      "bank",
      "wallet"
    ],
    "receiveMethods": [
      "bank",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "UAE Pass / Emirates ID Digital KYC",
        "UAE Bank Account"
      ],
      "recipient": [
        "GCash, bKash, Easypaisa or Bank Account"
      ]
    },
    "urlTemplate": "https://www.hubpay.com/remittance"
  },
  {
    "id": "pyypl",
    "name": "Pyypl GCC",
    "website": "https://www.pyypl.com",
    "logoText": "PYYPL",
    "logoColor": "#8b5cf6",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 1.35,
    "fxMarkupPct": 0.009,
    "estimatedMinutes": 5,
    "speedLabel": "\u26a1 Instant (~5 mins)",
    "transferMethods": [
      "card",
      "wallet"
    ],
    "receiveMethods": [
      "bank",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "Pyypl App Account",
        "Emirates ID / National ID"
      ],
      "recipient": [
        "Mobile Wallet or Bank Account"
      ]
    },
    "urlTemplate": "https://www.pyypl.com/features/send-money"
  },
  {
    "id": "lemfi",
    "name": "LemFi",
    "website": "https://lemfi.com",
    "logoText": "LEMFI",
    "logoColor": "#ec4899",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 0.0,
    "fxMarkupPct": 0.0085,
    "estimatedMinutes": 5,
    "speedLabel": "\u26a1 Instant (~5 mins)",
    "transferMethods": [
      "bank",
      "card"
    ],
    "receiveMethods": [
      "bank",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "Government ID / Visa verification",
        "Local debit card"
      ],
      "recipient": [
        "Local bank account number or Mobile Money"
      ]
    },
    "urlTemplate": "https://lemfi.com/send"
  },
  {
    "id": "flutterwave",
    "name": "Flutterwave Send",
    "website": "https://send.flutterwave.com",
    "logoText": "FLUTTER",
    "logoColor": "#f97316",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 1.0,
    "fxMarkupPct": 0.01,
    "estimatedMinutes": 5,
    "speedLabel": "\u26a1 Instant (~5 mins)",
    "transferMethods": [
      "card",
      "bank"
    ],
    "receiveMethods": [
      "bank",
      "wallet"
    ],
    "requirements": {
      "sender": [
        "Phone number & Debit Card",
        "Photo ID Verification"
      ],
      "recipient": [
        "Bank Account details or Mobile Money Wallet"
      ]
    },
    "urlTemplate": "https://send.flutterwave.com"
  },
  {
    "id": "chipper-cash",
    "name": "Chipper Cash",
    "website": "https://chippercash.com",
    "logoText": "CHIPPER",
    "logoColor": "#14b8a6",
    "globalSend": true,
    "globalReceive": true,
    "feePct": 0.0,
    "flatFeeUSD": 0.0,
    "fxMarkupPct": 0.011,
    "estimatedMinutes": 2,
    "speedLabel": "\u26a1 Instant (~2 mins)",
    "transferMethods": [
      "wallet",
      "card"
    ],
    "receiveMethods": [
      "wallet",
      "bank"
    ],
    "requirements": {
      "sender": [
        "Chipper Account",
        "Government ID"
      ],
      "recipient": [
        "Chipper @Tag, Mobile Money or Bank Account"
      ]
    },
    "urlTemplate": "https://chippercash.com"
  }
];

  function getCrossRate(sendCurrency, receiveCurrency) {
    const send = (sendCurrency || "USD").toUpperCase();
    const recv = (receiveCurrency || "PHP").toUpperCase();
    if (send === recv) return 1.0;
    const rSend = USD_RATES[send] || 1.0;
    const rRecv = USD_RATES[recv] || 1.0;
    return parseFloat((rRecv / rSend).toFixed(4));
  }

  function normalizeCountryCode(val) {
    if (!val) return "AE";
    const clean = val.trim().toUpperCase();
    const found = ALL_COUNTRIES.find(c => c.code === clean || c.shortName.toUpperCase() === clean || c.name.toUpperCase() === clean);
    return found ? found.code : clean;
  }

  function findTransferOptions(arg1, arg2) {
    const search = arg2 || arg1;
    const fromCode = normalizeCountryCode(search.fromCountry);
    const toCode = normalizeCountryCode(search.toCountry);

    const fromObj = ALL_COUNTRIES.find(c => c.code === fromCode) || { currency: "USD", shortName: search.fromCountry };
    const toObj = ALL_COUNTRIES.find(c => c.code === toCode) || { currency: "PHP", shortName: search.toCountry };

    const sendCurr = (search.sendCurrency || fromObj.currency).toUpperCase();
    const recvCurr = (search.receiveCurrency || toObj.currency).toUpperCase();
    const amount = parseFloat(search.amount) || 1000;

    const midRate = getCrossRate(sendCurr, recvCurr);
    const usdToSendRate = USD_RATES[sendCurr] || 1.0;

    const results = [];

    for (const prov of GLOBAL_PROVIDERS) {
      if (search.receiveMethod && prov.receiveMethods) {
        if (!prov.receiveMethods.includes(search.receiveMethod)) {
          continue;
        }
      }

      // Calculate Upfront Fee
      const feePct = prov.feePct || 0.0;
      const flatFee = (prov.flatFeeUSD || 0.0) * usdToSendRate;
      const totalFee = parseFloat(((amount * feePct) + flatFee).toFixed(2));

      if (amount <= totalFee) continue;

      // Provider Exchange Rate with FX Margin
      const markupPct = prov.fxMarkupPct || 0.0;
      const providerRate = parseFloat((midRate * (1.0 - markupPct)).toFixed(4));

      const amountAfterFee = amount - totalFee;
      const recipientGets = parseFloat((amountAfterFee * providerRate).toFixed(2));

      // Speed Formatting
      const estMin = prov.estimatedMinutes || 30;
      let speedText = prov.speedLabel || "🕒 Within 30 mins";

      // Direct Deep-Link Generation
      const template = prov.urlTemplate || prov.website;
      const transferUrl = template
        .replace("{from}", fromCode)
        .replace("{to}", toCode)
        .replace("{amount}", String(Math.round(amount)));

      // Transparent Cost Breakdown
      const hiddenFxCost = parseFloat((amountAfterFee * (midRate - providerRate)).toFixed(2));
      const totalCost = parseFloat((totalFee + (hiddenFxCost / (midRate > 0 ? midRate : 1))).toFixed(2));

      results.push({
        providerId: prov.id,
        providerName: prov.name,
        providerWebsite: prov.website,
        logoText: prov.logoText || prov.name.substring(0, 4),
        logoColor: prov.logoColor || "#3b82f6",
        fee: totalFee,
        exchangeRate: providerRate,
        recipientGets: recipientGets,
        estimatedMinutes: estMin,
        speedLabel: speedText,
        speedText: speedText,
        transferMethods: prov.transferMethods || ["bank", "card"],
        receiveMethods: prov.receiveMethods || ["bank", "wallet"],
        requirements: prov.requirements || {},
        transferUrl: transferUrl,
        midMarketRate: midRate,
        fxMarkupPercentage: parseFloat((markupPct * 100).toFixed(2)),
        hiddenFxCost: hiddenFxCost,
        totalCost: totalCost,
        badges: []
      });
    }

    // Sorting
    const prio = search.priority || "most_received";
    if (prio === "cheapest") {
      results.sort((a, b) => a.fee - b.fee);
    } else if (prio === "fastest") {
      results.sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
    } else {
      results.sort((a, b) => b.recipientGets - a.recipientGets);
    }

    if (results.length > 0) {
      const maxPayout = Math.max(...results.map(r => r.recipientGets));
      const minFee = Math.min(...results.map(r => r.fee));
      const minTime = Math.min(...results.map(r => r.estimatedMinutes));

      for (const r of results) {
        if (r.recipientGets === maxPayout) r.badges.push("🏆 Most Received");
        if (r.fee === 0) r.badges.push("🏷️ Zero Transfer Fee");
        else if (r.fee === minFee && minFee > 0) r.badges.push("💰 Lowest Fee");
        if (r.estimatedMinutes === minTime && minTime <= 10) r.badges.push("⚡ Fastest Delivery");
        if (r.fxMarkupPercentage === 0) r.badges.push("🛡️ True Mid-Market Rate");
      }
    }

    return results;
  }

  window.GTS_ENGINE = {
    ALL_COUNTRIES: ALL_COUNTRIES,
    USD_RATES: USD_RATES,
    GLOBAL_PROVIDERS: GLOBAL_PROVIDERS,
    getCrossRate: getCrossRate,
    normalizeCountryCode: normalizeCountryCode,
    findTransferOptions: findTransferOptions
  };
})();
