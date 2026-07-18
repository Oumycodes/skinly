import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItem,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Svg, { Ellipse } from 'react-native-svg';

import type { ScanMetricId } from '../../services/scan';
import { SCAN_ANGLES, type ScanAngle } from '../../utils/skinMeasures';
import {
  coverLayout,
  primaryRegion,
  regionToPixels,
  zoomTransformForRegion,
  type DisplayMetric,
  type MetricRegion,
} from '../../utils/scanMetrics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH;

const FRAME_W = Math.round(SCREEN_WIDTH * (220 / 340));
const FRAME_H = Math.round(FRAME_W * (280 / 220));
const PHOTO_INSET_X = Math.round(FRAME_W * (11 / 220));
const PHOTO_INSET_Y = Math.round(FRAME_H * (10 / 280));
const PHOTO_W = FRAME_W - PHOTO_INSET_X * 2;
const PHOTO_H = FRAME_H - PHOTO_INSET_Y * 2;
const RIM_RX = FRAME_W * (102 / 220);
const RIM_RY = FRAME_H * (132 / 280);

const TEAL = '#5DCAA5';
const TEAL_FILL = 'rgba(93, 202, 165, 0.18)';
const ARC_GREEN = '#1D9E75';
const RIM = '#E3E2DE';
const WHITE_MARKER = 'rgba(255,255,255,0.9)';
const DOT = '#D5D4D0';
const DOT_ACTIVE = '#111111';

const ZOOM_MS = 600;
const ZOOM_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const PULSE_MS = 2000;
const ARC_MS = 6000;
const SCAN_MS = 3500;

interface InteractiveScanPhotoProps {
  imageUrls: Partial<Record<ScanAngle, string>>;
  metrics: DisplayMetric[];
  activeMetricId: ScanMetricId | null;
  activeRegionIndex: number;
  onRegionSelect: (metricId: ScanMetricId, regionIndex: number) => void;
  onZoomOut: () => void;
  onZoomChange?: (zoomed: boolean) => void;
  /** When false, shows a plain oval photo — no markers, scan line, arc, or zoom */
  interactive?: boolean;
}

function OvalMask({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height}>
      <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill="#000" />
    </Svg>
  );
}

function regionCenter(region: MetricRegion, layout: ReturnType<typeof coverLayout>) {
  const { left, top, size } = regionToPixels(region, layout);
  return { cx: left + size / 2, cy: top + size / 2, r: Math.max(size / 2, 12) };
}

function markerVariant(region: MetricRegion): 'teal' | 'white' {
  if (region.y < 0.32 || region.y > 0.78) return 'white';
  return 'teal';
}

function MarkerPulse({
  cx,
  cy,
  r,
  variant,
  delayMs = 0,
}: {
  cx: number;
  cy: number;
  r: number;
  variant: 'teal' | 'white';
  delayMs?: number;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const size = r * 2;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const timeout = setTimeout(() => {
      loop = Animated.loop(
        Animated.timing(pulse, {
          toValue: 1,
          duration: PULSE_MS,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      );
      loop.start();
    }, delayMs);
    return () => {
      clearTimeout(timeout);
      loop?.stop();
    };
  }, [delayMs, pulse]);

  const opacity = pulse.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0.25, 1],
  });
  const scale = pulse.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 1.35, 1],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: size,
        height: size,
        borderRadius: r,
        borderWidth: 2,
        borderColor: variant === 'white' ? WHITE_MARKER : TEAL,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function ActiveRegionCircle({
  cx,
  cy,
  r,
  variant,
}: {
  cx: number;
  cy: number;
  r: number;
  variant: 'teal' | 'white';
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const size = r * 2;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: PULSE_MS,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1.3, 1] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.7, 0.15, 0.7] });
  const borderColor = variant === 'white' ? WHITE_MARKER : TEAL;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: cx - r,
          top: cy - r,
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: 2,
          borderColor,
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: cx - r,
          top: cy - r,
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: 2.5,
          borderColor,
          backgroundColor: TEAL_FILL,
        }}
      />
    </>
  );
}

function ScanLine() {
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, {
          toValue: 1,
          duration: SCAN_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scan, {
          toValue: 0,
          duration: SCAN_MS / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scan]);

  const translateY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [PHOTO_H * 0.06, PHOTO_H * 0.92],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(93,202,165,0.7)',
        transform: [{ translateY }],
      }}
    />
  );
}

