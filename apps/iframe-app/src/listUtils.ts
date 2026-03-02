import type { ExceptionRow } from "./mockData";

export type ReviewStatus = "Pending" | "Validated" | "Rejected";
export type FixStatus = "Pending" | "Confirmed" | "";
export type StatusFilter = "To Do" | "To Review" | "To Fix" | "Rejected" | "Fixed";

export type ListFilters = {
  status: StatusFilter;
  category: string;
};

export function getReviewStatus(row: Pick<ExceptionRow, "reviewState">): ReviewStatus {
  if (row.reviewState === "Confirmed") {
    return "Validated";
  }

  return row.reviewState;
}

export function getFixStatus(row: Pick<ExceptionRow, "reviewState" | "resolutionState">): FixStatus {
  if (row.reviewState === "Rejected") {
    return "";
  }

  return row.resolutionState === "Resolved" ? "Confirmed" : "Pending";
}

export function getFilterStatus(row: Pick<ExceptionRow, "reviewState" | "resolutionState">): StatusFilter {
  if (row.reviewState === "Rejected") {
    return "Rejected";
  }

  if (row.resolutionState === "Resolved") {
    return "Fixed";
  }

  return "To Do";
}

export function filterRows(rows: ExceptionRow[], filters: ListFilters): ExceptionRow[] {
  return rows.filter((row) => {
    const matchesCategory = row.category === filters.category;
    const matchesStatus =
      filters.status === "To Do"
        ? row.reviewState !== "Rejected" && row.resolutionState !== "Resolved"
        : filters.status === "To Review"
          ? row.reviewState === "Pending" && row.resolutionState !== "Resolved"
          : filters.status === "To Fix"
            ? row.reviewState === "Confirmed" && row.resolutionState !== "Resolved"
            : getFilterStatus(row) === filters.status;

    return matchesCategory && matchesStatus;
  });
}

export function ageInHoursSince(openedAt: string, referenceDate = new Date()): number {
  const openedAtTime = new Date(openedAt).getTime();
  const referenceTime = referenceDate.getTime();

  return Math.max(0, Math.floor((referenceTime - openedAtTime) / (60 * 60 * 1000)));
}

export function formatAge(openedAt: string, referenceDate = new Date()): string {
  const openedAtTime = new Date(openedAt).getTime();
  const referenceTime = referenceDate.getTime();
  const ageInMinutes = Math.max(0, Math.floor((referenceTime - openedAtTime) / (60 * 1000)));

  if (ageInMinutes >= 24 * 60) {
    const ageInDays = Math.floor(ageInMinutes / (24 * 60));
    return `${ageInDays}d`;
  }

  if (ageInMinutes >= 60) {
    const ageInHours = Math.floor(ageInMinutes / 60);
    return `${ageInHours}h`;
  }

  return `${ageInMinutes}m`;
}

export function sortRowsForTriage(rows: ExceptionRow[], referenceDate = new Date()): ExceptionRow[] {
  return [...rows].sort((left, right) => {
    if (left.resolutionState !== right.resolutionState) {
      return left.resolutionState === "Unresolved" ? -1 : 1;
    }

    const ageDifference = ageInHoursSince(right.openedAt, referenceDate) - ageInHoursSince(left.openedAt, referenceDate);
    if (ageDifference !== 0) {
      return ageDifference;
    }

    return Math.abs(right.amountCents) - Math.abs(left.amountCents);
  });
}

export function paginateRows(rows: ExceptionRow[], page: number, rowsPerPage: number): ExceptionRow[] {
  const start = page * rowsPerPage;
  return rows.slice(start, start + rowsPerPage);
}

export function pageCount(totalRows: number, rowsPerPage: number): number {
  return Math.max(1, Math.ceil(totalRows / rowsPerPage));
}
