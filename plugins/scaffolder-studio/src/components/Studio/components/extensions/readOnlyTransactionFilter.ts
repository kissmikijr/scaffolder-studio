import { EditorState } from '@codemirror/state';

export const readOnlyTransactionFilter = (
  readOnlyRanges: Array<{ from: number; to: number }>,
) =>
  EditorState.transactionFilter.of(tr => {
    if (!readOnlyRanges || readOnlyRanges.length === 0) return tr;

    let blocked = false;
    if (tr.docChanged) {
      tr.changes.iterChanges((fromA, toA, _fromB, _toB) => {
        if (blocked) return;
        for (const range of readOnlyRanges) {
          // Check if the change overlaps with any read-only range
          if (
            (fromA >= range.from && fromA < range.to) || // Start of change is inside range
            (toA > range.from && toA <= range.to) || // End of change is inside range
            (fromA <= range.from && toA >= range.to) // Change encompasses range
          ) {
            blocked = true;
            break;
          }
        }
      });
    } else if (tr.selection) {
      for (const selectionRange of tr.selection.ranges) {
        if (blocked) break;
        // Only block cursor placement (empty selection), allow text selection for copying
        if (selectionRange.empty) {
          for (const range of readOnlyRanges) {
            if (
              selectionRange.head > range.from &&
              selectionRange.head < range.to
            ) {
              blocked = true;
              break;
            }
          }
        }
      }
    }
    return blocked ? [] : tr;
  });
