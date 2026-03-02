import { describe, expect, it } from "vitest";
import {
  GT_OPEN_DETAIL,
  GT_SET_CONTEXT,
  GROUNDTRUTH_CATEGORY,
  createOpenDetailMessage,
  createSetContextMessage,
  parseGroundtruthMessage
} from "../dist/index.js";

describe("contracts", () => {
  it("parses a valid set context message", () => {
    const message = createSetContextMessage();
    const parsed = parseGroundtruthMessage(message);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe(GT_SET_CONTEXT);
    if (parsed?.type === GT_SET_CONTEXT) {
      expect(parsed.payload.category).toBe(GROUNDTRUTH_CATEGORY);
    }
  });

  it("rejects malformed messages", () => {
    const parsed = parseGroundtruthMessage({ type: GT_OPEN_DETAIL, payload: { itemId: "" } });
    expect(parsed).toBeNull();
  });

  it("creates open detail messages", () => {
    const message = createOpenDetailMessage("EX-101");
    expect(message).toEqual({
      type: GT_OPEN_DETAIL,
      payload: { itemId: "EX-101" }
    });
  });
});
