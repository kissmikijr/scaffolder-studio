import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  it('triggers save on Cmd/Ctrl+S when save is enabled', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    const onSave = jest.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        onUndo,
        onRedo,
        canUndo: false,
        canRedo: false,
        onSave,
        canSave: true,
        isSaving: false,
      }),
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();
  });

  it('does not trigger save when save is disabled', () => {
    const onSave = jest.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        onUndo: jest.fn(),
        onRedo: jest.fn(),
        canUndo: false,
        canRedo: false,
        onSave,
        canSave: false,
        isSaving: false,
      }),
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onSave).not.toHaveBeenCalled();
  });

  it('triggers undo and redo shortcuts', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        onUndo,
        onRedo,
        canUndo: true,
        canRedo: true,
      }),
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('does not trigger shortcuts while typing in input fields', () => {
    const onUndo = jest.fn();
    const onRedo = jest.fn();
    const onSave = jest.fn();

    renderHook(() =>
      useKeyboardShortcuts({
        onUndo,
        onRedo,
        canUndo: true,
        canRedo: true,
        onSave,
        canSave: true,
      }),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onSave).not.toHaveBeenCalled();
    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
