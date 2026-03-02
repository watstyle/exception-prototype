import { describe, expect, it } from "vitest";
import {
  ageInHoursSince,
  filterRows,
  formatAge,
  getFilterStatus,
  getFixStatus,
  getReviewStatus,
  pageCount,
  paginateRows,
  sortRowsForTriage
} from "../listUtils";
import { mockExceptions, type ExceptionRow } from "../mockData";

describe("listUtils", () => {
  it("maps review/resolution combinations to review, fix, and filter states", () => {
    expect(getReviewStatus({ reviewState: "Pending" })).toBe("Pending");
    expect(getFixStatus({ reviewState: "Pending", resolutionState: "Unresolved" })).toBe("Pending");
    expect(getFilterStatus({ reviewState: "Pending", resolutionState: "Unresolved" })).toBe("To Do");

    expect(getReviewStatus({ reviewState: "Pending" })).toBe("Pending");
    expect(getFixStatus({ reviewState: "Pending", resolutionState: "Resolved" })).toBe("Confirmed");
    expect(getFilterStatus({ reviewState: "Pending", resolutionState: "Resolved" })).toBe("Fixed");

    expect(getReviewStatus({ reviewState: "Confirmed" })).toBe("Validated");
    expect(getFixStatus({ reviewState: "Confirmed", resolutionState: "Unresolved" })).toBe("Pending");
    expect(getFilterStatus({ reviewState: "Confirmed", resolutionState: "Unresolved" })).toBe("To Do");

    expect(getReviewStatus({ reviewState: "Confirmed" })).toBe("Validated");
    expect(getFixStatus({ reviewState: "Confirmed", resolutionState: "Resolved" })).toBe("Confirmed");
    expect(getFilterStatus({ reviewState: "Confirmed", resolutionState: "Resolved" })).toBe("Fixed");

    expect(getReviewStatus({ reviewState: "Rejected" })).toBe("Rejected");
    expect(getFixStatus({ reviewState: "Rejected", resolutionState: "Unresolved" })).toBe("");
    expect(getFilterStatus({ reviewState: "Rejected", resolutionState: "Unresolved" })).toBe("Rejected");

    expect(getReviewStatus({ reviewState: "Rejected" })).toBe("Rejected");
    expect(getFixStatus({ reviewState: "Rejected", resolutionState: "Resolved" })).toBe("");
    expect(getFilterStatus({ reviewState: "Rejected", resolutionState: "Resolved" })).toBe("Rejected");
  });

  it("filters rows by rejected status", () => {
    const filtered = filterRows(mockExceptions, {
      category: "Groundtruth Exceptions",
      status: "Rejected"
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((row) => getFilterStatus(row) === "Rejected")).toBe(true);
  });

  it("returns actionable rows when status filter is To Do", () => {
    const filtered = filterRows(mockExceptions, {
      category: "Groundtruth Exceptions",
      status: "To Do"
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((row) => getFilterStatus(row) === "To Do")).toBe(true);
  });

  it("filters rows by to-review status", () => {
    const filtered = filterRows(mockExceptions, {
      category: "Groundtruth Exceptions",
      status: "To Review"
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((row) => row.reviewState === "Pending" && row.resolutionState !== "Resolved")).toBe(true);
  });

  it("filters rows by to-fix status", () => {
    const filtered = filterRows(mockExceptions, {
      category: "Groundtruth Exceptions",
      status: "To Fix"
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((row) => row.reviewState === "Confirmed" && row.resolutionState !== "Resolved")).toBe(true);
  });

  it("sorts rows unresolved first, then by days open, then by absolute amount", () => {
    const rows: ExceptionRow[] = [
      {
        id: "EX-001",
        exceptionType: "Missing Layover Charge",
        amountCents: 7_500,
        reviewState: "Pending",
        resolutionState: "Unresolved",
        billToCode: "GHJAL",
        orderNumber: "5GH6789",
        account: "Northstar Foods",
        lane: "Dallas, TX --> New York, NY",
        pickupDate: "2026-02-01",
        deliveryDate: "2026-02-02",
        openedAt: "2026-02-27T21:00:00.000Z",
        category: "Groundtruth Exceptions"
      },
      {
        id: "EX-002",
        exceptionType: "Missing Linehaul",
        amountCents: 20_000,
        reviewState: "Confirmed",
        resolutionState: "Unresolved",
        billToCode: "KLMNO",
        orderNumber: "9JK6791",
        account: "Atlas Retail Group",
        lane: "Seattle, WA --> Denver, CO",
        pickupDate: "2026-02-05",
        deliveryDate: "2026-02-06",
        openedAt: "2026-02-27T12:00:00.000Z",
        category: "Groundtruth Exceptions"
      },
      {
        id: "EX-003",
        exceptionType: "Linehaul Mismatch",
        amountCents: 99_999,
        reviewState: "Confirmed",
        resolutionState: "Resolved",
        billToCode: "PQRST",
        orderNumber: "2LM6805",
        account: "Pioneer Manufacturing",
        lane: "Miami, FL --> Charlotte, NC",
        pickupDate: "2026-01-20",
        deliveryDate: "2026-01-22",
        openedAt: "2026-01-25T01:00:00.000Z",
        category: "Groundtruth Exceptions"
      },
      {
        id: "EX-004",
        exceptionType: "Stopoff Mismatch",
        amountCents: 6_000,
        reviewState: "Rejected",
        resolutionState: "Unresolved",
        billToCode: "UVWXY",
        orderNumber: "7QR6899",
        account: "Canyon Beverage Co.",
        lane: "Atlanta, GA --> Chicago, IL",
        pickupDate: "2026-01-01",
        deliveryDate: "2026-01-03",
        openedAt: "2026-02-26T12:00:00.000Z",
        category: "Groundtruth Exceptions"
      }
    ];

    const sorted = sortRowsForTriage(rows, new Date("2026-02-28T00:00:00Z"));
    expect(sorted.map((row) => row.id)).toEqual(["EX-004", "EX-002", "EX-001", "EX-003"]);
  });

  it("computes age in hours and formats compact age labels", () => {
    expect(ageInHoursSince("2026-02-28T09:00:00.000Z", new Date("2026-02-28T12:00:00.000Z"))).toBe(3);
    expect(formatAge("2026-02-28T09:00:00.000Z", new Date("2026-02-28T12:00:00.000Z"))).toBe("3h");
    expect(formatAge("2026-02-27T12:00:00.000Z", new Date("2026-02-28T12:00:00.000Z"))).toBe("1d");
    expect(formatAge("2026-02-28T11:45:00.000Z", new Date("2026-02-28T12:00:00.000Z"))).toBe("15m");
  });

  it("returns paginated rows", () => {
    const paged = paginateRows(mockExceptions, 1, 10);
    expect(paged).toHaveLength(10);
    expect(paged[0].id).toBe("EX-011");
  });

  it("computes page count with lower bound of one", () => {
    expect(pageCount(0, 25)).toBe(1);
    expect(pageCount(72, 25)).toBe(3);
  });
});
