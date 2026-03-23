import { MarkerType } from '@xyflow/react';
import { shouldRenderRelationshipMarker } from './DependencyEdge';
import { defaultEdgeOptions } from './edgeTypes';

describe('defaultEdgeOptions', () => {
  it('renders main graph edges with a directional arrowhead', () => {
    expect(defaultEdgeOptions).toEqual(
      expect.objectContaining({
        type: 'custom-step',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }),
    );
  });
});

describe('shouldRenderRelationshipMarker', () => {
  it('keeps property-to-step relationship edges arrowless', () => {
    expect(
      shouldRenderRelationshipMarker({
        sourceKind: 'parameter',
      }),
    ).toBe(false);
  });

  it('keeps arrows for step-output relationship edges', () => {
    expect(
      shouldRenderRelationshipMarker({
        sourceKind: 'stepOutput',
      }),
    ).toBe(true);
  });
});
