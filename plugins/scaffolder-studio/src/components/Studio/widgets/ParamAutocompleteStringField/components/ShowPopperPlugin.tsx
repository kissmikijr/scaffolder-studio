import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $getNodeByKey } from 'lexical';
import { createToken } from '../createToken';
import { getColorForType } from '../../../utils/colorUtils';
import {
  ViewMode,
  SelectedToken,
  NunjucksFilter,
  NUNJUCKS_FILTERS,
} from './filterDefinitions';
import { AutocompletePopper } from './AutocompletePopper';
import { FilterParamDialog } from './FilterParamDialog';

export function ShowPopperPlugin({
  parameters,
  outputs,
  showAutocomplete,
  setShowAutocomplete,
  customFilters = [],
}: {
  parameters?: any;
  outputs?: any;
  showAutocomplete: boolean;
  setShowAutocomplete: (show: boolean) => void;
  customFilters?: NunjucksFilter[];
}) {
  const [editor] = useLexicalComposerContext();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(
    null,
  );
  const [showParamDialog, setShowParamDialog] = useState(false);
  const [selectedFilterForParams, setSelectedFilterForParams] =
    useState<NunjucksFilter | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const allParams = useMemo(() => parameters || [], [parameters]);
  const allOutputs = useMemo(() => outputs || [], [outputs]);

  // Create lookup maps for types
  const parameterTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    allParams.forEach((param: { name: string; type: string }) => {
      map.set(param.name, param.type);
    });
    return map;
  }, [allParams]);

  // Create a lookup map for output types
  const outputTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    allOutputs.forEach((output: { id: string; outputs: any }) => {
      if (output.outputs) {
        Object.entries(output.outputs).forEach(
          ([key, value]: [string, any]) => {
            const fullKey = `${output.id}.${key}`;
            map.set(fullKey, value?.type);
          },
        );
      }
    });
    return map;
  }, [allOutputs]);

  // Merge built-in and custom filters, grouped by category
  const allFilters = [...NUNJUCKS_FILTERS, ...customFilters];
  const nunjucksFilters = allFilters.filter(f => f.category === 'nunjucks');
  const backstageFilters = allFilters.filter(f => f.category === 'backstage');

  const lastInsertedNodeKey = useRef<string | null>(null);

  const insertToken = (
    lexicalEditor: any,
    display: string,
    fullExpression: string,
    color: string,
  ) => {
    let nodeKey: string | null = null;
    lexicalEditor.update(() => {
      const selection = $getSelection();
      if (selection !== null) {
        const textNode = createToken({ display, fullExpression, color });
        selection.insertNodes([textNode]);
        textNode.selectNext();
        nodeKey = textNode.getKey();
      }
    });
    return nodeKey;
  };

  const handleParamSelect = useCallback(
    (param: string) => {
      const paramType = parameterTypeMap.get(param);
      const color = getColorForType(paramType);

      const display = param;
      const baseExpression = `parameters.${param}`;

      // Insert immediately
      const fullExpression = baseExpression;
      const nodeKey = insertToken(editor, display, fullExpression, color);
      lastInsertedNodeKey.current = nodeKey;

      setSelectedToken({
        display: param,
        baseExpression: `parameters.${param}`,
        color,
      });
      setViewMode('filters');
    },
    [parameterTypeMap, editor],
  );

  const handleOutputSelect = useCallback(
    (output: { stepId: string; outputName: string }) => {
      const fullKey = `${output.stepId}.${output.outputName}`;
      const outputType = outputTypeMap.get(fullKey);
      const color = getColorForType(outputType);

      const display = `${output.stepId}.${output.outputName}`;
      const baseExpression = `steps['${output.stepId}'].output['${output.outputName}']`;

      // Insert immediately
      const fullExpression = baseExpression;
      const nodeKey = insertToken(editor, display, fullExpression, color);
      lastInsertedNodeKey.current = nodeKey;

      setSelectedToken({
        display: `${output.stepId}.${output.outputName}`,
        baseExpression: `steps['${output.stepId}'].output['${output.outputName}']`,
        color,
      });
      setViewMode('filters');
    },
    [outputTypeMap, editor],
  );

  const handleFilterSelect = useCallback(
    (filter: NunjucksFilter) => {
      // Check if filter requires parameters
      if (filter.requiresParams && filter.params) {
        // ... (existing param logic remains same, it handles null token internally if needed or we block it)
        // Initialize param values with defaults
        const initialValues: Record<string, string> = {};
        filter.params.forEach(param => {
          initialValues[param.name] = param.defaultValue;
        });
        setParamValues(initialValues);
        setSelectedFilterForParams(filter);
        setShowParamDialog(true);
        setShowAutocomplete(false);
      } else {
        // No parameters needed
        if (selectedToken) {
          // Apply filter to existing token (chaining)
          const newBaseExpression = `${selectedToken.baseExpression} | ${filter.syntax}`;
          const fullExpression = newBaseExpression;
          const newDisplay = `${selectedToken.display} | ${filter.name}`;

          if (lastInsertedNodeKey.current) {
            editor.update(() => {
              const node = $getNodeByKey(lastInsertedNodeKey.current!);
              if (node) {
                const newNode = createToken({
                  display: newDisplay,
                  fullExpression,
                  color: selectedToken.color,
                });
                node.replace(newNode);
                newNode.selectNext();
                // Update the node key to the new node
                lastInsertedNodeKey.current = newNode.getKey();
              }
            });
          }

          // Update selectedToken to allow chaining more filters
          setSelectedToken({
            display: newDisplay,
            baseExpression: newBaseExpression,
            color: selectedToken.color,
          });
        } else {
          // Insert filter at cursor position (no previous token selected)
          editor.update(() => {
            const selection = $getSelection();
            if (selection && selection.isCollapsed()) {
              // Check if there is a space before the cursor, if not add one
              // actually let's just insert " | filterName"
              selection.insertText(` | ${filter.syntax}`);
            }
          });
          // Close autocomplete after inserting
          setShowAutocomplete(false);
        }
      }
    },
    [editor, selectedToken, setShowAutocomplete],
  );

  const handleParamDialogSubmit = useCallback(() => {
    if (!selectedToken || !selectedFilterForParams) return;

    // Build filter syntax with user-provided values
    let filterSyntax = selectedFilterForParams.syntax;
    Object.entries(paramValues).forEach(([key, value]) => {
      filterSyntax = filterSyntax.replace(`{${key}}`, value);
    });

    const fullExpression = `${selectedToken.baseExpression} | ${filterSyntax}`;
    // Include the filter syntax with values in the display
    const display = `${selectedToken.display} | ${filterSyntax}`;

    if (lastInsertedNodeKey.current) {
      editor.update(() => {
        const node = $getNodeByKey(lastInsertedNodeKey.current!);
        if (node) {
          const newNode = createToken({
            display,
            fullExpression,
            color: selectedToken.color,
          });
          node.replace(newNode);
          newNode.selectNext();
        }
      });
    }

    // Reset state and close dialog and popper
    setShowParamDialog(false);
    setSelectedFilterForParams(null);
    setParamValues({});
    setViewMode('main');
    setSelectedToken(null);
    setShowAutocomplete(false);
    lastInsertedNodeKey.current = null;
  }, [
    editor,
    selectedToken,
    selectedFilterForParams,
    paramValues,
    setShowAutocomplete,
  ]);

  const handleParamDialogCancel = useCallback(() => {
    setShowParamDialog(false);
    setSelectedFilterForParams(null);
    setParamValues({});
  }, []);

  const handleParamChange = useCallback((paramName: string, value: string) => {
    setParamValues(prev => ({ ...prev, [paramName]: value }));
  }, []);

  const handleBackToMain = useCallback(() => {
    setViewMode('main');
    setSelectedToken(null);
    lastInsertedNodeKey.current = null;
  }, []);

  const handleNext = useCallback(() => {
    setViewMode('filters');
    setSelectedToken(null);
  }, []);

  useEffect(() => {
    return editor.registerRootListener(rootElement => {
      if (rootElement === null) return () => {};

      const handleFocus = () => {
        setAnchorEl(rootElement);
        setShowAutocomplete(true);
      };

      const handleBlur = () => {
        setShowAutocomplete(false);
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === ' ') {
          setViewMode('main');
          setSelectedToken(null);
          lastInsertedNodeKey.current = null;
        }
      };

      rootElement.addEventListener('focus', handleFocus, true);
      rootElement.addEventListener('click', handleFocus, true);
      rootElement.addEventListener('blur', handleBlur, true);
      rootElement.addEventListener('keydown', handleKeyDown, true);

      return () => {
        rootElement.removeEventListener('focus', handleFocus, true);
        rootElement.removeEventListener('click', handleFocus, true);
        rootElement.removeEventListener('blur', handleBlur, true);
        rootElement.removeEventListener('keydown', handleKeyDown, true);
      };
    });
  }, [editor, setShowAutocomplete]);

  return (
    <>
      <AutocompletePopper
        open={showAutocomplete}
        anchorEl={anchorEl}
        viewMode={viewMode}
        selectedToken={selectedToken}
        parameters={allParams}
        outputs={allOutputs}
        nunjucksFilters={nunjucksFilters}
        backstageFilters={backstageFilters}
        onParamSelect={handleParamSelect}
        onOutputSelect={handleOutputSelect}
        onFilterSelect={handleFilterSelect}
        onBack={handleBackToMain}
        onNext={handleNext}
      />
      <FilterParamDialog
        open={showParamDialog}
        filter={selectedFilterForParams}
        paramValues={paramValues}
        onParamChange={handleParamChange}
        onSubmit={handleParamDialogSubmit}
        onCancel={handleParamDialogCancel}
      />
    </>
  );
}
