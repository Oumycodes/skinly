import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '../../constants/colors';
import { font } from '../../constants/typography';
import {
  ANGLE_FACE_CONFIG,
  SCAN_ANGLE_LABEL,
  getMeasureFocus,
  type ScanAngle,
  type SkinMeasureId,
} from '../../utils/skinMeasures';

const SCREEN_WIDTH = Dimensions.get('window').width;
export const FACE_FRAME_WIDTH = SCREEN_WIDTH;
export const FACE_FRAME_HEIGHT = Math.round(FACE_FRAME_WIDTH * 0.7);
export const FACE_OVAL_WIDTH = FACE_FRAME_WIDTH;
export const FACE_OVAL_HEIGHT = FACE_FRAME_HEIGHT;

const SPOT_RADIUS = Math.min(FACE_FRAME_WIDTH, FACE_FRAME_HEIGHT) * 0.11;

interface FaceOvalViewerProps {
  imageUrl?: string | null;
  angle: ScanAngle;
  activeMeasureId: SkinMeasureId | null;
  onPress?: () => void;
}

function focusTransform(cx: number, cy: number, zoom: number) {
  return {
    scale: zoom,
    tx: FACE_FRAME_WIDTH / 2 - cx * FACE_FRAME_WIDTH * zoom,
    ty: FACE_FRAME_HEIGHT / 2 - cy * FACE_FRAME_HEIGHT * zoom,
  };
}

export function FaceOvalViewer({
  imageUrl,
  angle,
  activeMeasureId,
  onPress,
}: FaceOvalViewerProps) {
  const config = ANGLE_FACE_CONFIG[angle];
  const focus = activeMeasureId && imageUrl ? getMeasureFocus(angle, activeMeasureId) : null;

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const highlightOpacity = useRef(new Animated.Value(0)).current;

  const scaledW = FACE_FRAME_WIDTH * config.baseZoom;
  const scaledH = FACE_FRAME_HEIGHT * config.baseZoom;
  const imageLeft = FACE_FRAME_WIDTH * config.hCenter - scaledW / 2;
  const imageTop = -(scaledH * config.topCrop);

  useEffect(() => {
    const target = focus
      ? focusTransform(focus.cx, focus.cy, focus.scale)
      : { scale: 1, tx: 0, ty: 0 };

    Animated.parallel([
      Animated.spring(scale, {
        toValue: target.scale,
        useNativeDriver: true,
        friction: 8,
        tension: 44,
      }),
      Animated.spring(translateX, {
        toValue: target.tx,
        useNativeDriver: true,
        friction: 8,
        tension: 44,
      }),
      Animated.spring(translateY, {
        toValue: target.ty,
        useNativeDriver: true,
        friction: 8,
        tension: 44,
      }),
      Animated.timing(highlightOpacity, {
        toValue: activeMeasureId && imageUrl ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeMeasureId, focus, imageUrl, scale, translateX, translateY, highlightOpacity]);

  const faceContent = imageUrl ? (
    <Animated.View
      style={[
        styles.faceImageWrap,
        { transform: [{ translateX }, { translateY }, { scale }] },
      ]}
    >
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.faceImage,
          {
            width: scaledW,
            height: scaledH,
            left: imageLeft,
            top: imageTop,
          },
        ]}
      />
    </Animated.View>
  ) : (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderLabel}>{SCAN_ANGLE_LABEL[angle]}</Text>
      <Text style={styles.placeholderText}>Profile not captured</Text>
      <Text style={styles.placeholderHint}>Re-scan to add this angle</Text>
    </View>
  );

  const content = (
    <View style={styles.frame}>
      <View style={styles.rectSlot}>
        {faceContent}

        {imageUrl && (
          <Animated.View
            style={[styles.spotOverlay, { opacity: highlightOpacity }]}
            pointerEvents="none"
          >
            <Svg width={FACE_FRAME_WIDTH} height={FACE_FRAME_HEIGHT}>
              <Circle
                cx={FACE_FRAME_WIDTH / 2}
                cy={FACE_FRAME_HEIGHT / 2}
                r={SPOT_RADIUS}
                stroke="#FFFFFF"
                strokeWidth={2}
                fill="none"
              />
            </Svg>
          </Animated.View>
        )}
      </View>
    </View>
  );

  if (onPress && imageUrl) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.pressable}>{content}</View>;
}

const styles = StyleSheet.create({
  pressable: {
    width: FACE_FRAME_WIDTH,
  },
  frame: {
    width: FACE_FRAME_WIDTH,
    height: FACE_FRAME_HEIGHT,
  },
  rectSlot: {
    width: FACE_FRAME_WIDTH,
    height: FACE_FRAME_HEIGHT,
    overflow: 'hidden',
    backgroundColor: colors.surfaceMuted,
  },
  faceImageWrap: {
    width: FACE_FRAME_WIDTH,
    height: FACE_FRAME_HEIGHT,
  },
  faceImage: {
    position: 'absolute',
    resizeMode: 'cover',
  },
  spotOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 4,
  },
  placeholderLabel: {
    ...font.semibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  placeholderText: {
    ...font.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  placeholderHint: {
    ...font.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
