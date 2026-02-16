import { ReactNode } from 'react';
import { Typography } from '@mui/material';
import { Node } from '@xyflow/react';
import { StepNodeSideContent } from '../nodes/step/StepNodeSideContent';
import { TemplateNodeSideContent } from '../nodes/template/TemplateNodeSideContent';
import { ParametersNodeSideContent } from '../nodes/parameters/ParametersNodeSideContent';
import { OutputNodeSideContent } from '../nodes/output/OutputNodeSideContent';
import { PropertyNodeSideContent } from '../nodes/property/PropertyNodeSideContent';
import { PrefabInstanceNodeSideContent } from '../TemplateOverviewPage/Prefabs/PrefabInstanceNodeSideContent';
import {
    AllNodeData,
    isStepNode,
    isTemplateNode,
    isParametersNode,
    isOutputNode,
    isPropertyNode,
    isPrefabNode,
} from '../types';
import { ScaffolderAction } from '@kissmiklosjr/plugin-scaffolder-studio-common';

export interface NodeSideContentProps {
    node: Node<AllNodeData> | undefined;
    availableActions: ScaffolderAction[];
    children?: ReactNode;
    /** Show the "Type ${" hint for template expressions. Default: true */
    showHint?: boolean;
    /** Which node types to render. Default: all types */
    supportedTypes?: Array<'step' | 'template' | 'parameters' | 'output' | 'property' | 'prefab'>;
}

const defaultSupportedTypes: NodeSideContentProps['supportedTypes'] = [
    'step',
    'template',
    'parameters',
    'output',
    'property',
    'prefab',
];

/**
 * Unified component for rendering node-specific side content.
 * Used by both the main template editor and the prefab editor.
 */
export const NodeSideContent = ({
    node,
    availableActions,
    children,
    showHint = true,
    supportedTypes = defaultSupportedTypes,
}: NodeSideContentProps) => {
    const isTypeSupported = (type: string) => supportedTypes?.includes(type as any);

    return (
        <div
            style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                wordBreak: 'break-word',
            }}
        >
            {showHint && (
                <Typography
                    variant="caption"
                    sx={{
                        alignSelf: 'flex-end',
                        color: 'text.secondary',
                        opacity: 0.7,
                        fontSize: '0.7rem',
                        mb: 1,
                        fontStyle: 'italic',
                        position: 'absolute',
                        top: 25,
                        right: 10,
                    }}
                >
                    💡 Type <code style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '1px 4px', borderRadius: 2 }}>{'${{'}</code> to insert template expressions
                </Typography>
            )}
            {children}

            {node && isStepNode(node) && isTypeSupported('step') && (
                <StepNodeSideContent
                    node={node}
                    key={`${node.id}-${node.type}-step`}
                    id={node.id}
                    availableActions={availableActions}
                />
            )}
            {node && isTemplateNode(node) && isTypeSupported('template') && (
                <TemplateNodeSideContent
                    key={`${node.id}-${node.type}-template`}
                    id={node.id}
                />
            )}
            {node && isParametersNode(node) && isTypeSupported('parameters') && (
                <ParametersNodeSideContent
                    key={`${node.id}-${node.type}-parameters`}
                    id={node.id}
                />
            )}
            {node && isOutputNode(node) && isTypeSupported('output') && (
                <OutputNodeSideContent
                    node={node}
                    key={`${node.id}-${node.type}-output`}
                    id={node.id}
                />
            )}
            {node && isPropertyNode(node) && isTypeSupported('property') && (
                <PropertyNodeSideContent
                    node={node}
                    key={`${node.id}-${node.type}-property`}
                    id={node.id}
                />
            )}
            {node && isPrefabNode(node) && isTypeSupported('prefab') && (
                <PrefabInstanceNodeSideContent
                    node={node}
                    availableActions={availableActions}
                    key={`${node.id}-${node.type}-prefab`}
                />
            )}
        </div>
    );
};
