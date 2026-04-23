import { alpha, darken, Theme } from '@mui/material/styles';
import type { CSSProperties } from 'react';

export type RelationshipEdgeSourceKind = 'parameter' | 'stepOutput';
export type RelationshipEdgeVisualState =
  | 'background'
  | 'default'
  | 'selected'
  | 'focus';

type GetRelationshipEdgeStyleOptions = {
  theme: Theme;
  sourceKind?: RelationshipEdgeSourceKind;
  sourceColor?: string;
  state: RelationshipEdgeVisualState;
};

const NODE_FALLBACK_PARAMETER_COLOR = '#6FB6FF';
const LIGHT_MODE_RELATIONSHIP_INK = '#4E647F';
const LIGHT_MODE_PARAMETER_FALLBACK = '#6A9BE6';

const getFocusAccent = (theme: Theme): string =>
  theme.palette.mode === 'dark'
    ? theme.palette.info.light
    : theme.palette.info.main;

const getParameterStroke = ({
  isDark,
  sourceColor,
  state = 'default',
}: {
  isDark: boolean;
  sourceColor?: string;
  state?: 'default' | 'selected' | 'focus';
}): string => {
  if (isDark) {
    let alphaValue = 0.42;
    let fallbackAlpha = 0.38;

    if (state === 'selected') {
      alphaValue = 0.72;
      fallbackAlpha = 0.66;
    } else if (state === 'focus') {
      alphaValue = 0.82;
      fallbackAlpha = 0.78;
    }

    return sourceColor
      ? alpha(sourceColor, alphaValue)
      : alpha(NODE_FALLBACK_PARAMETER_COLOR, fallbackAlpha);
  }

  let darkenAmount = 0.42;
  let sourceAlpha = 0.78;
  let fallbackAlpha = 0.68;

  if (state === 'selected') {
    darkenAmount = 0.46;
    sourceAlpha = 0.84;
    fallbackAlpha = 0.76;
  } else if (state === 'focus') {
    darkenAmount = 0.5;
    sourceAlpha = 0.9;
    fallbackAlpha = 0.82;
  }

  const tintedInk = sourceColor
    ? darken(sourceColor, darkenAmount)
    : LIGHT_MODE_PARAMETER_FALLBACK;

  return alpha(tintedInk, sourceColor ? sourceAlpha : fallbackAlpha);
};

export const getRelationshipEdgeStyle = ({
  theme,
  sourceKind,
  sourceColor,
  state,
}: GetRelationshipEdgeStyleOptions): CSSProperties => {
  const isDark = theme.palette.mode === 'dark';
  const isParameter = sourceKind === 'parameter';
  const fallbackStroke = isDark
    ? alpha(theme.palette.common.white, 0.34)
    : alpha(LIGHT_MODE_RELATIONSHIP_INK, 0.62);
  const focusAccent = getFocusAccent(theme);

  const baseStyle: CSSProperties = {
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    transition:
      'stroke 160ms ease, stroke-width 160ms ease, opacity 160ms ease, stroke-dasharray 160ms ease',
  };

  if (state === 'background') {
    return {
      ...baseStyle,
      stroke: isDark
        ? alpha(theme.palette.text.secondary, 0.18)
        : alpha(LIGHT_MODE_RELATIONSHIP_INK, 0.22),
      strokeWidth: 1.5,
      strokeDasharray: isParameter ? '3 8' : '6 8',
      opacity: 0.58,
    };
  }

  if (state === 'focus') {
    return {
      ...baseStyle,
      stroke: isParameter
        ? getParameterStroke({ isDark, sourceColor, state: 'focus' })
        : alpha(focusAccent, isDark ? 0.88 : 0.82),
      strokeWidth: isParameter ? 2.2 : 2.45,
      strokeDasharray: isParameter ? '4 5' : '7 5',
      opacity: 0.98,
    };
  }

  if (state === 'selected') {
    return {
      ...baseStyle,
      stroke: isParameter
        ? getParameterStroke({ isDark, sourceColor, state: 'selected' })
        : alpha(focusAccent, isDark ? 0.76 : 0.72),
      strokeWidth: isParameter ? 2 : 2.2,
      strokeDasharray: isParameter ? '4 6' : '7 6',
      opacity: 0.94,
    };
  }

  return {
    ...baseStyle,
    stroke: isParameter
      ? getParameterStroke({ isDark, sourceColor, state: 'default' })
      : fallbackStroke,
    strokeWidth: isParameter ? 1.7 : 1.85,
    strokeDasharray: isParameter ? '4 7' : '8 7',
    opacity: isDark ? 0.82 : 0.84,
  };
};
