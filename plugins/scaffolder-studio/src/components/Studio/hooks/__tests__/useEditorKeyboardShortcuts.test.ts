import { renderHook } from '@testing-library/react';
import { useEditorKeyboardShortcuts } from '../useEditorKeyboardShortcuts';

describe('useEditorKeyboardShortcuts', () => {
  const setup = () => {
    const onAddStep = jest.fn();
    const onAddParameters = jest.fn();
    const onAddProperty = jest.fn();
    const onAddOutput = jest.fn();
    const onToggleZenMode = jest.fn();
    const onToggleDependencyEdges = jest.fn();
    const onToggleSideContent = jest.fn();
    const onFitView = jest.fn();

    renderHook(() =>
      useEditorKeyboardShortcuts({
        onAddStep,
        onAddParameters,
        onAddProperty,
        onAddOutput,
        onToggleZenMode,
        onToggleDependencyEdges,
        onToggleSideContent,
        onFitView,
      }),
    );

    return {
      onAddStep,
      onAddParameters,
      onAddProperty,
      onAddOutput,
      onToggleZenMode,
      onToggleDependencyEdges,
      onToggleSideContent,
      onFitView,
    };
  };

  it('triggers canvas node shortcuts for digits 1-4', () => {
    const {
      onAddStep,
      onAddParameters,
      onAddProperty,
      onAddOutput,
      onToggleZenMode,
      onToggleDependencyEdges,
      onToggleSideContent,
      onFitView,
    } = setup();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '4' }));

    expect(onAddStep).toHaveBeenCalledTimes(1);
    expect(onAddParameters).toHaveBeenCalledTimes(1);
    expect(onAddProperty).toHaveBeenCalledTimes(1);
    expect(onAddOutput).toHaveBeenCalledTimes(1);
    expect(onToggleZenMode).not.toHaveBeenCalled();
    expect(onToggleDependencyEdges).not.toHaveBeenCalled();
    expect(onToggleSideContent).not.toHaveBeenCalled();
    expect(onFitView).not.toHaveBeenCalled();
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

  it('triggers fit view on 0 without a modifier', () => {
    const { onFitView } = setup();

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '0',
      }),
    );

    expect(onFitView).toHaveBeenCalledTimes(1);
  });

  it('triggers fit view on Cmd/Ctrl+0', () => {
    const { onFitView } = setup();

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: '0',
        ctrlKey: true,
      }),
    );

    expect(onFitView).toHaveBeenCalledTimes(1);
  });

  it('triggers zen mode toggle on F without modifiers', () => {
    const { onToggleZenMode } = setup();

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'f',
      }),
    );

    expect(onToggleZenMode).toHaveBeenCalledTimes(1);
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
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));

    expect(callbacks.onAddStep).not.toHaveBeenCalled();
    expect(callbacks.onToggleZenMode).not.toHaveBeenCalled();
    expect(callbacks.onToggleDependencyEdges).not.toHaveBeenCalled();
    expect(callbacks.onToggleSideContent).not.toHaveBeenCalled();
    expect(callbacks.onFitView).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
