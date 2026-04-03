# Visual Canvas Linter Implementation Plan

## Direction

Build the linter as a standalone shared package and execute it on the backend.

The frontend should not own lint rule execution. It should:

1. send the current unsaved canvas snapshot to the backend,
2. receive normalized lint issues,
3. render badges, panels, and navigation from that response.

This keeps rule logic centralized, allows future CLI or batch use, and avoids drift between browser state and backend publishing/validation behavior.

## Why The Original Plan Should Change

The original plan made the linter frontend-only via `useTemplateLinter`. That is the wrong ownership boundary for this repo.

Problems with the frontend-only approach:

1. Rule execution would diverge from backend behavior over time.
2. Organization-specific rules would have to be shipped to the browser.
3. Any future non-UI use case such as CI, pre-publish checks, import validation, or batch linting would have to duplicate logic.
4. The frontend already depends on the backend for action/schema enrichment and graph-adjacent operations such as template serialization and prefab resolution.

The current FE/BE contract already supports backend-owned graph operations:

1. FE sends `nodes` and `edges` to `/template/serialize`.
2. FE sends `nodes` to `/prefabs/resolve`.
3. BE owns action lookup via `ScaffolderStudioService#getActions()`.

Linting fits that same contract pattern.

## Target Architecture

### Ownership

1. `packages/scaffolder-studio-linter`
   Pure TypeScript package.
   No React, no Backstage plugin runtime, no frontend-specific rendering concerns.

2. `plugins/scaffolder-studio-backend`
   Hosts the lint endpoint and wires the shared linter package into existing backend services.

3. `plugins/scaffolder-studio`
   Presentation layer only.
   Debounces requests, stores latest lint result, renders badges/tooltips/panels.

## Package Layout

### New Shared Package

Create a new workspace package:

`packages/scaffolder-studio-linter`

Suggested exports:

1. `lintTemplateGraph(input, options?) => TemplateLintResult`
2. `createTemplateLintContext(input, dependencies?)`
3. `builtinRules`
4. `TemplateLintIssue`
5. `TemplateLintResult`
6. `TemplateLintSummary`
7. `TemplateLintRule`
8. `TemplateLintRequest`
9. `TemplateLintGraphSnapshot`

This package should be usable from:

1. the backend router/service,
2. tests,
3. a future CLI command,
4. any batch job or publish-time validator.

## FE/BE Contract

### Important Constraint

The frontend editor works on unsaved graph state. Because of that, linting cannot be `GET /templates/:id/lint` only. The backend must accept the current in-memory graph snapshot from the browser.

### Request Contract

Add a backend endpoint:

`POST /templates/lint`

Request body:

```ts
type TemplateLintRequest = {
  templateId?: string;
  nodes: TemplateLintNode[];
  edges: TemplateLintEdge[];
  options?: {
    includeRuleMetadata?: boolean;
  };
};
```

Use a backend-owned, serializable DTO. Do not make the linter contract depend on frontend component props or React Flow runtime state.

The DTO should intentionally ignore browser-only fields such as:

1. `selected`
2. `dragging`
3. callback functions like `onChange`
4. measured/layout cache
5. transient UI expansion state that has no lint meaning unless explicitly needed

The practical rule is:

1. FE may still send current `nodes` and `edges`,
2. but the backend endpoint should validate and normalize them into the linter package’s own graph snapshot shape before rule execution.

### Response Contract

Response body:

```ts
type TemplateLintResult = {
  issues: TemplateLintIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  meta: {
    rulesVersion: string;
    generatedAt: string;
  };
};
```

Keep the wire contract flat and backend-oriented.

Do not return UI-shaped structures such as `issuesByNodeId` as the primary contract. The frontend can derive grouping for badges or panels.

### TemplateLintIssue

```ts
type TemplateLintIssue = {
  id: string;
  ruleId: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId: string;
  fieldPath?: string;
  relatedNodeIds?: string[];
};
```

This is the stable contract between FE and BE.

The frontend should treat this as read-only diagnostic data, not editor state.

## Backend Responsibilities

### Router

Add a route in [router.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio-backend/src/router.ts):

`POST /templates/lint`

Responsibilities:

1. validate request body with `zod`,
2. resolve prefabs if needed,
3. fetch actions via `ScaffolderStudioService#getActions()`,
4. invoke the shared linter package,
5. return normalized issues.

### Service

Add backend orchestration in [ScaffolderVisualTemplateEditorService.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio-backend/src/service/ScaffolderVisualTemplateEditorService.ts):

Suggested method:

`lintTemplateGraph({ nodes, edges, templateId? }): Promise<TemplateLintResult>`

This service method should:

1. reuse current prefab resolution behavior where appropriate,
2. reuse backend action/schema lookup,
3. keep linter execution deterministic and side-effect free.

### Backend Extension Point

If custom rules are needed later, add them on the backend, not the frontend.

Preferred direction:

1. built-in rules live in the shared linter package,
2. backend may register additional org-specific rules through a backend extension point or service constructor,
3. FE remains unaware of execution details except for `ruleId` metadata in issues.

This keeps policy logic server-owned.

## Standalone Linter Package Design

### Package Principles

The linter package should not depend on:

1. React hooks,
2. Backstage APIs,
3. browser globals,
4. MUI components,
5. editor rendering logic.

