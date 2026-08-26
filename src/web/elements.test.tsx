import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InkProvider } from "./InkProvider.js";
import { InkBreadcrumb, InkDivider, InkTable, InkTabs } from "./layout.js";
import { InkAvatar, InkEmptyState, InkSkeleton, InkSpinner, readingTime } from "./feedback.js";
import { InkCheckbox, InkInput, InkSelect, InkSlider } from "./forms.js";
import { InkDialog } from "./overlays.js";
import { InkNavbar } from "./InkNavbar.js";

afterEach(cleanup);

describe("navbar", () => {
  it("is chrome, so it never wears the edge", () => {
    // The rule it exists to respect. A navbar with a plate would be the loudest
    // treatment in the system spent on the part of the screen that is not the
    // point of the screen.
    const { container } = render(<InkNavbar title="Settings" />);
    const bar = container.querySelector("header")!;
    expect(bar.className).toContain("ink-glass");
    expect(bar.className).not.toContain("ink-edge");
  });

  it("fails toward legible when the observer never reports", () => {
    // The bar starts with the material on and the observer turns it off. Any
    // environment where the observer is stubbed or throttled — this test's, an
    // old engine's — gets a readable bar rather than a transparent one sitting
    // over content that is already scrolling under it.
    render(<InkNavbar title="Settings" />);
    expect(screen.getByRole("banner").dataset.scrolled).toBe("true");
  });

  it("lets the caller drive the scrolled state, which is how native does it", () => {
    const { rerender } = render(<InkNavbar title="Settings" scrolled={false} />);
    expect(screen.getByRole("banner").dataset.scrolled).toBe("false");
    rerender(<InkNavbar title="Settings" scrolled />);
    expect(screen.getByRole("banner").dataset.scrolled).toBe("true");
  });

  it("names the screen as a heading", () => {
    render(<InkNavbar title="Conversations" />);
    expect(screen.getByRole("heading", { name: "Conversations" })).toBeTruthy();
  });
});

describe("glass", () => {
  it("is written as a derived tint the stylesheet can read", () => {
    const { container } = render(
      <InkProvider>
        <span />
      </InkProvider>,
    );
    const scope = container.firstElementChild as HTMLElement;
    const bg = scope.style.getPropertyValue("--ink-glass-bg");
    expect(bg).toMatch(/^rgba\(/);
    // Not a round number somebody liked the look of.
    const alpha = Number(bg.match(/,\s*([\d.]+)\)$/)![1]);
    expect(alpha).toBeGreaterThan(0.4);
    expect(alpha).toBeLessThan(0.6);
  });
});

describe("tabs", () => {
  it("is one tab stop with arrow keys, not one stop per tab", () => {
    const onChange = vi.fn();
    render(
      <InkTabs
        label="View"
        value="all"
        onChange={onChange}
        tabs={[
          { value: "all", label: "All" },
          { value: "mine", label: "Mine" },
          { value: "shared", label: "Shared" },
        ]}
      />,
    );
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("mine");
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("shared");
  });
});

describe("breadcrumb", () => {
  it("drops the middle, because the ends are the parts that mean anything", () => {
    render(
      <InkBreadcrumb
        max={4}
        items={[
          { label: "Pond" },
          { label: "Settings" },
          { label: "Voice" },
          { label: "Quality" },
          { label: "Balanced" },
        ]}
      />,
    );
    expect(screen.getByText("Pond")).toBeTruthy();
    expect(screen.getByText("Balanced")).toBeTruthy();
    expect(screen.getByLabelText("Skipped levels")).toBeTruthy();
    expect(screen.queryByText("Settings")).toBeNull();
  });

  it("marks the last crumb as the current page", () => {
    render(<InkBreadcrumb items={[{ label: "Pond" }, { label: "Voice" }]} />);
    expect(screen.getByText("Voice").getAttribute("aria-current")).toBe("page");
  });
});

