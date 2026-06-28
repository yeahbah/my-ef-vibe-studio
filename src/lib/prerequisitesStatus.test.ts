import { describe, expect, it } from "vitest";
import { formatPrerequisitesStatus } from "./prerequisitesStatus";

describe("formatPrerequisitesStatus", () => {
  it("summarizes missing dotnet and efvibe", () => {
    expect(
      formatPrerequisitesStatus({
        ok: false,
        dotnet: { found: false, version: "", error: "not on PATH" },
        efvibe: {
          found: false,
          version: "",
          error: "",
          invocation: { kind: "global", command: "efvibe", prefixArgs: [] },
        },
      }),
    ).toBe("Prerequisites missing — .NET SDK not found: not on PATH; efvibe not found");
  });
});
