// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the supplied title and description", () => {
    render(<EmptyState icon={<span>!</span>} title="Nothing here" description="Create the first record." />);
    expect(screen.getByRole("heading", { name: "Nothing here" })).toBeInTheDocument();
    expect(screen.getByText("Create the first record.")).toBeInTheDocument();
  });

  it("renders an optional action", () => {
    render(<EmptyState icon={<span>!</span>} title="Empty" description="No records." action={<button>Add record</button>} />);
    expect(screen.getByRole("button", { name: "Add record" })).toBeInTheDocument();
  });
});
