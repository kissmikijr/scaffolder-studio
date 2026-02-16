import { useContext, useEffect, useRef } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';

type UseUnsavedChangesGuardProps = {
  when: boolean;
  shouldBlockInAppNavigation?: (pathname: string) => boolean;
  onAutoSave: () => Promise<boolean> | void;
  onAutoSaveFailed?: () => void;
};

export const useUnsavedChangesGuard = ({
  when,
  shouldBlockInAppNavigation,
  onAutoSave,
  onAutoSaveFailed,
}: UseUnsavedChangesGuardProps) => {
  const navigationContext = useContext(UNSAFE_NavigationContext as any) as {
    navigator: {
      push?: (...args: any[]) => void;
      replace?: (...args: any[]) => void;
      go?: (...args: any[]) => void;
    };
  };
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!when) {
      return undefined;
    }

    const navigator = navigationContext.navigator as any;
    const originalPush = navigator.push?.bind(navigator);
    const originalReplace = navigator.replace?.bind(navigator);
    const originalGo = navigator.go?.bind(navigator);

    const shouldBlockPath = (nextPathname: string) =>
      shouldBlockInAppNavigation
        ? shouldBlockInAppNavigation(nextPathname)
        : true;

    const runWithAutoSave = async (
      action: () => void,
      nextPathname: string = window.location.pathname,
    ) => {
      if (!shouldBlockPath(nextPathname)) {
        action();
        return;
      }

      if (isSavingRef.current) {
        return;
      }

      isSavingRef.current = true;
      try {
        const saveResult = await onAutoSave();
        if (saveResult === false) {
          onAutoSaveFailed?.();
        }
        action();
      } finally {
        isSavingRef.current = false;
      }
    };

    if (originalPush) {
      navigator.push = (...args: any[]) => {
        const nextPathname =
          typeof args[0] === 'string'
            ? args[0]
            : args[0]?.pathname || window.location.pathname;
        void runWithAutoSave(() => originalPush(...args), nextPathname);
      };
    }

    if (originalReplace) {
      navigator.replace = (...args: any[]) => {
        const nextPathname =
          typeof args[0] === 'string'
            ? args[0]
            : args[0]?.pathname || window.location.pathname;
        void runWithAutoSave(() => originalReplace(...args), nextPathname);
      };
    }

    if (originalGo) {
      navigator.go = (...args: any[]) => {
        void runWithAutoSave(() => originalGo(...args));
      };
    }

    return () => {
      if (originalPush) {
        navigator.push = originalPush;
      }
      if (originalReplace) {
        navigator.replace = originalReplace;
      }
      if (originalGo) {
        navigator.go = originalGo;
      }
    };
  }, [
    when,
    navigationContext,
    shouldBlockInAppNavigation,
    onAutoSave,
    onAutoSaveFailed,
  ]);

  useEffect(() => {
    if (!when) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void onAutoSave();
      }
    };
    const handlePageHide = () => {
      void onAutoSave();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [when, onAutoSave]);
};
