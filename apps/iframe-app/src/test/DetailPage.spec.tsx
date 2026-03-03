import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DetailPage,
  buildDetailFixture,
  buildDetailStatusChips,
  buildStatusFromTerminalAction,
  getFixNavigationUrl
} from "../components/DetailPage";
import { mockExceptions } from "../mockData";

function renderDetailPage(itemId: string) {
  render(
    <MemoryRouter initialEntries={[`/detail/${itemId}`]}>
      <Routes>
        <Route path="/detail/:itemId" element={<DetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function DetailRouteHarness() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/detail/EX-003")} data-testid="goto-next-detail">
        Next Detail
      </button>
      <DetailPage />
    </>
  );
}

describe("DetailPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps top-bar chips by review/resolution and terminal actions", () => {
    expect(buildDetailStatusChips({ reviewState: "Pending", resolutionState: "Unresolved" })).toEqual([
      { icon: "none", kind: "review", value: "Pending Review", tone: "slate" },
      { icon: "none", kind: "fix", value: "Pending Fix", tone: "slate" }
    ]);
    expect(buildDetailStatusChips({ reviewState: "Rejected", resolutionState: "Unresolved" })).toEqual([
      { icon: "thumbs-down", kind: "review", value: "Rejected", tone: "rose" }
    ]);
    expect(buildDetailStatusChips({ reviewState: "Confirmed", resolutionState: "Unresolved" })).toEqual([
      { icon: "thumbs-up", kind: "review", value: "Validated", tone: "emerald" },
      { icon: "none", kind: "fix", value: "Pending Fix", tone: "slate" }
    ]);
    expect(buildDetailStatusChips({ reviewState: "Confirmed", resolutionState: "Resolved" })).toEqual([
      { icon: "thumbs-up", kind: "review", value: "Validated", tone: "emerald" },
      { icon: "check", kind: "fix", value: "Fixed", tone: "sky" }
    ]);

    expect(buildStatusFromTerminalAction("confirm-fixed")).toEqual({ reviewState: "Confirmed", resolutionState: "Resolved" });
    expect(buildStatusFromTerminalAction("fix-later")).toEqual({ reviewState: "Confirmed", resolutionState: "Unresolved" });
    expect(buildStatusFromTerminalAction("disagree-feedback")).toEqual({ reviewState: "Rejected", resolutionState: "Unresolved" });
  });

  it("builds fixture data and exposes host fix URL helper", () => {
    const fixture = buildDetailFixture(mockExceptions[0]);
    expect(fixture.orderDetails.orderId).toMatch(/^\d[A-Z]{2}\d{4}$/);
    expect(fixture.timeline).toHaveLength(4);
    expect(fixture.timeline.map((milestone) => milestone.label)).toContain("Invoiced");
    expect(fixture.evidence.length).toBeGreaterThan(0);
    expect(new Date(fixture.auditRunAt).toString()).not.toBe("Invalid Date");
    expect(getFixNavigationUrl()).toBe("http://localhost:5173/fix-exception");
  });

  it("builds monotonic timeline states and null dates for pending milestones", () => {
    const unresolvedFixture = buildDetailFixture(mockExceptions[5]);
    const pendingIndex = unresolvedFixture.timeline.findIndex((milestone) => milestone.state === "pending");
    expect(pendingIndex).toBeGreaterThanOrEqual(0);
    unresolvedFixture.timeline.forEach((milestone, index) => {
      if (index < pendingIndex) {
        expect(milestone.state).toBe("completed");
        expect(milestone.datetime).toBeTruthy();
      } else {
        expect(milestone.state).toBe("pending");
        expect(milestone.datetime).toBeNull();
      }
    });

    const resolvedFixture = buildDetailFixture({
      ...mockExceptions[0],
      resolutionState: "Resolved",
      reviewState: "Confirmed"
    });
    resolvedFixture.timeline.forEach((milestone) => {
      expect(milestone.state).toBe("completed");
      expect(milestone.datetime).toBeTruthy();
    });
  });

  it("renders order-first left panel with a dedicated right supporting-message pane", () => {
    renderDetailPage("EX-002");

    expect(screen.getByTestId("detail-exception-type")).toBeInTheDocument();
    expect(screen.getByTestId("detail-exception-amount-chip")).toBeInTheDocument();
    expect(screen.getByTestId("detail-created-at")).toHaveTextContent(
      /^Created \d+(s|m|h|d|w|mo|y) ago$/
    );
    expect(screen.getByTestId("detail-created-at")).toHaveAttribute(
      "title",
      expect.stringMatching(/^\d{1,2}\/\d{1,2}\/\d{2} \d{1,2}:\d{2}(AM|PM) CT$/)
    );
    expect(screen.getByTestId("status-group-separator")).toBeInTheDocument();
    expect(screen.getByTestId("detail-status-chips")).toHaveTextContent("Validated");
    expect(screen.getByTestId("detail-status-chips")).toHaveTextContent("Pending Fix");
    expect(screen.getByTestId("exception-actions-menu-button")).toBeInTheDocument();

    const leftPanel = screen.getByTestId("left-panel-scroll");
    const orderSection = within(leftPanel).getByTestId("order-details-section");
    const exceptionSection = within(leftPanel).getByTestId("exception-section");
    const evidenceSection = within(leftPanel).getByTestId("evidence-section");
    expect(orderSection.compareDocumentPosition(exceptionSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(exceptionSection.compareDocumentPosition(evidenceSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const lastUpdated = screen.getByTestId("detail-last-updated");
    expect(lastUpdated).toHaveTextContent(/^Last updated \d+(s|m|h|d|w|mo|y) ago/);
    expect(lastUpdated).toHaveAttribute("title", expect.stringMatching(/^\d{1,2}\/\d{1,2}\/\d{2} \d{1,2}:\d{2}(AM|PM) CT$/));
    expect(screen.getByTestId("order-details-section")).toBeInTheDocument();
    expect(screen.getByTestId("exception-section")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-section")).toBeInTheDocument();
    expect(screen.getByTestId("toggle-order-section")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("right-panel")).toBeInTheDocument();
    expect(screen.getByTestId("right-panel-header")).toBeInTheDocument();
    expect(screen.getByTestId("right-panel-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("right-panel")).toHaveClass("h-full");
    expect(screen.queryByTestId("resolution-actions-section")).not.toBeInTheDocument();
    expect(screen.queryByText("Timeline")).not.toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("Origin")).toBeInTheDocument();
    expect(screen.getByText("Destination")).toBeInTheDocument();
    expect(screen.getByText("Ship ID")).toBeInTheDocument();
    expect(screen.getByTestId("order-reference-section")).toBeInTheDocument();
    expect(screen.getByTestId("references-section")).toBeInTheDocument();
    expect(screen.getByTestId("reference-value-shipid")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-column")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-column")).toHaveClass("justify-self-start", "w-full", "max-w-[220px]");
    expect(screen.getByTestId("timeline-column")).not.toHaveClass("bg-slate-50", "border", "rounded-xl", "p-4");
    expect(screen.getByTestId("load-timeline-track")).toBeInTheDocument();
    expect(screen.queryByTestId("copy-origin-code")).not.toBeInTheDocument();
    expect(screen.queryByTestId("copy-destination-code")).not.toBeInTheDocument();
    expect(screen.getByTestId("go-make-fix")).toHaveAttribute("href", "http://localhost:5173/fix-exception");
    expect(within(screen.getByTestId("right-panel")).queryByTestId("order-details-section")).not.toBeInTheDocument();
    expect(screen.getByTestId("supporting-message-header")).toHaveTextContent("Evidence");
    expect(screen.getByTestId("supporting-message-empty")).toBeInTheDocument();
  });

  it("hides age chip when exception is resolved and keeps it for rejected", () => {
    renderDetailPage("EX-001");
    expect(screen.queryByTestId("detail-created-at")).not.toBeInTheDocument();

    renderDetailPage("EX-003");
    expect(screen.getByTestId("detail-created-at")).toBeInTheDocument();
  });

  it("updates the right supporting-message pane when evidence is selected", () => {
    renderDetailPage("EX-002");

    const evidenceCard = screen.getAllByTestId(/evidence-card-/)[0];
    expect(evidenceCard).not.toHaveTextContent("Event:");
    fireEvent.click(evidenceCard);

    expect(screen.getByTestId("supporting-message-header")).toHaveTextContent("Quote Offered by Carrier");
    expect(screen.queryByTestId("supporting-message-from")).not.toBeInTheDocument();
    expect(screen.getByText(/Carrier quote was submitted/i)).toBeInTheDocument();
    expect(within(screen.getByTestId("right-panel")).getByTestId("supporting-message-content")).toBeInTheDocument();
    expect(screen.queryByTestId("supporting-message-empty")).not.toBeInTheDocument();
  });

  it("defaults bottom bar controls from existing validated review state", () => {
    renderDetailPage("EX-002");

    expect(screen.getByTestId("decision-agree")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("decision-compact-row")).toBeInTheDocument();
    expect(screen.queryByTestId("complete-task-inactive")).not.toBeInTheDocument();
    expect(screen.getByTestId("go-make-fix")).toHaveAttribute("href", "http://localhost:5173/fix-exception");
    expect(screen.getByTestId("fix-later")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-fixed")).toBeInTheDocument();
    expect(screen.queryByTestId("disagree-controls")).not.toBeInTheDocument();
  });

  it("returns to neutral pending states when deselecting a preselected agree decision", () => {
    renderDetailPage("EX-002");

    const statuses = screen.getByTestId("detail-status-chips");
    expect(statuses).toHaveTextContent("Validated");
    expect(statuses).toHaveTextContent("Pending Fix");

    fireEvent.click(screen.getByTestId("decision-agree"));

    const stickyBar = screen.getByTestId("left-feedback-bar");
    expect(screen.getByTestId("decision-agree")).toHaveAttribute("aria-pressed", "false");
    expect(within(stickyBar).getByTestId("default-decision-row")).toBeInTheDocument();
    expect(within(stickyBar).getByText("Reject Exception")).toBeInTheDocument();
    expect(within(stickyBar).getByText("Confirm Exception")).toBeInTheDocument();
    expect(within(stickyBar).getByTestId("complete-task-inactive")).toBeDisabled();
    expect(statuses).toHaveTextContent("Pending Review");
    expect(statuses).toHaveTextContent("Pending Fix");
    expect(statuses).not.toHaveTextContent("Validated");
    expect(screen.queryByTestId("fix-later")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirm-fixed")).not.toBeInTheDocument();
    expect(screen.queryByTestId("disagree-controls")).not.toBeInTheDocument();
  });

  it("defaults bottom bar controls from existing rejected review state", () => {
    renderDetailPage("EX-003");

    expect(screen.getByTestId("decision-disagree")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("decision-compact-row")).toBeInTheDocument();
    expect(screen.getByTestId("disagree-controls")).toBeInTheDocument();
    expect(screen.queryByTestId("fix-later")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirm-fixed")).not.toBeInTheDocument();
    expect(screen.getByTestId("close-submit-feedback")).toBeInTheDocument();
  });

  it("toggles evidence selection off when clicking the same card again", () => {
    renderDetailPage("EX-002");

    const evidenceCard = screen.getAllByTestId(/evidence-card-/)[0];
    fireEvent.click(evidenceCard);
    expect(screen.getByTestId("supporting-message-content")).toBeInTheDocument();

    fireEvent.click(evidenceCard);
    expect(screen.queryByTestId("supporting-message-content")).not.toBeInTheDocument();
    expect(screen.getByTestId("supporting-message-empty")).toBeInTheDocument();
    expect(screen.getByTestId("supporting-message-header")).toHaveTextContent("Evidence");
  });

  it("collapses and expands order section content from the toggle", () => {
    renderDetailPage("EX-002");

    expect(screen.getByTestId("toggle-order-section")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("order-reference-section")).toBeInTheDocument();
    expect(screen.getByTestId("order-last-updated")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toggle-order-section"));
    expect(screen.getByTestId("toggle-order-section")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("order-reference-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("load-timeline-track")).not.toBeInTheDocument();
    expect(screen.getByTestId("order-last-updated")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("toggle-order-section"));
    expect(screen.getByTestId("toggle-order-section")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("order-reference-section")).toBeInTheDocument();
    expect(screen.getByTestId("load-timeline-track")).toBeInTheDocument();
    expect(screen.getByTestId("order-last-updated")).toBeInTheDocument();
  });

  it("renders unified order card with embedded timeline and reference metadata", () => {
    renderDetailPage("EX-006");

    expect(screen.getByTestId("order-details-heading")).toHaveTextContent("Load Info");
    expect(screen.getByText("Order")).toBeInTheDocument();
    expect(screen.getByText(/^\d[A-Z]{2}\d{4}$/)).toBeInTheDocument();
    expect(screen.getByText("Customer")).toBeInTheDocument();
    expect(screen.getByText("Origin")).toBeInTheDocument();
    expect(screen.getByText("Destination")).toBeInTheDocument();
    expect(screen.getByText("Ship ID")).toBeInTheDocument();
    expect(screen.getByTestId("customer-account")).toHaveClass("truncate");
    expect(screen.getByTestId("origin-city-state")).toHaveClass("truncate");
    expect(screen.getByTestId("destination-city-state")).toHaveClass("truncate");
    expect(screen.getByTestId("reference-value-shipid")).toHaveClass("truncate");
    expect(screen.getByTestId("reference-value-shipid")).toHaveTextContent("SHIP-7006");
    expect(screen.getByTestId("load-timeline-track")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-label-invoiced")).toHaveTextContent("Invoiced");
    expect(screen.getByTestId("timeline-value-invoiced")).toBeInTheDocument();
    expect(screen.queryByText("Customer Ship Ref")).not.toBeInTheDocument();
    expect(screen.getByTestId("toggle-order-section")).toBeInTheDocument();

    expect(screen.getByTestId("evidence-section")).toBeInTheDocument();
    expect(screen.getAllByTestId(/evidence-card-/).length).toBeGreaterThan(0);
  });

  it("resets selected evidence and message pane when navigating to a different detail item", () => {
    render(
      <MemoryRouter initialEntries={["/detail/EX-002"]}>
        <Routes>
          <Route path="/detail/:itemId" element={<DetailRouteHarness />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByTestId(/evidence-card-/)[0]);
    expect(screen.getByTestId("supporting-message-content")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("goto-next-detail"));
    expect(screen.getByTestId("supporting-message-empty")).toBeInTheDocument();
    expect(screen.getByTestId("supporting-message-header")).toHaveTextContent("Evidence");
  });

  it("renders timeline milestones as text rows with matching order-row spacing and '-' for pending", () => {
    renderDetailPage("EX-006");

    expect(screen.getByTestId("timeline-column")).toHaveClass("max-w-[220px]");
    expect(screen.getByTestId("load-timeline-track")).toHaveClass("space-y-2");
    expect(screen.getByTestId("timeline-milestone-invoiced")).toHaveClass(
      "grid",
      "grid-cols-[minmax(0,1fr)_60px]",
      "items-center",
      "gap-x-2"
    );
    expect(screen.getByTestId("timeline-value-delivered")).toHaveTextContent("-");
    expect(screen.getByTestId("timeline-label-tendered")).toHaveClass("gt-label-text", "text-slate-500");
    expect(screen.getByTestId("timeline-value-tendered")).toHaveClass("gt-order-value-text", "text-right", "tabular-nums", "text-slate-900");
    expect(screen.queryByTestId("timeline-icon-tendered")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timeline-icon-invoiced")).not.toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("keeps disagree notes when toggling between agree and disagree", () => {
    renderDetailPage("EX-002");

    fireEvent.click(screen.getByTestId("decision-disagree"));
    const stickyBar = screen.getByTestId("left-feedback-bar");
    expect(within(stickyBar).getByTestId("disagree-controls")).toBeInTheDocument();
    expect(screen.queryByTestId("resolution-actions-section")).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId("disagree-note"), { target: { value: "Manual lane audit indicates no discrepancy." } });

    fireEvent.click(screen.getByTestId("decision-agree"));
    expect(screen.queryByTestId("disagree-controls")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("decision-disagree"));
    expect(screen.getByTestId("disagree-note")).toHaveValue("Manual lane audit indicates no discrepancy.");
  });

  it("updates header status chips based on agree/disagree selection and supports deselect", () => {
    renderDetailPage("EX-004");

    const statuses = screen.getByTestId("detail-status-chips");
    const stickyBar = screen.getByTestId("left-feedback-bar");
    expect(within(stickyBar).getByTestId("default-decision-row")).toBeInTheDocument();
    expect(within(stickyBar).getByTestId("complete-task-inactive")).toBeDisabled();
    expect(statuses).toHaveTextContent("Pending Review");
    expect(statuses).toHaveTextContent("Pending Fix");
    expect(within(stickyBar).queryByTestId("go-make-fix")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("decision-disagree"));
    expect(within(stickyBar).getByTestId("decision-compact-row")).toBeInTheDocument();
    expect(within(stickyBar).getByText("Provide Feedback")).toBeInTheDocument();
    expect(statuses).toHaveTextContent("Rejected");
    expect(statuses).not.toHaveTextContent("Pending Fix");
    expect(screen.getByTestId("detail-created-at")).toBeInTheDocument();
    expect(screen.getByTestId("disagree-controls")).toBeInTheDocument();
    expect(within(stickyBar).queryByTestId("go-make-fix")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("decision-disagree"));
    expect(within(stickyBar).getByTestId("default-decision-row")).toBeInTheDocument();
    expect(within(stickyBar).getByTestId("complete-task-inactive")).toBeDisabled();
    expect(statuses).toHaveTextContent("Pending Review");
    expect(statuses).toHaveTextContent("Pending Fix");
    expect(screen.queryByTestId("disagree-controls")).not.toBeInTheDocument();
    expect(within(stickyBar).queryByTestId("go-make-fix")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("decision-agree"));
    expect(within(stickyBar).getByTestId("decision-compact-row")).toBeInTheDocument();
    expect(within(stickyBar).getByText("Make the fix")).toBeInTheDocument();
    expect(statuses).toHaveTextContent("Validated");
    expect(statuses).toHaveTextContent("Pending Fix");
    expect(within(stickyBar).getByTestId("go-make-fix")).toHaveAttribute("href", "http://localhost:5173/fix-exception");
    expect(within(stickyBar).getByTestId("fix-later")).toBeInTheDocument();
    expect(within(stickyBar).getByTestId("confirm-fixed")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("decision-agree"));
    expect(within(stickyBar).getByTestId("default-decision-row")).toBeInTheDocument();
    expect(within(stickyBar).getByTestId("complete-task-inactive")).toBeDisabled();
    expect(statuses).toHaveTextContent("Pending Review");
    expect(statuses).toHaveTextContent("Pending Fix");
    expect(within(stickyBar).queryByTestId("go-make-fix")).not.toBeInTheDocument();
    expect(within(stickyBar).queryByTestId("fix-later")).not.toBeInTheDocument();
    expect(within(stickyBar).queryByTestId("confirm-fixed")).not.toBeInTheDocument();
  });

  it("posts close message and updates chips when terminal actions are used", () => {
    const parentPostMessage = vi.fn();
    vi.spyOn(window, "parent", "get").mockReturnValue({
      postMessage: parentPostMessage
    } as unknown as Window);

    renderDetailPage("EX-007");
    fireEvent.click(screen.getByTestId("decision-agree"));
    fireEvent.click(screen.getByTestId("confirm-fixed"));

    const statuses = screen.getByTestId("detail-status-chips");
    expect(statuses).toHaveTextContent("Validated");
    expect(statuses).toHaveTextContent("Fixed");
    expect(screen.queryByTestId("detail-created-at")).not.toBeInTheDocument();
    expect(parentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "GT_CLOSE_DETAIL",
        payload: { itemId: "EX-007" }
      }),
      "http://localhost:5173"
    );
  });

  it("supports fix-later secondary action in agree state", () => {
    const parentPostMessage = vi.fn();
    vi.spyOn(window, "parent", "get").mockReturnValue({
      postMessage: parentPostMessage
    } as unknown as Window);

    renderDetailPage("EX-007");
    fireEvent.click(screen.getByTestId("decision-agree"));
    fireEvent.click(screen.getByTestId("fix-later"));

    const statuses = screen.getByTestId("detail-status-chips");
    expect(statuses).toHaveTextContent("Validated");
    expect(statuses).toHaveTextContent("Pending Fix");
    expect(parentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "GT_CLOSE_DETAIL",
        payload: { itemId: "EX-007" }
      }),
      "http://localhost:5173"
    );
  });

  it("submits disagree feedback from sticky bar with optional note", () => {
    const parentPostMessage = vi.fn();
    vi.spyOn(window, "parent", "get").mockReturnValue({
      postMessage: parentPostMessage
    } as unknown as Window);

    renderDetailPage("EX-008");
    fireEvent.click(screen.getByTestId("decision-disagree"));

    const stickyBar = screen.getByTestId("left-feedback-bar");
    expect(screen.queryByTestId("resolution-actions-section")).not.toBeInTheDocument();

    const closeButton = within(stickyBar).getByTestId("close-submit-feedback");
    expect(within(stickyBar).queryByTestId("disagree-reason")).not.toBeInTheDocument();
    expect(within(stickyBar).getByTestId("disagree-note")).toHaveAttribute("placeholder", "Additional Notes...");
    expect(closeButton).toBeEnabled();
    fireEvent.click(closeButton);

    const statuses = screen.getByTestId("detail-status-chips");
    expect(statuses).toHaveTextContent("Rejected");
    expect(statuses).not.toHaveTextContent("Pending Fix");
    expect(screen.getByTestId("detail-created-at")).toBeInTheDocument();
    expect(parentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "GT_CLOSE_DETAIL",
        payload: { itemId: "EX-008" }
      }),
      "http://localhost:5173"
    );
  });

  it("keeps sticky top bar behaviors (back action + copy action + origin/destination hover details)", async () => {
    const parentPostMessage = vi.fn();
    vi.spyOn(window, "parent", "get").mockReturnValue({
      postMessage: parentPostMessage
    } as unknown as Window);

    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWrite
      }
    });

    renderDetailPage("EX-009");

    expect(screen.getByTestId("detail-back").closest("header") ?? document.querySelector("header")).toHaveClass("sticky");
    expect(screen.getByTestId("detail-exception-type")).not.toHaveTextContent("EX-009");

    fireEvent.click(screen.getByTestId("exception-actions-menu-button"));
    fireEvent.click(screen.getByTestId("copy-exception-id"));
    expect(clipboardWrite).toHaveBeenCalledWith("EX-009");
    expect(await screen.findByTestId("inline-copy-toast")).toHaveTextContent("Exception ID copied");

    const origin = screen.getByTestId("origin-city-state");
    const destination = screen.getByTestId("destination-city-state");
    const customerAccount = screen.getByTestId("customer-account");
    const originTooltip = screen.getByTestId("origin-address-tooltip");
    const destinationTooltip = screen.getByTestId("destination-address-tooltip");
    const customerTooltip = screen.getByTestId("customer-bill-to-code-tooltip");
    expect(origin).not.toHaveAttribute("title");
    expect(destination).not.toHaveAttribute("title");
    expect(within(customerTooltip).getByText("Account")).toHaveClass("text-slate-500");
    expect(within(customerTooltip).getByText("Account Code")).toHaveClass("text-slate-500");
    expect(within(customerTooltip).getByText("Bill-to Code")).toHaveClass("text-slate-500");
    const customerTooltipValues = customerTooltip.querySelectorAll("span.truncate.font-medium.text-slate-800");
    expect(customerTooltipValues).toHaveLength(3);
    expect(customerTooltipValues[0]).toHaveTextContent(customerAccount.textContent ?? "");
    expect(customerTooltipValues[1].textContent ?? "").toMatch(/^[A-Z0-9]{5}$/);
    expect(customerTooltipValues[2].textContent ?? "").toMatch(/^[A-Z0-9]{5}$/);
    expect(originTooltip).toHaveTextContent(origin.textContent ?? "");
    expect(destinationTooltip).toHaveTextContent(destination.textContent ?? "");
    expect(within(originTooltip).getByText("Name")).toHaveClass("text-slate-500");
    expect(within(originTooltip).getByText("Addr1")).toHaveClass("text-slate-500");
    expect(within(originTooltip).getByText("Addr2")).toHaveClass("text-slate-500");
    expect(within(originTooltip).getByText("City,State,Zip")).toHaveClass("text-slate-500");
    expect(within(originTooltip).getByText("Location Code")).toHaveClass("text-slate-500");
    expect(within(destinationTooltip).getByText("Name")).toHaveClass("text-slate-500");
    expect(within(destinationTooltip).getByText("Addr1")).toHaveClass("text-slate-500");
    expect(within(destinationTooltip).getByText("Addr2")).toHaveClass("text-slate-500");
    expect(within(destinationTooltip).getByText("City,State,Zip")).toHaveClass("text-slate-500");
    expect(within(destinationTooltip).getByText("Location Code")).toHaveClass("text-slate-500");
    expect(originTooltip.textContent).toMatch(/\d[A-Z]{3}$/);
    expect(destinationTooltip.textContent).toMatch(/\d[A-Z]{3}$/);

    fireEvent.click(screen.getByTestId("detail-back"));
    expect(parentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "GT_CLOSE_DETAIL",
        payload: { itemId: "EX-009" }
      }),
      "http://localhost:5173"
    );
  });

  it("shows inline copy toast and hides the inline copy icon state after click", async () => {
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWrite
      }
    });

    renderDetailPage("EX-006");
    const orderCopyButton = screen.getByTestId("copy-order-id");
    expect(orderCopyButton).toHaveClass("opacity-0", "group-hover/copy:opacity-100");
    const copyButton = screen.getByTestId("copy-ship-id");
    fireEvent.click(copyButton);

    expect(clipboardWrite).toHaveBeenCalledTimes(1);
    expect(copyButton).toHaveClass("!opacity-0");
    expect(copyButton).not.toHaveClass("group-focus-within:opacity-100");
    const toast = await screen.findByTestId("inline-copy-toast");
    expect(toast).toHaveTextContent("Ship ID copied");
    expect(toast).toHaveClass("bottom-4", "right-4");
  });

  it("copies evidence subject from the card without toggling selection off", async () => {
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWrite
      }
    });

    renderDetailPage("EX-002");
    const evidenceCard = screen.getAllByTestId(/evidence-card-/)[0];
    fireEvent.click(evidenceCard);
    expect(screen.getByTestId("supporting-message-header")).toHaveTextContent("Quote Offered by Carrier");

    const subjectCopyButton = within(evidenceCard).getByTestId(/copy-evidence-subject-/);
    fireEvent.click(subjectCopyButton);

    expect(clipboardWrite).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("supporting-message-header")).toHaveTextContent("Quote Offered by Carrier");
  });

  it("falls back to execCommand copy when clipboard API is blocked", async () => {
    const clipboardWrite = vi.fn().mockRejectedValue(new Error("clipboard blocked"));
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWrite
      }
    });
    const originalExecCommand = Object.getOwnPropertyDescriptor(document, "execCommand");
    const execCommandMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: execCommandMock
    });

    try {
      renderDetailPage("EX-006");
      fireEvent.click(screen.getByTestId("copy-ship-id"));

      const toast = await screen.findByTestId("inline-copy-toast");
      expect(clipboardWrite).toHaveBeenCalledTimes(1);
      expect(execCommandMock).toHaveBeenCalledWith("copy");
      expect(toast).toHaveTextContent("Ship ID copied");
    } finally {
      if (originalExecCommand) {
        Object.defineProperty(document, "execCommand", originalExecCommand);
      } else {
        Object.defineProperty(document, "execCommand", {
          configurable: true,
          value: undefined,
          writable: true
        });
      }
    }
  });
});
