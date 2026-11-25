import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { NavLabel } from "./NavLabel";

const LONG = "Assessment Configuration and Candidate Management Settings";

/* jsdom does no layout, so scrollWidth/clientWidth are 0 and every label looks
   untruncated. Pin them per element to model "the ellipsis cut this". */
function setWidths(el: Element, scrollWidth: number, clientWidth: number) {
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
}

/* jsdom has no layout: pin the row's box so placement has something to read. */
function setRowBox(row: HTMLElement, top: number) {
  row.getBoundingClientRect = () =>
    ({ left: 0, right: 200, top, bottom: top + 40, width: 200, height: 40, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
}

function renderRow(text = LONG, truncated = true) {
  const utils = render(
    <div className="il-shell">
      <a className="nav-link" href="#row">
        <NavLabel text={text} />
      </a>
    </div>,
  );
  const shell = utils.container.querySelector(".il-shell") as HTMLElement;
  const row = utils.container.querySelector(".nav-link") as HTMLElement;
  const label = utils.container.querySelector(".il-nav-label") as HTMLElement;
  setWidths(label, truncated ? 400 : 80, 100);
  setRowBox(row, 100);
  const tip = () => shell.querySelector(".il-nav-tip");
  return { ...utils, shell, row, label, tip };
}

describe("NavLabel tooltip", () => {
  it("shows the full text beside a truncated row on hover", () => {
    const { row, tip } = renderRow();
    fireEvent.mouseEnter(row);
    expect(tip()).toHaveTextContent(LONG);
  });

  it("never shows for a label that fits", () => {
    const { row, tip } = renderRow("Home", false);
    fireEvent.mouseEnter(row);
    expect(tip()).toBeNull();
  });

  it("portals into the shell (the token alias scope), not into the clipped row", () => {
    const { row, shell, tip } = renderRow();
    fireEvent.mouseEnter(row);
    expect(tip()?.parentElement).toBe(shell);
    expect(row.querySelector(".il-nav-tip")).toBeNull();
  });

  it("is aria-hidden — the full text is already the row's accessible name", () => {
    const { row, tip } = renderRow();
    fireEvent.mouseEnter(row);
    expect(tip()).toHaveAttribute("aria-hidden", "true");
    expect(row).toHaveTextContent(LONG);
  });

  it("shows on keyboard focus and hides on blur", () => {
    const { row, tip } = renderRow();
    act(() => row.focus());
    expect(tip()).not.toBeNull();
    act(() => row.blur());
    expect(tip()).toBeNull();
  });

  it("is dismissed by Escape without the key reaching other listeners", () => {
    const { row, tip } = renderRow();
    const later = vi.fn();
    document.addEventListener("keydown", later);
    fireEvent.mouseEnter(row);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(tip()).toBeNull();
    expect(later).not.toHaveBeenCalled();
    document.removeEventListener("keydown", later);
  });

  it("lets Escape through once nothing is open", () => {
    renderRow();
    const later = vi.fn();
    document.addEventListener("keydown", later);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(later).toHaveBeenCalledTimes(1);
    document.removeEventListener("keydown", later);
  });

  it("survives the pointer crossing onto the tooltip, then hides when it leaves", async () => {
    const { row, tip } = renderRow();
    fireEvent.mouseEnter(row);
    const el = tip() as HTMLElement;
    // jsdom has no pointer, so `:hover` never matches — model "the pointer is on the
    // tooltip" the way the component asks for it.
    const matches = el.matches.bind(el);
    el.matches = (sel: string) => sel === ":hover" || matches(sel);
    // The REAL browser order, which the first version got wrong: the tooltip's
    // enter (React derives it from `mouseout`) arrives BEFORE the row's native
    // `mouseleave`. Anything that cancels the hide on enter loses this race.
    fireEvent.mouseOut(row, { relatedTarget: el });
    fireEvent.mouseOver(el, { relatedTarget: row });
    fireEvent.mouseLeave(row, { relatedTarget: el });
    await new Promise((r) => setTimeout(r, 250));
    expect(tip()).not.toBeNull();
    // Pointer leaves the tooltip for empty page: hidden after the grace period.
    el.matches = matches;
    fireEvent.mouseLeave(el);
    await waitFor(() => expect(tip()).toBeNull());
  });

  it("hides shortly after the pointer leaves the row", async () => {
    const { row, tip } = renderRow();
    fireEvent.mouseEnter(row);
    fireEvent.mouseLeave(row);
    await waitFor(() => expect(tip()).toBeNull());
  });

  it("follows the row on scroll instead of hiding (a Collapse animating open fires scroll events)", async () => {
    const { row, tip } = renderRow();
    setRowBox(row, 100);
    fireEvent.mouseEnter(row);
    expect((tip() as HTMLElement).style.top).toBe("120px");
    setRowBox(row, 200);
    fireEvent.scroll(window);
    await waitFor(() => expect((tip() as HTMLElement | null)?.style.top).toBe("220px"));
  });

  it("hides once a scroll carries the row out of view", async () => {
    const { row, tip } = renderRow();
    setRowBox(row, 100);
    fireEvent.mouseEnter(row);
    expect(tip()).not.toBeNull();
    setRowBox(row, -200);
    fireEvent.scroll(window);
    await waitFor(() => expect(tip()).toBeNull());
  });
});
