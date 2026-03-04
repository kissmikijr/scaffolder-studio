# Compound Prefabs (Multi-Node) End-to-End Implementation Plan

## Summary

Implement **compound prefabs** as versioned, reusable subgraphs (multiple nodes + internal edges) that can be inserted into templates as a single prefab instance node on canvas, while still serializing to standard Backstage Template YAML via expansion at export/publish time.

Chosen defaults (locked):

- YAML strategy: **expand on export/publish** (no prefab syntax in published YAML)
- Canvas representation: **collapsed capsule node** with typed ports + internal preview
- Versioning: **pin to explicit prefab version** with manual upgrade flow

---

## Public API / Type / Interface Changes

### Shared types (`plugin-scaffolder-studio-common`)

1. Add `PrefabGraph` model:

- `nodes: Node<AllNodeData>[]`
- `edges: Edge[]`
- `entrypoints: { stepsIn?: string[]; paramsIn?: string[]; outputsOut?: string[] }`
- `interface: { inputs: PrefabInputPort[]; outputs: PrefabOutputPort[] }` (derived/cached)
- `schemaVersion: number`

2. Evolve `Prefab`:

- Keep `node` for backward compatibility (v1 single-node)
- Add `graph?: PrefabGraph`
- Add `kind: 'single' | 'compound'` (server-populated)

3. Evolve `PrefabInstanceNodeData`:

- Keep `id`, `version`, `refType`
- Add `instanceConfig?: { exposedInputBindings?: Record<string, string> }`
- Add `resolvedInterfaceHash?: string` (detect stale instance interface)

4. Add edge semantics type:

- `edge.data?.semantic = 'control' | 'relationship' | 'derived'`
- Default existing template flow edges to `'control'`

### Backend API (router + OpenAPI + clients)

1. `GET /prefabs/:id` and `GET /prefab-library/:id` return `Prefab` with `kind` + `graph` when compound.
2. `POST/PUT /prefabs` accept either:

- legacy `{ node }`
- new `{ graph, title, description }`

3. `POST /prefabs/resolve` resolves prefab instance nodes into expanded node set using `graph` if present, else legacy `node`.
4. Add `POST /prefabs/:id/validate` (optional but recommended) for prefab graph linting before publish.
5. Update OpenAPI schemas for backward-compatible unions.

### DB schema and migrations

1. `prefabs` table:

- Add `graph` (text/json)
- Keep `node` nullable for legacy
- Add `kind` (`single` default, `compound`)
- Add `schema_version`

2. `prefab_library` table: same additions.
3. Data migration:

- Existing rows map `node -> graph.nodes[0]`, `graph.edges=[]`, `kind='single'`.

---

## Core Architecture

## 1. Prefab storage and resolution pipeline

1. Replace single-node assumption in:

- `DatabasePrefabStore`
- `DatabasePrefabLibraryStore`
- `ScaffolderStudioService.resolveNodes`

2. Resolution algorithm:

- For each prefab instance node in template graph:
  - Load pinned prefab version (or personal draft fallback if no version)
  - Expand to internal nodes with deterministic instance prefix IDs (`instanceId::innerNodeId`)
  - Re-map internal edges with prefixed node IDs
  - Preserve instance position as anchor for internal layout offset

3. Expansion output is used by:

- YAML serialization
- YAML read-only range calculation
- dependency/relationship edge generation

## 2. Serialization to YAML (publish + YAML tab)

1. Keep published YAML prefab-agnostic.
2. Resolve compound prefab nodes before `serializeToYaml`.
3. Preserve step and property ordering rules:

- Respect internal edge topology in prefab graph
- For parameter/property chains, preserve `getOrderedProperties` behavior with expanded IDs

4. Detect and fail fast on:

- duplicate step IDs after expansion
- duplicate property names in same parameter schema
- cyclic prefab-in-prefab references (initially disallow nested prefab nodes inside prefab graphs)

## 3. Canvas behavior for compound prefab instances

1. Continue rendering one `prefab` node in main template canvas.
2. `PrefabInstanceNode` UI upgrades:

- Badge: `Compound`
- Port summary derived from prefab interface
- “Open internals” action opens read-only mini-map/side preview

3. Connection rules:

- Treat prefab instance effective type as interface-driven (not a single `refType`)
- Incoming/outgoing capacity computed from exposed interface ports
- Relationship/derived edges must never count toward validity/handle capacity

4. Keep dependency-edge overlay visual, but mark as `semantic='derived'`.

---

## Prefab Editor Redesign (Single + Compound)

## 1. Editor model

1. Convert prefab editor from one-node editor to subgraph editor:

- Nodes, edges, viewport state (same persistence model style as template editor)
- Reuse existing `Editor` primitives with feature flags to constrain allowed node types

2. Allowed nodes in prefab editor v1:

