import { useMemo } from 'react';
import { Box, Tooltip } from '@mui/material';
import {
    AllNodeData,
    NodeTypeColors,
    isTemplateNode,
    isStepNode,
    isParametersNode,
    isOutputNode,
    isPropertyNode,
    isPrefabNode,
    getPropertyBackgroundColor,
} from '@kissmiklosjr/plugin-scaffolder-studio-common';
import { Node } from '@xyflow/react';

type TemplateVisualSummaryProps = {
    nodes: Node<AllNodeData>[];
};

type SummaryItem = {
    id: string;
    type: string;
    color: string;
    label: string;
};

export const TemplateVisualSummary = ({ nodes }: TemplateVisualSummaryProps) => {
    const items = useMemo<SummaryItem[]>(() => {
        const summaryItems: SummaryItem[] = [];

        // 1. Template Node
        const templateNode = nodes.find(n => isTemplateNode(n));
        if (templateNode) {
            summaryItems.push({
                id: templateNode.id,
                type: 'template',
                color: NodeTypeColors.template || '#bd93f9',
                label: `Template: ${templateNode.data.name || 'Untitled'}`,
            });
        }

        // 2. Step Nodes
        const stepNodes = nodes.filter(n => isStepNode(n));
        stepNodes.forEach(node => {
            summaryItems.push({
                id: node.id,
                type: 'step',
                color: NodeTypeColors.step || '#ffb86c',
                label: `Step: ${node.data.name || node.data.actionId || 'Unknown'}`,
            });
        });

        // 3. Parameters Group Nodes
        const paramNodes = nodes.filter(n => isParametersNode(n));
        paramNodes.forEach(node => {
            summaryItems.push({
                id: node.id,
                type: 'parameters',
                color: NodeTypeColors.parameters || '#4fffe0',
                label: `Parameters: ${node.data.title || 'Group'}`,
            });
        });

        // 4. Property Nodes
        const propertyNodes = nodes.filter(n => isPropertyNode(n));
        propertyNodes.forEach(node => {
            summaryItems.push({
                id: node.id,
                type: 'property',
                color: getPropertyBackgroundColor(node.data.variableType) || '#818CF8',
                label: `Property: ${node.data.name || 'Untitled'} (${node.data.variableType})`,
            });
        });

        // 5. Output Nodes
        const outputNodes = nodes.filter(n => isOutputNode(n));
        outputNodes.forEach(node => {
            summaryItems.push({
                id: node.id,
                type: 'output',
                color: NodeTypeColors.templateOutput || '#ff79c6',
                label: 'Outputs',
            });
        });

        // 6. Prefab Nodes
        const prefabNodes = nodes.filter(n => isPrefabNode(n));
        prefabNodes.forEach(node => {
            summaryItems.push({
                id: node.id,
                type: 'prefab',
                color: '#f1fa8c', // Yellow/Prefab color
                label: `Prefab: ${node.data.id || 'Unknown'}`,
            });
        });

        return summaryItems;
    }, [nodes]);

    if (items.length === 0) {
        return null;
    }

    const totalSlots = Math.ceil(Math.max(items.length, 1) / 8) * 8;
    const placeholders = Array.from({ length: totalSlots - items.length });

    return (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, auto)', gap: 0.5, alignItems: 'center' }}>
            {items.map((item) => (
                <Tooltip key={item.id} title={item.label}>
                    <Box
                        sx={{
                            width: 8,
                            height: 12,
                            backgroundColor: item.color,
                            borderRadius: '2px',
                            cursor: 'help',
                            opacity: 0.8,
                            transition: 'opacity 0.2s, transform 0.2s',
                            '&:hover': {
                                opacity: 1,
                                transform: 'scaleY(1.2)',
                            },
                        }}
                    />
                </Tooltip>
            ))}
            {placeholders.map((_, index) => (
                <Box
                    key={`placeholder-${index}`}
                    sx={{
                        width: 8,
                        height: 12,
                        backgroundColor: '#000000',
                        borderRadius: '2px',
                        opacity: 0.1,
                    }}
                />
            ))}
        </Box>
    );
};
