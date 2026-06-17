import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, Mask, Rect } from 'react-native-svg';

import { colors } from '../constants/colors';

export function FaceGuideOverlay() {
  const { width, height } = useWindowDimensions();
  const ovalWidth = width * 0.62;
  const ovalHeight = height * 0.38;
  const cx = width / 2;
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
