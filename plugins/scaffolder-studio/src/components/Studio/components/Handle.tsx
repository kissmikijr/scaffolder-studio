import {
  forwardRef,
  useEffect,
  useMemo,
  useState,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from 'react';
import {
  Handle as FlowHandle,
  Position,
  useConnection,
  useNodeConnections,
  useNodeId,
} from '@xyflow/react';
import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { usePerimeterHandleContext } from '../PerimeterHandleContext';
import {
  getPerimeterHandleRenderState,
  getPerimeterHandleTransform,
  PERIMETER_HANDLE_DIAMETER,
  PERIMETER_HANDLE_EMPHASIS_SCALE,
} from './perimeterHandles';

const NODE_HOVER_GRACE_MS = 140;

export const Handle = forwardRef<
  HTMLDivElement,
  {
    position: Position;
    style?: CSSProperties;
    type: 'source' | 'target';
    id?: string;
    nodeId?: string;
    disabled?: boolean;
    children?: ReactNode;
  } & HTMLAttributes<HTMLDivElement>
>(
  (
    {
      position,
      type,
      style,
      id,
      nodeId: nodeIdProp,
      disabled = false,
      children,
      onMouseEnter: onMouseEnterProp,
      onMouseLeave: onMouseLeaveProp,
      ...props
    },
    ref,
  ) => {
    const theme = useTheme();
    const flowNodeId = useNodeId();
    const nodeId = nodeIdProp ?? flowNodeId;
    const resolvedNodeId = nodeId ?? undefined;
    const perimeterHandleContext = usePerimeterHandleContext();
    const connectionState = useConnection();
    const handleConnections = useNodeConnections({
      id: resolvedNodeId,
      handleType: type,
      handleId: id,
    });
    const [isHovered, setIsHovered] = useState(false);
    const [isWithinHoverGrace, setIsWithinHoverGrace] = useState(false);
    const hasIncomingConnectionOnHandle =
      type === 'target' && handleConnections.length > 0;
    const isNodeHovered =
      Boolean(resolvedNodeId) &&
      perimeterHandleContext.selectedNodeId === resolvedNodeId;

    useEffect(() => {
      let timeoutId: number | undefined;

      if (connectionState.inProgress) {
        setIsWithinHoverGrace(false);
      } else if (isNodeHovered) {
        setIsWithinHoverGrace(true);
      } else if (!isHovered) {
        timeoutId = window.setTimeout(() => {
          setIsWithinHoverGrace(false);
        }, NODE_HOVER_GRACE_MS);
      }

      return () => {
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      };
    }, [connectionState.inProgress, isHovered, isNodeHovered]);

    const isConnectionInProgress = connectionState.inProgress;
    const isActiveSourceHandle =
      Boolean(resolvedNodeId) &&
      isConnectionInProgress &&
      connectionState.fromNode.id === resolvedNodeId &&
      connectionState.fromHandle.id === id &&
      connectionState.fromHandle.type === type;

    let validCandidateType: 'target' | 'source' | null = null;
    if (connectionState.inProgress) {
      if (connectionState.fromHandle.type === 'source') {
        validCandidateType = 'target';
      } else if (connectionState.fromHandle.type === 'target') {
        validCandidateType = 'source';
      }
    }

    const isValidConnectionTarget = useMemo(() => {
      if (
        !resolvedNodeId ||
        !id ||
        disabled ||
        hasIncomingConnectionOnHandle ||
        !isConnectionInProgress ||
        !validCandidateType ||
        type !== validCandidateType ||
        !connectionState.fromNode.id ||
        !connectionState.fromHandle.id
      ) {
        return false;
      }

      if (connectionState.fromHandle.type === 'source') {
        return perimeterHandleContext.isValidConnection({
          source: connectionState.fromNode.id,
          sourceHandle: connectionState.fromHandle.id,
          target: resolvedNodeId,
          targetHandle: id,
        });
      }

      return perimeterHandleContext.isValidConnection({
        source: resolvedNodeId,
        sourceHandle: id,
        target: connectionState.fromNode.id,
        targetHandle: connectionState.fromHandle.id,
      });
    }, [
      connectionState,
      disabled,
      hasIncomingConnectionOnHandle,
      id,
      isConnectionInProgress,
      resolvedNodeId,
      perimeterHandleContext,
      type,
      validCandidateType,
    ]);

    const { visible, emphasized } = getPerimeterHandleRenderState({
      disabled: disabled || hasIncomingConnectionOnHandle,
      isNodeHovered: isWithinHoverGrace,
      isNodeSelected:
        Boolean(resolvedNodeId) &&
        perimeterHandleContext.selectedNodeId === resolvedNodeId,
      isConnectionInProgress,
      isActiveSourceHandle,
      isValidConnectionTarget,
      isHoveredHandle: isHovered,
    });

    const accentColor =
      theme.palette.mode === 'light'
        ? theme.palette.primary.main
        : theme.palette.info.light;
    const scale = emphasized ? PERIMETER_HANDLE_EMPHASIS_SCALE : 1;
    let zIndex = 2100;
    if (emphasized) {
      zIndex = 2500;
    } else if (visible) {
      zIndex = 2400;
    }
    const sideStyle: CSSProperties = {
      position: 'absolute',
      width: PERIMETER_HANDLE_DIAMETER,
      height: PERIMETER_HANDLE_DIAMETER,
      borderRadius: '999px',
      border: `1.5px solid ${alpha(accentColor, emphasized ? 0.95 : 0.55)}`,
      background: emphasized
        ? alpha(accentColor, 0.7)
        : alpha(theme.palette.background.paper, 0.92),
      boxShadow: emphasized
        ? `0 0 0 3px ${alpha(accentColor, 0.22)}, 0 4px 12px ${alpha(
            accentColor,
            0.22,
          )}`
        : `0 0 0 1px ${alpha(accentColor, 0.14)}`,
      opacity: 'var(--studio-perimeter-handle-opacity, 0)',
      zIndex,
      pointerEvents:
        'var(--studio-perimeter-handle-pointer-events, none)' as CSSProperties['pointerEvents'],
      transition:
        'opacity 140ms ease, transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease, border-color 140ms ease',
      transform: getPerimeterHandleTransform(position, scale),
      ['--studio-perimeter-handle-opacity' as any]: visible ? 1 : 0,
      ['--studio-perimeter-handle-pointer-events' as any]:
        visible && !disabled ? 'all' : 'none',
    };

    switch (position) {
      case Position.Top:
        Object.assign(sideStyle, { left: '50%', top: 0 });
        break;
      case Position.Right:
        Object.assign(sideStyle, { right: 0, top: '50%' });
        break;
      case Position.Bottom:
        Object.assign(sideStyle, { left: '50%', bottom: 0 });
        break;
      case Position.Left:
        Object.assign(sideStyle, { left: 0, top: '50%' });
        break;
      default:
        break;
    }

    return (
      <div ref={ref}>
        <FlowHandle
          id={id}
          position={position}
          type={type}
          className="studio-perimeter-handle"
          data-perimeter-visible={visible ? 'true' : 'false'}
          data-perimeter-emphasized={emphasized ? 'true' : 'false'}
          data-perimeter-disabled={disabled ? 'true' : 'false'}
          data-perimeter-occupied={
            hasIncomingConnectionOnHandle ? 'true' : 'false'
          }
          data-perimeter-connection-in-progress={
            isConnectionInProgress ? 'true' : 'false'
          }
          style={{ ...sideStyle, ...style }}
          onMouseEnter={event => {
            if (disabled) {
              return;
            }
            setIsHovered(true);
            onMouseEnterProp?.(event);
          }}
          onMouseLeave={event => {
            setIsHovered(false);
            onMouseLeaveProp?.(event);
          }}
          {...props}
        />
        {children}
      </div>
    );
  },
);
