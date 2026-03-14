import type { Agent } from "@/data/mockAgents";

// ── Types ────────────────────────────────────────────────────────────────────

export interface TDSResult {
  tdsRate: number;       // Percentage, e.g. 10
  tdsAmount: number;     // Computed TDS in USDC
  netPayable: number;    // grossAmount - tdsAmount
  section: string;       // e.g. "194J"
}

export interface Invoice {
  invoiceNumber: string;
  agentName: string;
  gstin: string;
  serviceCategory: string;
  grossAmount: number;
  tdsRate: number;
  tdsAmount: number;
  netPayable: number;
  section: string;
  date: string;          // ISO date string
  clientPan: string;
}

export interface Form26QEntry {
  deducteeType: "COMPANY" | "OTHER";
  pan: string;
  name: string;
  section: string;
  grossAmount: number;
  tdsDeducted: number;
  taxDeposited: number;
  dateOfDeduction: string;
  dateOfDeposit: string;
  certificateNumber: string;
}

export interface Form26Q {
  tan: string;
  quarter: "Q1" | "Q2" | "Q3" | "Q4";
  financialYear: string;
  totalEntries: number;
  totalTDS: number;
  entries: Form26QEntry[];
}

// ── TDS Rate Mapping ──────────────────────────────────────────────────────────

const TDS_MAPPING: Record<string, { rate: number; section: string }> = {
  "Information Technology Services": { rate: 10, section: "194J" },
  "Financial Services":              { rate: 2,  section: "194A" },
  "Consulting Services":             { rate: 10, section: "194J" },
  "Marketing & Advertising":         { rate: 1,  section: "194C" },
  "Research & Development":          { rate: 10, section: "194J" },
};

// Default fallback for unmapped categories
const DEFAULT_TDS = { rate: 10, section: "194J" };

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Calculate TDS (Tax Deducted at Source) for a given service category and gross amount.
 */
export function calculateTDS(serviceCategory: string, grossAmount: number): TDSResult {
  const mapping = TDS_MAPPING[serviceCategory] ?? DEFAULT_TDS;
  const tdsAmount = parseFloat(((mapping.rate / 100) * grossAmount).toFixed(2));
  const netPayable = parseFloat((grossAmount - tdsAmount).toFixed(2));

  return {
    tdsRate: mapping.rate,
    tdsAmount,
    netPayable,
    section: mapping.section,
  };
}

/**
 * Generate an invoice object for an agent transaction.
 */
export function generateInvoice(agent: Agent, amount: number, clientPan: string): Invoice {
  const timestamp = Date.now();
  const random4 = Math.floor(1000 + Math.random() * 9000).toString();
  const invoiceNumber = `INV-${timestamp}-${random4}`;

  const category = agent.indiaCompliance?.serviceCategory ?? "Information Technology Services";
  const gstin = agent.indiaCompliance?.gstin ?? "";

  const tds = calculateTDS(category, amount);

  return {
    invoiceNumber,
    agentName: agent.name,
    gstin,
    serviceCategory: category,
    grossAmount: amount,
    tdsRate: tds.tdsRate,
    tdsAmount: tds.tdsAmount,
    netPayable: tds.netPayable,
    section: tds.section,
    date: new Date().toISOString(),
    clientPan: clientPan.toUpperCase(),
  };
}

/**
 * Format a list of invoices into the ITD 26Q filing format.
 */
export function formatFor26Q(
  invoices: Invoice[],
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
): Form26Q {
  const now = new Date();
  const financialYear = getFinancialYear(now, quarter);

  const entries: Form26QEntry[] = invoices.map((inv, i) => ({
    deducteeType: "OTHER",
    pan: inv.clientPan,
    name: inv.agentName,
    section: inv.section,
    grossAmount: inv.grossAmount,
    tdsDeducted: inv.tdsAmount,
    taxDeposited: inv.tdsAmount,
    dateOfDeduction: inv.date.slice(0, 10),
    dateOfDeposit: inv.date.slice(0, 10),
    certificateNumber: `CERT-${quarter}-${String(i + 1).padStart(4, "0")}`,
  }));

  const totalTDS = parseFloat(
    entries.reduce((sum, e) => sum + e.tdsDeducted, 0).toFixed(2)
  );

  return {
    tan: "AGENTID0000A", // Placeholder — real TAN from env in production
    quarter,
    financialYear,
    totalEntries: entries.length,
    totalTDS,
    entries,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFinancialYear(date: Date, quarter: "Q1" | "Q2" | "Q3" | "Q4"): string {
  const year = date.getFullYear();
  // Indian FY: April–March. Q1 = Apr–Jun, Q2 = Jul–Sep, Q3 = Oct–Dec, Q4 = Jan–Mar
  if (quarter === "Q4") {
    // Q4 spans Jan–Mar which is the tail of the FY that started the previous April
    return `${year - 1}-${String(year).slice(-2)}`;
  }
  return `${year}-${String(year + 1).slice(-2)}`;
}

/**
 * Get all available service categories.
 */
export function getServiceCategories(): string[] {
  return Object.keys(TDS_MAPPING);
}

/**
 * Get the section label for display, e.g. "Section 194J — 10% TDS"
 */
export function getSectionLabel(serviceCategory: string): string {
  const mapping = TDS_MAPPING[serviceCategory] ?? DEFAULT_TDS;
  return `Section ${mapping.section} — ${mapping.rate}% TDS applicable`;
}
