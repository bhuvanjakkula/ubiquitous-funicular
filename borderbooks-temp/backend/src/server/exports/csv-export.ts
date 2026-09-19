import type { CURRENCY_EXPONENTS } from "../parsers/money";

// Exported currency exponent map (subset matching what the matching engine uses)
const EXPONENTS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, AUD: 2, CAD: 2, CHF: 2, HKD: 2, SGD: 2,
  NZD: 2, SEK: 2, NOK: 2, DKK: 2, MXN: 2, BRL: 2, INR: 2, ZAR: 2,
  PLN: 2, CZK: 2, HUF: 2, TRY: 2, AED: 2, SAR: 2, KWD: 3, BHD: 3,
  OMR: 3, JOD: 3, JPY: 0, KRW: 0, IDR: 0, VND: 0, CLP: 0,
};

export function getExponent(ccy: string): number {
  return EXPONENTS[ccy.toUpperCase()] ?? 2;
}

export type ExportedLink = {
  invoiceNumber: string;
  customerName: string;
  invoiceCurrency: string;
  invoiceAmountMinor: string;
  txnCurrency: string;
  txnAmountMinor: string;
  fxRate: string | null;
  fxDiffMinor: string;
  feeMinor: string;
  method: string;
  confidence: number;
  status: string;
  explanation: string;
  txnDate: string;
  postedAt: string;
};

/** Escape a CSV field: wrap in quotes if it contains comma, quote, or newline */
function escapeCsv(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Format a minor-unit amount as a major-unit decimal string */
function formatMajor(minor: string | bigint, ccy: string): string {
  const exp = getExponent(typeof ccy === "string" ? ccy : "USD");
  const m = BigInt(minor);
  if (exp === 0) return m.toString();
  const neg = m < 0n;
  const abs = (neg ? -m : m).toString().padStart(exp + 1, "0");
  return `${neg ? "-" : ""}${abs.slice(0, -exp)}.${abs.slice(-exp)}`;
}

export function exportMatchedLinks(links: ExportedLink[]): string {
  const headers = [
    "InvoiceNumber",
    "CustomerName",
    "InvoiceCurrency",
    "InvoiceAmount",
    "TxnCurrency",
    "TxnAmount",
    "FxRate",
    "FxDiffMinor",
    "FxDiff",
    "FeeMinor",
    "Fee",
    "Method",
    "Confidence",
    "Status",
    "TxnDate",
    "Explanation",
  ];

  const rows = links.map((link) => {
    const invAmt = formatMajor(link.invoiceAmountMinor, link.invoiceCurrency);
    const txnAmt = formatMajor(link.txnAmountMinor, link.txnCurrency);
    const fxDiff = formatMajor(link.fxDiffMinor, link.invoiceCurrency);
    const fee = formatMajor(link.feeMinor, link.invoiceCurrency);

    return [
      link.invoiceNumber,
      link.customerName,
      link.invoiceCurrency,
      invAmt,
      link.txnCurrency,
      txnAmt,
      link.fxRate ?? "",
      link.fxDiffMinor,
      fxDiff,
      link.feeMinor,
      fee,
      link.method,
      link.confidence,
      link.status,
      link.txnDate,
      link.explanation,
    ].map(escapeCsv).join(",");
  });

  return [headers.join(","), ...rows].join("\r\n");
}
