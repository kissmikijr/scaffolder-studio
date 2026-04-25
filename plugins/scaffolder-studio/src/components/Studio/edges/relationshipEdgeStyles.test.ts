import { createTheme } from '@mui/material/styles';
import { getRelationshipEdgeStyle } from './relationshipEdgeStyles';

describe('getRelationshipEdgeStyle', () => {
  it('keeps default relationship edges subtle in light theme', () => {
    const theme = createTheme({ palette: { mode: 'light' } });

    const style = getRelationshipEdgeStyle({
      theme,
      sourceKind: 'stepOutput',
      state: 'default',
    });

    expect(style).toMatchObject({
      strokeWidth: 1.85,
      strokeDasharray: '8 7',
      opacity: 0.84,
    });
    expect(style.stroke).toBe('rgba(78, 100, 127, 0.62)');
  });

  it('uses source tint for parameter relationship edges', () => {
    const theme = createTheme({ palette: { mode: 'dark' } });

    const style = getRelationshipEdgeStyle({
      theme,
      sourceKind: 'parameter',
      sourceColor: '#ffcc00',
      state: 'default',
    });

    expect(style).toMatchObject({
      strokeWidth: 1.7,
      strokeDasharray: '4 7',
      opacity: 0.82,
    });
    expect(style.stroke).toBe('rgba(255, 204, 0, 0.42)');
  });

  it('darkens bright parameter colors in light theme so they stay readable', () => {
    const theme = createTheme({ palette: { mode: 'light' } });

    const style = getRelationshipEdgeStyle({
      theme,
      sourceKind: 'parameter',
      sourceColor: '#ffcc00',
      state: 'default',
    });

    expect(style).toMatchObject({
      strokeWidth: 1.7,
      strokeDasharray: '4 7',
      opacity: 0.84,
    });
    expect(style.stroke).not.toBe('rgba(255, 204, 0, 0.5)');
    expect(style.stroke).toEqual(expect.stringContaining('rgba'));
  });

  it('keeps selected light-theme parameter edges inked instead of bright yellow', () => {
    const theme = createTheme({ palette: { mode: 'light' } });

    const style = getRelationshipEdgeStyle({
      theme,
      sourceKind: 'parameter',
      sourceColor: '#ffcc00',
      state: 'selected',
    });

    expect(style).toMatchObject({
      strokeWidth: 2,
      strokeDasharray: '4 6',
      opacity: 0.94,
    });
    expect(style.stroke).not.toBe('rgba(255, 204, 0, 0.66)');
    expect(style.stroke).toEqual(expect.stringContaining('rgba'));
  });

  it('emphasizes relationship edges in focus mode', () => {
    const theme = createTheme({ palette: { mode: 'dark' } });

    const subtle = getRelationshipEdgeStyle({
      theme,
      sourceKind: 'stepOutput',
      state: 'default',
    });
    const focused = getRelationshipEdgeStyle({
      theme,
      sourceKind: 'stepOutput',
      state: 'focus',
    });

    expect(Number(focused.strokeWidth)).toBeGreaterThan(
      Number(subtle.strokeWidth),
    );
    expect(Number(focused.opacity)).toBeGreaterThan(Number(subtle.opacity));
    expect(focused.stroke).not.toEqual(subtle.stroke);
  });

  it('fades non-focused relationship edges into the background', () => {
    const theme = createTheme({ palette: { mode: 'light' } });

    const style = getRelationshipEdgeStyle({
      theme,
      sourceKind: 'parameter',
      state: 'background',
    });

    expect(style).toMatchObject({
      strokeWidth: 1.5,
      strokeDasharray: '3 8',
      opacity: 0.58,
    });
    expect(style.stroke).toBe('rgba(78, 100, 127, 0.22)');
  });
});
