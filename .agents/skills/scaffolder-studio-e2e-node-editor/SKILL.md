---
name: scaffolder-studio-e2e-node-editor
description: Write and debug Playwright E2E tests for Scaffolder Studio's node editor and relationship graph. Use when adding or fixing tests under packages/app/e2e-tests/scaffolder, especially for node selection, drag-and-drop handles, side panel behavior, relationship overlays, zen mode focus, and viewport-sensitive interactions requiring collapse side content and fit view.
---

# Scaffolder Studio E2e Node Editor

Write tests by reusing the existing page objects and viewport-stabilization helpers instead of ad-hoc locators.

## Canonical Files

- Read and extend `packages/app/e2e-tests/pages/ScaffolderStudioPage.ts` first.
- Add new specs under `packages/app/e2e-tests/scaffolder/*.spec.ts`.
- Follow patterns in:
  - `packages/app/e2e-tests/scaffolder/relationship-io.spec.ts`
  - `packages/app/e2e-tests/scaffolder/zen-mode.spec.ts`
  - `packages/app/e2e-tests/scaffolder/node-comments.spec.ts`

## Quick Start Workflow

1. Initialize pages in each spec:

```ts
let listPage: ScaffolderStudioListPage;
let editorPage: ScaffolderStudioPage;

test.beforeEach(async ({ page }) => {
  listPage = new ScaffolderStudioListPage(page);
  editorPage = new ScaffolderStudioPage(page);
});

test.afterEach(async () => {
  await listPage?.cleanupCreatedTemplates();
});
```

2. Start every flow with deterministic setup:

   - `await listPage.goto()`
   - `await listPage.createNewTemplate()`
   - `await editorPage.verifyLoaded()`

3. Stabilize viewport before graph interactions:
   - Call `await editorPage.collapseSideContent()` before selecting, dragging, or handle checks.
   - Call `await editorPage.fitView()` after node creation bursts and before drag operations.

## Node Canvas Stability Rules

- Prefer page-object helpers over direct canvas selectors:
  - `selectNode`
  - `toggleStepIoByNodeText`
  - `connectRelationship`
  - `dragFromNodeTypeHandleToOffset`
- Use polling assertions for dynamic graph state:
  - `expect.poll(() => editorPage.countRelationshipEdges())`
  - `await editorPage.waitForRelationshipEdges(count => count >= 1)`
- Keep `waitForTimeout` as a last resort for known animation windows only (fitView animation, post-drag settling).

## Collapse Side Content + Fit View Playbook

Use this exact sequence when the test manipulates nodes/handles in dense templates:

```ts
await editorPage.collapseSideContent();
await editorPage.fitView();
await editorPage.waitForRelationshipEdges(count => count >= 0); // optional sync point
```

Apply the sequence:

- Before drag-and-drop between handles.
- After opening/closing side content if element coordinates are reused.
- Before asserting handle visibility in node-heavy graphs.

## Recommended Assertion Patterns

- Assert visible behavior, not implementation internals.
- Assert edge visibility by class/data-id count instead of SVG path geometry.
- For zen mode, assert both:
  - non-relationship edges hidden (`countNonRelationshipEdges() === 0`)
  - focused node/neighbor opacity expected values.

## Common Pitfalls To Avoid

- Do not click blank pane to clear selection in tests unless the flow explicitly needs it.
- Do not hardcode fragile `nth-child` selectors for node internals.
- Do not depend on side panel open width during handle drag tests; collapse it first.
- Do not assert immediately after mutation when graph layout is asynchronous; use `expect.poll`.

## Test Execution

- Run one spec:
  - `yarn test:e2e packages/app/e2e-tests/scaffolder/zen-mode.spec.ts`
- Run one test by title:
  - `yarn test:e2e packages/app/e2e-tests/scaffolder/relationship-io.spec.ts -g "property -> step input drag inserts token"`
- Debug headed:
  - `yarn test:e2e --headed packages/app/e2e-tests/scaffolder/zen-mode.spec.ts`
- Debug inspector:
  - `yarn test:e2e --debug packages/app/e2e-tests/scaffolder/relationship-io.spec.ts`
