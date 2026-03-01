import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import StepNode from './StepNode';
import { ThemeProvider, createTheme } from '@mui/material';

// Mock ResizeObserver
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

describe('StepNode', () => {
  const defaultProps = {
    id: 'test-node-1',
    data: {
      type: 'step' as const,
      name: 'Test Step',
      stepId: 'test_step_1',
      actionId: 'test:action',
      formData: {},
      if: '',
      onChange: jest.fn(),
      schema: {
        output: {
          properties: {
            result1: { type: 'string' },
            result2: { type: 'number' },
          },
        },
      },
    },
    selected: true,
    zIndex: 1,
    isConnectable: true,
    posX: 0,
    posY: 0,
    dragging: false,
    type: 'step' as const,
    selectable: true,
    deletable: true,
    draggable: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Show Output Fields Toggle', () => {
    it('renders the output toggle button when the node has output properties', () => {
      renderWithProviders(<StepNode {...(defaultProps as any)} />);

      const toggleButton = screen.getByTestId('node-output-toggle-button');
      expect(toggleButton).toBeInTheDocument();
    });

    it('does not render the toggle button when there are no output properties', () => {
      const propsWithoutOutput = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          schema: {},
        },
      };

      renderWithProviders(<StepNode {...(propsWithoutOutput as any)} />);

      const toggleBadge = screen.queryByTestId('node-output-toggle-badge');
      expect(toggleBadge).not.toBeInTheDocument();
    });

    it('opens and closes the output fields popover when clicked', async () => {
      renderWithProviders(<StepNode {...(defaultProps as any)} />);

      const toggleButton = screen.getByTestId('node-output-toggle-button');

      // Initially not visible
      expect(screen.queryByText('Output Fields')).not.toBeInTheDocument();

      // Click to open
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Output Fields')).toBeInTheDocument();
        expect(screen.getByText('result1')).toBeInTheDocument();
        expect(screen.getByText('string')).toBeInTheDocument();
      });

      // Click to close
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByText('Output Fields')).not.toBeInTheDocument();
      });
    });
  });
});
