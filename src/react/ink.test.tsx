import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InkBudget } from "../shared/budget.js";
import { configureInk, resetWarnings } from "../core/env.js";
import { InkProvider } from "./InkProvider.js";
import { InkBadge, InkMeter, InkNotice, InkTitle } from "./primitives.js";
import { InkCard, InkGroup, InkRow } from "./surfaces.js";
import { InkButton, InkChoice, InkSegmented, InkSwitch } from "./controls.js";

afterEach(() => {
  cleanup();
  resetWarnings();
  configureInk({});
});

describe("the provider", () => {
  it("writes the tokens the existing stylesheets already read", () => {
    const { container } = render(
      <InkProvider>
        <span>ready</span>
      </InkProvider>,
    );
    const scope = container.firstElementChild as HTMLElement;
    expect(scope.style.getPropertyValue("--color-accent")).toBe("#7C3AED");
    expect(scope.style.getPropertyValue("--shadow-ink")).toBe("4px 4px 0 #5D23C2");
    expect(scope.dataset.theme).toBe("light");
  });

  it("writes nothing at all in context mode", () => {
    // For a host that already applied the tokens itself. Two writers of the
    // same custom properties is how they drift.
    const { container } = render(
      <InkProvider mode="context">
        <span>ready</span>
      </InkProvider>,
    );
    expect(container.querySelector(".ink")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--color-accent")).toBe("");
  });

  it("renders without one, rather than crashing a host that forgot", () => {
    // A component library that takes an application down to enforce its own
    // setup step has chosen the wrong failure.
    render(<InkBadge>32 MB</InkBadge>);
    expect(screen.getByText("32 MB")).toBeTruthy();
  });
});

/**
 * The rule, as something that can fail.
 *
 * "Spend the offset about twice per screen." Every individual violation is
 * reasonable; the erosion only shows up once as a screen where everything is
 * shouting, which is too late to be feedback.
 */
describe("the edge budget", () => {
  beforeEach(() => configureInk({ dev: true }));

  it("says so when a screen raises more surfaces than it allowed itself", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <InkBudget max={2} label="Settings">
        <InkCard>one</InkCard>
        <InkCard>two</InkCard>
        <InkCard>three</InkCard>
      </InkBudget>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("Settings");
    expect(warn.mock.calls[0][0]).toContain("budget of 2");
    warn.mockRestore();
  });

  it("stays quiet at the budget", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <InkBudget max={2}>
        <InkCard>one</InkCard>
        <InkCard>two</InkCard>
      </InkBudget>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not count a flat card, which is the point of having one", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <InkBudget max={1}>
        <InkCard>chosen</InkCard>
        <InkCard raised={false}>quiet</InkCard>
        <InkCard raised={false}>quiet</InkCard>
      </InkBudget>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("charges a row of choices for the one that is selected, not for all of them", () => {
    // Twelve voices spend one edge. This is the whole reason state is elevation
    // rather than a colour: the treatment stays rare no matter how long the row.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <InkBudget max={1}>
        <InkSegmented
          label="Voice"
          value="bella"
          onChange={() => {}}
          options={Array.from({ length: 12 }, (_, i) => ({
            value: i === 3 ? "bella" : `v${i}`,
            label: `Voice ${i}`,
          }))}
        />
      </InkBudget>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("costs nothing outside development", () => {
    configureInk({ dev: false });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <InkBudget max={1}>
        <InkCard>one</InkCard>
        <InkCard>two</InkCard>
        <InkCard>three</InkCard>
      </InkBudget>,
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("choice", () => {
  it("says which one is chosen without spending a colour on it", () => {
    render(
      <InkChoice selected onSelect={() => {}}>
        Bella
      </InkChoice>,
    );
    const button = screen.getByRole("button", { name: /Bella/ });
    expect(button.getAttribute("aria-pressed")).toBe("true");
    // Elevation is the signal; there is no selected-colour class to find.
    expect(button.className).not.toMatch(/selected|active|current/);
  });

  it("reaches the touch floor without growing sideways", () => {
    render(
      <InkChoice selected={false} shape="pill">
        American
      </InkChoice>,
    );
    expect(screen.getByRole("button").className).toContain("ink-reach");
  });

  it("does not reach when it is already tall enough", () => {
    render(
      <InkChoice selected={false} shape="tile">
        Bella
      </InkChoice>,
    );
    expect(screen.getByRole("button").className).not.toContain("ink-reach");
  });
});

describe("segmented", () => {
  function setup(onChange = vi.fn()) {
    render(
      <InkSegmented
        label="Quality"
        value="q8"
        onChange={onChange}
        options={[
          { value: "q4", label: "Smallest", meta: "92 MB" },
          { value: "q8", label: "Balanced", meta: "154 MB" },
          { value: "fp32", label: "Best", meta: "326 MB" },
        ]}
      />,
    );
    return onChange;
  }

  it("is one tab stop, not one per option", () => {
    setup();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
  });

  it("moves with the arrow keys, wrapping at both ends", () => {
    const onChange = setup();
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("fp32");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("q4");
    fireEvent.keyDown(group, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("q4");
    fireEvent.keyDown(group, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("fp32");
  });

  it("skips an option that cannot be chosen", () => {
    const onChange = vi.fn();
    render(
      <InkSegmented
        label="Quality"
        value="q4"
        onChange={onChange}
        options={[
          { value: "q4", label: "Smallest" },
          { value: "q8", label: "Balanced", disabled: true },
          { value: "fp32", label: "Best" },
        ]}
      />,
    );
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("fp32");
  });

  it("leaves keys it does not own alone", () => {
    const onChange = setup();
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "Tab" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("names the group, so a screen reader says what is being chosen", () => {
    setup();
    expect(screen.getByRole("radiogroup").getAttribute("aria-label")).toBe("Quality");
  });
});

describe("the readouts say what they know", () => {
  it("reports a percentage when there is one", () => {
    render(<InkMeter value={0.42} label="Downloading" />);
    const bar = screen.getByRole("progressbar", { name: "Downloading" });
    expect(bar.getAttribute("aria-valuenow")).toBe("42");
  });

  it("claims nothing before a total is known", () => {
    // Before the server has reported a size there is no honest percentage, so
    // the bar paces rather than inventing one.
    render(<InkMeter label="Downloading" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBeNull();
    expect(bar.querySelector("[data-indeterminate]")).not.toBeNull();
  });

  it("announces a failure and waits with everything else", () => {
    const { rerender } = render(<InkNotice tone="danger">The export could not finish</InkNotice>);
    expect(screen.getByRole("alert")).toBeTruthy();
    rerender(<InkNotice tone="success">Export finished</InkNotice>);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});

describe("switch", () => {
  it("reports its own state and flips on press", () => {
    const onChange = vi.fn();
    render(<InkSwitch checked={false} onChange={onChange} label="Wake word" />);
    const control = screen.getByRole("switch", { name: "Wake word" });
    expect(control.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(control);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("the surfaces", () => {
  it("makes a pressable card a real button, not a div with a handler", () => {
    const onPress = vi.fn();
    render(
      <InkCard pressable onPress={onPress}>
        Yesterday, 14 turns
      </InkCard>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Yesterday/ }));
    expect(onPress).toHaveBeenCalled();
  });

  it("gives a group one heading and one edge, however many rows it holds", () => {
    render(
      <InkGroup title="Speaking">
        <InkRow label="Voice" description="Who the assistant sounds like">
          <InkButton>Change</InkButton>
        </InkRow>
        <InkRow label="Pace" description="How fast it talks" />
      </InkGroup>,
    );
    expect(screen.getAllByRole("heading")).toHaveLength(1);
    expect(screen.getByText("Who the assistant sounds like")).toBeTruthy();
  });

  it("sets a screen title as a heading, italic and all", () => {
    render(<InkTitle>Settings</InkTitle>);
    const heading = screen.getByRole("heading", { name: "Settings", level: 1 });
    expect(heading.className).toContain("ink-title--1");
  });
});

describe("the API refuses to hand out a colour", () => {
  /**
   * "Never invent meaning the data lacks." The moment a chip takes a hex,
   * someone colour-codes a list of voices, and an interface that colours things
   * arbitrarily teaches people to read patterns that are not there.
   */
  it("has no colour prop anywhere in the component surface", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));

    const offenders: string[] = [];
    for (const dir of [here, join(here, "..", "native")]) {
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".tsx") || file.includes(".test.")) continue;
        const source = readFileSync(join(dir, file), "utf8");
        // A prop named `color` or `colour` on an exported interface.
        for (const match of source.matchAll(/^\s{2}colou?r\??:\s/gm)) {
          offenders.push(`${file}: ${match[0].trim()}`);
        }
      }
    }
    expect(offenders, `Tone names the meaning; a hex does not:\n${offenders.join("\n")}`).toEqual(
      [],
    );
  });
});
