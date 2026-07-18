import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, Mask, Rect } from 'react-native-svg';

import { colors } from '../constants/colors';
import type { ScanAngle } from '../utils/skinMeasures';

interface FaceGuideOverlayProps {
  angle?: ScanAngle;
}

export function FaceGuideOverlay({ angle = 'front' }: FaceGuideOverlayProps) {
  const { width, height } = useWindowDimensions();

  const isProfile = angle === 'left' || angle === 'right';
  const ovalWidth = width * (isProfile ? 0.48 : 0.62);
  const ovalHeight = height * (isProfile ? 0.42 : 0.38);
  const cx = width / 2 + (isProfile ? (angle === 'left' ? width * 0.04 : -width * 0.04) : 0);
  const cy = height * 0.36;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <Mask id="faceMask">
            <Rect width={width} height={height} fill="white" />
            <Ellipse
              cx={cx}
              cy={cy}
              rx={ovalWidth / 2}
              ry={ovalHeight / 2}
              fill="black"
            />
          </Mask>
        </Defs>
        <Rect
          width={width}
          height={height}
          fill="rgba(0,0,0,0.55)"
          mask="url(#faceMask)"
        />
        <Ellipse
          cx={cx}
          cy={cy}
          rx={ovalWidth / 2}
          ry={ovalHeight / 2}
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeDasharray="10 6"
          fill="transparent"
        />
      </Svg>
    </View>
  );
}
