import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { Link } from "../dist/navigation.js";

afterEach(() => { delete (window as any).__WEBFRAMEZ_ROUTER__; });
test("Link forwards its anchor ref and routes mouse and keyboard activation once", async () => {
  const push = vi.fn();
  (window as any).__WEBFRAMEZ_ROUTER__ = { push, replace: vi.fn() };
  const ref = React.createRef<HTMLAnchorElement>();
  render(<Link ref={ref} basename="" to="/manager/alpha/servers">Servers</Link>);
  expect(ref.current).toBe(screen.getByRole("link"));
  expect(ref.current).toHaveAttribute("href", "/manager/alpha/servers");
  fireEvent.click(ref.current!);
  ref.current!.focus();
  await userEvent.keyboard("{Enter}");
  expect(push.mock.calls).toEqual([["/manager/alpha/servers"], ["/manager/alpha/servers"]]);
});

test.each([
  { event: { ctrlKey: true } }, { event: { metaKey: true } }, { event: { shiftKey: true } },
  { event: { altKey: true } }, { event: { button: 1 } },
  { props: { target: "_blank" } }, { props: { download: "export.csv" } },
  { props: { to: "https://example.org/" } },
])("Link preserves native browser navigation: %j", ({ event = {}, props = {} }: any) => {
  const push = vi.fn();
  (window as any).__WEBFRAMEZ_ROUTER__ = { push, replace: vi.fn() };
  render(<Link to="/manager/alpha/servers" {...props}>Destination</Link>);
  document.addEventListener("click", e => {
    expect(e.defaultPrevented).toBe(false);
    e.preventDefault(); // Suppress jsdom's unimplemented browser navigation.
  }, { once: true });
  fireEvent.click(screen.getByRole("link"), event);
  expect(push).not.toHaveBeenCalled();
});
