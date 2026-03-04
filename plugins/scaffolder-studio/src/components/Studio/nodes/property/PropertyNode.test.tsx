import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { ThemeProvider, createTheme } from '@mui/material';
import PropertyNode from './PropertyNode';

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={createTheme()}>
      <ReactFlowProvider>{ui}</ReactFlowProvider>
    </ThemeProvider>,
  );
};

describe('PropertyNode', () => {
  it('keeps the relationship handle above the comment hover hotspot layer', () => {
    renderWithProviders(
      <PropertyNode
        {...({
          id: 'property-node-1',
          data: {
            name: 'repoUrl',
            variableType: 'string',
            onChange: jest.fn(),
          },
          selected: true,
          zIndex: 1,
          isConnectable: true,
          posX: 0,
          posY: 0,
          dragging: false,
          type: 'property',
          selectable: true,
          deletable: true,
          draggable: true,
        } as any)}
      />,
    );

    const relationshipHandle = screen.getByTestId(
      'property-relationship-handle-property-node-1',
    );

    expect(
      Number((relationshipHandle as HTMLElement).style.zIndex),
    ).toBeGreaterThan(4500);
  });
});
