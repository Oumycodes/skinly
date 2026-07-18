import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';

import { colors } from '../../constants/colors';
import { font } from '../../constants/typography';
import {
  SCAN_ANGLES,
  type ScanAngle,
  type SkinMeasureId,
} from '../../utils/skinMeasures';
import { FACE_FRAME_WIDTH, FaceOvalViewer } from './FaceOvalViewer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PAGE_WIDTH = SCREEN_WIDTH;

interface MultiAngleFaceViewerProps {
  images: Partial<Record<ScanAngle, string>>;
  activeMeasureId: SkinMeasureId | null;
  activeAngle?: ScanAngle;
  onAngleChange?: (angle: ScanAngle) => void;
  onResetZoom?: () => void;
  /** Replaces the swipe hint when provided */
  analysisText?: string;
  /** Always show Front / Left / Right tabs even when profile photos are missing */
  showAllAngles?: boolean;
}

export function MultiAngleFaceViewer({
  images,
  activeMeasureId,
  activeAngle: controlledAngle,
  onAngleChange,
  onResetZoom,
  analysisText,
  showAllAngles = false,
}: MultiAngleFaceViewerProps) {
  const listRef = useRef<FlatList<ScanAngle>>(null);
  const scrollIndexRef = useRef(0);
  const [internalAngle, setInternalAngle] = useState<ScanAngle>('front');
  const activeAngle = controlledAngle ?? internalAngle;

  const availableAngles = showAllAngles
    ? SCAN_ANGLES
    : SCAN_ANGLES.filter((a) => images[a]);

  const hasAnyImage = SCAN_ANGLES.some((a) => images[a]);
  if (!hasAnyImage && !showAllAngles) return null;

  const setAngle = useCallback(
    (angle: ScanAngle) => {
      if (!controlledAngle) setInternalAngle(angle);
      onAngleChange?.(angle);
    },
    [controlledAngle, onAngleChange],
  );

  const syncScroll = useCallback((index: number, animated: boolean) => {
    scrollIndexRef.current = index;
    listRef.current?.scrollToIndex({ index, animated });
  }, []);

  const scrollToAngle = useCallback(
    (angle: ScanAngle) => {
      const index = availableAngles.indexOf(angle);
      if (index < 0) return;
      setAngle(angle);
      syncScroll(index, true);
    },
    [availableAngles, setAngle, syncScroll],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
      const clamped = Math.max(0, Math.min(index, availableAngles.length - 1));
      scrollIndexRef.current = clamped;
      const angle = availableAngles[clamped];
      if (angle && angle !== activeAngle) {
        setAngle(angle);
      }
    },
    [activeAngle, availableAngles, setAngle],
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
      const clamped = Math.max(0, Math.min(index, availableAngles.length - 1));
      scrollIndexRef.current = clamped;
      const angle = availableAngles[clamped];
      if (angle && angle !== activeAngle) {
        setAngle(angle);
      }
    },
    [activeAngle, availableAngles, setAngle],
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number }) => {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: true });
      }, 50);
    },
    [],
  );

  const renderItem: ListRenderItem<ScanAngle> = useCallback(
    ({ item }) => (
      <View style={[styles.page, { width: PAGE_WIDTH }]}>
        <FaceOvalViewer
          imageUrl={images[item]}
          angle={item}
          activeMeasureId={activeMeasureId}
          onPress={activeMeasureId && images[item] ? onResetZoom : undefined}
        />
      </View>
    ),
    [activeMeasureId, images, onResetZoom],
  );

  const activeIndex = Math.max(0, availableAngles.indexOf(activeAngle));

  useEffect(() => {
    if (availableAngles.length <= 1) return;
    if (scrollIndexRef.current === activeIndex) return;
    syncScroll(activeIndex, true);
  }, [activeIndex, availableAngles.length, syncScroll]);

  if (availableAngles.length === 1) {
    const angle = availableAngles[0]!;
    return (
      <View style={styles.single}>
        <FaceOvalViewer
          imageUrl={images[angle]}
          angle={angle}
          activeMeasureId={activeMeasureId}
          onPress={activeMeasureId && images[angle] ? onResetZoom : undefined}
        />
        {analysisText ? <Text style={styles.analysis}>{analysisText}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={listRef}
        data={availableAngles}
        keyExtractor={(item) => item}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollToIndexFailed={onScrollToIndexFailed}
        getItemLayout={(_, index) => ({
          length: PAGE_WIDTH,
          offset: PAGE_WIDTH * index,
          index,
        })}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.dots}>
        {availableAngles.map((angle, index) => (
          <Pressable
            key={angle}
            onPress={() => scrollToAngle(angle)}
            hitSlop={10}
            accessibilityLabel={angle}
          >
            <View
              style={[
                styles.dot,
                index === activeIndex && styles.dotActive,
                !images[angle] && styles.dotMissing,
              ]}
            />
          </Pressable>
        ))}
      </View>

      {analysisText ? (
        <Text style={styles.analysis}>{analysisText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: -20,
    alignItems: 'stretch',
    gap: 0,
  },
  list: {
    width: PAGE_WIDTH,
    backgroundColor: 'transparent',
  },
  listContent: {
    alignItems: 'stretch',
  },
  page: {
    justifyContent: 'center',
    width: PAGE_WIDTH,
    backgroundColor: 'transparent',
  },
  single: {
    alignItems: 'stretch',
    gap: 0,
    marginHorizontal: -20,
    width: SCREEN_WIDTH,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.text,
    transform: [{ scale: 1.15 }],
  },
  dotMissing: {
    opacity: 0.35,
  },
  analysis: {
    ...font.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    maxWidth: FACE_FRAME_WIDTH,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
