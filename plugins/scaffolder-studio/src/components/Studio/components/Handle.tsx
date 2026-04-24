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
  shouldUseSelectedPerimeterOutset,
} from './perimeterHandles';
import { getStudioPerimeterHandleInteractionStyle } from './studioHandleStyles';

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
    /** Target only: shift outward past the source (along the edge normal) when this node also renders a source on the same side. */
    pairedSourceOnSameSide?: boolean;
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
      pairedSourceOnSameSide = false,
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
    const { selectedNodeId, isValidConnection } = usePerimeterHandleContext();
    const {
      inProgress: isConnectionInProgress,
      fromNode,
      fromHandle,
    } = useConnection(state => ({
      inProgress: state.inProgress,
      fromNode: state.fromNode,
      fromHandle: state.fromHandle,
    }));
    const fromNodeId = fromNode?.id;
    const fromHandleId = fromHandle?.id;
    const fromHandleType = fromHandle?.type;
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
      Boolean(resolvedNodeId) && selectedNodeId === resolvedNodeId;

    useEffect(() => {
      let timeoutId: number | undefined;

      if (isConnectionInProgress) {
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
    }, [isConnectionInProgress, isHovered, isNodeHovered]);

    const isActiveSourceHandle =
      Boolean(resolvedNodeId) &&
      isConnectionInProgress &&
      fromNodeId === resolvedNodeId &&
      fromHandleId === id &&
      fromHandleType === type;

    let validCandidateType: 'target' | 'source' | null = null;
    if (isConnectionInProgress) {
      if (fromHandleType === 'source') {
        validCandidateType = 'target';
      } else if (fromHandleType === 'target') {
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
        !fromNodeId ||
        !fromHandleId
      ) {
        return false;
      }

      if (fromHandleType === 'source') {
        return isValidConnection({
          source: fromNodeId,
          sourceHandle: fromHandleId,
          target: resolvedNodeId,
          targetHandle: id,
        });
      }

      return isValidConnection({
        source: resolvedNodeId,
        sourceHandle: id,
        target: fromNodeId,
        targetHandle: fromHandleId,
      });
    }, [
      disabled,
      fromHandleId,
      fromHandleType,
      fromNodeId,
      hasIncomingConnectionOnHandle,
      id,
      isConnectionInProgress,
      isValidConnection,
      resolvedNodeId,
      type,
      validCandidateType,
    ]);

    const { visible: computedVisible, emphasized } =
      getPerimeterHandleRenderState({
        disabled: disabled || hasIncomingConnectionOnHandle,
        type,
        pairedSourceOnSameSide,
        isNodeHovered: isWithinHoverGrace,
        isNodeSelected:
          Boolean(resolvedNodeId) && selectedNodeId === resolvedNodeId,
        isConnectionInProgress,
        isActiveSourceHandle,
        isValidConnectionTarget,
        isHoveredHandle: isHovered,
      });
    const isNodeSelected =
      Boolean(resolvedNodeId) && selectedNodeId === resolvedNodeId;
    const visible = computedVisible;

    const accentColor =
      theme.palette.mode === 'light'
        ? theme.palette.primary.main
        : theme.palette.info.light;
    const scale = emphasized ? PERIMETER_HANDLE_EMPHASIS_SCALE : 1;
    const shouldUseSelectedOutset =
      !disabled &&
      shouldUseSelectedPerimeterOutset({
        type,
        isNodeSelected,
        pairedSourceOnSameSide,
      });
    const perimeterTransform = getPerimeterHandleTransform(
      position,
      scale,
      shouldUseSelectedOutset,
    );
    const handleTransform = perimeterTransform;
    let zIndex = 3200;
    if (emphasized) {
      zIndex = 3600;
    } else if (visible) {
      zIndex = 3400;
    }
    const sideStyle: CSSProperties = {
      position: 'absolute',
      width: PERIMETER_HANDLE_DIAMETER,
      height: PERIMETER_HANDLE_DIAMETER,
      borderRadius: '999px',
      border: `1.5px solid ${alpha(accentColor, emphasized ? 0.98 : 0.72)}`,
      background: emphasized ? accentColor : theme.palette.background.paper,
      boxShadow: emphasized
        ? `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${alpha(
            accentColor,
            0.24,
          )}, 0 4px 12px ${alpha(accentColor, 0.22)}`
        : `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 1px ${alpha(
            accentColor,
            0.18,
          )}`,
      opacity: 'var(--studio-perimeter-handle-opacity, 0)',
      zIndex,
      pointerEvents:
        'var(--studio-perimeter-handle-pointer-events, none)' as CSSProperties['pointerEvents'],
      transition:
        'opacity 140ms ease, transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease, border-color 140ms ease',
      transform: handleTransform,
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
          data-perimeter-selected={isNodeSelected ? 'true' : 'false'}
          style={{
            ...sideStyle,
            ...getStudioPerimeterHandleInteractionStyle(theme, type, position),
            ...style,
          }}
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
