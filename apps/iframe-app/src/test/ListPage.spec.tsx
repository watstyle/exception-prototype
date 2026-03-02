import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ListPage, formatVarianceMeta } from "../components/ListPage";
import { mockExceptions } from "../mockData";

describe("ListPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders compact triage headers", () => {
    render(<ListPage />);

    expect(screen.getByRole("columnheader", { name: "Exception" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Variance/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Age/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Review Status" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Fix Status" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Order" })).toBeInTheDocument();
  });

  it("shows arrow-only variance with compact order value and hover details", () => {
    render(<ListPage />);
    const varianceCells = Array.from(document.querySelectorAll("td[data-testid^='variance-cell-']"));
    const overbilledCell = varianceCells.find((cell) => /Overbilling/.test(cell.getAttribute("title") ?? ""));
    const underbilledCell = varianceCells.find((cell) => /Underbilling/.test(cell.getAttribute("title") ?? ""));

    expect(overbilledCell).toBeDefined();
    expect(underbilledCell).toBeDefined();

    expect(overbilledCell?.className).toContain("text-rose-700");
    expect(underbilledCell?.className).toContain("text-amber-700");
    expect(overbilledCell?.textContent).not.toContain("Overbilled");
    expect(underbilledCell?.textContent).not.toContain("Underbilled");
    expect(overbilledCell?.textContent).toMatch(/\$[0-9]/);
    expect(overbilledCell?.textContent).not.toMatch(/[+-]\$/);
    expect(underbilledCell?.textContent).not.toMatch(/[+-]\$/);
    expect(overbilledCell?.getAttribute("title")).toBe("Overbilling");
    expect(underbilledCell?.getAttribute("title")).toBe("Underbilling");
    expect(overbilledCell?.querySelector("svg")).not.toBeNull();
    expect(underbilledCell?.querySelector("svg")?.className.baseVal).toContain("rotate-180");

    const row = overbilledCell?.closest("tr");
    const rowId = row?.getAttribute("data-row-id");
    const rowData = mockExceptions.find((exception) => exception.id === rowId);

    expect(rowData).toBeDefined();
    expect(rowId).toBeTruthy();

    const orderTrigger = row?.querySelector(`span[data-testid='order-trigger-${rowId}']`);
    const orderTooltip = row?.querySelector(`div[data-testid='order-tooltip-${rowId}']`);
    const [origin = "", destination = ""] = (rowData?.lane ?? "").split("-->").map((part) => part.trim());
    expect(orderTrigger).not.toBeNull();
    expect(orderTrigger?.textContent).toBe(rowData?.orderNumber);
    expect(orderTooltip).not.toBeNull();
    expect(orderTooltip?.textContent).toContain("Account Name");
    expect(orderTooltip?.textContent).toContain("Bill-to-code");
    expect(orderTooltip?.textContent).toContain("Origin");
    expect(orderTooltip?.textContent).toContain("Destination");
    expect(orderTooltip?.textContent).toContain(rowData?.account ?? "");
    expect(orderTooltip?.textContent).toContain(rowData?.billToCode ?? "");
    expect(orderTooltip?.textContent).toContain(origin);
    expect(orderTooltip?.textContent).toContain(destination);
    expect(row?.querySelector(`div[data-testid='order-card-${rowId}']`)).toBeNull();
  });

  it("maps variance signs to over/under billing metadata", () => {
    expect(formatVarianceMeta(1200)).toMatchObject({
      direction: "overbilled",
      arrow: "↑",
      amountText: "$12.00",
      tooltipText: "Overbilling",
      className: "text-rose-700"
    });

    expect(formatVarianceMeta(-1200)).toMatchObject({
      direction: "underbilled",
      arrow: "↓",
      amountText: "$12.00",
      tooltipText: "Underbilling",
      className: "text-amber-700"
    });

    expect(formatVarianceMeta(0)).toMatchObject({
      direction: "underbilled",
      arrow: "↓",
      tooltipText: "Underbilling"
    });
  });

  it("opens detail when a row is clicked", () => {
    const parentPostMessage = vi.fn();
    vi.spyOn(window, "parent", "get").mockReturnValue({
      postMessage: parentPostMessage
    } as unknown as Window);

    render(<ListPage />);
    const firstDataRow = screen.getAllByRole("row")[1];
    const clickedId = firstDataRow.getAttribute("data-row-id") ?? "";

    fireEvent.click(firstDataRow);

    expect(parentPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "GT_OPEN_DETAIL",
        payload: { itemId: clickedId }
      }),
      "*"
    );
  });

  it("filters with one-click status chips and reset to To Do", () => {
    render(<ListPage />);
    fireEvent.click(screen.getByTestId("filter-menu-toggle"));

    fireEvent.click(screen.getByTestId("status-filter-fixed"));
    expect(screen.queryByTestId("filter-menu")).not.toBeInTheDocument();

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(within(row).getByText("Validated")).toBeInTheDocument();
      expect(within(row).getByText("Confirmed")).toBeInTheDocument();
      expect(within(row).queryByText("Rejected")).not.toBeInTheDocument();
    }

    fireEvent.click(screen.getByTestId("filter-menu-toggle"));
    fireEvent.click(screen.getByTestId("reset-to-todo"));
    expect(screen.queryByTestId("filter-menu")).not.toBeInTheDocument();

    const todoRows = screen.getAllByRole("row").slice(1);
    expect(todoRows.length).toBeGreaterThan(0);
    for (const row of todoRows) {
      expect(within(row).queryAllByText("Pending").length).toBeGreaterThan(0);
      expect(within(row).queryByText("Confirmed")).not.toBeInTheDocument();
      expect(within(row).queryByText("Rejected")).not.toBeInTheDocument();
    }
  });

  it("closes filter menu on row click and opens detail in the same click", () => {
    const parentPostMessage = vi.fn();
    vi.spyOn(window, "parent", "get").mockReturnValue({
      postMessage: parentPostMessage
    } as unknown as Window);

    render(<ListPage />);

    fireEvent.click(screen.getByTestId("filter-menu-toggle"));
    expect(screen.getByTestId("filter-menu")).toBeInTheDocument();

    const firstDataRow = screen.getAllByRole("row")[1];
    fireEvent.click(firstDataRow);

    expect(screen.queryByTestId("filter-menu")).not.toBeInTheDocument();
    expect(parentPostMessage).toHaveBeenCalledTimes(1);
  });

  it("sorts by amount and age from column headers", () => {
    render(<ListPage />);
    const rowMap = new Map(mockExceptions.map((row) => [row.id, row]));

    function visibleRowIds(): string[] {
      return screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.getAttribute("data-row-id"))
        .filter((id): id is string => Boolean(id));
    }

    const amountSortButton = screen.getByTestId("sort-amount");
    fireEvent.click(amountSortButton);

    const amountDescIds = visibleRowIds();
    for (let index = 1; index < amountDescIds.length; index += 1) {
      const previous = Math.abs(rowMap.get(amountDescIds[index - 1])?.amountCents ?? 0);
      const current = Math.abs(rowMap.get(amountDescIds[index])?.amountCents ?? 0);
      expect(previous).toBeGreaterThanOrEqual(current);
    }

    fireEvent.click(amountSortButton);
    const amountAscIds = visibleRowIds();
    for (let index = 1; index < amountAscIds.length; index += 1) {
      const previous = Math.abs(rowMap.get(amountAscIds[index - 1])?.amountCents ?? 0);
      const current = Math.abs(rowMap.get(amountAscIds[index])?.amountCents ?? 0);
      expect(previous).toBeLessThanOrEqual(current);
    }

    const ageSortButton = screen.getByTestId("sort-age");
    fireEvent.click(ageSortButton);

    const ageDescIds = visibleRowIds();
    for (let index = 1; index < ageDescIds.length; index += 1) {
      const previous = new Date(rowMap.get(ageDescIds[index - 1])?.openedAt ?? "").getTime();
      const current = new Date(rowMap.get(ageDescIds[index])?.openedAt ?? "").getTime();
      expect(previous).toBeLessThanOrEqual(current);
    }

    fireEvent.click(ageSortButton);
    const ageAscIds = visibleRowIds();
    for (let index = 1; index < ageAscIds.length; index += 1) {
      const previous = new Date(rowMap.get(ageAscIds[index - 1])?.openedAt ?? "").getTime();
      const current = new Date(rowMap.get(ageAscIds[index])?.openedAt ?? "").getTime();
      expect(previous).toBeGreaterThanOrEqual(current);
    }
  });
});
