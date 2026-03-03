import {
  GT_SET_CONTEXT,
  GROUNDTRUTH_CATEGORY,
  createOpenDetailMessage,
  parseGroundtruthMessage
} from "@groundtruth/contracts";
import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { HOST_ORIGIN } from "../runtime";
import {
  type FixStatus,
  type ReviewStatus,
  type StatusFilter,
  filterRows,
  formatAge,
  getFixStatus,
  getReviewStatus,
  pageCount,
  paginateRows,
  sortRowsForTriage
} from "../listUtils";
import { mockExceptions } from "../mockData";

const rowsPerPageOptions = [10, 25, 50] as const;
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const primaryStatusFilterOptions: StatusFilter[] = ["To Do"];
const todoStatusFilterOptions: StatusFilter[] = ["To Review", "To Fix"];
const terminalStatusFilterOptions: StatusFilter[] = ["Rejected", "Fixed"];
const reviewBadgeClass: Record<ReviewStatus, string> = {
  Pending: "bg-slate-100 text-slate-700",
  Validated: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-800"
};
const fixBadgeClass: Record<Exclude<FixStatus, "">, string> = {
  Pending: "bg-slate-100 text-slate-700",
  Confirmed: "bg-emerald-100 text-emerald-800"
};
const statusTriggerLabel: Record<StatusFilter, string> = {
  "To Do": "To Do",
  "To Review": "To Review",
  "To Fix": "To Fix",
  Fixed: "Fixed",
  Rejected: "Rejected"
};
const statusMenuLabel: Record<StatusFilter, string> = {
  "To Do": "To Do (Default)",
  "To Review": "To Review",
  "To Fix": "To Fix",
  Fixed: "Fixed",
  Rejected: "Rejected"
};

type VarianceDirection = "overbilled" | "underbilled";
type SortField = "default" | "amount" | "age";
type SortDirection = "asc" | "desc";

export type VarianceMeta = {
  direction: VarianceDirection;
  arrow: "↑" | "↓";
  amountText: string;
  tooltipText: string;
  className: string;
};

export function formatVarianceMeta(amountCents: number): VarianceMeta {
  const direction: VarianceDirection = amountCents > 0 ? "overbilled" : "underbilled";
  const amountText = currencyFormatter.format(Math.abs(amountCents) / 100);

  if (direction === "overbilled") {
    return {
      direction,
      arrow: "↑",
      amountText,
      tooltipText: "Overbilling",
      className: "text-rose-700"
    };
  }

  return {
    direction,
    arrow: "↓",
    amountText,
    tooltipText: "Underbilling",
    className: "text-amber-700"
  };
}

function parseLane(lane: string): { origin: string; destination: string } {
  const [originPart = "", destinationPart = ""] = lane.split("-->").map((part) => part.trim());
  return { origin: originPart, destination: destinationPart };
}

function VarianceDirectionIcon({ direction }: { direction: VarianceDirection }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={`h-2.5 w-2.5 ${direction === "underbilled" ? "rotate-180" : ""}`}
    >
      <path d="M10 5 16 14H4L10 5Z" />
    </svg>
  );
}

function AlertIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className={className} strokeWidth="1.6" strokeLinecap="round">
      <path d="M10 3.8 17 16.2H3L10 3.8Z" />
      <path d="M10 8v4.6" />
      <circle cx="10" cy="14.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FilterOptionIcon({ status }: { status: StatusFilter }) {
  if (status === "To Do" || status === "To Review" || status === "To Fix") {
    return <AlertIcon className="h-3.5 w-3.5 stroke-current" />;
  }

  if (status === "Fixed") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5 stroke-current stroke-[1.6]">
        <path d="M4 10.5 8 14.5 16 6.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5 stroke-current stroke-[1.6]">
      <path d="m5 5 10 10M15 5 5 15" />
    </svg>
  );
}

function resolveParentTargetOrigin(): string {
  try {
    const parentOrigin = window.parent?.location?.origin;
    if (parentOrigin) {
      return parentOrigin;
    }
  } catch {
    // Cross-origin parent blocks direct origin reads; fall back to referrer/env origin.
  }

  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      // Ignore malformed referrer and use configured fallback.
    }
  }

  // Fall back to wildcard so embedded environments with hidden/missing referrer
  // still receive open-detail messages.
  return "*";
}

