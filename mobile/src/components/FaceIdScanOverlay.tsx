import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, Line, Mask, Rect } from 'react-native-svg';

import { spacing } from '../constants/spacing';
import { type } from '../constants/typography';

/** Face ID–style progress green (distinct from brand sage for scan feedback) */
const TICK_ACTIVE = '#1D9E75';
const TICK_IDLE = 'rgba(255,255,255,0.45)';
const TICK_COUNT = 84;
const TICK_INNER_GAP = 10;
const TICK_LENGTH = 11;

export interface FaceOvalLayout {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

interface FaceIdScanOverlayProps {
  /** 0–1 clockwise fill starting from top */
  progress: number;
  instruction?: string | null;
  hint?: string | null;
}

export function getFaceOvalLayout(width: number, height: number): FaceOvalLayout {
  return {
    cx: width / 2,
    cy: height * 0.36,
    rx: (width * 0.62) / 2,
    ry: (height * 0.38) / 2,
  };
}

export function FaceIdScanOverlay({
  progress,
  instruction,
  hint,
}: FaceIdScanOverlayProps) {
  const { width, height } = useWindowDimensions();
  const { cx, cy, rx, ry } = getFaceOvalLayout(width, height);
  const clamped = Math.max(0, Math.min(1, progress));
  const filledCount = Math.round(clamped * TICK_COUNT);

  const ticks = [];
  for (let i = 0; i < TICK_COUNT; i += 1) {
    // Start at top (-90°) and go clockwise
    const angle = -Math.PI / 2 + (i / TICK_COUNT) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rimX = cx + cos * rx;
    const rimY = cy + sin * ry;
    const len = Math.hypot(rimX - cx, rimY - cy) || 1;
    const nx = (rimX - cx) / len;
    const ny = (rimY - cy) / len;
    const x1 = rimX + nx * TICK_INNER_GAP;
    const y1 = rimY + ny * TICK_INNER_GAP;
    const x2 = rimX + nx * (TICK_INNER_GAP + TICK_LENGTH);
    const y2 = rimY + ny * (TICK_INNER_GAP + TICK_LENGTH);

    const active = i < filledCount;
    ticks.push(
      <Line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={active ? TICK_ACTIVE : TICK_IDLE}
        strokeWidth={active ? 2.4 : 1.8}
        strokeLinecap="round"
        opacity={active ? 1 : 0.85}
      />,
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <Mask id="faceIdMask">
            <Rect width={width} height={height} fill="white" />
            <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
          </Mask>
        </Defs>
        <Rect
          width={width}
          height={height}
          fill="rgba(0,0,0,0.58)"
          mask="url(#faceIdMask)"
        />
        <Ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={1.5}
          fill="transparent"
        />
        {ticks}
      </Svg>

      <View style={[styles.copyBlock, { top: cy + ry + 36 }]}>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        {instruction ? <Text style={styles.instruction}>{instruction}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  copyBlock: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    alignItems: 'center',
    gap: 8,
  },
  instruction: {
    ...type.body,
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
  },
  hint: {
    ...type.bodySmall,
    color: '#FFD166',
    textAlign: 'center',
  },
});
