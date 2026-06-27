# Phase 6 checklist — polish, shipping, and Tier 2 depth

Phase 5 delivered the core Studio product (workspace, connections, query/notebook/REPL, scan, packs, sync, charts, SQL pane, scripts panel). Phase 6 closes **docs ↔ code gaps**, **ships aligned engine + Studio builds**, and delivers **Tier 2 differentiators** from [efvibe-studio-plan.md](https://github.com/yeahbah/my-ef-vibe/blob/main/docs/efvibe-studio-plan.md).

Use this as the working backlog. Check items off in PR descriptions; open GitHub issues from the suggested titles if you want tracking.

**Engine baseline:** efvibe **0.6.26+** (script session CLI fixes, `sqlToLinq` daemon message).  
**Studio baseline:** **0.2.3+** (Scripts panel, embedded REPL, grid writeback).

---

## Track A — Quick wins (1–2 weeks)

Small, visible fixes. Each item is independently shippable.

### A1. Compare baseline UI

**Goal:** Match REPL `:compare set` / `:compare` in the query workspace and Charts panel.

**Current gap:** README claims compare baseline; `ChartsPanel.tsx` has compare UI but is unused. `ChartsToolView` in `EditorToolPanel.tsx` only shows timings + benchmark. `resultRowsBaseline` on query tabs is used for **grid writeback**, not performance compare.

**Tasks**

- [ ] Add run-bar actions: **Set baseline**, **Clear baseline** (per active query tab or per expression).
- [ ] Store compare baseline as `EvaluationHistoryEntry` (or dedicated type) separate from `resultRowsBaseline`.
- [ ] Wire **Charts** tool panel: baseline vs latest table (total ms, database ms, row count, SQL command count) — merge logic from orphaned `ChartsPanel.tsx` into `ChartsToolView`.
- [ ] Optional: row/SQL diff summary when both runs succeeded (reuse patterns from REPL compare if exposed via daemon).
- [ ] Update `docs/USER_GUIDE.md` Charts section; remove or delete dead `ChartsPanel.tsx` once merged.
- [ ] Vitest: baseline set/clear state; Charts renders when baseline + latest exist.

**Key files:** `src/App.tsx`, `src/components/EditorToolPanel.tsx`, `src/types/query.ts`, `src/lib/history.ts`, run-bar toolbar in `App.tsx`.

**Exit criteria**

- User runs query A → **Set baseline** → runs query B → Charts shows side-by-side timing compare without opening REPL.
- Clear baseline resets Charts empty state message.
- README Phase 6 / user guide accurately describe behavior.

**Suggested issue:** `studio: compare baseline UI (run bar + Charts)`

---

### A2. Lambda (expression) mode toggle

**Goal:** Expose existing `lambdaMode` session flag in the query toolbar.

**Current gap:** `normalizeExpression(..., lambdaMode)` and session persistence exist; no UI toggle.

**Tasks**

- [ ] Toolbar toggle: **Expression mode** (tooltip: no trailing `;` required).
- [ ] Persist in session settings (`lib/settings.ts` already has `lambdaMode`).
- [ ] Status hint when enabled (e.g. status bar or editor subtitle).
- [ ] Vitest: toggle changes `normalizeExpression` output for sample input.

**Key files:** `src/App.tsx`, `src/lib/editorRun.ts`, query toolbar JSX.

**Exit criteria**

- Toggle survives app restart for the workspace session.
- `db.Products.Count()` runs without user adding `;`.
- Documented in user guide Quick reference.

**Suggested issue:** `studio: expression mode toolbar toggle`

---

### A3. Query library UX (folders + search)

**Goal:** Organize saved queries without restoring a heavy explorer tree.

**Current gap:** `QueryLibraryState` (folders, queries) powers packs/sync; Favorites panel only lists starred tabs.

**Tasks**

- [ ] Extend **Favorites** panel (or rename to **Library**): folder list, drag or assign tab to folder, search by name/expression.
- [ ] Actions: New folder, Rename, Delete folder (queries move to uncategorized).
- [ ] Save current tab to library (`.efvibe-query` file optional; in-memory ref minimum).
- [ ] Pack export/import continues to round-trip folder names (already partially wired).
- [ ] Vitest: folder CRUD + search filter.

**Key files:** `src/types/queryLibrary.ts`, `EditorToolPanel.tsx` (FavoritesToolView), `src/App.tsx`, `src/lib/pack.ts`.

**Exit criteria**

- User creates folder "Performance", assigns 3 favorite queries, finds one via search, opens it in a new tab.
- Team pack export includes folder metadata unchanged.

**Suggested issue:** `studio: query library folders and search`

---

### A4. Docs and README sync

**Goal:** Marketing and README match the app.

**Tasks**

- [ ] README Phase 5: add **Scripts panel**; move Phase 5 to "complete" summary; link this checklist as Phase 6.
- [ ] README: fix compare baseline wording until A1 ships (or ship A1 first).
- [ ] Website: capture screenshots per `my-ef-vibe-website/images/SCREENSHOTS.md` (Studio section).
- [ ] Website: replace dashed placeholders on `studio.html` and `docs/studio-user-guide.html`.
- [ ] INSTALL.md: require **efvibe 0.6.26+** when script session fields are used.

**Exit criteria**

- No README feature listed as shipped unless the UI exists.
- At least `studio-query-view.png`, `studio-scripts-panel.png`, `studio-connection-editor.png` on the website.

**Suggested issue:** `website: Studio screenshot capture`

---

## Track B — Shipping (parallel with Track A)

### B1. Aligned engine + Studio release

**Goal:** Users on NuGet/global `efvibe` get script session and latest daemon protocol.

**Tasks**

- [ ] Publish **efvibe 0.6.26** (or current) to NuGet if not already released from CI.
- [ ] Studio release **0.2.4+** (or next) with release notes: minimum efvibe version, Scripts panel, script CLI fix dependency.
- [ ] Verify `serve` with `--script-load` / `--script-using` semicolon-separated args against AdventureWorks-style workspace.
- [ ] GitHub release assets: Linux `.deb`/`.AppImage`, Windows `.msi`, macOS arm64 `.dmg`.

**Exit criteria**

- Fresh install: `dotnet tool install -g efvibe` + Studio release runs scripted connection (`constants.csx`) without handshake errors.
- Release notes link INSTALL.md and user guide.

**Suggested issue:** `release: efvibe 0.6.26 + Studio 0.2.x`

---

### B2. CI test hardening

**Goal:** Catch regressions in daemon arg building and frontend helpers.

**Tasks**

- [ ] CI: run `cargo test` (not only `cargo check`) in `src-tauri`.
- [ ] CI: keep `npm run test` (Vitest) on every PR.
- [ ] Add tests when landing A1–A3.

**Exit criteria**

- Green CI on main requires both Vitest and Rust unit tests.

**Suggested issue:** `ci: run cargo test in Studio pipeline`

---

## Track C — Tier 2 depth (3–6+ weeks)

Larger features from the product plan. Sequence C1 → C2 → C3 unless product priority changes.

### C1. SQL → LINQ polish

**Goal:** Make the draft assistant trustworthy for Tier A–C SQL (single table, joins, aggregates).

**Current state:** Engine `sqlToLinq` CLI + daemon message; Studio `SqlToLinqDialog` + live pane debounce.

**Tasks**

- [ ] Engine: expand parser coverage (document Tier A–C in `features.md` with examples).
- [ ] Engine: return structured **unsupported** nodes (table/column/expression) in JSON.
- [ ] Studio: confidence badge + unsupported list in dialog and live pane.
- [ ] Studio: **Insert into editor** and **Run** actions on converted draft.
- [ ] Integration test: sample SQL → LINQ → `ToQueryString()` round-trip on AdventureWorks model.

**Exit criteria**

- Simple `SELECT … FROM one_table WHERE …` converts with **high** confidence and runs successfully.
- Unsupported `GROUP BY` / CTE / window functions show explicit "not supported" UI, not silent garbage.

**Suggested issue:** `engine+studio: SQL→LINQ Tier A–C polish`

---

### C2. Two-connection compare (diff grid)

**Goal:** Same LINQ against two workspace connections; diff result grids.

**Tasks**

- [ ] UX: pick **Connection A** and **Connection B** (or "baseline connection" vs "compare connection").
- [ ] Engine/Studio: run expression against two daemons (sequential OK for v1).
- [ ] Diff grid: added/removed/changed rows (reuse `buildResultChangeSet` from `resultPersist.ts` where applicable).
- [ ] Handle schema mismatch gracefully (column set differs).
- [ ] Document limitations (different DB state, not just EF translation).

**Key files:** new compare module, `src/lib/daemon.ts`, results grid component.

**Exit criteria**

- User runs `db.Products.Take(10).ToList()` on Dev and Staging connections; Studio shows row diff count and drill-down.
- Works when both connections share the same EF model mapping.

**Suggested issue:** `studio: two-connection result diff`

---

### C3. Workspace validation (engine CLI)

**Goal:** Verify all connections in a workspace before a team demo or CI job.

**Tasks**

- [ ] Engine: `efvibe workspace validate --json <path>` — build each connection, optional DB ping, structured errors.
- [ ] Engine: `efvibe connections list --json` — discover DbContexts from registered projects (plan item).
- [ ] Studio: **Validate workspace** action in explorer or Settings; show panel with per-connection status.
- [ ] Unit + integration tests with sample workspace fixture.

**Exit criteria**

- Invalid `efProject` path returns JSON error with connection id and message.
- Studio shows green/red list without manual daemon spawn per connection.

**Suggested issue:** `engine: workspace validate --json`

---

### C4. Export bundle (query artifact)

**Goal:** Share query + generated SQL + plan as one markdown or zip.

**Tasks**

- [ ] Export action on results dock: Markdown bundle (expression, SQL tab content, plan summary, timings).
- [ ] Optional: include workspace/connection name (not secrets).

**Exit criteria**

- User exports after Run Plan; markdown opens in VS Code with readable sections.

**Suggested issue:** `studio: export query markdown bundle`

---

### C5. Daemon orchestration (optional)

**Goal:** Multi-connection workspaces without OOM from N idle daemons.

**Tasks**

- [ ] Settings: **Keep warm** pin per connection (max N).
- [ ] LRU eviction of idle daemons; restart on next run.
- [ ] Optional: file watcher on EF project → daemon refresh (build on save).

**Exit criteria**

- Workspace with 5 connections only keeps 1 active + up to `maxWarm` pinned; others cold-start on select.

**Suggested issue:** `studio: daemon pool LRU + keep-warm pins`

---

## Track D — Platform (ongoing)

| Item | Tasks | Exit criteria |
|------|--------|---------------|
| **Intel macOS** | Add x86_64 macOS target to Tauri build matrix | `.dmg` on Intel Mac installs and runs |
| **Auto-update** | Tauri updater plugin + signed releases | App prompts for update from GitHub release |
| **E2E tests** | WebDriver or Tauri integration tests: open workspace, run query | One smoke test in CI (optional nightly) |
| **Grid writeback polish** | Clearer errors when no PK / wrong entity | User guide examples match error text |

---

## Recommended merge order

```text
A1 → A2 → A4 (partial) → B1
A3 ∥ A1
B2 anytime
C3 before C2 (validation helps two-connection workflows)
C1 ∥ C2
C4, C5, Track D as capacity allows
```

---

## Phase 6 exit criteria (whole phase)

Phase 6 is **done** when:

1. **Track A** items A1–A4 are complete (compare baseline, lambda toggle, query library UX, docs/screenshots).
2. **Track B** B1 shipped (aligned engine + Studio release on GitHub/NuGet).
3. At least **one** Track C item shipped (recommended: **C1** or **C3**).
4. README lists Phase 6 outcomes; this checklist archived or moved to "Phase 6 (complete)".

---

## GitHub issue batch (copy/paste)

| Title | Track |
|-------|-------|
| `studio: compare baseline UI (run bar + Charts)` | A1 |
| `studio: expression mode toolbar toggle` | A2 |
| `studio: query library folders and search` | A3 |
| `website: Studio screenshot capture` | A4 |
| `release: efvibe 0.6.26 + Studio 0.2.x` | B1 |
| `ci: run cargo test in Studio pipeline` | B2 |
| `engine+studio: SQL→LINQ Tier A–C polish` | C1 |
| `studio: two-connection result diff` | C2 |
| `engine: workspace validate --json` | C3 |
| `studio: export query markdown bundle` | C4 |
| `studio: daemon pool LRU + keep-warm pins` | C5 |
