import { describe, expect, it, vi } from "vitest";
import { handleEscapeCloseKeyDown } from "./useEscapeClose";

describe("handleEscapeCloseKeyDown", () => {
  it("closes on Escape", () => {
    const onClose = vi.fn();
    const event = {
      key: "Escape",
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    handleEscapeCloseKeyDown(event, onClose);

    expect(onClose).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });

  it("ignores other keys", () => {
    const onClose = vi.fn();
    const event = {
      key: "Enter",
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as KeyboardEvent;

    handleEscapeCloseKeyDown(event, onClose);

    expect(onClose).not.toHaveBeenCalled();
  });
});
