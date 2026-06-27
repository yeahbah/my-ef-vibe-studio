# Phase 6 — overview

Phase 6 checklist is documented in **[PHASE6_CHECKLIST.md](./PHASE6_CHECKLIST.md)** and linked from the README and product plan.

Also updated:

- `README.md` — Phase 6 is current; Phase 5 marked complete (includes Scripts panel; compare baseline moved to Phase 6)
- `my-ef-vibe/docs/efvibe-studio-plan.md` — Phase 5/6 sections aligned

---

## Checklist overview

### Track A — Quick wins (1–2 weeks)

| ID | Item | Exit criteria (short) |
|----|------|------------------------|
| **A1** | Compare baseline UI | Set baseline on run bar → run again → Charts shows timing compare |
| **A2** | Lambda mode toggle | Toolbar switch; `db.Products.Count()` runs without `;` |
| **A3** | Query library UX | Folders + search in Library panel; pack round-trip |
| **A4** | Docs + screenshots | README/website match app; capture Studio PNGs |

### Track B — Shipping

| ID | Item | Exit criteria |
|----|------|---------------|
| **B1** | Aligned release | NuGet efvibe 0.6.26+ + Studio release; script session works fresh install |
| **B2** | CI hardening | `cargo test` + Vitest required on PRs |

### Track C — Tier 2 depth (pick 1+ for Phase 6 done)

| ID | Item | Exit criteria |
|----|------|---------------|
| **C1** | SQL→LINQ polish | Tier A–C with confidence + unsupported hints |
| **C2** | Two-connection diff | Same LINQ on Dev vs Staging → row diff grid |
| **C3** | `workspace validate --json` | CLI + Studio validate-all panel |
| **C4** | Export bundle | Markdown with query + SQL + plan |
| **C5** | Daemon pool | Keep-warm pins + LRU eviction |

### Track D — Platform (ongoing)

Intel macOS, auto-update, e2e smoke tests, grid writeback polish.

---

## Recommended order

```text
A1 → A2 → A4 (partial) → B1
A3 in parallel with A1
C3 before C2
C1 in parallel with C2
```

**Phase 6 complete when:** A1–A4 done, B1 shipped, and at least one of C1/C2/C3.

The full checklist in [PHASE6_CHECKLIST.md](./PHASE6_CHECKLIST.md) includes checkbox tasks, key files, and copy-paste GitHub issue titles.
