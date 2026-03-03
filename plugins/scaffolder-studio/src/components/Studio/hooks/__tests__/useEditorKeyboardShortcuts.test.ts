import { renderHook } from '@testing-library/react';
import { useEditorKeyboardShortcuts } from '../useEditorKeyboardShortcuts';

describe('useEditorKeyboardShortcuts', () => {
  const setup = () => {
    const onAddStep = jest.fn();
    const onAddParameters = jest.fn();
    const onAddProperty = jest.fn();
    const onAddOutput = jest.fn();
    const onToggleDependencyEdges = jest.fn();
    const onToggleSideContent = jest.fn();

    renderHook(() =>
      useEditorKeyboardShortcuts({
        onAddStep,
        onAddParameters,
        onAddProperty,
        onAddOutput,
        onToggleDependencyEdges,
        onToggleSideContent,
      }),
    );

    return {
      onAddStep,
      onAddParameters,
      onAddProperty,
      onAddOutput,
      onToggleDependencyEdges,
      onToggleSideContent,
    };
  };

  it('triggers canvas node shortcuts for digits 1-4', () => {
    const {
      onAddStep,
      onAddParameters,
      onAddProperty,
      onAddOutput,
      onToggleDependencyEdges,
      onToggleSideContent,
    } = setup();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));

    expect(onAddStep).toHaveBeenCalledTimes(1);
    expect(onAddParameters).toHaveBeenCalledTimes(1);
    expect(onAddProperty).toHaveBeenCalledTimes(1);
    expect(onAddOutput).toHaveBeenCalledTimes(1);
    expect(onToggleDependencyEdges).not.toHaveBeenCalled();
    expect(onToggleSideContent).not.toHaveBeenCalled();
  });

  it('triggers dependency edge toggle on Cmd/Ctrl+4', () => {
    const { onAddOutput, onToggleDependencyEdges } = setup();

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '4',
        ctrlKey: true,
      }),
    );

    expect(onToggleDependencyEdges).toHaveBeenCalledTimes(1);
    expect(onAddOutput).not.toHaveBeenCalled();
  });

  it('triggers side content toggle on Option+Cmd / Alt+Ctrl + B', () => {
    const { onToggleSideContent } = setup();

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        altKey: true,
      }),
    );

    expect(onToggleSideContent).toHaveBeenCalledTimes(1);
  });

  it('does not trigger shortcuts when an input is focused', () => {
    const callbacks = setup();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '4',
        ctrlKey: true,
      }),
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        altKey: true,
      }),
    );

    expect(callbacks.onAddStep).not.toHaveBeenCalled();
    expect(callbacks.onToggleDependencyEdges).not.toHaveBeenCalled();
    expect(callbacks.onToggleSideContent).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
