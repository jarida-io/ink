import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { InkBottomBar, InkSidebar } from "./navigation.js";
import { InkNavbar } from "./InkNavbar.js";
import { InkCalendar, InkDatePicker, InkTimePicker } from "./pickers.js";
import { InkBubbleGroup, InkTyping } from "./chat.js";
import { InkForm, InkFormField, InkMenu, InkRadioGroup, InkRangeSlider } from "./forms.js";
import { InkProgress, InkDots } from "./feedback.js";
import type { CivilDate } from "../headless/calendar.js";

afterEach(cleanup);

const d = (year: number, month: number, day: number): CivilDate => ({ year, month, day });

describe("bottom bar", () => {
  const items = Array.from({ length: 7 }, (_, i) => ({ key: `k${i}`, label: `Item ${i}` }));

  it("caps at five and puts the rest behind More", () => {
    render(<InkBottomBar label="Main" items={items} value="k0" onChange={() => {}} />);
    // Four destinations plus More.
    expect(screen.getAllByRole("button")).toHaveLength(5);
    expect(screen.getByText("More")).toBeTruthy();
  });

  it("says the current destination is inside the overflow", () => {
    // Otherwise nothing appears selected anywhere and the reader is lost.
    const onMore = vi.fn();
    render(<InkBottomBar label="Main" items={items} value="k6" onChange={() => {}} onMore={onMore} />);
    const more = screen.getByText("More").closest("button")!;
    expect(more.getAttribute("aria-current")).toBe("page");
    fireEvent.click(more);
    expect(onMore).toHaveBeenCalled();
  });

  it("marks the current destination with a shape, not only a colour", () => {
    const { container } = render(
      <InkBottomBar label="Main" items={items.slice(0, 3)} value="k1" onChange={() => {}} />,
    );
    const current = container.querySelector('[aria-current="page"]')!;
    expect(current.querySelector(".ink-nav__mark")).not.toBeNull();
  });
});

describe("sidebar", () => {
  const sections = [
    { label: "Library", items: [{ key: "all", label: "Everything" }, { key: "new", label: "Recent", badge: 3 }] },
  ];

  it("gives a rail an accessible name for every destination", () => {
    // A rail has no visible label, so without this it is a column of mysteries.
    render(<InkSidebar label="Main" sections={sections} value="all" onChange={() => {}} size="rail" />);
    expect(screen.getByRole("button", { name: "Everything" })).toBeTruthy();
    expect(screen.queryByText("Everything")).toBeNull();
  });

  it("shows a count, and says nothing when there is nothing to say", () => {
    render(<InkSidebar label="Main" sections={sections} value="all" onChange={() => {}} />);
    expect(screen.getByText("3")).toBeTruthy();
    const everything = screen.getByRole("button", { name: /Everything/ });
    expect(within(everything).queryByText(/^\d+$/)).toBeNull();
  });

  it("offers a collapse control only when there is somewhere to collapse to", () => {
    const { rerender } = render(
      <InkSidebar label="Main" sections={sections} value="all" onChange={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: /Collapse|Expand/ })).toBeNull();
    rerender(
      <InkSidebar label="Main" sections={sections} value="all" onChange={() => {}} onToggle={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Collapse navigation" })).toBeTruthy();
  });
});

describe("calendar", () => {
  it("is one tab stop, with the arrows moving inside it", () => {
    // 35 tab stops is a calendar nobody reaches the end of.
    render(<InkCalendar value={d(2024, 5, 15)} onChange={() => {}} />);
    const focusable = screen.getAllByRole("gridcell").filter((c) => c.tabIndex === 0);
    expect(focusable).toHaveLength(1);
  });

  it("moves by day and week, and pages the month when it runs off the end", () => {
    const onChange = vi.fn();
    render(<InkCalendar value={d(2024, 5, 31)} onChange={onChange} />);
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowRight" });
    // 31 May + 1 day is 1 June, so the view has to follow.
    expect(screen.getByText(/June 2024/)).toBeTruthy();
  });

  it("selects on Enter as well as on click", () => {
    const onChange = vi.fn();
    render(<InkCalendar value={d(2024, 5, 15)} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("grid"), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(d(2024, 5, 15));
  });

  it("announces the month when it pages, for a reader who cannot see it change", () => {
    const { container } = render(<InkCalendar value={d(2024, 5, 15)} onChange={() => {}} />);
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toContain("May 2024");
  });

  it("refuses a day outside the bounds", () => {
    render(<InkCalendar value={d(2024, 5, 15)} onChange={() => {}} min={d(2024, 5, 10)} />);
    const ninth = screen.getByRole("gridcell", { name: "Thursday 9 May 2024" });
    expect(ninth).toHaveProperty("disabled", true);
  });

  it("takes two presses to answer a range, and starts over on a third", () => {
    const onRangeChange = vi.fn();
    const { rerender } = render(
      <InkCalendar range={{ start: null, end: null }} onRangeChange={onRangeChange} />,
    );
    fireEvent.click(screen.getByRole("gridcell", { name: "Saturday 10 January 2026" }));
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: d(2026, 1, 10), end: null });

    rerender(<InkCalendar range={{ start: d(2026, 1, 10), end: null }} onRangeChange={onRangeChange} />);
    fireEvent.click(screen.getByRole("gridcell", { name: "Wednesday 14 January 2026" }));
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: d(2026, 1, 10), end: d(2026, 1, 14) });

    rerender(
      <InkCalendar range={{ start: d(2026, 1, 10), end: d(2026, 1, 14) }} onRangeChange={onRangeChange} />,
    );
    fireEvent.click(screen.getByRole("gridcell", { name: "Tuesday 20 January 2026" }));
    expect(onRangeChange).toHaveBeenLastCalledWith({ start: d(2026, 1, 20), end: null });
  });
});