function FaceOverlay({
  layout,
  metrics,
  activeMetric,
  activeRegionIndex,
  isZoomed,
  showMarkers,
  onRegionSelect,
}: {
  layout: ReturnType<typeof coverLayout>;
  metrics: DisplayMetric[];
  activeMetric: DisplayMetric | null;
  activeRegionIndex: number;
  isZoomed: boolean;
  showMarkers: boolean;
  onRegionSelect: (metricId: ScanMetricId, regionIndex: number) => void;
}) {
  if (!showMarkers) return null;

  if (isZoomed && activeMetric) {
    const region =
      activeMetric.regions[activeRegionIndex] ?? primaryRegion(activeMetric.regions);
    if (!region) return null;

    const { cx, cy, r } = regionCenter(region, layout);

    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
        <ActiveRegionCircle cx={cx} cy={cy} r={r} variant={markerVariant(region)} />
        {activeMetric.regions.map((dot, index) => {
          if (index === activeRegionIndex) return null;
          const center = regionCenter(dot, layout);
          return (
            <Pressable
              key={index}
              onPress={() => onRegionSelect(activeMetric.id, index)}
              hitSlop={10}
              style={{
                position: 'absolute',
                left: center.cx - 14,
                top: center.cy - 14,
                width: 28,
                height: 28,
              }}
            />
          );
        })}
      </View>
    );
  }

  const issueRegions = metrics
    .filter((m) => m.hasIssue)
    .flatMap((metric) =>
      metric.regions.map((region, index) => ({
        key: `${metric.id}-${index}`,
        region,
        ...regionCenter(region, layout),
      })),
    );

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <ScanLine />
      {issueRegions.map(({ key, region, cx, cy, r }, i) => (
        <MarkerPulse
          key={key}
          cx={cx}
          cy={cy}
          r={r}
          variant={markerVariant(region)}
          delayMs={(i % 4) * 500}
        />
      ))}
    </View>
  );
}

interface ScanPhotoFrameProps {
  imageUri?: string;
  angle: ScanAngle;
  metrics: DisplayMetric[];
  activeMetric: DisplayMetric | null;
  activeRegionIndex: number;
  isZoomed: boolean;
  zoomEnabled: boolean;
  interactive: boolean;
  scale: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
  layout: ReturnType<typeof coverLayout>;
  onRegionSelect: (metricId: ScanMetricId, regionIndex: number) => void;
}

function ScanPhotoFrame({
  imageUri,
  angle,
  metrics,
  activeMetric,
  activeRegionIndex,
  isZoomed,
  zoomEnabled,
  interactive,
  scale,
  translateX,
  translateY,
  layout,
  onRegionSelect,
}: ScanPhotoFrameProps) {
  const arcSpin = useRef(new Animated.Value(0)).current;
  const showMarkers = interactive && angle === 'front';

  useEffect(() => {
    if (!interactive) return;
    Animated.loop(
      Animated.timing(arcSpin, {
        toValue: 1,
        duration: ARC_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [arcSpin, interactive]);

  const arcRotate = arcSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['-90deg', '270deg'],
  });

  const zoomTransform = zoomEnabled
    ? { transform: [{ translateX }, { translateY }, { scale }] }
    : undefined;

  return (
    <View style={styles.framePage}>
      <View style={[styles.frame, { width: FRAME_W, height: FRAME_H }]}>
        {interactive ? (
          <Animated.View
            style={[styles.arcLayer, { transform: [{ rotate: arcRotate }] }]}
            pointerEvents="none"
          >
            <Svg width={FRAME_W} height={FRAME_H}>
              <Ellipse
                cx={FRAME_W / 2}
                cy={FRAME_H / 2}
                rx={RIM_RX}
                ry={RIM_RY}
                stroke={ARC_GREEN}
                strokeWidth={3}
                strokeDasharray={`${FRAME_W * 2.55} ${FRAME_H * 2.79}`}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        ) : null}

        <View
          style={[
            styles.photoClip,
            {
              left: PHOTO_INSET_X,
              top: PHOTO_INSET_Y,
              width: PHOTO_W,
              height: PHOTO_H,
            },
          ]}
        >
          <MaskedView style={styles.masked} maskElement={<OvalMask width={PHOTO_W} height={PHOTO_H} />}>
            <Animated.View style={[styles.zoomLayer, zoomTransform]}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photo, styles.photoPlaceholder]} />
              )}
              <FaceOverlay
                layout={layout}
                metrics={metrics}
                activeMetric={activeMetric}
                activeRegionIndex={activeRegionIndex}
                isZoomed={isZoomed && zoomEnabled}
                showMarkers={showMarkers}
                onRegionSelect={onRegionSelect}
              />
            </Animated.View>
          </MaskedView>
        </View>

        <Svg
          width={FRAME_W}
          height={FRAME_H}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        >
          <Ellipse
            cx={FRAME_W / 2}
            cy={FRAME_H / 2}
            rx={RIM_RX}
            ry={RIM_RY}
            stroke={RIM}
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      </View>
    </View>
  );
}

