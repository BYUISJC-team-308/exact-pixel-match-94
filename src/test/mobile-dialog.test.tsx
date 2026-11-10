import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Modal } from "@/components/ui-bits";

afterEach(cleanup);

function DialogJourney() {
  const [open, setOpen] = useState(false);
  const [nested, setNested] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open event</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Event details">
        <p>Long event content</p>
        <button onClick={() => setNested(true)}>Report event</button>
        <Modal open={nested} onClose={() => setNested(false)} title="Report event">
          <label>
            Report details
            <textarea />
          </label>
        </Modal>
      </Modal>
    </>
  );
}

describe("Shared mobile dialogs", () => {
  it("focuses the close control, locks background scrolling, and restores focus on dismissal", async () => {
    render(<DialogJourney />);
    const trigger = screen.getByRole("button", { name: "Open event" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Event details" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(document.body).toHaveAttribute("data-scroll-locked");
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
  });

  it("closes only the top dialog when reporting from event details", async () => {
    render(<DialogJourney />);
    fireEvent.click(screen.getByRole("button", { name: "Open event" }));
    const report = screen.getByRole("button", { name: "Report event" });
    report.focus();
    fireEvent.click(report);
    expect(screen.getByRole("dialog", { name: "Report event" })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Report event" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "Event details" })).toBeInTheDocument();
    await waitFor(() => expect(report).toHaveFocus());
  });

  it("keeps the dialog inside the visible viewport when a keyboard reduces its height", () => {
    const original = Object.getOwnPropertyDescriptor(window, "visualViewport");
    const viewport = Object.assign(new EventTarget(), { height: 700, offsetTop: 0 });
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    try {
      render(<DialogJourney />);
      fireEvent.click(screen.getByRole("button", { name: "Open event" }));
      const dialog = screen.getByRole("dialog", { name: "Event details" });
      expect(dialog).toHaveStyle({ maxHeight: "676px", top: "350px" });
      act(() => {
        viewport.height = 300;
        viewport.offsetTop = 40;
        viewport.dispatchEvent(new Event("resize"));
      });
      expect(dialog).toHaveStyle({ maxHeight: "276px", top: "190px" });
    } finally {
      cleanup();
      if (original) Object.defineProperty(window, "visualViewport", original);
      else Reflect.deleteProperty(window, "visualViewport");
    }
  });
});
