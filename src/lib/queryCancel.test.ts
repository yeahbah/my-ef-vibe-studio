import { describe, expect, it } from "vitest";
import { isQueryCancelledMessage } from "./queryCancel";

describe("isQueryCancelledMessage", () => {
  it("matches cancellation messages", () => {
    expect(isQueryCancelledMessage("Query cancelled.")).toBe(true);
    expect(isQueryCancelledMessage("efvibe daemon stopped.")).toBe(true);
    expect(isQueryCancelledMessage("Session invalidated.")).toBe(true);
  });

  it("rejects unrelated errors", () => {
    expect(isQueryCancelledMessage("Compilation error CS1002")).toBe(false);
  });
});
