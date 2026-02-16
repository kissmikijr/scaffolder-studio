import { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

describe('useUnsavedChangesGuard', () => {
  it('calls failure callback when autosave fails before navigation', async () => {
    const pushSpy = jest.fn();
    const navigator = {
      push: pushSpy,
      replace: jest.fn(),
      go: jest.fn(),
    };
    const onAutoSave = jest.fn().mockResolvedValue(false);
    const onAutoSaveFailed = jest.fn();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <UNSAFE_NavigationContext.Provider value={{ navigator } as any}>
        {children}
      </UNSAFE_NavigationContext.Provider>
    );

    renderHook(
      () =>
        useUnsavedChangesGuard({
          when: true,
          shouldBlockInAppNavigation: () => true,
          onAutoSave,
          onAutoSaveFailed,
        }),
      { wrapper },
    );

    await act(async () => {
      (navigator.push as any)('/somewhere');
    });

    await waitFor(() => {
      expect(onAutoSave).toHaveBeenCalledTimes(1);
      expect(onAutoSaveFailed).toHaveBeenCalledTimes(1);
      expect(pushSpy).toHaveBeenCalledWith('/somewhere');
    });
  });
});
