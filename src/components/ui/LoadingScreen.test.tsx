// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LoadingScreen } from "./LoadingScreen";

afterEach(() => {
  cleanup();
});

describe("LoadingScreen", () => {
  it("exposes an accessible live status region", () => {
    render(<LoadingScreen />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent("Opening your vault");
  });

  it("uses a caller-provided status label", () => {
    render(<LoadingScreen label="Loading versions" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading versions");
  });
});
