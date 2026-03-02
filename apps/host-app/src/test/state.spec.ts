import { describe, expect, it } from "vitest";
import { hostReducer, initialHostState } from "../state";

describe("hostReducer", () => {
  it("resets detail iframe when selecting another category", () => {
    const base = { selectedCategory: "Groundtruth Exceptions", detailItemId: "EX-12" };
    const next = hostReducer(base, { type: "SELECT_CATEGORY", category: "Accessory Rules" });

    expect(next.selectedCategory).toBe("Accessory Rules");
    expect(next.detailItemId).toBeNull();
  });

  it("opens detail from iframe event", () => {
    const next = hostReducer(initialHostState(), { type: "OPEN_DETAIL", itemId: "EX-99" });
    expect(next.detailItemId).toBe("EX-99");
  });

  it("closes detail on explicit close", () => {
    const openState = hostReducer(initialHostState(), { type: "OPEN_DETAIL", itemId: "EX-99" });
    const closed = hostReducer(openState, { type: "CLOSE_DETAIL" });

    expect(closed.detailItemId).toBeNull();
  });
});
