import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { InkButton, InkSwitch } from "./controls.js";
import { InkCheckbox, InkInput, InkSelect, InkTextArea } from "./forms.js";
import { InkNotice, InkText } from "./primitives.js";
import { InkDialog, InkSheet } from "./overlays.js";
import { InkToaster, useInkToast } from "./feedback.js";

afterEach(cleanup);

describe("button", () => {
  it("keeps its words while busy and refuses a second press", () => {
    const onPress = vi.fn();
    render(
      <InkButton variant="primary" loading onPress={onPress}>
        Save
      </InkButton>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    // The spinner is the button's, not a second announcement.
    expect(button.querySelector(".ink-spinner")?.getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("takes a size without losing the touch floor on the small one", () => {
    render(<InkButton size="sm">Edit</InkButton>);
    const button = screen.getByRole("button", { name: "Edit" });
    expect(button.className).toContain("ink-btn--sm");
    expect(button.className).toContain("ink-reach");
  });
});

describe("labelled controls", () => {
  it("lets the words beside a checkbox tick it, and names it with them", () => {
    const onChange = vi.fn();
    render(
      <InkCheckbox checked={false} onChange={onChange}>
        Kitchen speaker
      </InkCheckbox>,
    );
    const box = screen.getByRole("checkbox", { name: "Kitchen speaker" });
    fireEvent.click(screen.getByText("Kitchen speaker"));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(box.closest("label")).not.toBeNull();
  });

  it("does the same for a switch, and keeps an explicit label over the words", () => {
    const onChange = vi.fn();
    render(
      <InkSwitch checked onChange={onChange} label="Speak aloud in this room">
        Speak aloud
      </InkSwitch>,
    );
    screen.getByRole("switch", { name: "Speak aloud in this room" });
    fireEvent.click(screen.getByText("Speak aloud"));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe("fields", () => {
  it("answers Enter and hides a password", () => {
    const onSubmit = vi.fn();
    render(<InkInput label="Password" type="password" value="x" onChange={() => {}} onSubmit={onSubmit} />);
    const input = screen.getByLabelText("Password") as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("passes the platform's own props through without giving up its value", () => {
    render(
      <InkInput
        label="Email"
        value="a@b.c"
        onChange={() => {}}
        inputProps={{ autoComplete: "email", name: "email" }}
      />,
    );
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input.getAttribute("autocomplete")).toBe("email");
    expect(input.name).toBe("email");
    expect(input.value).toBe("a@b.c");
  });

  it("says why a text area will not do, and links the reason to it", () => {
    render(<InkTextArea label="Note" value="" onChange={() => {}} invalid="Say something first" />);
    const area = screen.getByLabelText("Note");
    expect(area.getAttribute("aria-invalid")).toBe("true");
    const reason = screen.getByRole("alert");
    expect(reason.textContent).toBe("Say something first");
    expect(area.getAttribute("aria-describedby")).toBe(reason.id);
  });

  it("shows a placeholder until something is chosen", () => {
    render(
      <InkSelect
        label="Room"
        placeholder="Pick a room"
        value={undefined}
        onChange={() => {}}
        options={[{ value: "kitchen", label: "Kitchen" }]}
      />,
    );
    const select = screen.getByLabelText("Room") as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(select.options[0].textContent).toBe("Pick a room");
    expect(select.closest(".ink-select")?.hasAttribute("data-empty")).toBe(true);
  });
});

describe("notice and text", () => {
  it("puts an action under the words", () => {
    render(
      <InkNotice tone="danger" action={<button type="button">Try again</button>}>
        The export could not finish
      </InkNotice>,
    );
    const alert = screen.getByRole("alert");
    expect(alert.querySelector(".ink-notice__action button")?.textContent).toBe("Try again");
  });

  it("clamps to a line count", () => {
    const { container } = render(<InkText numberOfLines={2}>Long</InkText>);
    const text = container.firstElementChild as HTMLElement;
    expect(text.hasAttribute("data-clamp")).toBe(true);
    expect(text.style.getPropertyValue("--ink-lines")).toBe("2");
  });
});

describe("overlays", () => {
  it("gives every dialog its own title id", () => {
    render(
      <>
        <InkDialog open onClose={() => {}} title="First" />
        <InkDialog open onClose={() => {}} title="Second" />
      </>,
    );
    const ids = [...document.querySelectorAll("dialog")].map((d) => d.getAttribute("aria-labelledby"));
    expect(new Set(ids).size).toBe(2);
  });

  it("describes a sheet and refuses Escape when it must be answered", () => {
    const onClose = vi.fn();
    const { container } = render(
      <InkSheet open onClose={onClose} title="Speaking" description="How it sounds" dismissible={false}>
        <p>Body</p>
      </InkSheet>,
    );
    expect(screen.getByText("How it sounds").className).toBe("ink-sheet__description");
    const cancel = new Event("cancel", { cancelable: true });
    container.querySelector("dialog")!.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("toaster", () => {
  function Trigger() {
    const toast = useInkToast();
    return (
      <button type="button" onClick={() => toast.show({ tone: "success", text: "Saved" })}>
        go
      </button>
    );
  }

  it("clears its tab bar, marks the tone and closes on the drawn mark", () => {
    const { container } = render(
      <InkToaster offset={64}>
        <Trigger />
      </InkToaster>,
    );
    const region = screen.getByRole("region", { name: "Notifications" });
    expect(region.style.getPropertyValue("--ink-toast-offset")).toBe("64px");
    fireEvent.click(screen.getByText("go"));
    expect(container.querySelector(".ink-toast__dot")).not.toBeNull();
    const close = screen.getByRole("button", { name: "Dismiss" });
    expect(close.querySelector("svg")).not.toBeNull();
    fireEvent.click(close);
    expect(screen.queryByText("Saved")).toBeNull();
  });
});
