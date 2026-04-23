import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import StepNode from './StepNode';
import { ThemeProvider, createTheme } from '@mui/material';
import {
  GraphPerformanceContext,
  GraphPerformanceContextValue,
} from '../../GraphPerformanceContext';
import { TemplateOutgoingSlots } from '../../utils/connectionLimits';

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver;

const renderWithProviders = (
  ui: React.ReactElement,
  contextOverrides: Partial<GraphPerformanceContextValue> = {},
) => {
  const defaultSlots: TemplateOutgoingSlots = {
    hasStep: false,
    hasParameters: false,
    hasOutput: false,
    hasAny: true,
  };

  const defaultContextValue: GraphPerformanceContextValue = {
    relationshipMode: false,
    relationshipConnectionInProgress: false,
    isStepRelated: () => false,
    getIncomingConnectionCount: () => 0,
    getOutgoingConnectionCount: () => 0,
    getRelationshipHandleColor: () => undefined,
    getTemplateOutgoingSlots: () => defaultSlots,
    getParameterType: () => undefined,
  };

  return render(
    <ThemeProvider theme={createTheme()}>
      <ReactFlowProvider>
        <GraphPerformanceContext.Provider
          value={{ ...defaultContextValue, ...contextOverrides }}
        >
          {ui}
        </GraphPerformanceContext.Provider>
      </ReactFlowProvider>
    </ThemeProvider>,
  );
};

describe('StepNode', () => {
  const onChange = jest.fn();

  const defaultProps = {
    id: 'test-node-1',
    data: {
      type: 'step' as const,
      name: 'Test Step',
      stepId: 'test_step_1',
      actionId: 'test:action',
      formData: {
        url: '${{ parameters.repoUrl }}',
      },
      if: "${{ steps['build'].output['result'] }}",
      onChange,
      schema: {
        input: {
          properties: {
            url: { type: 'string' },
          },
        },
        output: {
          properties: {
            result: { type: 'string' },
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

  it('renders the I/O toggle button when node has input/output fields', () => {
    renderWithProviders(<StepNode {...(defaultProps as any)} />);
    expect(screen.getByTestId('node-output-toggle-button')).toBeInTheDocument();
  });

  it('is collapsed by default when no persisted uiState exists', () => {
    renderWithProviders(<StepNode {...(defaultProps as any)} />);
    expect(
      screen.queryByTestId('step-node-io-section'),
    ).not.toBeInTheDocument();
  });

  it('renders expanded input/output rows when persisted uiState.ioExpanded=true', () => {
    const expandedProps = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        uiState: { ioExpanded: true },
      },
    };

    renderWithProviders(<StepNode {...(expandedProps as any)} />);

    expect(screen.getByTestId('step-node-io-section')).toBeInTheDocument();
    expect(screen.getByTestId('step-node-input-row-url')).toBeInTheDocument();
    expect(screen.getByTestId('step-node-input-row-if')).toBeInTheDocument();
    expect(
      screen.getByTestId('step-node-output-row-result'),
    ).toBeInTheDocument();
  });

  it('toggles persisted expansion state via onChange', () => {
    renderWithProviders(<StepNode {...(defaultProps as any)} />);

    fireEvent.click(screen.getByTestId('node-output-toggle-button'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('test-node-1', {
      uiState: { ioExpanded: true },
    });
  });

  it('force expands in relationship mode and disables manual collapse', () => {
    renderWithProviders(
      <StepNode
        {...(defaultProps as any)}
        data={{
          ...defaultProps.data,
          uiState: { ioExpanded: false },
        }}
      />,
      {
        relationshipMode: true,
        isStepRelated: (stepNodeId: string) => stepNodeId === 'test-node-1',
      },
    );

    expect(screen.getByTestId('step-node-io-section')).toBeInTheDocument();

    const toggleButton = screen.getByTestId('node-output-toggle-button');
    expect(toggleButton).toBeDisabled();

    fireEvent.click(toggleButton);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('force expands while a relationship connection is being dragged', () => {
    renderWithProviders(
      <StepNode
        {...(defaultProps as any)}
        data={{
          ...defaultProps.data,
          uiState: { ioExpanded: false },
        }}
      />,
      {
        relationshipMode: true,
        relationshipConnectionInProgress: true,
        isStepRelated: () => false,
      },
    );

    expect(screen.getByTestId('step-node-io-section')).toBeInTheDocument();
    expect(screen.getByTestId('step-node-input-row-url')).toBeInTheDocument();
  });
});
