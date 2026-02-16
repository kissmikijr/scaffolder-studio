import { forwardRef, useState, CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { Handle as FlowHandle, Position } from '@xyflow/react';
import { useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';

export const Handle = forwardRef<
  HTMLDivElement,
  {
    position: Position;
    style?: CSSProperties;
    type: 'source' | 'target';
    id?: string;
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
      disabled = false,
      children,
      onMouseEnter: onMouseEnterProp,
      onMouseLeave: onMouseLeaveProp,
      ...props
    },
    ref,
  ) => {
    const theme = useTheme();
    const [isHovered, setIsHovered] = useState(false);

    const sideWideStyle: CSSProperties = {
      background: 'transparent',
      border: '1px solid transparent',
      opacity: 0,
      zIndex: 2000,
      pointerEvents: disabled ? 'none' : 'all',
    };

    const indicatorStyle: CSSProperties = {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: 1999,
      background: alpha(theme.palette.primary.main, 0.16),
      border: `1px solid ${alpha(theme.palette.primary.main, 0.55)}`,
      boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.18)}`,
      transition: 'opacity 120ms ease',
    };

    switch (position) {
      case Position.Top:
        Object.assign(sideWideStyle, {
          width: '100%',
          height: 12,
          left: '50%',
          top: 0,
          transform: 'translate(-50%, -50%)',
        });
        Object.assign(indicatorStyle, {
          width: 30,
          height: 14,
          left: '50%',
          top: -14,
          transform: 'translateX(-50%)',
          borderRadius: '14px 14px 0 0',
          borderBottom: 'none',
        });
        break;
      case Position.Right:
        Object.assign(sideWideStyle, {
          width: 12,
          height: '100%',
          right: 0,
          top: '50%',
          transform: 'translate(50%, -50%)',
        });
        Object.assign(indicatorStyle, {
          width: 14,
          height: 30,
          right: -14,
          top: '50%',
          transform: 'translateY(-50%)',
          borderRadius: '0 14px 14px 0',
          borderLeft: 'none',
        });
        break;
      case Position.Left:
        Object.assign(sideWideStyle, {
          width: 12,
          height: '100%',
          left: 0,
          top: '50%',
          transform: 'translate(-50%, -50%)',
        });
        Object.assign(indicatorStyle, {
          width: 14,
          height: 30,
          left: -14,
          top: '50%',
          transform: 'translateY(-50%)',
          borderRadius: '14px 0 0 14px',
          borderRight: 'none',
        });
        break;
      case Position.Bottom:
        Object.assign(sideWideStyle, {
          width: '100%',
          height: 12,
          left: '50%',
          bottom: 0,
          transform: 'translate(-50%, 50%)',
        });
        Object.assign(indicatorStyle, {
          width: 30,
          height: 14,
          left: '50%',
          bottom: -14,
          transform: 'translateX(-50%)',
          borderRadius: '0 0 14px 14px',
          borderTop: 'none',
        });
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
          style={{ ...sideWideStyle, ...style }}
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
        {isHovered && !disabled && <div style={indicatorStyle} />}
        {children}
      </div>
    );
  },
);
