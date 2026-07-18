import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '../../constants/colors';

interface ArcGaugeProps {
  /** 0–100 */
  value: number;
  height?: number;
  strokeWidth?: number;
  fillColor?: string;
  trackColor?: string;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

const VB_W = 100;
const VB_H = 56;
const CX = 50;
const CY = 48;
const R = 40;
const START = 180;

export function ArcGauge({
  value,
  height = 28,
  strokeWidth = 5,
  fillColor = colors.text,
  trackColor = colors.border,
}: ArcGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const end = START + (clamped / 100) * 180;
  const needle = polar(CX, CY, R, end);

  return (
    <View style={{ width: '100%', height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Path
          d={arcPath(CX, CY, R, START, 360)}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {clamped > 0 && (
          <Path
            d={arcPath(CX, CY, R, START, end)}
            stroke={fillColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}
        <Circle
          cx={needle.x}
          cy={needle.y}
          r={strokeWidth * 0.55}
          fill={fillColor}
        />
      </Svg>
    </View>
  );
}
