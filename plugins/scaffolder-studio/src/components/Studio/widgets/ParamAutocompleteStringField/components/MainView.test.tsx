import { render, screen } from '@testing-library/react';
import { MainView } from './MainView';

describe('MainView', () => {
  const defaultProps = {
    parameters: [],
    outputs: [],
    onParamSelect: jest.fn(),
    onOutputSelect: jest.fn(),
    onNext: jest.fn(),
  };

  it('renders outputs with color indicator', () => {
    const outputs = [
      {
        id: 'step1',
        outputs: {
          output1: { type: 'string' },
        },
      },
    ];

    render(<MainView {...defaultProps} outputs={outputs} />);

    // Find the output item
    const outputItem = screen.getByText('output1');
    expect(outputItem).toBeInTheDocument();

    // Find the color box element
    // It should be the first child of the parent container of the text "output1"
    const outputText = screen.getByText('output1');
    const flexContainer = outputText.parentElement;
    const colorBox = flexContainer?.firstElementChild;

    expect(colorBox).toBeInTheDocument();
    // The color box should not be the text itself
    expect(colorBox).not.toBe(outputText);

    // Check the background color
    const style = window.getComputedStyle(colorBox!);
    // NodeTypeColors.step (#ffb86c)
    expect(style.backgroundColor).toBe('rgb(255, 184, 108)');
  });

  it('marks the active option as selected', () => {
    const onActiveOptionChange = jest.fn();

    render(
      <MainView
        {...defaultProps}
        parameters={[{ name: 'selectedParam', type: 'string' }]}
        activeOptionIndex={1}
        onActiveOptionChange={onActiveOptionChange}
      />,
    );

    const selectedParam = screen.getByText('selectedParam');
    const selectedButton = selectedParam.closest('.MuiListItemButton-root');

    expect(selectedButton).toHaveClass('Mui-selected');
  });
});