function AngleDots({
  activeIndex,
  onDotPress,
  available,
}: {
  activeIndex: number;
  onDotPress: (index: number) => void;
  available: boolean[];
}) {
  return (
    <View style={styles.dots}>
      {SCAN_ANGLES.map((angle, index) => (
        <Pressable
          key={angle}
          onPress={() => onDotPress(index)}
          hitSlop={10}
          accessibilityLabel={angle}
          disabled={!available[index]}
        >
          <View
            style={[
              styles.dot,
              index === activeIndex && styles.dotActive,
              !available[index] && styles.dotMissing,
            ]}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function InteractiveScanPhoto({
  imageUrls,
  metrics,
  activeMetricId,
  activeRegionIndex,
  onRegionSelect,
  onZoomOut,
  onZoomChange,
  interactive = true,
}: InteractiveScanPhotoProps) {
  const listRef = useRef<FlatList<ScanAngle>>(null);
  const scrollIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageSize, setImageSize] = useState({ w: 3, h: 4 });

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const activeMetric = interactive ? metrics.find((m) => m.id === activeMetricId) ?? null : null;
  const isZoomed = interactive && activeMetricId !== null;
  const isOnFront = activeIndex === 0;

  const photoTapStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: PHOTO_INSET_Y,
      left: (PAGE_WIDTH - FRAME_W) / 2 + PHOTO_INSET_X,
      width: PHOTO_W,
      height: PHOTO_H,
      zIndex: 50,
    }),
    [],
  );

  const layout = useMemo(
    () => coverLayout(PHOTO_W, PHOTO_H, imageSize.w, imageSize.h),
    [imageSize.h, imageSize.w],
  );

  const available = useMemo(
    () => SCAN_ANGLES.map((angle) => Boolean(imageUrls[angle])),
    [imageUrls],
  );

  const scrollToIndex = useCallback((index: number, animated = true) => {
    const clamped = Math.max(0, Math.min(index, SCAN_ANGLES.length - 1));
    scrollIndexRef.current = clamped;
    setActiveIndex(clamped);
    listRef.current?.scrollToIndex({ index: clamped, animated });
  }, []);

  const resetZoom = useCallback(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: ZOOM_MS, easing: ZOOM_EASING, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: ZOOM_MS, easing: ZOOM_EASING, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: ZOOM_MS, easing: ZOOM_EASING, useNativeDriver: true }),
    ]).start();
  }, [scale, translateX, translateY]);

  const applyZoom = useCallback(() => {
    if (!activeMetric || !isOnFront) {
      resetZoom();
      return;
    }

    const region = activeMetric.regions[activeRegionIndex] ?? primaryRegion(activeMetric.regions);
    if (!region) {
      resetZoom();
      return;
    }

    const target = zoomTransformForRegion(region, layout, PHOTO_W, PHOTO_H);
    Animated.parallel([
      Animated.timing(scale, { toValue: target.scale, duration: ZOOM_MS, easing: ZOOM_EASING, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: target.tx, duration: ZOOM_MS, easing: ZOOM_EASING, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: target.ty, duration: ZOOM_MS, easing: ZOOM_EASING, useNativeDriver: true }),
    ]).start();
  }, [activeMetric, activeRegionIndex, isOnFront, layout, resetZoom, scale, translateX, translateY]);

  useEffect(() => {
    if (!interactive) return;
    onZoomChange?.(isZoomed);
  }, [interactive, isZoomed, onZoomChange]);

  useEffect(() => {
    if (!interactive || !activeMetric || !isOnFront) {
      resetZoom();
      return;
    }
    applyZoom();
  }, [interactive, activeMetric, activeRegionIndex, isOnFront, layout, applyZoom, resetZoom]);

  useEffect(() => {
    const frontUri = imageUrls.front;
    if (!frontUri) return;
    Image.getSize(
      frontUri,
      (w, h) => setImageSize({ w, h }),
      () => setImageSize({ w: 3, h: 4 }),
    );
  }, [imageUrls.front]);

  useEffect(() => {
    if (!interactive) return;
    if (activeMetricId && activeIndex !== 0) {
      scrollToIndex(0);
    }
  }, [interactive, activeMetricId, activeIndex, scrollToIndex]);

  const handleAngleChange = useCallback(
    (index: number) => {
      if (index === scrollIndexRef.current) return;
      scrollIndexRef.current = index;
      setActiveIndex(index);
      if (isZoomed) onZoomOut();
    },
    [isZoomed, onZoomOut],
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
      handleAngleChange(Math.max(0, Math.min(index, SCAN_ANGLES.length - 1)));
    },
    [handleAngleChange],
  );

  const onScrollToIndexFailed = useCallback((info: { index: number }) => {
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index: info.index, animated: true });
    }, 50);
  }, []);

  const handlePhotoPress = useCallback(() => {
    resetZoom();
    onZoomOut();
  }, [onZoomOut, resetZoom]);

  const renderItem: ListRenderItem<ScanAngle> = useCallback(
    ({ item, index }) => (
      <ScanPhotoFrame
        imageUri={imageUrls[item]}
        angle={item}
        metrics={metrics}
        activeMetric={activeMetric}
        activeRegionIndex={activeRegionIndex}
        isZoomed={isZoomed}
        zoomEnabled={interactive && index === 0}
        interactive={interactive}
        scale={scale}
        translateX={translateX}
        translateY={translateY}
        layout={layout}
        onRegionSelect={onRegionSelect}
      />
    ),
    [
      activeMetric,
      activeRegionIndex,
      imageUrls,
      interactive,
      isZoomed,
      layout,
      metrics,
      onRegionSelect,
      scale,
      translateX,
      translateY,
    ],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.carouselHost}>
        <FlatList
          ref={listRef}
          data={SCAN_ANGLES}
          keyExtractor={(item) => item}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!isZoomed}
          pointerEvents={isZoomed ? 'none' : 'auto'}
          onMomentumScrollEnd={onMomentumScrollEnd}
          onScrollToIndexFailed={onScrollToIndexFailed}
          extraData={{ isZoomed, activeMetricId, activeRegionIndex, layout }}
          getItemLayout={(_, index) => ({
            length: PAGE_WIDTH,
            offset: PAGE_WIDTH * index,
            index,
          })}
          style={styles.carousel}
        />
        {interactive && isZoomed && isOnFront ? (
          <Pressable
            style={photoTapStyle}
            onPress={handlePhotoPress}
            accessibilityLabel="Zoom out"
            accessibilityRole="button"
          />
        ) : null}
      </View>
      <AngleDots
        activeIndex={activeIndex}
        available={available}
        onDotPress={(index) => {
          if (available[index]) scrollToIndex(index);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  carouselHost: {
    width: PAGE_WIDTH,
    position: 'relative',
  },
  carousel: {
    width: PAGE_WIDTH,
  },
  framePage: {
    width: PAGE_WIDTH,
    alignItems: 'center',
  },
  frame: {
    position: 'relative',
  },
  arcLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  photoClip: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 9999,
  },
  masked: {
    flex: 1,
  },
  zoomLayer: {
    width: PHOTO_W,
    height: PHOTO_H,
  },
  photo: {
    width: PHOTO_W,
    height: PHOTO_H,
  },
  photoPlaceholder: {
    backgroundColor: '#F3F2EF',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: DOT,
  },
  dotActive: {
    backgroundColor: DOT_ACTIVE,
  },
  dotMissing: {
    opacity: 0.35,
  },
});
