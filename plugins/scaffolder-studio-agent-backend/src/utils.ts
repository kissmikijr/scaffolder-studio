export function delegateAbortController(parent?: AbortSignal): AbortController {
  const delegate = new AbortController();

  if (parent) {
    if (parent.aborted) {
      delegate.abort();
    } else {
      const onParentAborted = () => {
        delegate.abort();
      };

      const onChildAborted = () => {
        parent.removeEventListener('abort', onParentAborted);
      };

      parent.addEventListener('abort', onParentAborted, { once: true });
      delegate.signal.addEventListener('abort', onChildAborted, { once: true });
    }
  }

  return delegate;
}
