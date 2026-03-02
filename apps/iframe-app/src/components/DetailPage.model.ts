import { type ExceptionRow } from "../mockData";
import { HOST_FIX_URL } from "../runtime";

export type DetailChipTone = "sky" | "indigo" | "rose" | "emerald" | "slate";
export type DetailDecision = "agree" | "disagree" | null;
export type TerminalAction = "confirm-fixed" | "fix-later" | "disagree-feedback";
type TimelineState = "completed" | "pending";

export type DetailStatusChip = {
  icon: "thumbs-up" | "thumbs-down" | "check" | "none";
  kind: "review" | "fix";
  value: "Pending Review" | "Validated" | "Rejected" | "Pending Fix" | "Fixed";
  tone: DetailChipTone;
};

type EvidenceEvent = {
  id: string;
  title: string;
  timestampLabel: string;
  quote: string;
  subject: string;
  eventId: string;
  from: string;
  message: string;
};

type TimelineMilestone = {
  label: "Tendered" | "Picked Up" | "Delivered" | "Invoiced";
  datetime: string | null;
  state: TimelineState;
};

type ExceptionBreakdownRow = {
  charge: string;
  billedTmsCents: number;
  expectedCents: number;
  varianceCents: number;
};

type OrderDetails = {
  orderId: string;
  customerShipId: string;
  account: string;
  accountCode: string;
  billToCode: string;
  originName: string;
  originAddress1: string;
  originAddress2: string;
  originCityStateZip: string;
  originLocationCode: string;
  destinationName: string;
  destinationAddress1: string;
  destinationAddress2: string;
  destinationCityStateZip: string;
  destinationLocationCode: string;
};

type DetailFixture = {
  orderDetails: OrderDetails;
  timeline: TimelineMilestone[];
  exceptionBreakdown: ExceptionBreakdownRow;
  evidence: EvidenceEvent[];
  auditRunAt: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit"
});
const lastUpdatedFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  month: "numeric",
  day: "numeric",
  year: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});
const timelineDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "2-digit"
});
const evidenceMetaFormatter = new Intl.DateTimeFormat("en-US", {
  month: "numeric",
  day: "numeric",
  year: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  hour12: true
});

export function getDefaultDecisionFromReviewState(reviewState?: ExceptionRow["reviewState"]): DetailDecision {
  if (reviewState === "Confirmed") {
    return "agree";
  }
  if (reviewState === "Rejected") {
    return "disagree";
  }
  return null;
}

export function formatCurrency(amountCents: number): string {
  return currencyFormatter.format(amountCents / 100);
}

