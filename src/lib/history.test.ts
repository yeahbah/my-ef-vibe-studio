import { describe, expect, it } from "vitest";
import {
  filterQueryHistory,
  filterRecentHistory,
  formatHistoryDateLabel,
  groupHistoryByDate,
  localDateKey,
  recordHistoryEntry,
  type EvaluationHistoryEntry,
} from "./history";
import type { EvaluationJsonPayload } from "../types/evaluation";

function entry(timestamp: string, expression = "db.Products.Take(1)"): EvaluationHistoryEntry {
  return {
    id: crypto.randomUUID(),
    expression,
    totalMs: 12,
    sqlCommandCount: 1,
    resultKind: "Enumerable",
    timestamp,
    connectionName: "Default",
  };
}

describe("filterRecentHistory", () => {
  const now = new Date(2026, 5, 26, 15, 30, 0);

  it("keeps entries from the last seven calendar days", () => {
    const history = [
      entry(new Date(2026, 5, 26, 10, 0, 0).toISOString()),
      entry(new Date(2026, 5, 20, 10, 0, 0).toISOString()),
      entry(new Date(2026, 5, 19, 23, 59, 0).toISOString()),
    ];

    const recent = filterRecentHistory(history, now);

    expect(recent).toHaveLength(2);
    expect(recent.map((item) => localDateKey(new Date(item.timestamp)))).toEqual([
      "2026-06-26",
      "2026-06-20",
    ]);
  });
});

describe("formatHistoryDateLabel", () => {
  const now = new Date(2026, 5, 26, 12, 0, 0);

  it("labels today and yesterday", () => {
    expect(formatHistoryDateLabel("2026-06-26", now)).toBe("Today");
    expect(formatHistoryDateLabel("2026-06-25", now)).toBe("Yesterday");
  });

  it("labels older dates within the week", () => {
    expect(formatHistoryDateLabel("2026-06-24", now)).toMatch(/Wednesday/);
  });
});

describe("groupHistoryByDate", () => {
  const now = new Date(2026, 5, 26, 12, 0, 0);

  it("groups recent entries by date with newest sections first", () => {
    const history = [
      entry(new Date(2026, 5, 26, 9, 0, 0).toISOString(), "today-a"),
      entry(new Date(2026, 5, 26, 8, 0, 0).toISOString(), "today-b"),
      entry(new Date(2026, 5, 25, 18, 0, 0).toISOString(), "yesterday-a"),
      entry(new Date(2026, 5, 19, 23, 59, 0).toISOString(), "too-old"),
    ];

    const groups = groupHistoryByDate(history, now);

    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday"]);
    expect(groups[0]?.entries.map((item) => item.expression)).toEqual(["today-a", "today-b"]);
    expect(groups[1]?.entries.map((item) => item.expression)).toEqual(["yesterday-a"]);
  });
});

describe("filterQueryHistory", () => {
  it("excludes notebook-sourced and command entries", () => {
    const history: EvaluationHistoryEntry[] = [
      entry("2026-06-26T10:00:00.000Z", "db.Products.Take(1)"),
      entry("2026-06-26T09:00:00.000Z", ":dbinfo"),
      { ...entry("2026-06-26T08:00:00.000Z", ":tables"), source: "notebook" },
    ];

    expect(filterQueryHistory(history).map((item) => item.expression)).toEqual([
      "db.Products.Take(1)",
    ]);
  });
});

describe("recordHistoryEntry", () => {
  const payload: EvaluationJsonPayload = {
    success: true,
    sql: [],
    metrics: {
      totalMs: 42,
      sqlCommandCount: 1,
      resultKind: "Enumerable",
    },
    warnings: [],
  };

  it("skips notebook command entries", () => {
    const next = recordHistoryEntry([], ":dbinfo", payload, "Default", "notebook");
    expect(next).toHaveLength(0);
  });

  it("skips colon commands even when source is query", () => {
    const next = recordHistoryEntry([], ":tables", payload, "Default", "query");
    expect(next).toHaveLength(0);
  });
});
