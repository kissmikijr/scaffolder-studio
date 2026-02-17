import { EditorView, Decoration } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { Theme } from '@mui/material';

export const readOnlyDecorations = (
  readOnlyRanges: Array<{ from: number; to: number }>,
  theme: Theme,
) =>
  EditorView.decorations.of(view => {
    if (!readOnlyRanges || readOnlyRanges.length === 0) return Decoration.none;

    const builder = new RangeSetBuilder<Decoration>();
    const linesToHighlight = new Set<number>();

    for (const range of readOnlyRanges) {
      const from = Math.max(0, range.from);
      const to = Math.min(view.state.doc.length, range.to);
      if (from >= to) continue;

      const startLine = view.state.doc.lineAt(from);
      let endLine = view.state.doc.lineAt(to);

      // If 'to' is at the start of the line, exclude this line from highlighting
      // unless it's the same as startLine
      if (endLine.from === to && endLine.number > startLine.number) {
        endLine = view.state.doc.line(endLine.number - 1);
      }

      for (let i = startLine.number; i <= endLine.number; i++) {
        linesToHighlight.add(i);
      }
    }

    const sortedLines = Array.from(linesToHighlight).sort((a, b) => a - b);

    for (const lineNo of sortedLines) {
      const line = view.state.doc.line(lineNo);
      const isStart = !linesToHighlight.has(lineNo - 1);
      const className = isStart
        ? 'cm-readonly-line cm-readonly-start'
        : 'cm-readonly-line';

      const backgroundColor =
        theme.palette.mode === 'dark'
          ? 'rgba(94, 94, 94, 0.4)'
          : 'rgba(0, 0, 0, 0.05)';

      builder.add(
        line.from,
        line.from,
        Decoration.line({
          attributes: {
            style: `background-color: ${backgroundColor};`,
          },
          class: className,
        }),
      );
    }
    return builder.finish();
  });
