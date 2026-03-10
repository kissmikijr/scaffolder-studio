import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $getRoot,
  $getNodeByKey,
  $isRangeSelection,
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import { NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { createToken } from '../createToken';
import { getColorForType } from '../../../utils/colorUtils';
import {
  ViewMode,
  SelectedToken,
  NunjucksFilter,
  NUNJUCKS_FILTERS,
} from './filterDefinitions';
import { getMainViewOptions, MainViewOption } from './MainView';
import { getFilterViewOptions, FilterViewOption } from './FilterView';
import { AutocompletePopper } from './AutocompletePopper';
import { FilterParamDialog } from './FilterParamDialog';
import { ExpressionTokenNode } from '../ExpressionTokenNode';

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
  const isExpressionTokenNode = (
    node: unknown,
  ): node is ExpressionTokenNode => {
    return (
      !!node &&
      typeof (node as any).getType === 'function' &&
      (node as any).getType() === 'expression-token-node' &&
      typeof (node as any).getFullExpression === 'function'
    );
  };

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
  const [activeMainOptionIndex, setActiveMainOptionIndex] = useState(0);
  const [activeFilterOptionIndex, setActiveFilterOptionIndex] = useState(0);

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

  // Merge built-in and custom filters, grouped by category
  const allFilters = [...NUNJUCKS_FILTERS, ...customFilters];
  const nunjucksFilters = allFilters.filter(f => f.category === 'nunjucks');
  const backstageFilters = allFilters.filter(f => f.category === 'backstage');
  const mainViewOptions = useMemo(
    () => getMainViewOptions(allParams, allOutputs),
    [allParams, allOutputs],
  );
  const filterViewOptions = useMemo(
    () => getFilterViewOptions(nunjucksFilters, backstageFilters),
    [nunjucksFilters, backstageFilters],
  );

  const lastInsertedNodeKey = useRef<string | null>(null);
  const showAutocompleteRef = useRef(showAutocomplete);
  const viewModeRef = useRef(viewMode);
  const activeMainOptionIndexRef = useRef(activeMainOptionIndex);
  const activeFilterOptionIndexRef = useRef(activeFilterOptionIndex);
  const mainViewOptionsRef = useRef(mainViewOptions);
  const filterViewOptionsRef = useRef(filterViewOptions);
  const handleMainViewOptionSelectRef = useRef<
    (option: MainViewOption) => void
  >(() => {});
  const handleFilterViewOptionSelectRef = useRef<
    (option: FilterViewOption) => void
  >(() => {});

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
      const color = NodeTypeColors.step;

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
    [editor],
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
        let chainedToken: {
          display: string;
          baseExpression: string;
          color: string;
        } | null = null;
        let insertedAtCursor = false;

        editor.update(() => {
          const selection = $getSelection();
          const root = $getRoot();

          const resolveTargetToken = (): ExpressionTokenNode | null => {
            const byLastInsertedKey = lastInsertedNodeKey.current
              ? $getNodeByKey(lastInsertedNodeKey.current)
              : null;
            if (isExpressionTokenNode(byLastInsertedKey)) {
              return byLastInsertedKey;
            }

            if ($isRangeSelection(selection)) {
              const anchorNode = selection.anchor.getNode();
              if (isExpressionTokenNode(anchorNode)) {
                return anchorNode;
              }

              const previousSibling = anchorNode.getPreviousSibling();
              if (isExpressionTokenNode(previousSibling)) {
                return previousSibling;
              }

              const nextSibling = anchorNode.getNextSibling();
              if (isExpressionTokenNode(nextSibling)) {
                return nextSibling;
              }
            }

            const textNodes = root.getAllTextNodes();
            for (let i = textNodes.length - 1; i >= 0; i -= 1) {
              const candidate = textNodes[i];
              if (isExpressionTokenNode(candidate)) {
                return candidate;
              }
            }

            return null;
          };

          const targetToken = resolveTargetToken();

          if (targetToken) {
            const existingExpression = targetToken.getFullExpression();
            const existingDisplay = targetToken.getTextContent();
            const color = targetToken.getColor();
            const newBaseExpression = `${existingExpression} | ${filter.syntax}`;
            const newDisplay = `${existingDisplay} | ${filter.name}`;

            const newNode = createToken({
              display: newDisplay,
              fullExpression: newBaseExpression,
              color,
            });
            targetToken.replace(newNode);
            newNode.selectNext();
            lastInsertedNodeKey.current = newNode.getKey();

            chainedToken = {
              display: newDisplay,
              baseExpression: newBaseExpression,
              color,
            };
            return;
          }

          if (selection && selection.isCollapsed()) {
            selection.insertText(` | ${filter.syntax}`);
            insertedAtCursor = true;
          }
        });

        if (chainedToken) {
          setSelectedToken(chainedToken);
        } else if (insertedAtCursor) {
          setShowAutocomplete(false);
        }
      }
    },
    [editor, setShowAutocomplete],
  );

  const handleParamDialogSubmit = useCallback(() => {
    if (!selectedFilterForParams) return;

    // Build filter syntax with user-provided values
    let filterSyntax = selectedFilterForParams.syntax;
    Object.entries(paramValues).forEach(([key, value]) => {
      filterSyntax = filterSyntax.replace(`{${key}}`, value);
    });

    editor.update(() => {
      const selection = $getSelection();
      const root = $getRoot();
      let targetToken: ExpressionTokenNode | null = null;

      if (lastInsertedNodeKey.current) {
        const byLastInsertedKey = $getNodeByKey(lastInsertedNodeKey.current);
        if (isExpressionTokenNode(byLastInsertedKey)) {
          targetToken = byLastInsertedKey;
        }
      }

      if (!targetToken && $isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        if (isExpressionTokenNode(anchorNode)) {
          targetToken = anchorNode;
        } else {
          const previousSibling = anchorNode.getPreviousSibling();
          if (isExpressionTokenNode(previousSibling)) {
            targetToken = previousSibling;
          }
        }
      }

      if (!targetToken) {
        const textNodes = root.getAllTextNodes();
        for (let i = textNodes.length - 1; i >= 0; i -= 1) {
          const candidate = textNodes[i];
          if (isExpressionTokenNode(candidate)) {
            targetToken = candidate;
            break;
          }
        }
      }

      if (targetToken) {
        const fullExpression = `${targetToken.getFullExpression()} | ${filterSyntax}`;
        const display = `${targetToken.getTextContent()} | ${filterSyntax}`;
        const newNode = createToken({
          display,
          fullExpression,
          color: targetToken.getColor(),
        });
        targetToken.replace(newNode);
        newNode.selectNext();
        lastInsertedNodeKey.current = newNode.getKey();
      } else if (selection && selection.isCollapsed()) {
        selection.insertText(` | ${filterSyntax}`);
      }
    });

    // Reset state and close dialog and popper
    setShowParamDialog(false);
    setSelectedFilterForParams(null);
    setParamValues({});
    setViewMode('main');
    setSelectedToken(null);
    setShowAutocomplete(false);
    lastInsertedNodeKey.current = null;
  }, [editor, selectedFilterForParams, paramValues, setShowAutocomplete]);

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

  const handleMainViewOptionSelect = useCallback(
    (option: MainViewOption) => {
      if (option.kind === 'next') {
        handleNext();
        return;
      }

      if (option.kind === 'param') {
        handleParamSelect(option.name);
        return;
      }

      handleOutputSelect({
        stepId: option.stepId,
        outputName: option.outputName,
      });
    },
    [handleNext, handleOutputSelect, handleParamSelect],
  );

  const moveMainViewSelection = useCallback((direction: 1 | -1) => {
    const options = mainViewOptionsRef.current;
    if (options.length === 0) {
      return;
    }

    setActiveMainOptionIndex(prev => {
      const normalizedPrev = prev >= 0 && prev < options.length ? prev : 0;
      const nextIndex =
        (normalizedPrev + direction + options.length) % options.length;
      activeMainOptionIndexRef.current = nextIndex;
      return nextIndex;
    });
  }, []);

  const handleActiveOptionChange = useCallback((index: number) => {
    activeMainOptionIndexRef.current = index;
    setActiveMainOptionIndex(index);
  }, []);

  const handleFilterViewOptionSelect = useCallback(
    (option: FilterViewOption) => {
      handleFilterSelect(option.filter);
    },
    [handleFilterSelect],
  );

  const moveFilterViewSelection = useCallback((direction: 1 | -1) => {
    const options = filterViewOptionsRef.current;
    if (options.length === 0) {
      return;
    }

    setActiveFilterOptionIndex(prev => {
      const normalizedPrev = prev >= 0 && prev < options.length ? prev : 0;
      const nextIndex =
        (normalizedPrev + direction + options.length) % options.length;
      activeFilterOptionIndexRef.current = nextIndex;
      return nextIndex;
    });
  }, []);

  const handleFilterActiveOptionChange = useCallback((index: number) => {
    activeFilterOptionIndexRef.current = index;
    setActiveFilterOptionIndex(index);
  }, []);

  useEffect(() => {
    showAutocompleteRef.current = showAutocomplete;
  }, [showAutocomplete]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    activeMainOptionIndexRef.current = activeMainOptionIndex;
  }, [activeMainOptionIndex]);

  useEffect(() => {
    activeFilterOptionIndexRef.current = activeFilterOptionIndex;
  }, [activeFilterOptionIndex]);

  useEffect(() => {
    mainViewOptionsRef.current = mainViewOptions;
  }, [mainViewOptions]);

  useEffect(() => {
    filterViewOptionsRef.current = filterViewOptions;
  }, [filterViewOptions]);

  useEffect(() => {
    handleMainViewOptionSelectRef.current = handleMainViewOptionSelect;
  }, [handleMainViewOptionSelect]);

  useEffect(() => {
    handleFilterViewOptionSelectRef.current = handleFilterViewOptionSelect;
  }, [handleFilterViewOptionSelect]);

  useEffect(() => {
    if (!showAutocomplete || viewMode !== 'main') {
      handleActiveOptionChange(0);
      return;
    }

    if (
      mainViewOptions.length === 0 ||
      activeMainOptionIndex < 0 ||
      activeMainOptionIndex >= mainViewOptions.length
    ) {
      handleActiveOptionChange(0);
    }
  }, [
    activeMainOptionIndex,
    handleActiveOptionChange,
    mainViewOptions.length,
    showAutocomplete,
    viewMode,
  ]);

  useEffect(() => {
    if (!showAutocomplete || viewMode !== 'filters') {
      handleFilterActiveOptionChange(0);
      return;
    }

    if (
      filterViewOptions.length === 0 ||
      activeFilterOptionIndex < 0 ||
      activeFilterOptionIndex >= filterViewOptions.length
    ) {
      handleFilterActiveOptionChange(0);
    }
  }, [
    activeFilterOptionIndex,
    filterViewOptions.length,
    handleFilterActiveOptionChange,
    showAutocomplete,
    viewMode,
  ]);

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

      rootElement.addEventListener('focus', handleFocus, true);
      rootElement.addEventListener('click', handleFocus, true);
      rootElement.addEventListener('blur', handleBlur, true);

      return () => {
        rootElement.removeEventListener('focus', handleFocus, true);
        rootElement.removeEventListener('click', handleFocus, true);
        rootElement.removeEventListener('blur', handleBlur, true);
      };
    });
  }, [editor, setShowAutocomplete]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (e: KeyboardEvent) => {
        if (e.key === ' ') {
          setViewMode('main');
          setSelectedToken(null);
          lastInsertedNodeKey.current = null;
          return false;
        }

        if (!showAutocompleteRef.current) {
          return false;
        }

        if (viewModeRef.current === 'main') {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            moveMainViewSelection(e.key === 'ArrowDown' ? 1 : -1);
            return true;
          }

          if (e.key === 'Enter') {
            const options = mainViewOptionsRef.current;
            if (options.length === 0) {
              return false;
            }

            e.preventDefault();
            e.stopPropagation();
            const activeOption =
              options[activeMainOptionIndexRef.current] ?? options[0];
            handleMainViewOptionSelectRef.current(activeOption);
            return true;
          }
        }

        if (viewModeRef.current === 'filters') {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            moveFilterViewSelection(e.key === 'ArrowDown' ? 1 : -1);
            return true;
          }

          if (e.key === 'Enter') {
            const options = filterViewOptionsRef.current;
            if (options.length === 0) {
              return false;
            }

            e.preventDefault();
            e.stopPropagation();
            const activeOption =
              options[activeFilterOptionIndexRef.current] ?? options[0];
            handleFilterViewOptionSelectRef.current(activeOption);
            return true;
          }
        }

        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor, moveFilterViewSelection, moveMainViewSelection]);

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
        activeOptionIndex={
          viewMode === 'main' ? activeMainOptionIndex : activeFilterOptionIndex
        }
        onActiveOptionChange={
          viewMode === 'main'
            ? handleActiveOptionChange
            : handleFilterActiveOptionChange
        }
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
