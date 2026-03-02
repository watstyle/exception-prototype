import { createCloseDetailMessage } from "@groundtruth/contracts";
import { flushSync } from "react-dom";
import { type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { type VarianceMeta, formatVarianceMeta } from "./ListPage";
import { type ExceptionRow, mockExceptions } from "../mockData";
import { HOST_ORIGIN } from "../runtime";
import {
  type DetailChipTone,
  type DetailDecision,
  type DetailStatusChip,
  type TerminalAction,
  buildDetailFixture,
  buildDetailStatusChips,
  buildStatusFromTerminalAction,
  formatCreatedRelative,
  formatCurrency,
  formatEvidenceMetaTimestamp,
  formatLastUpdatedAbsolute,
  formatLastUpdatedRelative,
  formatTimelineDate,
  getDefaultDecisionFromReviewState,
  getFixNavigationUrl,
  stripEmailFromEvidenceTitle
} from "./DetailPage.model";

export { buildDetailFixture, buildDetailStatusChips, buildStatusFromTerminalAction, getFixNavigationUrl } from "./DetailPage.model";

const detailChipClass: Record<DetailChipTone, string> = {
  sky: "bg-sky-100 text-sky-800",
  indigo: "bg-indigo-100 text-indigo-800",
  rose: "bg-rose-100 text-rose-800",
  emerald: "bg-emerald-100 text-emerald-800",
  slate: "bg-slate-100 text-slate-700"
};

function DetailChipIcon({ icon }: { icon: DetailStatusChip["icon"] }) {
  if (icon === "check") {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3 w-3 stroke-current stroke-[1.8]">
        <path d="M4 10.5 8 14.5 16 6.5" />
      </svg>
    );
  }

  if (icon === "thumbs-up" || icon === "thumbs-down") {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className={`h-3 w-3 stroke-current ${icon === "thumbs-down" ? "rotate-180" : ""}`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6.5 9.5v7h-3a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 3.5 9.5h3Z" />
        <path d="M9.5 9.5 12 3.1c.2-.5.9-.7 1.3-.3.2.2.2.4.2.7v3h2.8c1.1 0 2 .9 2 2 0 .1 0 .3-.1.4l-1 5c-.2 1-.9 1.6-1.9 1.6H9.5" />
      </svg>
    );
  }

  return null;
}

function DecisionThumbIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`h-3.5 w-3.5 stroke-current ${direction === "down" ? "rotate-180" : ""}`}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 9.5v7h-3a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 3.5 9.5h3Z" />
      <path d="M9.5 9.5 12 3.1c.2-.5.9-.7 1.3-.3.2.2.2.4.2.7v3h2.8c1.1 0 2 .9 2 2 0 .1 0 .3-.1.4l-1 5c-.2 1-.9 1.6-1.9 1.6H9.5" />
    </svg>
  );
}

