// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require("pdfkit") as any;

export type PdfLink = {
  invoiceNumber: string;
  customerName: string;
  invoiceCurrency: string;
  invoiceAmountMinor: string;
  txnCurrency: string;
  txnAmountMinor: string;
  fxRate: number | null;
  fxDiffMinor: string;
  feeMinor: string;
  method: string;
  confidence: number;
  status: string;
  explanation: string;
  txnDate: string;
};

export type PdfReportOptions = {
  workspaceName: string;
  runId: string;
  generatedAt?: Date;
  links: PdfLink[];
};

const EXPONENTS: Record<string, number> = {
  USD: 2, EUR: 2, GBP: 2, AUD: 2, CAD: 2, CHF: 2, JPY: 0, KRW: 0,
  HKD: 2, SGD: 2, INR: 2, AED: 2, SAR: 2, KWD: 3, BHD: 3, BRL: 2, MXN: 2,
};

function exp(ccy: string) { return EXPONENTS[ccy.toUpperCase()] ?? 2; }

function major(minor: string | bigint, ccy: string): string {
  const e = exp(ccy);
  const m = BigInt(minor);
  if (e === 0) return m.toString();
  const neg = m < 0n;
  const abs = (neg ? -m : m).toString().padStart(e + 1, "0");
  const val = `${neg ? "-" : ""}${abs.slice(0, -e)}.${abs.slice(-e)}`;
  return val;
}

function fmt(minor: string | bigint, ccy: string): string {
  try {
    return `${ccy} ${major(minor, ccy)}`;
  } catch { return String(minor); }
}

/** Generate a Payment-Cost PDF report as a Buffer. */
export async function generatePaymentCostReport(opts: PdfReportOptions): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const { workspaceName, runId, generatedAt = new Date(), links } = opts;

    // ── Header ──────────────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(20).text("Payment Cost Report", { align: "center" });
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(10)
      .text(`Workspace: ${workspaceName}`, { align: "center" })
      .text(`Run ID: ${runId}`, { align: "center" })
      .text(`Generated: ${generatedAt.toISOString()}`, { align: "center" });
    doc.moveDown(1);

    // ── Summary table ────────────────────────────────────────────────────────
    const accepted = links.filter((l) => l.status !== "REJECTED");

    // Group totals by invoice currency
    type Summary = { invoiced: bigint; received: bigint; fxDiff: bigint; fee: bigint; count: number };
    const byCcy: Record<string, Summary> = {};
    for (const link of accepted) {
      const c = link.invoiceCurrency;
      if (!byCcy[c]) byCcy[c] = { invoiced: 0n, received: 0n, fxDiff: 0n, fee: 0n, count: 0 };
      byCcy[c].invoiced += BigInt(link.invoiceAmountMinor);
      byCcy[c].received += BigInt(link.txnAmountMinor);
      byCcy[c].fxDiff += BigInt(link.fxDiffMinor);
      byCcy[c].fee += BigInt(link.feeMinor);
      byCcy[c].count++;
    }

    doc.font("Helvetica-Bold").fontSize(13).text("Summary by Currency");
    doc.moveDown(0.4);

    const summaryHeaders = ["Currency", "Links", "Invoiced", "Received", "FX Diff", "Fees"];
    const summaryWidths = [55, 40, 110, 110, 110, 100];
    let sx = doc.page.margins.left;
    const sy = doc.y;

    doc.font("Helvetica-Bold").fontSize(8);
    summaryHeaders.forEach((h, i) => {
      doc.text(h, sx, sy, { width: summaryWidths[i], align: i === 0 ? "left" : "right" });
      sx += summaryWidths[i];
    });
    doc.moveTo(doc.page.margins.left, doc.y + 2)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
      .stroke();
    doc.moveDown(0.6);

    doc.font("Helvetica").fontSize(8);
    for (const [ccy, s] of Object.entries(byCcy)) {
      let rx = doc.page.margins.left;
      const ry = doc.y;
      const row = [
        ccy,
        String(s.count),
        fmt(s.invoiced, ccy),
        fmt(s.received, ccy),
        fmt(s.fxDiff, ccy),
        fmt(s.fee, ccy),
      ];
      row.forEach((val, i) => {
        doc.text(val, rx, ry, { width: summaryWidths[i], align: i <= 1 ? "left" : "right" });
        rx += summaryWidths[i];
      });
      doc.moveDown(0.7);
    }
    doc.moveDown(0.8);

    // ── Per-link detail ──────────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(13).text("Link Detail");
    doc.moveDown(0.4);

    const cols = ["Invoice", "Customer", "Inv Amt", "Mid Rate", "Txn Amt", "FX Diff", "Fee", "Method"];
    const widths = [65, 90, 75, 65, 75, 65, 55, 65];
    const totalWidth = widths.reduce((a, b) => a + b, 0);

    const drawDetailHeader = () => {
      let hx = doc.page.margins.left;
      const hy = doc.y;
      doc.font("Helvetica-Bold").fontSize(7.5);
      cols.forEach((h, i) => {
        doc.text(h, hx, hy, { width: widths[i], align: i <= 1 ? "left" : "right" });
        hx += widths[i];
      });
      doc.moveTo(doc.page.margins.left, doc.y + 2)
        .lineTo(doc.page.margins.left + totalWidth, doc.y + 2)
        .stroke();
      doc.moveDown(0.6);
    };

    drawDetailHeader();
    doc.font("Helvetica").fontSize(7.5);

    for (const link of accepted) {
      if (doc.y > doc.page.height - 120) {
        doc.addPage();
        drawDetailHeader();
        doc.font("Helvetica").fontSize(7.5);
      }

      const rateStr = link.fxRate ? link.fxRate.toFixed(6) : (link.invoiceCurrency === link.txnCurrency ? "1.000000" : "—");
      const row = [
        link.invoiceNumber,
        link.customerName.slice(0, 16),
        fmt(link.invoiceAmountMinor, link.invoiceCurrency),
        rateStr,
        fmt(link.txnAmountMinor, link.txnCurrency),
        fmt(link.fxDiffMinor, link.invoiceCurrency),
        fmt(link.feeMinor, link.invoiceCurrency),
        link.method.replace("_", " "),
      ];

      const rx0 = doc.page.margins.left;
      const ry0 = doc.y;

      // Color-code rejected
      if (link.status === "REJECTED") doc.fillColor("#999999");

      row.forEach((val, i) => {
        let lx = rx0;
        for (let j = 0; j < i; j++) lx += widths[j];
        doc.text(val, lx, ry0, { width: widths[i], align: i <= 1 ? "left" : "right" });
      });
      doc.fillColor("#000000");
      doc.moveDown(0.7);
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.moveDown(1.5);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(7).fillColor("#666666")
      .text(
        "Mid-market rates sourced from Frankfurter (ECB). This report is for reconciliation purposes only and does not constitute financial advice. Statement data is not used for training.",
        { align: "center" }
      );

    // Page numbers
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      doc.font("Helvetica").fontSize(7).fillColor("#999999").text(
        `Page ${i + 1} of ${pages.count}`,
        doc.page.margins.left,
        doc.page.height - 30,
        { align: "right", width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
      );
    }

    doc.end();
  });
}
