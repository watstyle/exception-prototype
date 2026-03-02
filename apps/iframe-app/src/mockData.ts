import { GROUNDTRUTH_CATEGORY } from "@groundtruth/contracts";

export type ExceptionRow = {
  id: string;
  exceptionType: "Missing Layover Charge" | "Missing Linehaul" | "Linehaul Mismatch" | "Stopoff Mismatch" | "All-in Mismatch";
  amountCents: number;
  reviewState: "Pending" | "Confirmed" | "Rejected";
  resolutionState: "Unresolved" | "Resolved";
  billToCode: string;
  orderNumber: string;
  account: string;
  lane: string;
  pickupDate: string;
  deliveryDate: string;
  openedAt: string;
  category: string;
};

const exceptionTypes: ExceptionRow["exceptionType"][] = [
  "Missing Layover Charge",
  "Missing Linehaul",
  "Linehaul Mismatch",
  "Stopoff Mismatch",
  "All-in Mismatch"
];

const reviewStates: ExceptionRow["reviewState"][] = ["Pending", "Confirmed", "Rejected"];
const resolvedReviewStates: Exclude<ExceptionRow["reviewState"], "Pending">[] = ["Confirmed", "Rejected"];

const accounts = [
  "Northstar Foods",
  "Atlas Retail Group",
  "Pioneer Manufacturing",
  "Canyon Beverage Co.",
  "Summit Home Goods",
  "Riverbend Pharmaceuticals",
  "Evergreen Distributors",
  "Velocity Consumer Brands",
  "Harbor Industrial Supply",
  "Blue Horizon Logistics"
] as const;

const cities = [
  "Dallas, TX",
  "New York, NY",
  "Atlanta, GA",
  "Chicago, IL",
  "Phoenix, AZ",
  "Los Angeles, CA",
  "Seattle, WA",
  "Denver, CO",
  "Nashville, TN",
  "Miami, FL",
  "Kansas City, MO",
  "Charlotte, NC"
] as const;

const baseDate = new Date("2026-02-28T00:00:00Z");

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateTime(date: Date): string {
  return date.toISOString();
}

function shiftDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function shiftHours(date: Date, hours: number): Date {
  const copy = new Date(date);
  copy.setUTCHours(copy.getUTCHours() + hours);
  return copy;
}

function toBillToCode(index: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: 5 })
    .map((_, offset) => letters[(index * 7 + offset * 11) % letters.length])
    .join("");
}

function toOrderNumber(index: number): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const leadingDigit = ((index % 9) + 1).toString();
  const letterPair = `${letters[(index * 5) % letters.length]}${letters[(index * 5 + 9) % letters.length]}`;
  const trailingDigits = String(6000 + ((index * 137) % 3000)).padStart(4, "0");
  return `${leadingDigit}${letterPair}${trailingDigits}`;
}

export const mockExceptions: ExceptionRow[] = Array.from({ length: 72 }).map((_, index) => {
  const itemNumber = index + 1;
  const resolutionState: ExceptionRow["resolutionState"] = index % 4 === 0 ? "Resolved" : "Unresolved";
  const reviewState: ExceptionRow["reviewState"] =
    resolutionState === "Resolved" ? resolvedReviewStates[index % resolvedReviewStates.length] : reviewStates[index % reviewStates.length];
  const origin = cities[index % cities.length];
  const destinationCandidate = cities[(index * 3 + 5) % cities.length];
  const destination = destinationCandidate === origin ? cities[(index + 1) % cities.length] : destinationCandidate;
  const openedAt = shiftHours(shiftDays(baseDate, -((index % 14) + 1)), -(index % 23));
  const pickupDate = shiftDays(openedAt, (index % 6) + 1);
  const deliveryDate = shiftDays(pickupDate, (index % 4) + 1);
  const magnitudeCents = 8_500 + ((index * 1_379) % 44_000);
  const amountCents = (index % 2 === 0 ? -1 : 1) * magnitudeCents;

  return {
    id: `EX-${String(itemNumber).padStart(3, "0")}`,
    exceptionType: exceptionTypes[index % exceptionTypes.length],
    amountCents,
    reviewState,
    resolutionState,
    billToCode: toBillToCode(index),
    orderNumber: toOrderNumber(index),
    account: accounts[index % accounts.length],
    lane: `${origin} --> ${destination}`,
    pickupDate: formatDate(pickupDate),
    deliveryDate: formatDate(deliveryDate),
    openedAt: formatDateTime(openedAt),
    category: GROUNDTRUTH_CATEGORY,
  };
});
