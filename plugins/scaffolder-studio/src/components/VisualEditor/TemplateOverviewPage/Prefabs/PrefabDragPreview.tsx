import React, { useState, useImperativeHandle } from 'react';
import { Box, useTheme } from '@mui/material';
import { Prefab, NodeTypeColors } from '@kissmiklosjr/plugin-scaffolder-studio-common';
import StepNode from '../../nodes/step/StepNode';
import { PropertyNodeContent } from '../../nodes/property/PropertyNode';
import OutputNode from '../../nodes/output/OutputNode';

export interface PrefabDragPreviewRef {
    setPrefab: (prefab: Prefab | null) => void;
    element: HTMLDivElement | null;
}

export const PrefabDragPreview = React.forwardRef<PrefabDragPreviewRef, {}>((_, ref) => {
    const theme = useTheme();
    const [prefab, setPrefab] = useState<Prefab | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
        setPrefab: (p: Prefab | null) => {
            setPrefab(p);
        },
        get element() {
            return containerRef.current;
        }
    }));

    if (!prefab || !prefab.node) {
        return <div ref={containerRef} style={{ display: 'none' }} />;
    }

    const nodeWithHandlers = {
        ...prefab.node,
        data: {
            ...prefab.node.data,
            onChange: () => { },
        },
    };

    const renderNode = () => {
        switch (prefab.node.type) {
            case 'step':
                return (
                    <StepNode {...(nodeWithHandlers as any)} disabled selected={false} />
                );
            case 'property':
                return (
                    <PropertyNodeContent
                        {...(nodeWithHandlers as any)}
                        disabled
                        selected={false}
                    />
                );
            case 'templateOutput':
                return (
                    <OutputNode
                        {...(nodeWithHandlers as any)}
                        disabled
                        selected={false}
                    />
                );
            default:
                return null;
        }
    };

    const getBorderColor = (nodeType: string) => {
        switch (nodeType) {
            case 'step':
                return NodeTypeColors.step;
            case 'templateOutput':
                return NodeTypeColors.templateOutput;
            case 'property':
                return '#818CF8';
            default:
                return NodeTypeColors.unknown;
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'absolute',
                top: -1000,
                left: -1000,
                zIndex: -1,
            }}
        >
            <Box
                sx={{
                    borderRadius: '24px',
                    color: theme.palette.text.primary,
                    backgroundColor: theme.palette.background.paper,
                    position: 'relative',
                    display: 'block',
                    border: `4px solid ${prefab.node.type
                        ? getBorderColor(prefab.node.type)
                        : NodeTypeColors.unknown
                        }`,
                    width: 'fit-content',
                }}
            >
                {renderNode()}
            </Box>
        </div>
    );
});
