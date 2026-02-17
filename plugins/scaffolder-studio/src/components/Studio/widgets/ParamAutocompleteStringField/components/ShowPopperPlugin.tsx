import React, { useCallback, useEffect, useState } from 'react';
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
  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(null);
  const [showParamDialog, setShowParamDialog] = useState(false);
  const [selectedFilterForParams, setSelectedFilterForParams] = useState<NunjucksFilter | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});

  const allParams = parameters || [];
  const allOutputs = outputs || [];

  // Create lookup maps for types
  const parameterTypeMap = new Map<string, string>();
  allParams.forEach((param: { name: string; type: string }) => {
    parameterTypeMap.set(param.name, param.type);
  });

  // Create a lookup map for output types
  const outputTypeMap = new Map<string, string>();
  allOutputs.forEach((output: { id: string; outputs: any }) => {
    if (output.outputs) {
      Object.entries(output.outputs).forEach(([key, value]: [string, any]) => {
        const fullKey = `${output.id}.${key}`;
        outputTypeMap.set(fullKey, value?.type);
      });
    }
  });

  // Merge built-in and custom filters, grouped by category
  const allFilters = [...NUNJUCKS_FILTERS, ...customFilters];
  const nunjucksFilters = allFilters.filter(f => f.category === 'nunjucks');
  const backstageFilters = allFilters.filter(f => f.category === 'backstage');

  const lastInsertedNodeKey = React.useRef<string | null>(null);

  const insertToken = (
    editor: any,
    display: string,
    fullExpression: string,
    color: string,
  ) => {
    let nodeKey: string | null = null;
    editor.update(() => {
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

      // Insert immediately - use unwrapped format since ${{ }} is already in the text from auto-complete
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

      // Insert immediately - use unwrapped format since ${{ }} is already in the text from auto-complete
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

  const isProcessingBraces = React.useRef(false);
  const prevTextContent = React.useRef('')

  useEffect(() => {
    const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
      if (isProcessingBraces.current) return;
      editorState.read(() => {

        const selection = $getSelection();
        if (!selection || !selection.isCollapsed()) return;

        if (!('anchor' in selection)) return;
        const rangeSelection = selection as any;

        // Get the current text content before the cursor
        const anchorNode = rangeSelection.anchor.getNode();
        const anchorOffset = rangeSelection.anchor.offset;


        if (anchorNode.getType() !== 'text') return;
        const textContent = anchorNode.getTextContent();
        const textBeforeCursor = textContent.slice(0, anchorOffset);
        const textAfterCursor = textContent.slice(anchorOffset);


        if (!prevTextContent.current.includes('${{') && textBeforeCursor.endsWith('${{') && !textAfterCursor.startsWith('  }}')) {
          const rootElement = editor.getRootElement();
          if (rootElement) {
            setAnchorEl(rootElement);
          }

          isProcessingBraces.current = true;

          editor.update(() => {
            const currentSelection = $getSelection();
            if (currentSelection) {

              currentSelection.insertText('  }}');

              const newSelection = $getSelection();
              if (newSelection && newSelection.isCollapsed() && 'anchor' in newSelection) {
                const ns = newSelection as any;
                const node = ns.anchor.getNode();
                const currentOffset = ns.anchor.offset;

                ns.anchor.set(node.getKey(), currentOffset - 3, 'text');
                ns.focus.set(node.getKey(), currentOffset - 3, 'text');
              }
            }
          }, {
            onUpdate: () => {
              isProcessingBraces.current = false;
            }
          });

          setShowAutocomplete(true);
          setViewMode('main');
          setSelectedToken(null);
          lastInsertedNodeKey.current = null;
        }
        prevTextContent.current = textBeforeCursor
      });
    });

    return editor.registerRootListener(rootElement => {
      if (rootElement === null) return;

      const handleBlur = () => {
        setShowAutocomplete(false);
      };

      rootElement.addEventListener('blur', handleBlur, true);

      return () => {
        rootElement.removeEventListener('blur', handleBlur, true);
        removeUpdateListener();
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
