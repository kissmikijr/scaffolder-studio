# Visual Dependency Linter (Health Checks) Implementation Plan

## Summary

Implement a frontend-only background linter that continuously analyzes the template graph and surfaces node-level issues without requiring dry-run.  
The solution adds a new `useTemplateLinter` hook, extends expression parsing, computes four check families (unused parameters, broken references, dangling dependency edges, required fields), and renders compact warning/error badges with tooltip details on affected nodes.

## Public Interfaces and Types

1. Add a new hook in [useTemplateLinter.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/hooks/useTemplateLinter.ts) with this public contract:
   `useTemplateLinter({ nodes, edges, availableActions, enabled? }) => { issues, issuesByNodeId, summary }`.
2. Add exported linter types from the same file and re-export via [hooks/index.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/hooks/index.ts):
   `TemplateLintSeverity`, `TemplateLintCode`, `TemplateLintIssue`, `TemplateLintResult`.
3. Add optional node component prop shape (internal UI interface only, no backend API change):
   `lintIssues?: TemplateLintIssue[]` for step/output/property/parameters node renderers.
4. No backend endpoints, DB schema, or persisted project format changes.

## Implementation Plan

1. Create shared dependency/reference analysis utility.

- Add [dependencyAnalysis.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/utils/dependencyAnalysis.ts) to centralize expression scanning and inferred dependency pair creation.
- Move common extraction logic out of [useDependencyEdges.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/hooks/useDependencyEdges.ts) into this utility so dependency rendering and lint checks stay consistent.
- Provide functions for:
  `collectExpressionReferences(nodes)`,
  `buildInferredDependencyPairs(references, nodeLookup)`,
  `getNodeExpressionTargets(node)`.

2. Extend expression parser to support canonical + imported syntax.

- Update [tokenParser.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/utils/tokenParser.ts) to parse both:
  `steps['id'].output['key']` and `steps.id.output.key`, including single/double quote variants.
- Preserve current filter support (`| trim`, etc.) and existing parameter pattern support.
- Keep output compatible with existing token rendering in expression editor/viewer.

3. Implement `useTemplateLinter` with deterministic rule execution.

- In [useTemplateLinter.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/hooks/useTemplateLinter.ts), compute results in `useMemo` using only `nodes`, `edges`, and `availableActions`.
- Rule A: Unused Parameters.
  Emit warning on `property` nodes whose `name` is never referenced in any expression token.
- Rule B: Broken References.
  Emit error when expression references unknown parameter name, unknown step ID, or unknown output key on a known step with known output schema.
- Rule C: Dangling Edges.
  Based on your chosen rule, inspect manual graph edges where source is `property|step` and target is `step|templateOutput`; warn if that source→target pair is not present in inferred expression dependencies.
- Rule D: Required Fields.
  Warn on step nodes missing `stepId`, `name`, or `actionId`, and warn on missing values for `schema.input.required` top-level keys when action/schema is available.
- Deduplicate issues by `(code,nodeId,fieldPath,message)` and provide stable sort order for predictable tooltips/tests.

4. Render node-level indicators with tooltip details.

- Add [NodeLintBadge.tsx](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/nodes/NodeLintBadge.tsx) as a compact reusable badge.
- Badge behavior:
  show only on nodes with issues,
  error icon/color if any error exists else warning icon/color,
  tooltip lists all issue messages for that node.
- Place badge at top-left to avoid collision with existing comment badge at top-right.
- Add `data-testid` hooks for unit/e2e checks.

5. Inject linter issues into node renderers without mutating node data.

- In [Editor.tsx](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/Editor.tsx), call `useTemplateLinter`.
- Replace static `nodeTypes` usage with memoized wrappers that pass `lintIssues` by node ID to node components.
- Update [nodeTypes.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/nodes/nodeTypes.ts) if needed to support wrapper creation, or keep wrappers local in `Editor.tsx`.
- Integrate badge into:
  [StepNode.tsx](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/nodes/step/StepNode.tsx),
  [OutputNode.tsx](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/nodes/output/OutputNode.tsx),
  [PropertyNode.tsx](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/nodes/property/PropertyNode.tsx),
  [ParametersNode.tsx](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/nodes/parameters/ParametersNode.tsx).
- Keep linter non-blocking and read-only; no `onChange` dispatches, no history writes.

6. Keep dependency edge rendering aligned.

- Refactor [useDependencyEdges.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/hooks/useDependencyEdges.ts) to consume the new shared analysis utility.
- Preserve existing edge style/type and handle placement behavior so current UX does not regress.

7. Add tests across parser, hook, UI, and e2e flow.

- Unit tests for parser and dependency extraction:
  add/update tests near [useDependencyEdges.test.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/hooks/__tests__/useDependencyEdges.test.ts).
- Hook tests for linter:
  add [useTemplateLinter.test.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/hooks/__tests__/useTemplateLinter.test.ts).
- Node UI tests:
  add badge rendering/tooltip tests in node component test files, including severity precedence and multi-issue tooltip content.
- E2E:
  add [template-linter.spec.ts](/Users/kissmiklos/personal/scaffolder-studio/packages/app/e2e-tests/scaffolder/template-linter.spec.ts) and extend page object [ScaffolderStudioPage.ts](/Users/kissmiklos/personal/scaffolder-studio/packages/app/e2e-tests/pages/ScaffolderStudioPage.ts) with lint-badge helpers.

## Test Cases and Scenarios

1. Unused parameter warning appears on an unreferenced property and disappears after the parameter is referenced by a step input.
2. Broken step reference error appears when an expression references a missing step ID.
3. Broken output reference error appears when expression references a missing output key on a known step schema.
4. Dot syntax (`steps.foo.output.bar`) and bracket syntax (`steps['foo'].output['bar']`) both resolve correctly.
5. Dangling edge warning appears for manual `step/property -> step/output` connection without matching expression dependency and clears when expression is added.
6. Required-field warnings appear for missing step id/name/action and missing required action input fields.
7. Badge severity is error-over-warning when both exist; tooltip shows all node issues.
8. Undo/redo and draft persistence remain unaffected by linter recomputation.

## Rollout and Acceptance

1. Rollout is immediate and frontend-only, with no migration needed.
2. Acceptance criteria:
   linter updates automatically when graph or actions change,
   no dry-run required,
   each issue is visible on its node via icon + tooltip,
   existing dependency-edge toggle behavior remains intact,
   no unintended writes to project state/history.

## Assumptions and Defaults

1. Dangling-edge rule uses manual graph edges from `property|step` to `step|templateOutput`, excluding relationship/dependency synthetic edges.
2. Required checks include both step basics (`id/name/action`) and action schema required inputs.
3. Broken-reference parser supports both bracket and dot expression syntax with single/double quote variants.
4. Required input validation is top-level schema `required` keys only (no deep JSON-schema traversal in v1).
5. If action output schema is unavailable, output-key existence is not enforced to avoid false positives.
