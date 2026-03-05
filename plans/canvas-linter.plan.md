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

Extension:

# Extensible Visual Dependency Linter (Built-ins + Customer Rules)

## Summary

Rework the linter into a small rules engine where current checks are first-class built-in rules, and customers can register organization-specific rules through a public frontend API contract.  
Execution remains frontend, synchronous, and advisory-only, with safe error isolation so one bad custom rule cannot break the editor.  
The existing node badge UX is preserved, but issue metadata is expanded to include originating rule IDs for traceability.

## Important Public API / Interface Additions

1. Add a public rule contract in [TemplateLinterTypes.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/linter/TemplateLinterTypes.ts):
   `TemplateLintRule`, `TemplateLintRuleContext`, `TemplateLintIssue`, `TemplateLintSeverity`, `TemplateLintResult`.
2. Add a public rules provider API in [TemplateLinterRulesApi.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/api/TemplateLinterRulesApi.ts):
   `templateLinterRulesApiRef` and `TemplateLinterRulesApi#getConfig(): { customRules; disabledBuiltInRuleIds }`.
3. Export extensibility entrypoints from package root via [index.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/index.ts) and [api/index.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/api/index.ts) so app integrators can register custom rules.
4. Register default API factories in both plugin entry models:
   [plugin.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/plugin.ts) and [alpha.tsx](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/alpha.tsx).

## End-to-End Implementation Plan

1. Introduce a dedicated linter engine layer.

- Add [TemplateLinterEngine.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/linter/TemplateLinterEngine.ts) that accepts graph snapshot + actions + rules config and returns normalized `TemplateLintResult`.
- Engine responsibilities:
  merge built-in and custom rules,
  apply built-in disable list,
  execute each rule in try/catch,
  normalize and dedupe issues,
  build `issuesByNodeId` map and severity summary.
- Define deterministic conflict behavior:
  if custom rule ID collides with an enabled built-in ID, custom is ignored and a console warning is emitted.
- Define deterministic fault behavior:
  if a rule throws, add synthetic advisory issue `rule-runtime-error` on template node (or first node fallback) and continue remaining rules.

2. Convert current four checks into built-in rule modules.

- Add built-in rules under [rules/builtin](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/linter/rules):
  `unusedParametersRule.ts`,
  `brokenReferencesRule.ts`,
  `danglingEdgesRule.ts`,
  `requiredFieldsRule.ts`.
- Each built-in rule implements the same `TemplateLintRule` contract as custom rules.
- Keep rule IDs stable and namespaced, for example:
  `scaffolder-studio/unused-parameters`,
  `scaffolder-studio/broken-references`,
  `scaffolder-studio/dangling-edges`,
  `scaffolder-studio/required-fields`.

3. Build shared analysis context for all rules.

- Add/extend shared utilities in [dependencyAnalysis.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/utils/dependencyAnalysis.ts) and [tokenParser.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/utils/tokenParser.ts).
- Provide precomputed context to rules:
  node maps by ID/type,
  property name set,
  step ID map,
  extracted expression references,
  inferred dependency pairs from references.
- Parser support includes both syntaxes you selected:
  `steps['id'].output['key']` and `steps.id.output.key`, with single/double quotes and filters.
- Reuse this same analysis for dependency-edge visualization to prevent drift.

4. Replace monolithic hook with engine-backed hook.

- Keep [useTemplateLinter.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/hooks/useTemplateLinter.ts) as thin orchestration:
  gather graph inputs,
  read rules config via `useApi(templateLinterRulesApiRef)`,
  call engine inside `useMemo`,
  return result for UI.
- Ensure hook remains read-only and does not mutate nodes or history state.

5. Integrate custom rules API into plugin DI.

- Add default implementation class in [TemplateLinterRulesApi.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/api/TemplateLinterRulesApi.ts) returning no custom rules and no disabled built-ins.
- Wire default factory in [plugin.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/plugin.ts).
- Wire corresponding `ApiBlueprint` in [alpha.tsx](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/alpha.tsx).
- Document override pattern for app consumers in [README.md](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/README.md), including sample custom rule registration and optional built-in disable list.

6. Keep UI indicators rule-agnostic.

- Keep node badge rendering generic, driven by issue list only, not hardcoded check types.
- Add/retain reusable badge component in [NodeLintBadge.tsx](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/nodes/NodeLintBadge.tsx).
- Tooltip should include issue text plus compact rule source label for debugging policy packs.
- Continue injecting issues by node ID from [Editor.tsx](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/Editor.tsx) into node wrappers, without storing lint data in node `data`.

7. Preserve and align dependency edge rendering.

- Refactor [useDependencyEdges.ts](/Users/kissmiklos/personal/scaffolder-studio/plugins/scaffolder-studio/src/components/Studio/hooks/useDependencyEdges.ts) to consume shared reference extraction utilities.
- This ensures dangling-edge rule and visual dependency edges are computed from identical parsing semantics.

8. Provide minimal rule authoring guardrails.

- Rule contract is synchronous and pure by convention.
- Context is immutable (readonly typed inputs) to prevent accidental mutation.
- Add helper utilities for common tasks (node lookup, token traversal) so customer rules avoid duplicated fragile parsing logic.
- Advisory-only enforcement: rule severities affect icon state and tooltip content but do not block save/publish/dry-run.

## Rule Contract (Implementation Spec)

1. `TemplateLintRule` fields:
   `id`, `title`, optional `description`, optional `defaultSeverity`, `evaluate(context)`.
2. `TemplateLintRuleContext` fields:
   `nodes`, `edges`, `availableActions`, `analysis`, `helpers`.
3. `TemplateLintIssue` fields:
   `id`, `ruleId`, `code`, `severity`, `message`, `nodeId`, optional `fieldPath`, optional `relatedNodeIds`.
4. Rule output requirements:
   stable IDs per issue instance,
   node-scoped anchoring for UI badges,
   no side effects.

## Customer Extension Flow (Target UX)

1. Customer creates one or more rules in app code, importing public linter types from this plugin package.
2. Customer overrides `templateLinterRulesApiRef` factory in app plugin wiring and returns:
   `customRules` and optional `disabledBuiltInRuleIds`.
3. Studio automatically runs built-ins + custom rules on graph changes and displays combined issues.

## Test Cases and Scenarios

1. Engine executes built-in rules and returns expected baseline issues for existing checks.
2. Custom rule returned by API contributes issues to the same node badge pipeline.
3. Disabled built-in IDs remove those built-ins from execution while leaving others active.
4. Duplicate custom rule IDs are handled deterministically and logged.
5. Rule throw does not crash editor and yields `rule-runtime-error` advisory issue.
6. Broken reference detection still works for bracket and dot syntax variants.
7. Dangling-edge rule still matches your selected manual-edge semantics.
8. Dependency edge visualization remains unchanged after shared-analysis refactor.
9. UI badge renders combined built-in + custom issues with correct severity precedence.
10. Undo/redo and draft persistence remain unaffected by linter execution.

## Rollout / Compatibility

1. No backend changes, migrations, or persisted schema changes.
2. Backward compatible defaults:
   if no custom API override is provided, behavior equals built-ins only.
3. Existing templates continue to load unchanged; only additional diagnostics may appear.
4. Docs update includes migration note that custom policy logic now belongs in frontend rule modules.

## Explicit Assumptions and Defaults

1. Custom rules execute in frontend only.
2. Rule source is code registration through API factory override, not per-template DSL.
3. Linter remains advisory-only and non-blocking.
4. Built-ins are enabled by default and may be disabled by explicit ID list.
5. Rule evaluation is synchronous; async/networked policy checks are out of scope for this iteration.