It should accept plain data and return plain data.

### Inputs

The package should accept:

1. normalized graph snapshot,
2. resolved or raw node metadata needed by rules,
3. available actions/schemas,
4. optional custom rule list.

### Outputs

It should return:

1. flat issues,
2. summary counts,
3. optional execution metadata.

### Rule Execution Model

The package can still use a rules engine internally, but that engine belongs in the shared package, not the FE.

Suggested rule modules:

1. `unusedParametersRule`
2. `brokenReferencesRule`
3. `danglingEdgesRule`
4. `requiredFieldsRule`

These remain pure functions over normalized context.

## Shared Analysis Utilities

Move parsing and dependency inference into the shared linter package so both linting and other consumers can use the same semantics.

Suggested utilities:

1. `tokenParser.ts`
2. `dependencyAnalysis.ts`
3. `graphSnapshot.ts`
4. `normalizeRequest.ts`

Support both expression forms:

1. `steps['id'].output['key']`
2. `steps.id.output.key`

Also preserve parameter reference parsing and filter support.

## Frontend Changes

### Client Contract

Extend [ScaffolderVisualClient.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/api/ScaffolderVisualClient.ts):

```ts
lintTemplate({
  templateId,
  nodes,
  edges,
}: {
  templateId?: string;
  nodes: Node[];
  edges: Edge[];
}): Promise<TemplateLintResult>
```

### Frontend Hook

Replace the original plan for a local `useTemplateLinter` engine with a thin request hook, for example:

`useTemplateLintResult({ templateId, nodes, edges, enabled? })`

Responsibilities:

1. debounce requests,
2. cancel or ignore stale responses,
3. expose loading/error/result state,
4. derive `issuesByNodeId` locally for rendering convenience.

This hook should not contain lint rules.

### UI Integration

Use the backend result to drive:

1. `NodeLintBadge`,
2. tooltip contents,
3. future issue list panel,
4. click-to-focus navigation.

The FE should remain a presentation layer.

## Rule Set For V1

Keep the same initial checks, but move them into the shared package:

1. Unused Parameters
   Warning on unreferenced property nodes.

2. Broken References
   Error on unknown parameter names, unknown step IDs, or unknown outputs when schema is available.

3. Dangling Edges
   Warning when a manual structural/dependency connection has no matching inferred expression dependency.

4. Required Fields
   Warning for missing step basics and missing top-level required action inputs.

## Contract Decisions

### Decision 1: Flat Issues Over UI Maps

Return `issues[]` as the canonical payload.

Reason:

1. simpler wire contract,
2. backend remains presentation-agnostic,
3. frontend can group by node, severity, or panel section as needed.

### Decision 2: Snapshot POST Over Persisted GET

Lint current unsaved editor state through `POST /templates/lint`.

Reason:

1. the editor state often differs from what is persisted,
2. lint must react immediately to in-memory changes,
3. this matches existing backend patterns like `/template/serialize`.

### Decision 3: Backend Fetches Actions

Do not send `availableActions` from the frontend.

Reason:

1. the backend already owns action/schema retrieval,
2. this avoids large request payloads,
3. it removes FE/BE drift around schema shape.

### Decision 4: Backend Owns Custom Rule Registration

Do not expose a frontend API for custom rules.

Reason:

1. customer policy logic should not ship to the browser,
2. publish-time and editor-time diagnostics should share the same engine,
3. this allows future CI and batch reuse.

## Implementation Plan

1. Create `packages/scaffolder-studio-linter` with pure types, analysis helpers, built-in rules, and `lintTemplateGraph`.
2. Move expression parsing and dependency analysis logic into the shared package.
3. Add backend service orchestration that resolves prefabs, loads actions, and invokes the linter package.
4. Add `POST /templates/lint` to the backend router with request validation and normalized response output.
5. Extend the frontend API client with `lintTemplate`.
6. Replace the planned FE-local linter hook with a backend request hook.
7. Keep node badges and tooltips in FE, fed entirely by backend results.
8. Add tests for package rules, backend route/service behavior, and frontend presentation behavior.

## Testing Strategy

### Shared Package Tests

1. parser tests for dot and bracket syntax,
2. dependency inference tests,
3. rule tests for each built-in rule,
4. result normalization and deduplication tests.

### Backend Tests

1. route validation tests for malformed lint requests,
2. service tests for action enrichment and prefab resolution,
3. integration tests for end-to-end lint response shape.

### Frontend Tests

1. API client test for `POST /templates/lint`,
2. hook tests for debounce and stale response handling,
3. node badge tests for severity precedence and tooltip rendering,
4. optional E2E test for issue visibility on canvas.

## Rollout

1. Introduce the backend lint endpoint behind normal editor usage with no migration.
2. Keep lint advisory-only in v1.
3. Do not block save, publish, or draft persistence yet.
4. Once stable, consider reusing the same shared package during publish-time checks or CLI validation.

## Acceptance Criteria

1. Lint execution happens on the backend, not in the browser.
2. Lint logic exists in a standalone shared package reusable outside the editor UI.
3. Frontend only requests, caches, groups, and renders issues.
4. The FE/BE contract is a stable snapshot-in, issues-out API.
5. Existing dependency edge behavior remains consistent with lint reference analysis.
6. The same linter package can later be reused for backend publish validation or a CLI without rewriting rules.
