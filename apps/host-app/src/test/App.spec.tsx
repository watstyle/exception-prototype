import { createCloseDetailMessage, createOpenDetailMessage } from "@groundtruth/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../App";

describe("App", () => {
  it("shows native host content for non-groundtruth categories", () => {
    render(<App />);
    expect(screen.getByTestId("host-native-pane")).toBeInTheDocument();
    expect(screen.queryByTestId("groundtruth-pane")).not.toBeInTheDocument();
  });

  it("shows the groundtruth iframe pane on category click", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("category-groundtruth-exceptions"));

    expect(screen.getByTestId("groundtruth-pane")).toBeInTheDocument();
    expect(screen.getByTitle("Groundtruth List Iframe")).toBeInTheDocument();
  });

  it("opens and closes detail overlay from iframe messages", async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("category-groundtruth-exceptions"));

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:5174",
        data: createOpenDetailMessage("EX-501")
      })
    );

    expect(await screen.findByTestId("detail-overlay")).toBeInTheDocument();
    expect(screen.getByTitle("Groundtruth Detail Iframe")).toHaveAttribute(
      "src",
      "http://localhost:5174/detail/EX-501"
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:5174",
        data: createCloseDetailMessage("EX-501")
      })
    );

    await waitFor(() => {
      expect(screen.queryByTestId("detail-overlay")).not.toBeInTheDocument();
    });
  });

  it("ignores messages from unknown origins", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("category-groundtruth-exceptions"));

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://localhost:4000",
        data: createOpenDetailMessage("EX-999")
      })
    );

    expect(screen.queryByTestId("detail-overlay")).not.toBeInTheDocument();
  });
});