function VarianceDirectionIcon({ direction }: { direction: VarianceMeta["direction"] }) {
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

function LastUpdatedMeta({
  relativeText,
  absoluteText,
  testId,
  variant = "bar"
}: {
  relativeText: string;
  absoluteText: string;
  testId?: string;
  variant?: "bar" | "inline";
}) {
  const containerClass =
    variant === "inline"
      ? "text-left text-xs text-slate-500"
      : "border-t border-slate-100 bg-slate-50/55 px-5 py-2 text-left text-xs text-slate-500";
  return (
    <div className={containerClass} data-testid={testId} title={absoluteText}>
      <span
        className="group relative inline-flex cursor-help items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        tabIndex={0}
        aria-label={`Updated timestamp ${absoluteText}`}
      >
        <span className="decoration-dotted underline-offset-2 no-underline group-hover:underline group-focus-visible:underline">
          {`Last updated ${relativeText}`}
        </span>
        <span
          role="tooltip"
          aria-hidden="true"
          className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block group-focus-visible:block"
        >
          {absoluteText}
        </span>
      </span>
    </div>
  );
}

function AddressHoverDetails({
  name,
  address1,
  address2,
  cityStateZip,
  locationCode,
  triggerTestId,
  tooltipTestId
}: {
  name: string;
  address1: string;
  address2: string;
  cityStateZip: string;
  locationCode: string;
  triggerTestId: string;
  tooltipTestId: string;
}) {
  return (
    <div className="relative block min-w-0 max-w-full">
      <span
        tabIndex={0}
        data-testid={triggerTestId}
        className="peer inline-block max-w-full truncate align-middle text-sm font-medium text-slate-900 decoration-dotted underline-offset-2 no-underline hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        {cityStateZip}
      </span>
      <div
        role="tooltip"
        data-testid={tooltipTestId}
        className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-72 rounded-md border border-slate-200 bg-white p-2 text-left text-xs text-slate-700 shadow-lg peer-hover:block peer-focus-visible:block"
      >
        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
          <span className="text-slate-500">Name</span>
          <span className="truncate font-medium text-slate-800">{name}</span>
        </div>
        <div className="mt-1 grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
          <span className="text-slate-500">Addr1</span>
          <span className="truncate font-medium text-slate-800">{address1}</span>
        </div>
        <div className="mt-1 grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
          <span className="text-slate-500">Addr2</span>
          <span className="truncate font-medium text-slate-800">{address2}</span>
        </div>
        <div className="mt-1 grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
          <span className="text-slate-500">City,State,Zip</span>
          <span className="truncate font-medium text-slate-800">{cityStateZip}</span>
        </div>
        <div className="mt-1 grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
          <span className="text-slate-500">Location Code</span>
          <span className="truncate font-medium text-slate-800">{locationCode}</span>
        </div>
      </div>
    </div>
  );
}

function BillToCodeHover({
  accountName,
  accountCode,
  billToCode
}: {
  accountName: string;
  accountCode: string;
  billToCode: string;
}) {
  return (
    <div className="relative block min-w-0 max-w-full">
      <span
        tabIndex={0}
        data-testid="customer-account"
        className="peer inline-block max-w-full truncate align-middle text-sm font-medium text-slate-900 decoration-dotted underline-offset-2 no-underline hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        {accountName}
      </span>
      <div
        role="tooltip"
        data-testid="customer-bill-to-code-tooltip"
        className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-72 rounded-md border border-slate-200 bg-white p-2 text-left text-xs text-slate-700 shadow-lg peer-hover:block peer-focus-visible:block"
      >
        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
          <span className="text-slate-500">Account</span>
          <span className="truncate font-medium text-slate-800">{accountName}</span>
        </div>
        <div className="mt-1 grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
          <span className="text-slate-500">Account Code</span>
          <span className="truncate font-medium text-slate-800">{accountCode}</span>
        </div>
        <div className="mt-1 grid grid-cols-[92px_minmax(0,1fr)] items-start gap-x-2">
          <span className="text-slate-500">Bill-to Code</span>
          <span className="truncate font-medium text-slate-800">{billToCode}</span>
        </div>
      </div>
    </div>
  );
}

function InlineCopyButton({
  onCopy,
  label,
  testId
}: {
  onCopy: () => Promise<void> | void;
  label: string;
  testId: string;
}) {
  const [isSuppressed, setIsSuppressed] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function copyValue(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.blur();
    setIsSuppressed(true);
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    const copyGroup = event.currentTarget.closest<HTMLElement>("[data-copy-group]");
    if (copyGroup) {
      const restore = () => {
        setIsSuppressed(false);
        copyGroup.removeEventListener("mouseleave", restore);
      };
      copyGroup.addEventListener("mouseleave", restore, { once: true });
    } else {
      resetTimerRef.current = window.setTimeout(() => {
        setIsSuppressed(false);
        resetTimerRef.current = null;
      }, 1200);
    }
    await onCopy();
  }

  return (
    <button
      type="button"
      onClick={(event) => void copyValue(event)}
      className={`ml-1 inline-flex items-center rounded border border-transparent p-0.5 text-slate-400 transition-opacity hover:bg-slate-100 hover:text-slate-900 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
        isSuppressed ? "!opacity-0 pointer-events-none" : "opacity-0 group-hover/copy:opacity-100"
      }`}
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
      data-testid={testId}
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5 stroke-current stroke-[1.6]">
        <rect x="7" y="7" width="9" height="9" rx="1.5" />
        <path d="M5 12H4a1 1 0 0 1-1-1V4.5A1.5 1.5 0 0 1 4.5 3H11a1 1 0 0 1 1 1v1" />
      </svg>
    </button>
  );
}

export function DetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const decodedItemId = itemId ? decodeURIComponent(itemId) : "";
  const detail = useMemo(() => mockExceptions.find((row) => row.id === decodedItemId), [decodedItemId]);
  const detailFixture = useMemo(() => buildDetailFixture(detail), [detail]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [isOrderSectionOpen, setIsOrderSectionOpen] = useState(true);
  const [decision, setDecision] = useState<DetailDecision>(() => getDefaultDecisionFromReviewState(detail?.reviewState));
  const [decisionTouched, setDecisionTouched] = useState(false);
  const [disagreeNote, setDisagreeNote] = useState("");
  const disagreeNoteRef = useRef<HTMLTextAreaElement | null>(null);
  const [statusOverride, setStatusOverride] = useState<Pick<ExceptionRow, "reviewState" | "resolutionState"> | null>(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const inlineCopyToastTimerRef = useRef<number | null>(null);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const [inlineCopyToast, setInlineCopyToast] = useState<string | null>(null);

  const selectedEvidence = useMemo(
    () => detailFixture.evidence.find((event) => event.id === selectedEvidenceId) ?? null,
    [detailFixture.evidence, selectedEvidenceId]
  );

  const baseStatusSource = detail ? { reviewState: detail.reviewState, resolutionState: detail.resolutionState } : undefined;
  let previewStatusSource: Pick<ExceptionRow, "reviewState" | "resolutionState"> | undefined;
  if (!statusOverride && decisionTouched) {
    previewStatusSource =
      decision === "disagree"
        ? { reviewState: "Rejected", resolutionState: "Unresolved" }
        : decision === "agree"
          ? { reviewState: "Confirmed", resolutionState: "Unresolved" }
          : { reviewState: "Pending", resolutionState: "Unresolved" };
  }
  const statusSource = statusOverride ?? previewStatusSource ?? baseStatusSource;
  const statusChips = buildDetailStatusChips(statusSource);
  const showAgeChip =
    !statusSource ||
    (statusSource.resolutionState !== "Resolved" && (statusSource.reviewState !== "Rejected" || decision === "disagree"));
  const feedbackPrompt =
    statusSource?.reviewState === "Rejected"
      ? "Provide Feedback"
      : statusSource?.reviewState === "Confirmed"
        ? "Make the fix"
        : "Do you agree?";

  const exceptionVarianceMeta = useMemo(
    () => formatVarianceMeta(detailFixture.exceptionBreakdown.varianceCents),
    [detailFixture.exceptionBreakdown.varianceCents]
  );
  const exceptionAgeText = useMemo(() => (detail ? formatCreatedRelative(detail.openedAt) : "0s ago"), [detail]);
  const exceptionCreatedTooltip = useMemo(
    () => (detail ? formatLastUpdatedAbsolute(detail.openedAt) : formatLastUpdatedAbsolute(new Date().toISOString())),
    [detail]
  );
  const lastUpdatedText = useMemo(() => formatLastUpdatedRelative(detailFixture.auditRunAt), [detailFixture.auditRunAt]);
  const lastUpdatedTooltip = useMemo(() => formatLastUpdatedAbsolute(detailFixture.auditRunAt), [detailFixture.auditRunAt]);

  useEffect(() => {
    setSelectedEvidenceId(null);
    setIsOrderSectionOpen(true);
    setStatusOverride(null);
    setDecision(getDefaultDecisionFromReviewState(detail?.reviewState));
    setDecisionTouched(false);
    setDisagreeNote("");
    setIsHeaderMenuOpen(false);
    setInlineCopyToast(null);
  }, [decodedItemId, detail]);

  useEffect(() => {
    if (decision !== "disagree" || !disagreeNoteRef.current) {
      return;
    }

    const textarea = disagreeNoteRef.current;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [decision, disagreeNote]);

  useEffect(() => {
    if (!isHeaderMenuOpen) {
      return;
    }

    function handleOutsidePointerDown(event: globalThis.MouseEvent) {
      if (!headerMenuRef.current) {
        return;
      }
      if (!headerMenuRef.current.contains(event.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    }

    function handleMenuEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsHeaderMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handleOutsidePointerDown);
    window.addEventListener("keydown", handleMenuEscape);
    return () => {
      window.removeEventListener("mousedown", handleOutsidePointerDown);
      window.removeEventListener("keydown", handleMenuEscape);
    };
  }, [isHeaderMenuOpen]);

  useEffect(() => {
    return () => {
      if (inlineCopyToastTimerRef.current !== null) {
        window.clearTimeout(inlineCopyToastTimerRef.current);
      }
    };
  }, []);

  async function copyTextToClipboard(value: string): Promise<boolean> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // In iframe contexts clipboard-write can be blocked even when the API exists.
        // Fall through to legacy execCommand copy as a best-effort fallback.
      }
    }

    try {
      const input = document.createElement("textarea");
      input.value = value;
      input.setAttribute("readonly", "true");
      input.style.position = "fixed";
      input.style.top = "0";
      input.style.left = "0";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.focus();
      input.select();
      input.setSelectionRange(0, value.length);
      const copied = document.execCommand("copy");
      document.body.removeChild(input);
      return copied;
    } catch {
      return false;
    }
  }

  function closeDetail() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(createCloseDetailMessage(decodedItemId || itemId), HOST_ORIGIN);
      return;
    }

    window.location.assign("/list");
  }

  function handleTerminalAction(action: TerminalAction) {
    const next = buildStatusFromTerminalAction(action);
    flushSync(() => {
      setStatusOverride(next);
    });
    closeDetail();
  }

  async function copyExceptionId() {
    if (!decodedItemId) {
      return;
    }

    const copied = await copyTextToClipboard(decodedItemId);
    showInlineCopyToast(copied ? "Exception ID copied" : "Could not copy exception id");
  }

  function showInlineCopyToast(message: string) {
    setInlineCopyToast(message);
    if (inlineCopyToastTimerRef.current !== null) {
      window.clearTimeout(inlineCopyToastTimerRef.current);
    }
    inlineCopyToastTimerRef.current = window.setTimeout(() => {
      setInlineCopyToast(null);
      inlineCopyToastTimerRef.current = null;
    }, 1400);
  }

  async function handleInlineCodeCopy(value: string, label: string) {
    const copied = await copyTextToClipboard(value);
    showInlineCopyToast(copied ? `${label} copied` : `Could not copy ${label.toLowerCase()}`);
  }

  function handleDecisionChange(nextDecision: DetailDecision) {
    setDecision((current) => (current === nextDecision ? null : nextDecision));
    setDecisionTouched(true);
  }

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-900">
      <main className="flex w-full flex-1 min-h-0 overflow-hidden p-0">
        <div className="grid h-full min-h-0 w-full overflow-hidden lg:grid-cols-[55%_45%] lg:divide-x lg:divide-slate-200">
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
              <div className="flex h-14 w-full items-center justify-between gap-5 px-8">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    data-testid="detail-back"
                  >
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5 stroke-current stroke-[1.8]">
                      <path d="M12.5 4.5 7 10l5.5 5.5" />
                    </svg>
                    Back
                  </button>

                  <div className="flex min-w-0 items-center gap-2">
                    <h1 className="min-w-0 truncate text-base font-semibold text-slate-900" data-testid="detail-exception-type">
                      {detail?.exceptionType ?? "Exception Type"}
                    </h1>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${
                        exceptionVarianceMeta.direction === "overbilled" ? "bg-rose-700 text-white" : "bg-amber-600 text-white"
                      }`}
                      data-testid="detail-exception-amount-chip"
                    >
                      <VarianceDirectionIcon direction={exceptionVarianceMeta.direction} />
                      {exceptionVarianceMeta.amountText}
                    </span>
                    <span className="h-4 w-px shrink-0 bg-slate-300" data-testid="status-group-separator" aria-hidden="true" />
                    <div className="flex min-w-0 shrink-0 items-center gap-1.5" data-testid="detail-status-chips">
                      {statusChips.map((chip) => (
                        <div key={`${chip.kind}:${chip.value}`} className="inline-flex items-center gap-1">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-medium ${detailChipClass[chip.tone]}`}>
                            <DetailChipIcon icon={chip.icon} />
                            <span className="font-semibold">{chip.value}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="ml-3 flex shrink-0 items-center justify-end gap-2">
                  {showAgeChip && (
                    <span className="cursor-help text-xs text-slate-500" title={exceptionCreatedTooltip} data-testid="detail-created-at">
                      {`Created ${exceptionAgeText}`}
                    </span>
                  )}
                  <div className="relative" ref={headerMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsHeaderMenuOpen((current) => !current)}
                      className="inline-flex items-center rounded-md border border-transparent p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      aria-haspopup="menu"
                      aria-expanded={isHeaderMenuOpen}
                      aria-label="Exception actions"
                      data-testid="exception-actions-menu-button"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
                        <circle cx="10" cy="4" r="1.5" />
                        <circle cx="10" cy="10" r="1.5" />
                        <circle cx="10" cy="16" r="1.5" />
                      </svg>
                    </button>
                    {isHeaderMenuOpen && (
                      <div
                        className="absolute right-0 top-8 z-40 min-w-[170px] rounded-md border border-slate-200 bg-white p-1 shadow-lg"
                        role="menu"
                        aria-label="Exception actions menu"
                        data-testid="exception-actions-menu"
                      >
                        <button
                          type="button"
                          onClick={async () => {
                            await copyExceptionId();
                            setIsHeaderMenuOpen(false);
                          }}
                          className="w-full rounded px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                          role="menuitem"
                          data-testid="copy-exception-id"
                        >
                          Copy Exception ID
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </header>
            <div className="panel-scroll min-h-0 flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-8 py-6" data-testid="left-panel-scroll">
              <div>
                <section data-testid="order-details-section">
                  <div
                    className="overflow-visible rounded-2xl border border-slate-300 bg-white shadow-sm"
                    data-testid="order-details-card"
                  >
                      <div className="px-5 py-5">
                      <div className={`flex items-center justify-between gap-2 ${isOrderSectionOpen ? "pb-1" : ""}`}>
                        <div className="group/copy inline-flex min-w-0 items-center gap-1.5" data-copy-group>
                          <h2 className="truncate text-base font-semibold text-slate-900" data-testid="order-details-heading">
                            {`Order ${detailFixture.orderDetails.orderId}`}
                          </h2>
                          <InlineCopyButton
                            onCopy={() => handleInlineCodeCopy(detailFixture.orderDetails.orderId, "Order ID")}
                            label="order ID"
                            testId="copy-order-id"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setIsOrderSectionOpen((current) => !current);
                          }}
                          className="inline-flex items-center rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                          aria-expanded={isOrderSectionOpen}
                          aria-label={isOrderSectionOpen ? "Collapse order details" : "Expand order details"}
                          data-testid="toggle-order-section"
                        >
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            aria-hidden="true"
                            className={`h-3.5 w-3.5 stroke-current transition-transform ${isOrderSectionOpen ? "rotate-90" : "rotate-0"}`}
                            strokeWidth="1.8"
                          >
                            <path d="m7 5 6 5-6 5" />
                          </svg>
                        </button>
                      </div>
                      {isOrderSectionOpen && (
                        <>
                          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_248px]">
                            <div className="space-y-4" data-testid="order-reference-section">
                              <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-4">
                                <span className="text-sm leading-6 font-normal text-slate-500">Customer</span>
                                <div className="min-w-0">
                                  <BillToCodeHover
                                    accountName={detailFixture.orderDetails.account}
                                    accountCode={detailFixture.orderDetails.accountCode}
                                    billToCode={detailFixture.orderDetails.billToCode}
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-4">
                                <span className="text-sm leading-6 font-normal text-slate-500">Origin</span>
                                <div className="min-w-0">
                                  <AddressHoverDetails
                                    name={detailFixture.orderDetails.originName}
                                    address1={detailFixture.orderDetails.originAddress1}
                                    address2={detailFixture.orderDetails.originAddress2}
                                    cityStateZip={detailFixture.orderDetails.originCityStateZip}
                                    locationCode={detailFixture.orderDetails.originLocationCode}
                                    triggerTestId="origin-city-state"
                                    tooltipTestId="origin-address-tooltip"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-4">
                                <span className="text-sm leading-6 font-normal text-slate-500">Destination</span>
                                <div className="min-w-0">
                                  <AddressHoverDetails
                                    name={detailFixture.orderDetails.destinationName}
                                    address1={detailFixture.orderDetails.destinationAddress1}
                                    address2={detailFixture.orderDetails.destinationAddress2}
                                    cityStateZip={detailFixture.orderDetails.destinationCityStateZip}
                                    locationCode={detailFixture.orderDetails.destinationLocationCode}
                                    triggerTestId="destination-city-state"
                                    tooltipTestId="destination-address-tooltip"
                                  />
                                </div>
                              </div>

                              <div data-testid="references-section" className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-4">
                                <span className="text-sm leading-6 font-normal text-slate-500">Ship ID</span>
                                <div className="group/copy flex min-w-0 max-w-full items-center gap-1" data-copy-group>
                                  <div
                                    className="min-w-0 truncate text-sm font-medium tabular-nums text-slate-900"
                                    data-testid="reference-value-shipid"
                                  >
                                    {detailFixture.orderDetails.customerShipId}
                                  </div>
                                  <InlineCopyButton
                                    onCopy={() => handleInlineCodeCopy(detailFixture.orderDetails.customerShipId, "Ship ID")}
                                    label="ship ID"
                                    testId="copy-ship-id"
                                  />
                                </div>
                              </div>
                            </div>

                            <aside className="min-w-0 w-full max-w-[220px] justify-self-start" data-testid="timeline-column">
                              <ul className="space-y-4" data-testid="load-timeline-track">
                                {detailFixture.timeline.map((milestone) => {
                                  const milestoneKey = milestone.label.toLowerCase().replace(/\s+/g, "-");
                                  const milestoneDate = milestone.datetime;
                                  const isCompleted = milestoneDate !== null;
                                  return (
                                    <li
                                      key={milestone.label}
                                      data-testid={`timeline-milestone-${milestoneKey}`}
                                      className="grid min-w-0 grid-cols-[minmax(0,1fr)_60px] items-center gap-x-2"
                                    >
                                      <span
                                        className="truncate text-sm leading-6 font-normal text-slate-500"
                                        data-testid={`timeline-label-${milestoneKey}`}
                                      >
                                        {milestone.label}
                                      </span>
                                      <span
                                        className={`text-right tabular-nums text-sm leading-6 font-medium ${
                                          isCompleted ? "text-slate-900" : "text-slate-400"
                                        }`}
                                        data-testid={`timeline-value-${milestoneKey}`}
                                      >
                                        {isCompleted ? formatTimelineDate(milestoneDate) : "-"}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </aside>
                          </div>
                        </>
                      )}
                      </div>
                      {isOrderSectionOpen && (
                        <div className="overflow-hidden rounded-b-2xl" data-testid="order-last-updated">
                          <LastUpdatedMeta relativeText={lastUpdatedText} absoluteText={lastUpdatedTooltip} variant="bar" />
                        </div>
                      )}
                  </div>
                </section>
              </div>

              <div>
                <section data-testid="exception-section">
                  <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm" data-testid="exception-card">
                      <div className="px-5 py-5">
                        <h2 className="text-base font-semibold text-slate-900">Exception</h2>
                        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full border-collapse text-sm">
                            <thead className="bg-slate-50 text-sm leading-6 text-slate-500">
                              <tr>
                                <th className="px-3 py-2.5 text-left font-normal">Charge</th>
                                <th className="px-3 py-2.5 text-right font-normal">Billed (TMS)</th>
                                <th className="px-3 py-2.5 text-right font-normal">Expected (GT)</th>
                                <th className="px-3 py-2.5 text-right font-normal">Variance</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-t border-slate-200">
                                <td className="px-3 py-2.5 font-medium text-slate-900">{detailFixture.exceptionBreakdown.charge}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-900">
                                  {formatCurrency(detailFixture.exceptionBreakdown.billedTmsCents)}
                                </td>
                                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-slate-900">
                                  {formatCurrency(detailFixture.exceptionBreakdown.expectedCents)}
                                </td>
                                <td
                                  className={`px-3 py-2.5 text-right tabular-nums font-medium ${exceptionVarianceMeta.className}`}
                                  title={exceptionVarianceMeta.tooltipText}
                                  data-testid="detail-exception-variance"
                                >
                                  <span className="inline-flex items-center justify-end gap-1">
                                    <VarianceDirectionIcon direction={exceptionVarianceMeta.direction} />
                                    <span>{exceptionVarianceMeta.amountText}</span>
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <a
                          href={getFixNavigationUrl()}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          data-testid="exception-fix-in-orders"
                        >
                          Fix in Orders
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5 stroke-current stroke-[1.8]">
                            <path d="M11 4h5v5" />
                            <path d="m10 10 6-6" />
                            <path d="M9 5H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-4" />
                          </svg>
                        </a>
                      </div>
                      <div data-testid="exception-last-updated">
                        <LastUpdatedMeta
                          relativeText={lastUpdatedText}
                          absoluteText={lastUpdatedTooltip}
                          testId="detail-last-updated"
                          variant="bar"
                        />
                      </div>
                  </div>
                </section>
              </div>

              <div>
                <section data-testid="evidence-section">
                  <div className="rounded-2xl border border-slate-300 bg-white shadow-sm" data-testid="evidence-shell">
                      <div className="px-5 pt-5 pb-5">
                        <h2 className="text-base font-semibold text-slate-900">Evidence</h2>
                        <div className="mt-4 space-y-3">
                          {detailFixture.evidence.map((event) => {
                            const isSelected = event.id === selectedEvidenceId;
                            const displayTitle = stripEmailFromEvidenceTitle(event.title);
                            const metaLine = `${event.from} · ${formatEvidenceMetaTimestamp(event.timestampLabel)}`;
                            const toggleSelection = () => {
                              setSelectedEvidenceId((current) => (current === event.id ? null : event.id));
                            };
                            return (
                              <div
                                key={event.id}
                                role="button"
                                tabIndex={0}
                                onClick={toggleSelection}
                                onKeyDown={(keyEvent: ReactKeyboardEvent<HTMLDivElement>) => {
                                  if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                                    keyEvent.preventDefault();
                                    toggleSelection();
                                  }
                                }}
                                aria-pressed={isSelected}
                                data-testid={`evidence-card-${event.id}`}
                                className={`group relative w-full cursor-pointer rounded-lg border p-4 text-left transition ${
                                  isSelected
                                    ? "border-sky-400 bg-sky-50 shadow-sm"
                                    : "border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50"
                                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300`}
                              >
                                <span
                                  className="pointer-events-none absolute right-4 top-4 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                                  aria-hidden="true"
                                  data-testid={`evidence-expand-icon-${event.id}`}
                                >
                                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 stroke-current stroke-[1.8]">
                                    <path d="M8 5h7v7" />
                                    <path d="m15 5-8 8" />
                                  </svg>
                                </span>
                                <div className="min-w-0 pr-10">
                                  <div className="truncate text-sm leading-6 font-medium text-slate-900">{displayTitle}</div>
                                  <div className="mt-1 truncate text-xs leading-5 font-normal text-slate-500">{metaLine}</div>
                                </div>
                                <div className="mt-3 rounded-md bg-slate-100 px-2.5 py-2 text-sm leading-6 font-normal text-slate-700">
                                  &quot;{event.quote}&quot;
                                </div>
                                <div className="group/copy mt-2 inline-flex max-w-full items-center" data-copy-group>
                                  <span className="truncate text-xs leading-5 font-normal text-slate-500">{`Subject: ${event.subject}`}</span>
                                  <InlineCopyButton
                                    onCopy={() => handleInlineCodeCopy(event.subject, "Subject line")}
                                    label="subject line"
                                    testId={`copy-evidence-subject-${event.id}`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                  </div>
                </section>
              </div>
            </div>
            <div
              className="sticky bottom-0 z-20 shrink-0 border-t border-slate-200 bg-white/95 px-8 py-3 shadow-[0_-1px_4px_rgba(15,23,42,0.03)] backdrop-blur"
              data-testid="left-feedback-bar"
            >
              {/*
                Footer control row behavior:
                - Neutral: two full-width choice buttons (Agree/Disagree)
                - Active choice: compact icon-only toggles + Fix action
              */}
              {(() => {
                const compactDecisionButtons = decision !== null;
                const showFixInOrders = decision === "agree";
                const showDecisionSeparator = decision === "agree";
                return (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{feedbackPrompt}</h3>
                    <div className="ml-auto flex items-center">
                      <div className="flex items-stretch gap-2" role="radiogroup" aria-label="Do you agree">
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={() => handleDecisionChange("disagree")}
                            data-testid="decision-disagree"
                            className={`peer inline-flex h-10 items-center justify-center rounded-md border text-sm font-medium ${
                              compactDecisionButtons ? "w-10 px-0" : "w-[116px] px-3"
                            } ${
                              decision === "disagree"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50"
                            }`}
                            aria-pressed={decision === "disagree"}
                            aria-label="Disagree"
                          >
                            <DecisionThumbIcon direction="down" />
                            {!compactDecisionButtons && <span className="ml-1.5">Disagree</span>}
                          </button>
                          <span
                            role="tooltip"
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg peer-hover:block peer-focus-visible:block"
                          >
                            Disagree
                          </span>
                        </div>
                        <div className="relative inline-flex">
                          <button
                            type="button"
                            onClick={() => handleDecisionChange("agree")}
                            data-testid="decision-agree"
                            className={`peer inline-flex h-10 items-center justify-center rounded-md border text-sm font-medium ${
                              compactDecisionButtons ? "w-10 px-0" : "w-[116px] px-3"
                            } ${
                              decision === "agree"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50"
                            }`}
                            aria-pressed={decision === "agree"}
                            aria-label="Agree"
                          >
                            <DecisionThumbIcon direction="up" />
                            {!compactDecisionButtons && <span className="ml-1.5">Agree</span>}
                          </button>
                          <span
                            role="tooltip"
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg peer-hover:block peer-focus-visible:block"
                          >
                            Agree
                          </span>
                        </div>
                      </div>
                      {showDecisionSeparator && <span className="mx-2 h-6 w-px bg-slate-200" aria-hidden="true" />}
                      {showFixInOrders && (
                        <a
                          href={getFixNavigationUrl()}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex h-10 w-[116px] items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          data-testid="go-make-fix"
                        >
                          Fix
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-3.5 w-3.5 stroke-current stroke-[1.8]">
                            <path d="M11 4h5v5" />
                            <path d="m10 10 6-6" />
                            <path d="M9 5H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-4" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}
              {decision === "agree" && (
                <div className="mt-3 border-t border-slate-200/80 pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTerminalAction("fix-later")}
                      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      data-testid="fix-later"
                    >
                      Fix Later
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTerminalAction("confirm-fixed")}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      data-testid="confirm-fixed"
                    >
                      <DetailChipIcon icon="check" />
                      Confirm Fixed
                    </button>
                  </div>
                </div>
              )}
              {decision === "disagree" && (
                <div className="mt-3 pt-1" data-testid="disagree-controls">
                  <textarea
                    id="disagree-note"
                    ref={disagreeNoteRef}
                    rows={1}
                    className="min-h-10 w-full resize-none overflow-hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    value={disagreeNote}
                    onChange={(event) => setDisagreeNote(event.target.value)}
                    placeholder="Additional Notes..."
                    data-testid="disagree-note"
                  />
                  <div className="mt-3 border-t border-slate-200/80 pt-4">
                    <button
                      type="button"
                      onClick={() => handleTerminalAction("disagree-feedback")}
                      className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                      data-testid="close-submit-feedback"
                    >
                      Submit Feedback and Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="relative flex h-full min-h-0 min-w-0 flex-col bg-white" data-testid="right-panel">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur" data-testid="right-panel-header">
              <div className="flex h-14 w-full min-w-0 items-center px-8">
                <div className="min-w-0">
                  <h2 className="truncate pr-2 text-base font-semibold text-slate-900" data-testid="supporting-message-header">
                  {selectedEvidence ? stripEmailFromEvidenceTitle(selectedEvidence.title) : "Evidence"}
                  </h2>
                </div>
              </div>
            </header>
            <div className="panel-scroll h-full min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-8 py-6" data-testid="right-panel-scroll">
              <section className="min-w-0" data-testid="supporting-message-pane">
                {!selectedEvidence ? (
                  <div
                    className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500"
                    data-testid="supporting-message-empty"
                  >
                    Select an evidence event to preview the supporting message.
                  </div>
                ) : (
                  <article className="space-y-4" data-testid="supporting-message-content">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      <div>Subject: {selectedEvidence.subject}</div>
                    </div>
                    <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                      {selectedEvidence.message}
                    </pre>
                  </article>
                )}
              </section>
            </div>
          </aside>
        </div>
      </main>
      {inlineCopyToast && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-50" data-testid="inline-copy-toast">
          <div className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg">
            {inlineCopyToast}
          </div>
        </div>
      )}
    </div>
  );
}