export function ListPage() {
  const [category, setCategory] = useState(GROUNDTRUTH_CATEGORY);
  const [status, setStatus] = useState<StatusFilter>("To Do");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>("default");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState<(typeof rowsPerPageOptions)[number]>(25);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const filteredRows = useMemo(() => filterRows(mockExceptions, { status, category }), [status, category]);
  const sortedRows = useMemo(() => {
    if (sortField === "default") {
      return sortRowsForTriage(filteredRows);
    }

    const now = Date.now();
    const sorted = [...filteredRows];
    sorted.sort((left, right) => {
      const leftAgeMs = now - new Date(left.openedAt).getTime();
      const rightAgeMs = now - new Date(right.openedAt).getTime();
      const leftAmount = Math.abs(left.amountCents);
      const rightAmount = Math.abs(right.amountCents);

      if (sortField === "amount") {
        if (leftAmount !== rightAmount) {
          return sortDirection === "desc" ? rightAmount - leftAmount : leftAmount - rightAmount;
        }
        return sortDirection === "desc" ? rightAgeMs - leftAgeMs : leftAgeMs - rightAgeMs;
      }

      if (leftAgeMs !== rightAgeMs) {
        return sortDirection === "desc" ? rightAgeMs - leftAgeMs : leftAgeMs - rightAgeMs;
      }
      return sortDirection === "desc" ? rightAmount - leftAmount : leftAmount - rightAmount;
    });
    return sorted;
  }, [filteredRows, sortField, sortDirection]);

  const totalPages = pageCount(sortedRows.length, rowsPerPage);

  const safePage = useMemo(() => Math.min(page, totalPages - 1), [page, totalPages]);
  const pagedRows = useMemo(() => paginateRows(sortedRows, safePage, rowsPerPage), [sortedRows, safePage, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [status, category, rowsPerPage, sortField, sortDirection]);

  useEffect(() => {
    const handler = (event: MessageEvent<unknown>) => {
      if (event.origin !== HOST_ORIGIN) {
        return;
      }

      const message = parseGroundtruthMessage(event.data);
      if (!message || message.type !== GT_SET_CONTEXT) {
        return;
      }

      setCategory(message.payload.category);
    };

    window.addEventListener("message", handler);
    return () => {
      window.removeEventListener("message", handler);
    };
  }, []);

  function openDetail(itemId: string) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(createOpenDetailMessage(itemId), resolveParentTargetOrigin());
      return;
    }

    window.location.assign(`/detail/${encodeURIComponent(itemId)}`);
  }

  function applyStatusFilter(nextStatus: StatusFilter) {
    setStatus(nextStatus);
    setIsFilterMenuOpen(false);
  }

  function toggleSort(nextField: Exclude<SortField, "default">) {
    if (sortField === nextField) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }

    setSortField(nextField);
    setSortDirection("desc");
  }

  function sortIndicator(field: Exclude<SortField, "default">): string {
    if (sortField !== field) {
      return "↕";
    }
    return sortDirection === "desc" ? "↓" : "↑";
  }

  function handlePageClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!isFilterMenuOpen) {
      return;
    }

    if (filterMenuRef.current?.contains(event.target as Node)) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-row-id]")) {
      return;
    }

    setIsFilterMenuOpen(false);
  }

  return (
    <div className="h-screen bg-white text-slate-800" data-testid="list-page" onClickCapture={handlePageClickCapture}>
      <div className="flex h-full flex-col border border-iframe-border">
        <div className="sticky top-0 z-20 border-b border-iframe-border bg-white px-4 py-2.5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Groundtruth Exceptions ({filteredRows.length})</h1>
            </div>

            <div className="relative" ref={filterMenuRef}>
              <button
                type="button"
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => setIsFilterMenuOpen((open) => !open)}
                data-testid="filter-menu-toggle"
              >
                Status: {statusTriggerLabel[status]}
              </button>

              {isFilterMenuOpen && (
                <div
                  className="absolute right-0 top-11 z-30 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_16px_32px_rgba(15,23,42,0.14)]"
                  data-testid="filter-menu"
                >
                  <div className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Status</div>
                  <div className="space-y-1" role="group" aria-label="Status filters">
                    {primaryStatusFilterOptions.map((option) => {
                      const isActive = status === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                            isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                          }`}
                          onClick={() => applyStatusFilter(option)}
                          data-testid={`status-filter-${option.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <span className={isActive ? "text-slate-300" : "text-slate-500"}>
                              <FilterOptionIcon status={option} />
                            </span>
                            <span>{statusMenuLabel[option]}</span>
                          </span>
                          {isActive && (
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3 w-3 stroke-current stroke-[1.8]">
                              <path d="M4 10.5 8 14.5 16 6.5" />
                            </svg>
                          )}
                        </button>
                      );
                    })}

                    <div className="my-1 border-t border-slate-200" aria-hidden="true" />

                    {todoStatusFilterOptions.map((option) => {
                      const isActive = status === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                            isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                          }`}
                          onClick={() => applyStatusFilter(option)}
                          data-testid={`status-filter-${option.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <span className={isActive ? "text-slate-300" : "text-slate-500"}>
                              <FilterOptionIcon status={option} />
                            </span>
                            <span>{statusMenuLabel[option]}</span>
                          </span>
                          {isActive && (
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3 w-3 stroke-current stroke-[1.8]">
                              <path d="M4 10.5 8 14.5 16 6.5" />
                            </svg>
                          )}
                        </button>
                      );
                    })}

                    <div className="my-1 border-t border-slate-200" aria-hidden="true" />

                    {terminalStatusFilterOptions.map((option) => {
                      const isActive = status === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                            isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                          }`}
                          onClick={() => applyStatusFilter(option)}
                          data-testid={`status-filter-${option.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <span className={isActive ? "text-slate-300" : "text-slate-500"}>
                              <FilterOptionIcon status={option} />
                            </span>
                            <span>{statusMenuLabel[option]}</span>
                          </span>
                          {isActive && (
                            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3 w-3 stroke-current stroke-[1.8]">
                              <path d="M4 10.5 8 14.5 16 6.5" />
                            </svg>
                          )}
                        </button>
                      );
                    })}

                    <div className="mt-2 flex justify-end border-t border-slate-200 pt-2">
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-400 disabled:hover:bg-white"
                        onClick={() => applyStatusFilter("To Do")}
                        data-testid="reset-to-todo"
                        disabled={status === "To Do"}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: "26%" }} />
              <col style={{ width: "calc((100% - 26%) / 5)" }} />
              <col style={{ width: "calc((100% - 26%) / 5)" }} />
              <col style={{ width: "calc((100% - 26%) / 5)" }} />
              <col style={{ width: "calc((100% - 26%) / 5)" }} />
              <col style={{ width: "calc((100% - 26%) / 5)" }} />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-iframe-border bg-slate-50 text-left text-slate-600">
                <th className="px-4 py-2.5 text-left">
                  <span className="gt-table-header-text inline-flex items-center gap-1 rounded text-slate-600">Exception</span>
                </th>
                <th className="px-4 py-2.5 text-right" aria-sort={sortField === "amount" ? (sortDirection === "desc" ? "descending" : "ascending") : "none"}>
                  <button
                    type="button"
                    className="gt-table-header-text inline-flex items-center gap-1 rounded text-slate-600 hover:text-slate-900"
                    onClick={() => toggleSort("amount")}
                    data-testid="sort-amount"
                  >
                    <span>Variance</span>
                    <span aria-hidden="true" className="text-[10px] text-slate-500">
                      {sortIndicator("amount")}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-2.5 text-right" aria-sort={sortField === "age" ? (sortDirection === "desc" ? "descending" : "ascending") : "none"}>
                  <button
                    type="button"
                    className="gt-table-header-text inline-flex w-full items-center justify-end gap-1 rounded text-slate-600 hover:text-slate-900"
                    onClick={() => toggleSort("age")}
                    data-testid="sort-age"
                  >
                    <span>Age</span>
                    <span aria-hidden="true" className="text-[10px] text-slate-500">
                      {sortIndicator("age")}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <span className="gt-table-header-text inline-flex items-center gap-1 rounded text-slate-600">Review Status</span>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <span className="gt-table-header-text inline-flex items-center gap-1 rounded text-slate-600">Fix Status</span>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <span className="gt-table-header-text inline-flex items-center gap-1 rounded text-slate-600">Order</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={6}>
                    No exceptions match this filter set.
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => {
                  const varianceMeta = formatVarianceMeta(row.amountCents);
                  const laneParts = parseLane(row.lane);
                  const reviewStatus = getReviewStatus(row);
                  const fixStatus = getFixStatus(row);
                  return (
                  <tr
                    key={row.id}
                    className={`border-b border-iframe-border text-sm ${isFilterMenuOpen ? "cursor-default" : "cursor-pointer hover:bg-sky-50"}`}
                    onClick={() => {
                      if (isFilterMenuOpen) {
                        setIsFilterMenuOpen(false);
                      }
                      openDetail(row.id);
                    }}
                    data-row-id={row.id}
                  >
                    <td className="px-4 py-2.5">
                      <div className="truncate font-medium text-slate-900" title={row.exceptionType}>
                        {row.exceptionType}
                      </div>
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right ${varianceMeta.className}`}
                      data-testid={`variance-cell-${row.id}`}
                      title={varianceMeta.tooltipText}
                    >
                      <div className="inline-flex w-24 items-center justify-end gap-1 text-sm font-medium tabular-nums">
                        <VarianceDirectionIcon direction={varianceMeta.direction} />
                        <span className="min-w-[4.75rem] text-right">{varianceMeta.amountText}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatAge(row.openedAt)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-xs font-medium ${reviewBadgeClass[reviewStatus]}`}
                        data-testid={`review-badge-${row.id}`}
                      >
                        {reviewStatus}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {fixStatus ? (
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-xs font-medium ${fixBadgeClass[fixStatus]}`}
                          data-testid={`fix-badge-${row.id}`}
                        >
                          {fixStatus}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 text-left">
                      <div className="group relative inline-flex max-w-full justify-start">
                        <span
                          className="truncate text-left text-sm font-normal text-slate-700 decoration-dotted underline-offset-2 group-hover:underline group-focus:underline"
                          tabIndex={0}
                          data-testid={`order-trigger-${row.id}`}
                        >
                          {row.orderNumber}
                        </span>
                        <div
                          role="tooltip"
                          data-testid={`order-tooltip-${row.id}`}
                          className="pointer-events-none absolute right-0 top-full z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white p-2 text-left text-xs text-slate-700 shadow-lg opacity-0 translate-y-1 transition-all duration-100 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
                        >
                          <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
                            <span className="text-slate-500">Account Name</span>
                            <span className="truncate font-medium text-slate-800">{row.account}</span>
                          </div>
                          <div className="mt-1 grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
                            <span className="text-slate-500">Bill-to-code</span>
                            <span className="truncate font-medium text-slate-800">{row.billToCode}</span>
                          </div>
                          <div className="mt-1 grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
                            <span className="text-slate-500">Origin</span>
                            <span className="truncate font-medium text-slate-800">{laneParts.origin}</span>
                          </div>
                          <div className="mt-1 grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
                            <span className="text-slate-500">Destination</span>
                            <span className="truncate font-medium text-slate-800">{laneParts.destination}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-iframe-border bg-white p-3 text-sm">
          <div className="text-slate-600">
            Page {safePage + 1} of {totalPages}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded border border-iframe-border px-3 py-2 disabled:opacity-50"
              onClick={() => setPage(0)}
              disabled={safePage === 0}
            >
              First
            </button>
            <button
              type="button"
              className="rounded border border-iframe-border px-3 py-2 disabled:opacity-50"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={safePage === 0}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded border border-iframe-border px-3 py-2 disabled:opacity-50"
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
              disabled={safePage >= totalPages - 1}
            >
              Next
            </button>
            <button
              type="button"
              className="rounded border border-iframe-border px-3 py-2 disabled:opacity-50"
              onClick={() => setPage(totalPages - 1)}
              disabled={safePage >= totalPages - 1}
            >
              Last
            </button>
          </div>

          <label className="flex items-center gap-2" htmlFor="rows-per-page">
            Rows
            <select
              id="rows-per-page"
              className="rounded border border-iframe-border px-3 py-2"
              value={rowsPerPage}
              onChange={(event) => setRowsPerPage(Number(event.target.value) as typeof rowsPerPage)}
            >
              {rowsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