export function formatLastUpdatedAbsolute(value: string): string {
  const parts = lastUpdatedFormatter.formatToParts(new Date(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "";
  const month = getPart("month");
  const day = getPart("day");
  const year = getPart("year");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const dayPeriod = getPart("dayPeriod").toUpperCase();
  return `${month}/${day}/${year} ${hour}:${minute}${dayPeriod} CT`;
}

export function formatLastUpdatedRelative(value: string): string {
  const updatedAt = new Date(value);
  const updatedAtMs = updatedAt.getTime();
  if (Number.isNaN(updatedAtMs)) {
    return "0s ago";
  }

  const deltaMs = Date.now() - updatedAtMs;
  if (deltaMs <= 0) {
    return "0s ago";
  }

  const deltaSeconds = Math.floor(deltaMs / 1000);
  const minuteSeconds = 60;
  const hourSeconds = 60 * minuteSeconds;
  const daySeconds = 24 * hourSeconds;
  const weekSeconds = 7 * daySeconds;
  const monthSeconds = 30.44 * daySeconds;
  const yearSeconds = 365.25 * daySeconds;

  if (deltaSeconds < minuteSeconds) {
    return `${Math.max(1, deltaSeconds)}s ago`;
  }

  if (deltaSeconds < hourSeconds) {
    return `${Math.floor(deltaSeconds / minuteSeconds)}m ago`;
  }

  if (deltaSeconds < daySeconds) {
    return `${Math.floor(deltaSeconds / hourSeconds)}h ago`;
  }

  if (deltaSeconds < weekSeconds) {
    return `${Math.floor(deltaSeconds / daySeconds)}d ago`;
  }

  if (deltaSeconds < monthSeconds) {
    return `${Math.floor(deltaSeconds / weekSeconds)}w ago`;
  }

  if (deltaSeconds < yearSeconds) {
    return `${Math.floor(deltaSeconds / monthSeconds)}mo ago`;
  }

  return `${Math.floor(deltaSeconds / yearSeconds)}y ago`;
}

export function formatCreatedRelative(value: string): string {
  return formatLastUpdatedRelative(value);
}

export function formatTimelineDate(value: string): string {
  return timelineDateFormatter.format(new Date(value));
}

export function formatEvidenceMetaTimestamp(value: string): string {
  const parts = evidenceMetaFormatter.formatToParts(new Date(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "";
  const month = getPart("month");
  const day = getPart("day");
  const year = getPart("year");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const dayPeriod = getPart("dayPeriod").toUpperCase();
  return `${month}/${day}/${year} at ${hour}:${minute}${dayPeriod}`;
}

export function stripEmailFromEvidenceTitle(title: string): string {
  return title.replace(/\s*<[^>]+>\s*$/, "").trim();
}

function parseLane(lane: string): { origin: string; destination: string } {
  const [origin = "Unknown, NA", destination = "Unknown, NA"] = lane.split("-->").map((part) => part.trim());
  return { origin, destination };
}

type LocationAddressDetails = {
  name: string;
  address1: string;
  address2: string;
  cityStateZip: string;
};

function buildLocationAddress(cityState: string, seed: number, kind: "origin" | "destination"): LocationAddressDetails {
  const [cityRaw = "Unknown", stateRaw = "NA"] = cityState.split(",").map((part) => part.trim());
  const city = cityRaw || "Unknown";
  const state = stateRaw || "NA";
  const streetNo = 100 + (seed % 800);
  const streetNames = ["Logistics Way", "Commerce Blvd", "Carrier Ave", "Freight Park", "Shipper Drive"];
  const suite = 10 + (seed % 80);
  const zip = (10000 + ((seed * 137) % 89999)).toString().padStart(5, "0");
  const nameSuffixes =
    kind === "origin"
      ? ["Origin Hub", "Shipper Campus", "Dispatch Center", "Pickup Facility"]
      : ["Destination Hub", "Receiver Campus", "Delivery Center", "Consignee Facility"];
  const name = `${city} ${nameSuffixes[seed % nameSuffixes.length]}`;
  const address1 = `${streetNo} ${streetNames[seed % streetNames.length]}`;
  const address2 = `Suite ${suite}`;
  const cityStateZip = `${city}, ${state}, ${zip}`;

  return { name, address1, address2, cityStateZip };
}

function toLocationCode(seed: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `${(seed % 9) + 1}${letters[(seed * 7) % letters.length]}${letters[(seed * 13) % letters.length]}${letters[(seed * 17) % letters.length]}`;
}

function toAccountCode(account: string): string {
  const normalized = account.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (normalized.length >= 5) {
    return normalized.slice(0, 5);
  }

  return (normalized + "ACCT0").slice(0, 5);
}

function buildTimeline(row: ExceptionRow, seed: number): TimelineMilestone[] {
  const pickup = new Date(`${row.pickupDate}T09:00:00Z`);
  const delivered = new Date(`${row.deliveryDate}T17:30:00Z`);
  const invoiced = new Date(delivered);
  invoiced.setUTCDate(invoiced.getUTCDate() + 1);
  invoiced.setUTCHours(12, 0, 0, 0);
  const tendered = new Date(pickup);
  tendered.setUTCDate(tendered.getUTCDate() - 2);
  tendered.setUTCHours(14, 15, 0, 0);

  const milestoneDates = [tendered, pickup, delivered, invoiced];
  const completedCount = row.resolutionState === "Resolved" ? 4 : 2 + (seed % 2);

  return (["Tendered", "Picked Up", "Delivered", "Invoiced"] as const).map((label, index) => {
    const completed = index < completedCount;
    return {
      label,
      datetime: completed ? milestoneDates[index].toISOString() : null,
      state: completed ? "completed" : "pending"
    };
  });
}

function buildEvidence(row: ExceptionRow, seed: number): EvidenceEvent[] {
  const opened = new Date(row.openedAt);
  const quoteAt = new Date(opened);
  quoteAt.setUTCHours(quoteAt.getUTCHours() - 8);
  const confirmAt = new Date(opened);
  confirmAt.setUTCHours(confirmAt.getUTCHours() - 4);
  const invoiceAt = new Date(opened);
  invoiceAt.setUTCHours(invoiceAt.getUTCHours() - 1);

  const variance = formatCurrency(Math.abs(row.amountCents));

  return [
    {
      id: `${row.id}-ev-1`,
      title: "Quote Offered by Carrier <pricing1@carrierfleet.com>",
      timestampLabel: dateTimeFormatter.format(quoteAt),
      quote: `Carrier offered quote totaling ${variance}.`,
      subject: `Quote + Accessorials for ${row.orderNumber}`,
      eventId: `ev_${100 + (seed % 200)}`,
      from: "pricing1@carrierfleet.com",
      message:
        `Hello team,\n\n` +
        `Carrier quote was submitted for ${row.orderNumber}. Please review the proposed pricing against lane expectations.\n\n` +
        `Quoted delta observed: ${variance}.\n\n` +
        "Thanks,\nCarrier Pricing Desk"
    },
    {
      id: `${row.id}-ev-2`,
      title: "Quote Confirmed by Shipper <controls1@shipperco.com>",
      timestampLabel: dateTimeFormatter.format(confirmAt),
      quote: "Shipper confirmed the quote as primary for this movement.",
      subject: `Quote decision for ${row.orderNumber}`,
      eventId: `ev_${120 + (seed % 220)}`,
      from: "controls1@shipperco.com",
      message:
        `Hi Ops,\n\n` +
        `We confirmed quote selection for ${row.orderNumber}. Please route to billing controls if final invoice does not match approved values.\n\n` +
        "Regards,\nShipper Controls"
    },
    {
      id: `${row.id}-ev-3`,
      title: "Invoice Ingest Event <ap@shipperco.com>",
      timestampLabel: dateTimeFormatter.format(invoiceAt),
      quote: "Invoice was received and posted to TMS for reconciliation.",
      subject: `Invoice ingest for ${row.orderNumber}`,
      eventId: `ev_${140 + (seed % 240)}`,
      from: "ap@shipperco.com",
      message:
        `Billing Audit,\n\n` +
        `Invoice payload for ${row.orderNumber} was ingested. Reconciliation flagged an exception requiring manual review.\n\n` +
        `Please confirm expected vs billed values and close out this exception.\n\n` +
        "AP Automation"
    }
  ];
}

function buildExceptionBreakdown(row: ExceptionRow, seed: number): ExceptionBreakdownRow {
  const expectedBase = 140_000 + ((seed * 379) % 60_000);
  const billedTmsCents = Math.max(0, expectedBase + row.amountCents);
  const chargeMap: Record<ExceptionRow["exceptionType"], string> = {
    "Missing Layover Charge": "Layover",
    "Missing Linehaul": "Linehaul",
    "Linehaul Mismatch": "Linehaul",
    "Stopoff Mismatch": "Stopoff",
    "All-in Mismatch": "All-In"
  };

  return {
    charge: chargeMap[row.exceptionType],
    billedTmsCents,
    expectedCents: expectedBase,
    varianceCents: row.amountCents
  };
}

export function buildDetailFixture(row?: ExceptionRow): DetailFixture {
  const fallback: ExceptionRow = row ?? {
    id: "EX-000",
    exceptionType: "Linehaul Mismatch",
    amountCents: 12_500,
    reviewState: "Pending",
    resolutionState: "Unresolved",
    billToCode: "ABCDE",
    orderNumber: "1AA6000",
    account: "Unknown Account",
    lane: "Dallas, TX --> Atlanta, GA",
    pickupDate: "2026-02-20",
    deliveryDate: "2026-02-22",
    openedAt: "2026-02-21T04:00:00.000Z",
    category: "Groundtruth Exceptions"
  };

  const sequence = Number.parseInt(fallback.id.split("-")[1] ?? "0", 10) || 0;
  const { origin, destination } = parseLane(fallback.lane);
  const originAddress = buildLocationAddress(origin, sequence * 11 + 3, "origin");
  const destinationAddress = buildLocationAddress(destination, sequence * 13 + 7, "destination");
  const auditRunAt = new Date(fallback.openedAt);
  auditRunAt.setUTCHours(auditRunAt.getUTCHours() + ((sequence % 10) + 2));

  return {
    orderDetails: {
      orderId: fallback.orderNumber,
      customerShipId: `SHIP-${(7000 + sequence).toString().padStart(4, "0")}`,
      account: fallback.account,
      accountCode: toAccountCode(fallback.account),
      billToCode: fallback.billToCode,
      originName: originAddress.name,
      originAddress1: originAddress.address1,
      originAddress2: originAddress.address2,
      originCityStateZip: originAddress.cityStateZip,
      originLocationCode: toLocationCode(sequence * 5 + 2),
      destinationName: destinationAddress.name,
      destinationAddress1: destinationAddress.address1,
      destinationAddress2: destinationAddress.address2,
      destinationCityStateZip: destinationAddress.cityStateZip,
      destinationLocationCode: toLocationCode(sequence * 7 + 3)
    },
    timeline: buildTimeline(fallback, sequence),
    exceptionBreakdown: buildExceptionBreakdown(fallback, sequence),
    evidence: buildEvidence(fallback, sequence),
    auditRunAt: auditRunAt.toISOString()
  };
}

export function buildDetailStatusChips(
  row?: Pick<ExceptionRow, "reviewState" | "resolutionState">
): DetailStatusChip[] {
  const reviewState = row?.reviewState ?? "Pending";
  const reviewValue: DetailStatusChip["value"] =
    reviewState === "Pending" ? "Pending Review" : reviewState === "Confirmed" ? "Validated" : "Rejected";
  const fixValue: DetailStatusChip["value"] = row?.resolutionState === "Resolved" ? "Fixed" : "Pending Fix";

  const reviewTone: DetailChipTone = reviewState === "Rejected" ? "rose" : reviewState === "Confirmed" ? "emerald" : "slate";
  const resolutionTone: DetailChipTone = fixValue === "Fixed" ? "sky" : "slate";

  const chips: DetailStatusChip[] = [
    {
      icon: reviewState === "Confirmed" ? "thumbs-up" : reviewState === "Rejected" ? "thumbs-down" : "none",
      kind: "review",
      value: reviewValue,
      tone: reviewTone
    }
  ];

  const shouldShowFixChip = !(reviewState === "Rejected" && fixValue === "Pending Fix");
  if (shouldShowFixChip) {
    chips.push({ icon: fixValue === "Fixed" ? "check" : "none", kind: "fix", value: fixValue, tone: resolutionTone });
  }

  return chips;
}

export function buildStatusFromTerminalAction(action: TerminalAction): Pick<ExceptionRow, "reviewState" | "resolutionState"> {
  if (action === "confirm-fixed") {
    return { reviewState: "Confirmed", resolutionState: "Resolved" };
  }
  if (action === "fix-later") {
    return { reviewState: "Confirmed", resolutionState: "Unresolved" };
  }
  return { reviewState: "Rejected", resolutionState: "Unresolved" };
}

export function getFixNavigationUrl(): string {
  return HOST_FIX_URL;
}