describe("table", () => {
  it("marks numeric columns so a reader can compare down them", () => {
    const { container } = render(
      <InkTable
        caption="Voices"
        rowKey={(r: { id: string }) => r.id}
        rows={[{ id: "bella", size: "154 MB" }]}
        columns={[
          { key: "id", header: "Voice", render: (r) => r.id },
          { key: "size", header: "Size", numeric: true, render: (r) => r.size },
        ]}
      />,
    );
    expect(container.querySelectorAll("[data-numeric]").length).toBe(2);
  });

  it("shows the empty state instead of a header with nothing under it", () => {
    render(
      <InkTable
        caption="Voices"
        rowKey={(r: { id: string }) => r.id}
        rows={[]}
        empty={<InkEmptyState title="No voices yet" />}
        columns={[{ key: "id", header: "Voice", render: (r) => r.id }]}
      />,
    );
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("No voices yet")).toBeTruthy();
  });
});

describe("the waiting states", () => {
  it("will not let a spinner exist without saying what it waits for", () => {
    render(<InkSpinner label="Loading voices" />);
    expect(screen.getByRole("status", { name: "Loading voices" })).toBeTruthy();
  });

  it("hides skeletons from a screen reader, which has nothing to read", () => {
    const { container } = render(<InkSkeleton width={120} />);
    expect(container.firstElementChild!.getAttribute("aria-hidden")).toBe("true");
  });

  it("scales a toast's life to how long its message takes to read", () => {
    // Four seconds is generous for "Saved" and nowhere near enough for a
    // sentence explaining what failed.
    expect(readingTime("Saved")).toBeLessThan(readingTime(
      "Kokoro could not start because q8f16 returns silence on this board, so the pond is running q4f16 instead.",
    ));
    expect(readingTime("Saved")).toBeGreaterThanOrEqual(3000);
  });
});

describe("avatar", () => {
  it("reads the name aloud rather than spelling the initials", () => {
    render(<InkAvatar name="Jerry Ochieng" />);
    const avatar = screen.getByRole("img", { name: "Jerry Ochieng" });
    expect(avatar.textContent).toBe("JO");
    expect(avatar.querySelector("[aria-hidden='true']")).not.toBeNull();
  });
});

describe("the form controls", () => {
  it("says why a value will not do, and announces it", () => {
    render(
      <InkInput value="nairobi" onChange={() => {}} label="Place" invalid="Pick a place from the list" />,
    );
    const field = screen.getByLabelText("Place");
    expect(field.getAttribute("aria-invalid")).toBe("true");
    const error = screen.getByRole("alert");
    expect(field.getAttribute("aria-describedby")).toBe(error.id);
  });

  it("gives a checkbox the third state a switch cannot have", () => {
    render(<InkCheckbox checked={false} indeterminate onChange={() => {}} label="All rooms" />);
    expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe("mixed");
  });

  it("uses the platform's own picker rather than a hand-rolled listbox", () => {
    const onChange = vi.fn();
    render(
      <InkSelect
        label="Quality"
        value="q8"
        onChange={onChange}
        options={[
          { value: "q4", label: "Smallest" },
          { value: "q8", label: "Balanced" },
        ]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Quality"), { target: { value: "q4" } });
    expect(onChange).toHaveBeenCalledWith("q4");
  });

  it("gives a slider a spoken value, not just a number", () => {
    render(
      <InkSlider
        label="Pace"
        value={120}
        min={50}
        max={200}
        onChange={() => {}}
        format={(v) => `${v} per cent`}
      />,
    );
    expect(screen.getByLabelText("Pace").getAttribute("aria-valuetext")).toBe("120 per cent");
  });
});

describe("dialog", () => {
  it("is the platform element, so the focus trap is not hand-rolled", () => {
    const { container } = render(
      <InkDialog open onClose={() => {}} title="Delete this conversation?" />,
    );
    expect(container.querySelector("dialog")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Delete this conversation?" })).toBeTruthy();
  });
});

describe("divider", () => {
  it("puts a label in the rule rather than beside it", () => {
    const { container } = render(<InkDivider label="Earlier" />);
    expect(container.querySelectorAll(".ink-divider__rule").length).toBe(2);
    expect(screen.getByText("Earlier")).toBeTruthy();
  });
});
