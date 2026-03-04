## Feature Plan: Active Minimap + Intelligent “Tidy Canvas” Auto-Layout (Main Editor)

### Summary

Implement two UX upgrades in the template visual editor (`ScaffolderStudioEditor`) to improve navigation/readability at scale:

1. **Active Minimap** in the canvas bottom-right using React Flow’s built-in `MiniMap`.
2. **“Tidy Canvas” toolbar action** that repositions nodes into a readable dependency-oriented structure using **Dagre** as the layout engine.

This plan is scoped to the main template editor only (`Editor.tsx`), uses a **semantic hybrid layout** (steps right, parameters below, output left), runs **animated auto-fit** after tidy, and leaves disconnected/orphan nodes in place.

---

## Why Dagre (and why now)

### Decision

Use `@dagrejs/dagre` as the layout engine behind `Tidy Canvas`.

### Reasoning

- **Best fit for directed flow graphs**: this graph is edge-driven and mostly DAG-like.
- **Deterministic layered output**: predictable positions are critical for an explicit “Tidy” action.
- **Light integration cost**: straightforward client-side computation, no worker/server requirement.
- **Dimension-aware layout**: can use real node dimensions (`measured/width/height`) for better spacing.
- **Good migration path**: we can abstract layout behind a utility so ELKJS can be swapped in later if constraint complexity grows.

### Why not ELKJS first

- More powerful constraints, but higher complexity and heavier integration for this iteration.
- Not required for current scope if we keep semantic lane composition + local Dagre passes.

---

## Scope and Non-Scope

### In scope

- Main visual template editor canvas only.
- New minimap UI and tidy action in existing toolbar.
- Node position auto-layout for connected template graph.
- Property child reflow inside parameter groups.
- Auto-fit viewport with animation after tidy.
- Unit + E2E coverage.

### Out of scope

- Prefab editor parity (tracked as follow-up).
- Automatic background layout (layout remains explicit via button).
- Backend/API data model changes.
- Analytics instrumentation (optional follow-up).

---

## Implementation Design

### 1) Dependency + Utility Layer

#### Files

- `plugins/scaffolder-studio/package.json`
- `plugins/scaffolder-studio/src/components/Studio/utils/autoLayout.ts` (new)
- `plugins/scaffolder-studio/src/components/Studio/utils/autoLayout.test.ts` (new)

#### Changes

- Add direct dependency: `@dagrejs/dagre` in plugin package (already present transitively in lockfile, but make usage explicit).
- Create pure utility module that accepts current nodes/edges and returns updated node positions.

#### Internal interface (new)

- `computeTidyLayout(params): { nodes: Node<AllNodeData>[]; didChange: boolean }`
- `params`:
  - `nodes`
  - `edges`
  - `options` (lane spacing, padding, animation-fit defaults)

No public API surface changes.

---

### 2) Tidy Layout Algorithm (Semantic Hybrid)

#### Goal

Keep user mental model while improving readability:

- Template as anchor
- Step flow to the right
- Parameters chain below
- Output to the left
- Property nodes neatly stacked inside each parameter group

#### Detailed behavior

1. **Find template root node**.
2. **Compute connected component** from template using non-dependency edges.
3. **Respect orphan policy**: nodes not connected to template are untouched.
4. **Split connected top-level nodes into lanes**:
   - Step lane: `step` and step-like prefab instances
   - Parameters lane: `parameters` and parameter-like prefab instances
   - Output lane: `templateOutput`
5. **Run Dagre per lane**:
   - Step lane: `rankdir=LR`, tuned `ranksep/nodesep`.
   - Parameters lane: `rankdir=LR`, then placed under template with fixed vertical gap.
   - Output lane: anchored to template-left with horizontal gap.
6. **Preserve template anchor**:
   - Translate computed coordinates so template remains at (or very near) original position to reduce disorientation.
7. **Reflow parameter children (property nodes)**:
   - For each parameters node, order children by existing chain logic (`getOrderedProperties`).
   - Assign consistent vertical stack positions.
   - Recompute parent size to enclose children (compatible with existing layout size logic).
8. **Do not mutate edges** (intentional):
   - Keeps tidy as a layout-only operation.
   - Avoids affecting content-hash semantics in draft persistence.

#### Failure handling

- If template is missing or component has <2 movable nodes: no-op.
- If Dagre throws (unexpected malformed graph): catch + fallback no-op + warning toast.

---

### 3) Editor UI Integration

#### Files