- `property`, `parameters`, `step`, `templateOutput`
- Disallow `template` node and disallow `prefab` node nesting

3. Add “Interface Panel”:

- Auto-detect exposed entry/exit ports from graph roots/leaves
- User can rename exposed ports and set descriptions

## 2. Side content + YAML view

1. `NodeSideContent` in prefab editor should use graph-selected node context, not prefab instance fetch.
2. Prefab YAML tab in prefab editor:

- Show **standalone prefab serialization** format (internal JSON->YAML preview) for portability/debug, not Backstage Template YAML.

3. For prefab node selected in template editor:

- YAML remains read-only resolved snippet
- Fetch via dedicated query hook (already in place), now reading `graph` when compound.

## 3. Prefab creation flows

1. New from scratch: opens empty compound canvas with starter nodes.
2. Convert selection in template:

- User selects connected nodes, “Create Prefab”
- System validates allowed node types and no external dangling dependencies
- Extract subgraph, replace selection with prefab instance node, auto-wire compatible external edges

---

## Edit Flow (User Journey)

1. User opens prefab editor.
2. Adds/edits multiple nodes and internal edges.
3. Interface panel auto-updates exposed inputs/outputs.
4. User saves draft (debounced autosave to personal prefabs).
5. Validation runs continuously:

- stepId uniqueness
- required parameter/property consistency
- no unsupported edges/nodes

6. User can inspect generated standalone prefab YAML/JSON preview.
7. User publishes prefab to library -> new immutable version.

Template usage flow:

1. Drag prefab version into template canvas.
2. Connect to other template nodes using exposed interface ports.
3. Optional: “Upgrade version” action with compatibility checks.
4. YAML tab shows resolved full template output.

---

## Publish Flow

### Prefab publish

1. On publish, create immutable version snapshot in `prefab_library` including `graph`.
2. Run server-side validation before write.
3. Store computed interface hash for compatibility checks.

### Template publish

1. Before publish:

- Resolve all prefab instances by pinned version
- Run preflight checks for stale/missing versions
- Show actionable errors with prefab id/version and offending node

2. Serialize resolved graph to Backstage Template YAML and publish as today.
3. Store published template as expanded YAML only (no prefab runtime dependency).

---

## UI/UX updates needed

1. Prefab list rows:

- Show `Single`/`Compound` type pill
- Mini summary from `graph.nodes` + `graph.edges`

2. Drag preview:

- Compound iconography + node count

3. Prefab instance side panel:

- Show interface ports and version
- Show “View internals” preview

4. Upgrade UX:

- If newer prefab version exists, show non-blocking badge and explicit upgrade action

---

## Validation and Lint Rules

1. Connection validity must ignore edges with `semantic in ['relationship','derived']`.
2. Compound prefab graph rules:

- no nested prefab instances (v1)
- no orphaned required interface ports
- deterministic ordering for steps/properties

3. Template-level rules:

- expanded graph must remain acyclic for control flow
- no duplicate generated IDs in expanded namespace

---

## Testing Plan

## Unit tests

1. `resolveNodes` expands compound prefabs with deterministic ID prefixing.
2. `serializeToYaml` with compound prefabs produces expected steps/parameters/output ordering.
3. Connection limits ignore relationship/derived edges.
4. Interface extraction from prefab graph (roots/leaves/typed ports).

## Integration tests (backend)

1. Prefab CRUD legacy single-node remains compatible.
2. Compound prefab create/update/get/publish/list roundtrip.
3. Template publish with compound prefab succeeds and stores expanded YAML.
4. Missing prefab version yields clear error.

## E2E tests

1. Create compound prefab (property + step) and publish.
2. Drag into template, connect, verify YAML contains expanded fields.
3. Switch form/yaml with prefab selected: no empty YAML state, stable read-only behavior.
4. Upgrade prefab version from template and verify updated resolved YAML.
5. Regression: relationship edges do not affect handle validity.

---

## Rollout and Migration Strategy

1. Phase 1: backend schema + compatibility reads/writes (`node` and `graph`).
2. Phase 2: prefab editor graph mode behind feature flag `compoundPrefabs`.
3. Phase 3: template canvas interface-aware prefab instances.
4. Phase 4: enable compound publish + template preflight checks.
5. Phase 5: remove flag after e2e soak and telemetry confidence.

Telemetry to add:

- prefab kind usage
- resolve failures by reason
- publish validation failures
- upgrade action adoption

---

## Assumptions and Defaults

1. Nested prefabs inside prefabs are out of scope for v1.
2. Published template YAML must remain valid Backstage `kind: Template` without custom prefab syntax.
3. Prefab versions are immutable; template instances pin exact version.
4. Compound prefab internals are not directly editable from template canvas in v1.
5. Existing single-node prefabs must continue working unchanged after migration.