describe("date and time fields", () => {
  it("opens a calendar rather than hoping for a typed format", () => {
    // 03/04 is two different days on two sides of an ocean.
    render(<InkDatePicker label="Starts" value={null} onChange={() => {}} />);
    const field = screen.getByRole("button", { name: "Starts" });
    expect(field.getAttribute("aria-haspopup")).toBe("dialog");
    fireEvent.click(field);
    expect(screen.getByRole("dialog", { name: "Starts" })).toBeTruthy();
  });

  it("closes once the question is answered", () => {
    const onChange = vi.fn();
    render(<InkDatePicker label="Starts" value={null} onChange={onChange} today={d(2026, 1, 5)} />);
    fireEvent.click(screen.getByRole("button", { name: "Starts" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "Wednesday 7 January 2026" }));
    expect(onChange).toHaveBeenCalledWith(d(2026, 1, 7));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers every time on the clock at its step", () => {
    render(<InkTimePicker label="At" value={null} onChange={() => {}} step={30} />);
    // 48 half-hours, plus the empty placeholder.
    expect(screen.getByLabelText("At").querySelectorAll("option")).toHaveLength(49);
  });
});

describe("chat bubbles", () => {
  const messages = [
    { id: "1", author: "Ada", text: "Morning" },
    { id: "2", author: "Ada", text: "Are you free?" },
    { id: "3", mine: true, text: "Yes" },
  ];

  it("gives the tail to the run, not to every message", () => {
    // Four bubbles each with a tail reads as four interruptions.
    const { container } = render(<InkBubbleGroup label="Chat" messages={messages} />);
    const tails = container.querySelectorAll(".ink-bubble__body[data-tail]");
    expect(tails).toHaveLength(2); // Ada's last, and mine
  });

  it("names the sender once per run", () => {
    render(<InkBubbleGroup label="Chat" messages={messages} />);
    expect(screen.getAllByText("Ada")).toHaveLength(1);
  });

  it("says a failure in words, not in a colour", () => {
    render(
      <InkBubbleGroup
        label="Chat"
        messages={[{ id: "1", mine: true, text: "Hi", status: "failed" }]}
      />,
    );
    expect(screen.getByText("Not sent")).toBeTruthy();
  });

  it("keeps the typing indicator away from assistive technology", () => {
    // Announcing it on every keystroke is the most disruptive thing a chat
    // interface can do to a screen-reader user.
    const { container } = render(<InkTyping author="Ada" />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("reads the transcript as a log", () => {
    render(<InkBubbleGroup label="Chat with Ada" messages={messages} />);
    expect(screen.getByRole("log", { name: "Chat with Ada" })).toBeTruthy();
  });
});

describe("radio group", () => {
  const options = [
    { value: "a", label: "Smallest", description: "92 MB" },
    { value: "b", label: "Balanced", description: "154 MB" },
    { value: "c", label: "Best", description: "326 MB", disabled: true },
  ];

  it("carries a description, which is the reason to use one", () => {
    render(<InkRadioGroup label="Quality" value="a" options={options} onChange={() => {}} />);
    expect(screen.getByText("154 MB")).toBeTruthy();
  });

  it("is one tab stop and moves on the vertical arrows", () => {
    const onChange = vi.fn();
    render(<InkRadioGroup label="Quality" value="a" options={options} onChange={onChange} />);
    expect(screen.getAllByRole("radio").filter((r) => r.tabIndex === 0)).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("skips what cannot be chosen", () => {
    const onChange = vi.fn();
    render(<InkRadioGroup label="Quality" value="b" options={options} onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith("a"); // wraps past the disabled one
  });
});

describe("menu", () => {
  const items = [
    { key: "rename", label: "Rename" },
    { key: "delete", label: "Delete", tone: "danger" as const, separated: true },
  ];

  it("wires the trigger without the caller doing it", () => {
    render(
      <InkMenu
        label="Actions"
        items={items}
        trigger={(props) => (
          <button type="button" {...props}>
            Open
          </button>
        )}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu", { name: "Actions" })).toBeTruthy();
  });

  it("closes on Escape and on a press outside", () => {
    render(
      <InkMenu label="Actions" items={items} trigger={(p) => <button type="button" {...p}>Open</button>} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("runs the action and closes", () => {
    const onPress = vi.fn();
    render(
      <InkMenu
        label="Actions"
        items={[{ key: "go", label: "Go", onPress }]}
        trigger={(p) => <button type="button" {...p}>Open</button>}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Go" }));
    expect(onPress).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("range slider", () => {
  it("names both ends separately", () => {
    render(<InkRangeSlider label="Price" value={[20, 80]} onChange={() => {}} />);
    expect(screen.getByLabelText("Price, lower bound")).toBeTruthy();
    expect(screen.getByLabelText("Price, upper bound")).toBeTruthy();
  });

  it("clamps rather than letting the ends cross", () => {
    // A handle that becomes the other handle mid-drag makes the value jump.
    const onChange = vi.fn();
    render(<InkRangeSlider label="Price" value={[20, 80]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Price, lower bound"), { target: { value: "95" } });
    expect(onChange).toHaveBeenCalledWith([80, 80]);
  });
});

describe("form", () => {
  it("summarises the errors and links each to its field", () => {
    render(
      <InkForm
        label="Account"
        errors={[{ field: "name", message: "Add a name" }, { field: "email", message: "Check the email" }]}
      >
        <InkFormField id="name" label="Name">
          <input id="name-control" />
        </InkFormField>
      </InkForm>,
    );
    const summary = screen.getByRole("alert");
    expect(summary.textContent).toContain("2 things need fixing");
    expect(screen.getByRole("link", { name: "Add a name" }).getAttribute("href")).toBe("#name");
  });

  it("counts in words when there is only one", () => {
    render(<InkForm label="Account" errors={[{ field: "n", message: "Add a name" }]}>{null}</InkForm>);
    expect(screen.getByRole("alert").textContent).toContain("One thing needs fixing");
  });

  it("spells out required rather than using an asterisk nobody was taught", () => {
    render(
      <InkFormField id="name" label="Name" required>
        <input id="name-control" />
      </InkFormField>,
    );
    expect(screen.getByText(/\(required\)/)).toBeTruthy();
  });
});

describe("loaders", () => {
  it("reports a percentage when it has one and stays busy when it does not", () => {
    const { rerender } = render(<InkProgress value={0.4} label="Uploading" />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("40");
    rerender(<InkProgress label="Uploading" />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBeNull();
  });

  it("will not let dots exist without saying what they wait for", () => {
    render(<InkDots label="Sending" />);
    expect(screen.getByRole("status", { name: "Sending" })).toBeTruthy();
  });
});

describe("the bar and the sidebar wear the same material as the navbar", () => {
  it("gives the bottom bar the glass, and no material until something is under it", () => {
    const items = [{ key: "a", label: "Home" }, { key: "b", label: "Inbox" }];
    const { rerender } = render(
      <InkBottomBar label="Main" items={items} value="a" onChange={() => {}} stage="expanded" />,
    );
    const bar = screen.getByRole("navigation", { name: "Main" });
    expect(bar.className).toContain("ink-glass");
    expect(bar.dataset.material).toBe("false");

    rerender(
      <InkBottomBar label="Main" items={items} value="a" onChange={() => {}} stage="condensed" />,
    );
    expect(screen.getByRole("navigation", { name: "Main" }).dataset.material).toBe("true");
  });

  it("contracts the bar to one button, and the button restores rather than navigates", () => {
    const onChange = vi.fn();
    render(
      <InkBottomBar
        label="Main"
        items={[{ key: "a", label: "Home" }, { key: "b", label: "Inbox" }]}
        value="a"
        onChange={onChange}
        collapse
        stage="collapsed"
      />,
    );
    const puck = screen.getByRole("button", { name: "Show navigation" });
    expect(puck.tabIndex).toBe(0);
    fireEvent.click(puck);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps the contracted bar's destinations out of the keyboard's way", () => {
    // aria-hidden with focusable children is a keyboard trap; `inert` removes
    // it from both trees at once.
    const { container } = render(
      <InkBottomBar
        label="Main"
        items={[{ key: "a", label: "Home" }]}
        value="a"
        onChange={() => {}}
        collapse
        stage="collapsed"
      />,
    );
    expect(container.querySelector(".ink-bottombar__body")!.hasAttribute("inert")).toBe(true);
  });

  it("gives the sidebar the glass, with the rim turned on its side", () => {
    const { container } = render(
      <InkSidebar
        label="Main"
        sections={[{ items: [{ key: "a", label: "Everything" }] }]}
        value="a"
        onChange={() => {}}
      />,
    );
    const nav = container.querySelector("nav")!;
    expect(nav.className).toContain("ink-glass");
    // A vertical surface catches the light down its edge, not along its top.
    expect(nav.className).toContain("ink-glass--vertical");
  });
});

describe("one glass treatment, three bars", () => {
  /**
   * The navbar had this look first. Defining it three times is how a navbar, a
   * bottom bar and a sidebar drift into three slightly different pills.
   */
  it("gives all three the same raised-glass surface by default", () => {
    const { container: nav } = render(<InkNavbar title="Library" />);
    const { container: bar } = render(
      <InkBottomBar label="Main" items={[{ key: "a", label: "Home" }]} value="a" onChange={() => {}} />,
    );
    const { container: side } = render(
      <InkSidebar
        label="Main"
        sections={[{ items: [{ key: "a", label: "Everything" }] }]}
        value="a"
        onChange={() => {}}
      />,
    );

    for (const [name, root, selector] of [
      ["navbar", nav, "header"],
      ["bottom bar", bar, "nav"],
      ["sidebar", side, "nav"],
    ] as const) {
      const el = root.querySelector(selector)!;
      expect(el.className, `${name} is not glass`).toContain("ink-glass");
      expect(el.className, `${name} is not raised`).toContain("ink-glass--raised");
    }
  });

  it("still allows a flush bar for a layout that wants one", () => {
    const { container } = render(<InkNavbar title="Library" variant="sticky" />);
    expect(container.querySelector("header")!.className).not.toContain("ink-glass--raised");
  });
});