- `plugins/scaffolder-studio/src/components/Studio/Editor.tsx`

#### Minimap integration

- Import and render `MiniMap` within `ReactFlow`.
- Bottom-right placement.
- “Active” behavior:
  - `pannable` and `zoomable` enabled.
  - Node coloring by node type.
  - Selected node visually distinct (stroke/opacity).
- Avoid overlap with side panel:
  - Minimap right offset depends on side panel state/width.
- Add stable selector for tests: `data-testid="editor-minimap"`.

#### Tidy button integration

- Add button to existing bottom toolbar near existing graph actions.
- New test id: `data-testid="toolbar-tidy-canvas-button"`.
- Click handler:
  1. Run `computeTidyLayout`.
  2. `setNodes` once with updated nodes.
  3. Trigger visual node transition window (short-lived `isTidying` flag).
  4. Call `fitView({ padding, duration })` for animated full-graph framing.
- Button disable conditions:
  - No template node.
  - Less than 2 connected nodes to arrange.
  - Already tidying (debounce rapid clicks).

---

### 4) Persistence, Undo/Redo, and Compatibility

#### Expected behavior with current architecture

- Tidy updates node positions, so:
  - **Undo/Redo**: captured as one history state (good).
  - **Draft sync**: persisted as layout change; existing logic already supports layout-only timestamp preservation.
- No backend schema/API changes.
- No migration needed.

#### Compatibility checks

- Existing template data with missing measured sizes uses type-based size fallbacks.
- Existing tests around layout-only hash behavior remain valid.

---

### 5) Test Plan

### Unit tests (new/updated)

#### New: `autoLayout.test.ts`

1. Lays out steps left-to-right from template.
2. Places parameters lane below template.
3. Places output node left of template.
4. Leaves orphan/disconnected nodes unchanged.
5. Reflows property children inside parameter groups and resizes parent container.
6. Handles cyclic edges without throwing (Dagre acyclic fallback behavior).
7. Produces stable output on repeated runs (idempotence-ish within tolerance).

#### Existing tests to keep green

- `useTemplateDraftPersistence.test.ts` layout-only semantics.

### E2E tests

#### Files

- `packages/app/e2e-tests/pages/ScaffolderStudioPage.ts`
- `packages/app/e2e-tests/scaffolder/editor.spec.ts`

#### Add page object helpers

- `clickTidyCanvasToolbarButton()`
- `expectMinimapVisible()`
- Node drag helper for scrambling (`dragNodeByText`)

#### Add scenarios

1. **Minimap renders and is interactive**:
   - Visible in editor.
2. **Tidy reorganizes scrambled graph**:
   - Create template + steps + parameters + output.
   - Manually scramble node positions.
   - Click Tidy.
   - Assert structural expectations:
     - steps ordered by increasing X
     - parameters below template
     - output left of template
3. **Tidy is undoable**:
   - Capture post-scramble positions.
   - Tidy.
   - Undo.
   - Positions return close to scrambled state.

---

## Important Changes to APIs / Interfaces / Types

### External/public APIs

- **No backend or plugin public API changes.**

### Internal interface additions

- New internal layout utility API in `autoLayout.ts` (`computeTidyLayout` + config/options types).
- New test-facing UI selectors:
  - `toolbar-tidy-canvas-button`
  - `editor-minimap`

---

## Rollout Plan

1. Land utility + unit tests first.
2. Wire editor UI (button + minimap).
3. Add E2E coverage.
4. Run targeted tests:
   - plugin unit tests
   - relevant e2e scaffolder editor specs
5. Manual QA on large template sample.
6. Merge behind normal release flow (no feature flag needed for this scope).

---

## Acceptance Criteria

1. Minimap is visible in bottom-right and supports quick navigation.
2. “Tidy Canvas” button appears in toolbar and runs without errors.
3. Scrambled connected template graph becomes readable with semantic lane structure.
4. View auto-fits with smooth transition after tidy.
5. Disconnected nodes remain untouched.
6. Undo/Redo works correctly for tidy action.
7. Existing editor behaviors (add/connect/edit/sync) remain intact.

---

## Explicit Assumptions and Defaults Chosen

1. **Scope**: main editor only (no prefab editor in this iteration).
2. **Layout style**: semantic hybrid (steps right, parameters below, output left).
3. **Post-tidy viewport**: auto-fit with animation.
4. **Orphans/disconnected nodes**: unchanged.
5. **Edge data**: untouched by tidy to preserve layout-only semantics and reduce risk.
