import React, { useState, useCallback, useMemo } from 'react';
import { Typography, TextField, Box, Tooltip, Menu, MenuItem, ListSubheader } from '@mui/material';
import { StyledIconButton } from '../../components/StyledIconButton';
import AddIcon from '@mui/icons-material/Add';
import { AllNodeData, OutputNodeData, PropertyNodeData, StepNodeData } from '../../types';
import { Node, useNodes, useEdges } from '@xyflow/react';
import { outputSchema } from './schema';
import CloseIcon from '@mui/icons-material/Close';

import { NodeTypeColors, traverseUpFromNode } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { StepNodeExpressionField } from '../step/StepNodeExpressionField';
import { MarkdownEditor } from '../../components/MarkdownEditor';

type ValidationErrors = {
  links: Record<number, Record<string, string>>;
  text: Record<number, Record<string, string>>;
};

export const OutputNodeSideContent = ({
  id,
  node,
  disabled = false,
}: {
  id: string;
  node?: Node<OutputNodeData>;
  disabled?: boolean;
}) => {
  const nodes = useNodes<Node<AllNodeData>>();
  const edges = useEdges();
  const currentNode =
    node || useMemo(() => nodes.find(n => n.id === id), [nodes, id]);
  const currentData = currentNode?.data as OutputNodeData;

  const allParentSteps = traverseUpFromNode(
    id,
    edges,
    nodes.filter(n => n.type === 'step'),
  ).slice(1);

  const allParentStepsOutputs = (
    allParentSteps as Node<StepNodeData>[]
  ).flatMap(s => {
    return {
      id: s.data.stepId || '',
      outputs: s.data.schema?.output?.properties,
    };
  });

  const propertyNodes = useMemo(
    () => nodes.filter(n => n.type === 'property'),
    [nodes],
  );

  const parameters = useMemo(
    () =>
      propertyNodes.map(pn => ({
        name: (pn.data as PropertyNodeData).name,
        type: (pn.data as PropertyNodeData).variableType,
      })),
    [propertyNodes],
  );

  // State for Variable Picker Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeFieldIndex, setActiveFieldIndex] = useState<number | 'new' | null>(null);
  const open = Boolean(anchorEl);


  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActiveFieldIndex(null);
  };

  const insertVariable = (variable: string) => {
    if (activeFieldIndex === 'new') {
      const currentContent = newText.content;
      const newContent = currentContent + variable;
      setNewText({ ...newText, content: newContent });
    } else if (typeof activeFieldIndex === 'number') {
      const textItem = (currentData.text || [])[activeFieldIndex];
      const newContent = (textItem.content || '') + variable;
      const newTextArray = [...(currentData.text || [])];
      newTextArray[activeFieldIndex] = { ...textItem, content: newContent };

      handleChange({
        links: currentData.links || [],
        text: newTextArray,
      });
      validate(currentData.links || [], newTextArray);
    }
    handleCloseMenu();
  };

  const [newLink, setNewLink] = useState<{ title: string; url: string; icon?: string }>({
    title: '',
    url: '',
    icon: undefined,
  });

  const [newText, setNewText] = useState<{ title: string; content: string }>({
    title: '',
    content: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({
    links: {},
    text: {},
  });

  const handleChange = useCallback(
    (newData: Pick<OutputNodeData, 'links' | 'text'>) => {
      if (currentData?.onChange) {
        currentData.onChange?.(id, { ...currentData, ...newData });
      }
    },
    [currentData, id],
  );

  const validate = useCallback(
    (links: OutputNodeData['links'], text: OutputNodeData['text']): boolean => {
      const result = outputSchema.safeParse({ links, text });
      if (!result.success) {
        const formatted: ValidationErrors = {
          links: {},
          text: {},
        };
        for (const issue of result.error.issues) {
          const [key, index, field] = issue.path;

          if (
            typeof key === 'string' &&
            (key === 'links' || key === 'text') &&
            typeof index === 'number' &&
            typeof field === 'string'
          ) {
            if (!formatted[key][index]) {
              formatted[key][index] = {};
            }
            formatted[key][index][field] = issue.message;
          }
        }
        setErrors(formatted);
        return false;
      }
      setErrors({ links: {}, text: {} });
      return true;
    },
    [],
  );

  const handleAddLink = useCallback(() => {
    const newLinks = [...(currentData.links || []), newLink];
    if (validate(newLinks, currentData.text || [])) {
      handleChange({ links: newLinks, text: currentData.text || [] });
      setNewLink({ title: '', url: '', icon: undefined });
    }
  }, [currentData, handleChange, newLink, validate]);

  const handleAddText = useCallback(() => {
    const newTextArray = [...(currentData.text || []), newText];
    if (validate(currentData.links || [], newTextArray)) {
      handleChange({ links: currentData.links || [], text: newTextArray });
      setNewText({ title: '', content: '' });
    }
  }, [currentData, handleChange, newText, validate]);

  const handleDeleteLink = useCallback(
    (index: number) => {
      if (currentData?.links) {
        const newLinks = [...currentData.links];
        newLinks.splice(index, 1);
        handleChange({ links: newLinks, text: currentData.text || [] });
        validate(newLinks, currentData.text || []);
      }
    },
    [currentData, handleChange, validate],
  );

  const handleDeleteText = useCallback(
    (index: number) => {
      if (currentData?.text) {
        const newTextArray = [...currentData.text];
        newTextArray.splice(index, 1);
        handleChange({ links: currentData.links || [], text: newTextArray });
        validate(currentData.links || [], newTextArray);
      }
    },
    [currentData, handleChange, validate],
  );

  if (!currentNode || !currentData) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        opacity: disabled ? 0.7 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            borderRadius: '4px',
            backgroundColor: NodeTypeColors.templateOutput,
            flexShrink: 0,
          }}
        />
        <Typography variant="h6" sx={{ m: 0 }}>
          Output
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle1">Links</Typography>
        {(currentData.links || []).map((link, index) => (
          <Box
            key={index}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Title"
                value={link.title}
                size="small"
                error={!!errors.links?.[index]?.title}
                helperText={errors.links?.[index]?.title}
                fullWidth
                onChange={e => {
                  const newLinks = [...(currentData.links || [])];
                  newLinks[index] = { ...link, title: e.target.value };
                  handleChange({
                    links: newLinks,
                    text: currentData.text || [],
                  });
                  validate(newLinks, currentData.text || []);
                }}
              />
              <Tooltip title="Delete">
                <StyledIconButton
                  size="small"
                  onClick={() => handleDeleteLink(index)}
                >
                  <CloseIcon />
                </StyledIconButton>
              </Tooltip>
            </Box>
            <TextField
              label="Icon"
              value={link.icon || ''}
              fullWidth
              placeholder="e.g. catalog, external, github"
              InputLabelProps={{ shrink: true }}
              onChange={e => {
                const newLinks = [...(currentData.links || [])];
                newLinks[index] = { ...link, icon: e.target.value || undefined };
                handleChange({
                  links: newLinks,
                  text: currentData.text || [],
                });
                validate(newLinks, currentData.text || []);
              }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                URL
              </Typography>
              <StepNodeExpressionField
                value={link.url || ''}
                onChange={val => {
                  const newLinks = [...(currentData.links || [])];
                  newLinks[index] = { ...link, url: val };
                  handleChange({
                    links: newLinks,
                    text: currentData.text || [],
                  });
                  validate(newLinks, currentData.text || []);
                }}
                parameters={parameters}
                outputs={allParentStepsOutputs}
                disableWrapper
              />
              {!!errors.links?.[index]?.url && (
                <Typography variant="caption" color="error">
                  {errors.links?.[index]?.url}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
        <Box
          data-testid="new-link-box"
          sx={{
            p: 2,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <Typography variant="subtitle2" color="text.secondary">New Link</Typography>
          <TextField
            label="Title"
            value={newLink.title}
            size="small"
            fullWidth
            error={!!errors.links?.[(currentData.links || []).length]?.title}
            helperText={errors.links?.[(currentData.links || []).length]?.title}
            onChange={e => setNewLink({ ...newLink, title: e.target.value })}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              URL
            </Typography>
            <StepNodeExpressionField
              value={newLink.url}
              onChange={val => setNewLink({ ...newLink, url: val })}
              parameters={parameters}
              outputs={allParentStepsOutputs}
              disableWrapper
            />
            {!!errors.links?.[(currentData.links || []).length]?.url && (
              <Typography variant="caption" color="error">
                {errors.links?.[(currentData.links || []).length]?.url}
              </Typography>
            )}
          </Box>
          <TextField
            label="Icon"
            value={newLink.icon || ''}
            fullWidth
            placeholder="e.g. catalog, external, github"
            InputLabelProps={{ shrink: true }}
            onChange={e => setNewLink({ ...newLink, icon: e.target.value || undefined })}
          />
          <StyledIconButton
            data-testid="add-link-button"
            size="small"
            onClick={handleAddLink}
            disabled={!newLink.title || !newLink.url}
            sx={{ alignSelf: 'flex-end' }}
          >
            <AddIcon />
          </StyledIconButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle1">Text Blocks</Typography>
          {(currentData.text || []).map((text, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                p: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" color="text.secondary">Block {index + 1}</Typography>
                <StyledIconButton
                  size="small"
                  onClick={() => handleDeleteText(index)}
                >
                  <CloseIcon fontSize="small" />
                </StyledIconButton>
              </Box>

              <TextField
                label="Title"
                value={text.title}
                size="small"
                fullWidth
                variant="outlined"
                error={!!errors.text?.[index]?.title}
                helperText={errors.text?.[index]?.title}
                onChange={e => {
                  const newTextArray = [...(currentData.text || [])];
                  newTextArray[index] = { ...text, title: e.target.value };
                  handleChange({
                    links: currentData.links || [],
                    text: newTextArray,
                  });
                  validate(currentData.links || [], newTextArray);
                }}
              />

              <MarkdownEditor
                value={text.content}
                onChange={val => {
                  const newTextArray = [...(currentData.text || [])];
                  newTextArray[index] = { ...text, content: val };
                  handleChange({
                    links: currentData.links || [],
                    text: newTextArray,
                  });
                  validate(currentData.links || [], newTextArray);
                }}
                parameters={parameters}
                outputs={allParentStepsOutputs}
                minHeight={150}
              />
            </Box>
          ))}

          <Box
            data-testid="new-text-box"
            sx={{
              p: 2,
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Typography variant="subtitle2" color="text.secondary">New Text Block</Typography>
            <TextField
              label="Title"
              value={newText.title}
              size="small"
              fullWidth
              onChange={e => setNewText({ ...newText, title: e.target.value })}
            />
            <Box>
              <MarkdownEditor
                value={newText.content}
                onChange={val => setNewText({ ...newText, content: val })}
                parameters={parameters}
                outputs={allParentStepsOutputs}
                minHeight={150}
              />
            </Box>
            <StyledIconButton
              data-testid="add-text-button"
              size="small"
              onClick={handleAddText}
              disabled={!newText.title || !newText.content}
              sx={{ alignSelf: 'flex-end', color: 'white' }}
            >
              <AddIcon />
            </StyledIconButton>
          </Box>

          {/* Variable Picker Menu */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleCloseMenu}
            PaperProps={{
              style: {
                maxHeight: 300,
                width: 250,
              },
            }}
          >
            {parameters.length > 0 && <ListSubheader>Parameters</ListSubheader>}
            {parameters.map((param) => (
              <MenuItem
                key={`param-${param.name}`}
                onClick={() => insertVariable(`\${{ parameters.${param.name} }}`)}
                dense
              >
                {param.name}
              </MenuItem>
            ))}

            {allParentStepsOutputs.length > 0 && <ListSubheader>Step Outputs</ListSubheader>}
            {allParentStepsOutputs.map((step) => (
              <Box key={`step-${step.id}`}>
                <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary', fontWeight: 'bold' }}>
                  {step.id}
                </Typography>
                {Object.keys(step.outputs || {}).map((outputKey) => (
                  <MenuItem
                    key={`output-${step.id}-${outputKey}`}
                    onClick={() => insertVariable(`\${{ steps.${step.id}.output.${outputKey} }}`)}
                    dense
                    sx={{ pl: 4 }}
                  >
                    {outputKey}
                  </MenuItem>
                ))}
                {(!step.outputs || Object.keys(step.outputs).length === 0) && (
                  <MenuItem
                    key={`output-${step.id}-default`}
                    onClick={() => insertVariable(`\${{ steps.${step.id}.output }}`)}
                    dense
                    sx={{ pl: 4 }}
                  >
                    (Full Object)
                  </MenuItem>
                )}
              </Box>
            ))}

            {parameters.length === 0 && allParentStepsOutputs.length === 0 && (
              <MenuItem disabled dense>
                No variables available
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>
    </Box>
  );
};
