import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AnalyzingMeshOverlay } from '../components/AnalyzingMeshOverlay';
import { FaceGuideOverlay } from '../components/FaceGuideOverlay';
import { FaceIdScanOverlay } from '../components/FaceIdScanOverlay';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { type } from '../constants/typography';
import { useFaceIdScanSequence } from '../hooks/useFaceIdScanSequence';
import { useScanQuota } from '../hooks/useScanQuota';
import type { ScanStackParamList } from '../navigation/types';
import { ApiError } from '../services/api';
import {
  QC_REASON_COPY,
  submitHybridScan,
  type ScanAngle,
  type ScanImages,
} from '../services/scan';
import { cropCaptureToFaceGuide } from '../utils/cropFaceGuide';
import { SCAN_ANGLES } from '../utils/skinMeasures';

type Props = NativeStackScreenProps<ScanStackParamList, 'ScanCamera'>;

type FlowPhase =
  | 'idle'
  | 'sweeping'
  | 'bridge'
  | 'posed'
  | 'analyzing';

const POSED_COPY: Record<ScanAngle, { title: string; subtitle: string }> = {
  front: {
    title: 'Front view',
    subtitle: 'Face the camera and align within the oval',
  },
  left: {
    title: 'Left profile',
    subtitle: 'Turn slowly to show your left cheek',
  },
  right: {
    title: 'Right profile',
    subtitle: 'Turn to show your right cheek',
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ScanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('idle');
  const [burstFrames, setBurstFrames] = useState<string[]>([]);
  const [posedStep, setPosedStep] = useState(0);
  const [posedCaptures, setPosedCaptures] = useState<Partial<ScanImages>>({});
  const [isCapturingPosed, setIsCapturingPosed] = useState(false);
  const [gateHint, setGateHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { quota, refresh: refreshQuota } = useScanQuota();

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) {
      throw new Error('Camera not ready');
    }
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.85,
      skipProcessing: false,
      shutterSound: false,
    });
    if (!photo?.uri) {
      throw new Error('Failed to capture photo');
    }
    return photo.uri;
  }, []);

  const {
    progress,
    instruction,
    setInstruction,
    runSequence,
    reset: resetSweep,
    cancel,
  } = useFaceIdScanSequence({ takePicture });

  const currentAngle = SCAN_ANGLES[posedStep]!;
  const posedCopy = POSED_COPY[currentAngle];
  const limitReached =
    quota?.plan === 'free' && quota.limit > 0 && quota.remaining <= 0;
  const busy =
    flowPhase === 'sweeping' ||
    flowPhase === 'bridge' ||
    flowPhase === 'analyzing' ||
    isCapturingPosed;

  function handleClose() {
    cancel();
    navigation.getParent()?.goBack();
  }

  function resetAll() {
    cancel();
    resetSweep();
    setFlowPhase('idle');
    setBurstFrames([]);
    setPosedStep(0);
    setPosedCaptures({});
    setIsCapturingPosed(false);
    setInstruction('Align your face in the oval, then start');
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, styles.permissionScreen, { paddingTop: insets.top }]}>
        <Pressable style={[styles.closeButton, styles.closeButtonLight]} onPress={handleClose}>
          <Text style={styles.closeButtonTextLight}>✕</Text>
        </Pressable>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          skins uses your front camera to analyze your skin. Photos are sent securely for analysis.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  async function finishAndAnalyze(
    burst: string[],
    posed: ScanImages,
  ) {
    setFlowPhase('analyzing');
    setInstruction('Analyzing your skin…');

    const croppedBurst: string[] = [];
    for (const raw of burst) {
      try {
        croppedBurst.push(await cropCaptureToFaceGuide(raw, 'front'));
      } catch {
        // skip
      }
    }

    const result = await submitHybridScan(croppedBurst, posed);
    await refreshQuota();

    navigation.navigate('ScanResult', {
      result,
      localImages: {
        front: result.image_urls?.front ?? posed.front,
        left: result.image_urls?.left ?? posed.left,
        right: result.image_urls?.right ?? posed.right,
      },
    });
    resetAll();
  }

  async function handleStartScan() {
    if (busy || limitReached || flowPhase !== 'idle') return;

    setError(null);
    setGateHint(null);
    setFlowPhase('sweeping');

    try {
      const { allFrames } = await runSequence();
      setBurstFrames(allFrames);

      // Smooth bridge into posed 3-angle capture
      setFlowPhase('bridge');
      setInstruction('Nice — next we’ll capture front, left, and right');
      await sleep(1100);

      setPosedStep(0);
      setPosedCaptures({});
      setFlowPhase('posed');
      setInstruction(POSED_COPY.front.subtitle);
    } catch (err) {
      if (err instanceof Error && err.message === 'cancelled') {
        resetAll();
        return;
      }
      setError(err instanceof Error ? err.message : 'Scan failed. Please try again.');
      resetAll();
    }
  }

  async function handlePosedCapture() {
    if (flowPhase !== 'posed' || isCapturingPosed || limitReached) return;

    setIsCapturingPosed(true);
    setError(null);
    setGateHint(null);

    try {
      const raw = await takePicture();
      const cropped = await cropCaptureToFaceGuide(raw, currentAngle);
      const nextCaptures = { ...posedCaptures, [currentAngle]: cropped };
      setPosedCaptures(nextCaptures);

      const isLast = posedStep >= SCAN_ANGLES.length - 1;
      if (!isLast) {
        const next = posedStep + 1;
        setPosedStep(next);
        setInstruction(POSED_COPY[SCAN_ANGLES[next]!]!.subtitle);
        return;
      }

      const posed = nextCaptures as ScanImages;
      if (!posed.front || !posed.left || !posed.right) {
        throw new Error('Missing posed photos');
      }
      await finishAndAnalyze(burstFrames, posed);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setGateHint(
          (err.reason && QC_REASON_COPY[err.reason]) ||
            err.message ||
            'Please retake the photo.',
        );
        setFlowPhase('posed');
        return;
      }
      let message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Scan failed. Please try again.';
      if (err instanceof ApiError && err.status === 401) {
        message = 'Please sign in to scan. Go to Profile and sign in with Google or email.';
      }
      setError(message);
      setFlowPhase('posed');
    } finally {
      setIsCapturingPosed(false);
    }
  }

  function handlePosedBack() {
    if (posedStep <= 0 || isCapturingPosed) return;
    const prev = posedStep - 1;
    setPosedStep(prev);
    setInstruction(POSED_COPY[SCAN_ANGLES[prev]!]!.subtitle);
  }

  const showFaceIdOverlay =
    flowPhase === 'idle' || flowPhase === 'sweeping' || flowPhase === 'bridge';

  const displayProgress =
    flowPhase === 'bridge' || flowPhase === 'posed' ? 1 : progress;

  const overlayInstruction =
    flowPhase === 'idle' && !gateHint && !error
      ? 'Move your head slowly to complete the circle.'
      : flowPhase === 'bridge'
        ? 'Nice — next we’ll capture front, left, and right'
        : flowPhase === 'posed'
          ? posedCopy.subtitle
          : instruction;

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" />

      {flowPhase === 'analyzing' ? (
        <AnalyzingMeshOverlay />
      ) : showFaceIdOverlay ? (
        <FaceIdScanOverlay
          progress={displayProgress}
          instruction={overlayInstruction}
          hint={gateHint}
        />
      ) : (
        <>
          <FaceGuideOverlay angle={currentAngle} />
          <View style={[styles.posedCopy, { top: insets.top + 88 }]} pointerEvents="none">
            <Text style={styles.posedTitle}>{posedCopy.title}</Text>
            <Text style={styles.posedSubtitle}>{posedCopy.subtitle}</Text>
            <Text style={styles.posedStep}>Photo {posedStep + 1} of 3</Text>
            {gateHint ? <Text style={styles.gateText}>{gateHint}</Text> : null}
          </View>
        </>
      )}

      {flowPhase !== 'analyzing' && (
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={12}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={styles.title}>Face scan</Text>
          {flowPhase === 'posed' && (
            <View style={styles.stepDots}>
              {SCAN_ANGLES.map((angle, index) => (
                <View
                  key={angle}
                  style={[
                    styles.stepDot,
                    index <= posedStep && styles.stepDotActive,
                    posedCaptures[angle] && index < posedStep && styles.stepDotDone,
                  ]}
                />
              ))}
            </View>
          )}
          {quota && quota.plan === 'free' && quota.limit > 0 && (
            <Text style={styles.quota}>
              {quota.remaining} free scan{quota.remaining === 1 ? '' : 's'} left
            </Text>
          )}
        </View>
        <View style={styles.topBarSpacer} />
      </View>
      )}

      {flowPhase !== 'analyzing' && (
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 28 }]}>
        {error && !gateHint ? <Text style={styles.errorText}>{error}</Text> : null}

        {limitReached && (
          <Text style={styles.limitText}>
            Monthly scan limit reached. Upgrade to Pro for unlimited scans.
          </Text>
        )}

        {flowPhase === 'posed' ? (
          <View style={styles.posedActions}>
            {posedStep > 0 ? (
              <Pressable style={styles.backButton} onPress={handlePosedBack}>
                <Text style={styles.backButtonText}>Back</Text>
              </Pressable>
            ) : (
              <View style={styles.backSpacer} />
            )}

            <Pressable
              style={[
                styles.captureButton,
                (isCapturingPosed || limitReached) && styles.captureButtonDisabled,
              ]}
              onPress={handlePosedCapture}
              disabled={isCapturingPosed || limitReached}
            >
              {isCapturingPosed ? (
                <ActivityIndicator color={colors.primary} size="large" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </Pressable>

            <View style={styles.backSpacer} />
          </View>
        ) : (
          <Pressable
            style={[
              styles.startButton,
              (busy || limitReached || flowPhase !== 'idle') && styles.startButtonDisabled,
            ]}
            onPress={handleStartScan}
            disabled={busy || limitReached || flowPhase !== 'idle'}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startButtonText}>
                {gateHint || error ? 'Try again' : 'Start scan'}
              </Text>
            )}
          </Pressable>
        )}

        {flowPhase === 'posed' && !isCapturingPosed ? (
          <Text style={styles.hint}>Align, then tap to capture</Text>
        ) : null}
        {flowPhase === 'sweeping' ? (
          <Text style={styles.hint}>Keep moving slowly around the circle</Text>
        ) : null}
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  permissionScreen: {
    padding: spacing.section + spacing.inner,
    gap: spacing.item,
  },
  permissionTitle: {
    ...type.sectionTitle,
    textAlign: 'center',
  },
  permissionBody: {
    ...type.body,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: spacing.inner,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    ...type.button,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.screen,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  topBarSpacer: {
    width: 40,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  stepDotActive: {
    backgroundColor: colors.surface,
  },
  stepDotDone: {
    backgroundColor: '#1D9E75',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  closeButtonLight: {
    position: 'relative',
    left: 0,
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    marginBottom: 8,
  },
  closeButtonText: {
    ...type.cardTitle,
    color: colors.surface,
    lineHeight: 22,
  },
  closeButtonTextLight: {
    ...type.cardTitle,
    lineHeight: 22,
  },
  title: {
    ...type.sectionTitle,
    color: colors.surface,
  },
  quota: {
    ...type.caption,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  posedCopy: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    alignItems: 'center',
    gap: 4,
  },
  posedTitle: {
    ...type.sectionTitle,
    color: '#fff',
  },
  posedSubtitle: {
    ...type.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  posedStep: {
    ...type.caption,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  limitText: {
    ...type.bodySmall,
    color: colors.warning,
    textAlign: 'center',
    paddingHorizontal: spacing.section,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing.item,
    paddingHorizontal: spacing.screen,
  },
  posedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  backButton: {
    width: 72,
    alignItems: 'center',
    paddingVertical: 10,
  },
  backButtonText: {
    ...type.link,
    color: colors.surface,
  },
  backSpacer: {
    width: 72,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#1D9E75',
  },
  captureButtonDisabled: {
    opacity: 0.55,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1D9E75',
  },
  startButton: {
    minWidth: 200,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    backgroundColor: '#1D9E75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonDisabled: {
    opacity: 0.55,
  },
  startButtonText: {
    ...type.button,
    color: '#FFFFFF',
    fontSize: 17,
  },
  hint: {
    ...type.bodySmall,
    color: 'rgba(255,255,255,0.75)',
  },
  gateText: {
    ...type.bodySmall,
    color: '#FFD166',
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    ...type.bodySmall,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: spacing.section,
    marginBottom: 4,
  },
});
