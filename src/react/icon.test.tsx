import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { InkProvider } from "./InkProvider.js";
import { InkIcon, renderIconSlot } from "./icon.js";
import { InkButton } from "./controls.js";
import { InkChip } from "./primitives.js";
import { configureInk, registerIcons, resetIcons, resetWarnings } from "../core/index.js";
import { controlIconSize, iconStrokeWidth } from "../tokens/control.js";

afterEach(cleanup);
beforeEach(() => {
  resetIcons();
  resetWarnings();
  configureInk({ dev: true });
});

const wrap = (ui: React.ReactNode) => render(<InkProvider>{ui}</InkProvider>);

describe("drawing a named icon", () => {
  it("draws the house glyph at the size asked for", () => {
    const { container } = wrap(<InkIcon name="search" size={24} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("24");
    expect(svg.getAttribute("viewBox")).toBe("0 0 24 24");
    // Two elements, because lucide's search is a circle and the handle.
    expect(svg.children).toHaveLength(2);
  });

  it("holds one line weight across every size", () => {
    // The point of the compensation. A 24px drawing rendered at 16px would
    // otherwise carry a 1.33px line beside a 24px icon's 2px line, and a row of
    // controls would read as a row of different font weights.
    for (const size of [16, 20, 24]) {
      const { container } = wrap(<InkIcon name="check" size={size} />);
      const stroke = Number(container.querySelector("svg")!.getAttribute("stroke-width"));
      expect(stroke * (size / 24)).toBeCloseTo(2, 5);
      cleanup();
    }
  });

  it("matches the derivation the control geometry publishes", () => {
    expect(controlIconSize("sm")).toBe(16);
    expect(controlIconSize("md")).toBe(20);
    expect(controlIconSize("lg")).toBe(24);
    // `lg` lands on lucide's own grid, where the artwork is untouched.
    expect(iconStrokeWidth(controlIconSize("lg"))).toBe(2);
  });

  it("takes its colour from the text around it rather than a prop", () => {
    const { container } = wrap(<InkIcon name="check" />);
    const stroke = container.querySelector("svg")!.getAttribute("stroke")!;
    // Read together: the tone of a container if there is one, the surrounding
    // text if there is not. Neither requires the caller to name a colour.
    expect(stroke).toBe("var(--ink-tone-fg, currentColor)");
  });
});

describe("what a screen reader hears", () => {
  it("says nothing by default, because an icon beside a word is that word", () => {
    const { container } = wrap(<InkIcon name="search" />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    // Hidden and unfocusable: `aria-hidden` alone still leaves the node in the
    // tab order in some engines.
    expect(svg.getAttribute("focusable")).toBe("false");
    expect(svg.getAttribute("role")).toBeNull();
  });

  it("speaks only when the caller gives it something to say", () => {
    wrap(<InkIcon name="search" label="Search" />);
    const svg = screen.getByRole("img", { name: "Search" });
    expect(svg.getAttribute("aria-hidden")).toBeNull();
  });
});

describe("a name that does not resolve", () => {
  it("reserves the space, so fixing the spelling does not reflow the row", () => {
    const { container } = wrap(<InkIcon name="not-a-real-icon" size={20} />);
    const gap = container.querySelector("[data-ink-icon-missing]") as HTMLElement;
    expect(gap.style.width).toBe("20px");
    expect(gap.style.height).toBe("20px");
  });

  it("never renders the name as text", () => {
    // The tempting fallback, and the one that ships the raw word "search" into
    // production UI where it reads as finished work.
    const { container } = wrap(<InkIcon name="not-a-real-icon" />);
    expect(container.textContent).toBe("");
  });

  it("says what to do, once, rather than on every row", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    wrap(
      <>
        <InkIcon name="bell" />
        <InkIcon name="bell" />
        <InkIcon name="bell" />
      </>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0][0] as string;
    expect(message).toContain("registerIcons");
    // The message carries a snippet, not a diagnosis.
    expect(message).toContain("lucide-react");
    // `warnOnce` owns the prefix; repeating it here prints "ink: ink: ...".
    expect(message.startsWith("ink: ink:")).toBe(false);
    warn.mockRestore();
  });
});

describe("registering after something has already mounted", () => {
  it("repaints icons that were showing a gap", () => {
    // The case the subscription exists for: a set that arrives from a lazy
    // chunk or a route entry. Without it these stay blank until something
    // unrelated re-renders, and the bug reads as "registration is broken".
    const { container } = wrap(<InkIcon name="bell" />);
    expect(container.querySelector("svg")).toBeNull();

    act(() => {
      registerIcons({ bell: [["path", { d: "M6 8a6 6 0 0 1 12 0" }]] });
    });

    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("[data-ink-icon-missing]")).toBeNull();
  });
});

describe("a registered component", () => {
  it("gets the three props both lucide packages honour, and no others", () => {
    const seen: Record<string, unknown>[] = [];
    const Bell = (props: Record<string, unknown>) => {
      seen.push(props);
      return <svg data-testid="bell" />;
    };
    registerIcons({ Bell });
    wrap(<InkIcon name="bell" size={24} />);
    expect(seen[0]).toMatchObject({ size: 24, strokeWidth: 2 });
    // Forwarding more would work on web and diverge silently on device.
    expect(seen[0]).not.toHaveProperty("absoluteStrokeWidth");
  });
});

describe("the slot every component renders through", () => {
  it("turns a string into an icon and passes an element straight through", () => {
    expect(renderIconSlot(null)).toBeNull();
    expect(renderIconSlot(undefined)).toBeNull();
    expect(renderIconSlot(false)).toBeNull();
    const { container } = wrap(<>{renderIconSlot("search")}</>);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("does not hold a hook, because icons render inside .map()", () => {
    // `navigation.tsx` renders `{item.icon}` inside a list whose length is
    // derived from a ResizeObserver. A hook here would change hook count
    // between renders and crash on the first resize.
    const source = renderIconSlot.toString();
    expect(source).not.toMatch(/\buse[A-Z]/);
  });
});

describe("components take a name where they took an element", () => {
  it("renders a named icon inside a button", () => {
    const { container } = wrap(<InkButton icon="search">Find</InkButton>);
    expect(container.querySelector("button svg")).not.toBeNull();
    expect(screen.getByRole("button").textContent).toContain("Find");
  });

  it("still accepts an element, so no existing call site breaks", () => {
    const { container } = wrap(
      <InkButton icon={<svg data-testid="hand-rolled" />}>Find</InkButton>,
    );
    expect(container.querySelector('[data-testid="hand-rolled"]')).not.toBeNull();
  });

  it("sizes an icon to the control it sits in", () => {
    // A chip is small, so its icon is the `sm` size rather than the default.
    const { container } = wrap(<InkChip icon="check">Done</InkChip>);
    expect(container.querySelector("svg")!.getAttribute("width")).toBe(String(controlIconSize("sm")));
  });
});
