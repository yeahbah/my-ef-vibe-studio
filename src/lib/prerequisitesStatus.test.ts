import { describe, expect, it } from "vitest";
import { formatPrerequisitesStatus } from "./prerequisitesStatus";

describe("formatPrerequisitesStatus", () => {
  it("summarizes missing dotnet and efvibe", () => {
    expect(
      formatPrerequisitesStatus({
        ok: false,
        minimumEfvibeVersion: "0.6.26",
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

  it("reports when efvibe is too old", () => {
    expect(
      formatPrerequisitesStatus({
        ok: false,
        minimumEfvibeVersion: "0.6.26",
        dotnet: { found: true, version: "10.0.301" },
        efvibe: {
          found: true,
          version: "0.6.20",
          error:
            "efvibe 0.6.20 is too old for MyEFvibe Studio (requires 0.6.26+).\nUpdate the global tool: dotnet tool update -g efvibe",
          invocation: { kind: "global", command: "efvibe", prefixArgs: [] },
        },
      }),
    ).toContain("efvibe 0.6.20 is too old");
  });
});
