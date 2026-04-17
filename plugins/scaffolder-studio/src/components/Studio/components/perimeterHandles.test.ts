import { Position } from '@xyflow/react';
import {
  getPerimeterHandleRenderState,
  getPerimeterHandleTransform,
  isPerimeterHandleId,
  offsetPointTowardNode,
} from './perimeterHandles';

describe('perimeterHandles', () => {
  it('reveals handles on hovered or selected nodes when idle', () => {
    expect(
      getPerimeterHandleRenderState({
        disabled: false,
        isNodeHovered: true,
        isNodeSelected: false,
        isConnectionInProgress: false,
        isActiveSourceHandle: false,
        isValidConnectionTarget: false,
        isHoveredHandle: false,
      }),
    ).toEqual({ visible: true, emphasized: false });

    expect(
      getPerimeterHandleRenderState({
        disabled: false,
        isNodeHovered: false,
        isNodeSelected: true,
        isConnectionInProgress: false,
        isActiveSourceHandle: false,
        isValidConnectionTarget: false,
        isHoveredHandle: false,
      }),
    ).toEqual({ visible: true, emphasized: false });
  });

  it('shows only valid or active handles during an active connection', () => {
    expect(
      getPerimeterHandleRenderState({
        disabled: false,
        isNodeHovered: false,
        isNodeSelected: false,
        isConnectionInProgress: true,
        isActiveSourceHandle: false,
        isValidConnectionTarget: false,
        isHoveredHandle: false,
      }),
    ).toEqual({ visible: false, emphasized: false });

    expect(
      getPerimeterHandleRenderState({
        disabled: false,
        isNodeHovered: false,
        isNodeSelected: false,
        isConnectionInProgress: true,
        isActiveSourceHandle: true,
        isValidConnectionTarget: false,
        isHoveredHandle: false,
      }),
    ).toEqual({ visible: true, emphasized: true });

    expect(
      getPerimeterHandleRenderState({
        disabled: false,
        isNodeHovered: false,
        isNodeSelected: false,
        isConnectionInProgress: true,
        isActiveSourceHandle: false,
        isValidConnectionTarget: true,
        isHoveredHandle: false,
      }),
    ).toEqual({ visible: true, emphasized: false });
  });

  it('emphasizes hovered valid targets during drag', () => {
    expect(
      getPerimeterHandleRenderState({
        disabled: false,
        isNodeHovered: false,
        isNodeSelected: false,
        isConnectionInProgress: true,
        isActiveSourceHandle: false,
        isValidConnectionTarget: true,
        isHoveredHandle: true,
      }),
    ).toEqual({ visible: true, emphasized: true });
  });

  it('offsets handle points back to the node border for routed edges', () => {
    expect(
      offsetPointTowardNode({ x: 100, y: 20, position: Position.Right }),
    ).toEqual({ x: 90, y: 20 });
    expect(
      offsetPointTowardNode({ x: 100, y: 20, position: Position.Top }),
    ).toEqual({ x: 100, y: 30 });
  });

  it('recognizes perimeter handle ids and preserves transform outsets', () => {
    expect(isPerimeterHandleId('top')).toBe(true);
    expect(isPerimeterHandleId('out:value')).toBe(false);
    expect(getPerimeterHandleTransform(Position.Left)).toContain('- 10px');
  });
});
