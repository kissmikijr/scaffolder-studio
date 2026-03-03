const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';

const isEditableElement = (element: Element | null): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.matches(EDITABLE_SELECTOR)) {
    return true;
  }

  return Boolean(element.closest(EDITABLE_SELECTOR));
};

export const isKeyboardEventFromEditableTarget = (
  event: KeyboardEvent,
): boolean => {
  const target = event.target;
  if (target instanceof Element && isEditableElement(target)) {
    return true;
  }

  return isEditableElement(document.activeElement);
};

export const isPrimaryShortcutModifierPressed = (event: KeyboardEvent) =>
  event.metaKey || event.ctrlKey;

export const isDigitShortcutKey = (event: KeyboardEvent, digit: number) => {
  const digitKey = String(digit);
  return (
    event.key === digitKey ||
    event.code === `Digit${digitKey}` ||
    event.code === `Numpad${digitKey}`
  );
};

export const isLetterShortcutKey = (event: KeyboardEvent, letter: string) => {
  const normalizedLetter = letter.toLowerCase();
  return (
    event.key.toLowerCase() === normalizedLetter ||
    event.code === `Key${normalizedLetter.toUpperCase()}`
  );
};
