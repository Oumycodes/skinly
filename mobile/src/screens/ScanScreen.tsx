import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { FaceGuideOverlay } from '../components/FaceGuideOverlay';
import { colors } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { type } from '../constants/typography';
import { useScanQuota } from '../hooks/useScanQuota';
import type { ScanStackParamList } from '../navigation/types';
import { ApiError } from '../services/api';
import { submitScan, type ScanAngle, type ScanImages } from '../services/scan';
import { cropCaptureToFaceGuide } from '../utils/cropFaceGuide';
import { SCAN_ANGLES } from '../utils/skinMeasures';

type Props = NativeStackScreenProps<ScanStackParamList, 'ScanCamera'>;

const STEP_COPY: Record<
  ScanAngle,
  { title: string; subtitle: string; step: number }
> = {
  front: {
    title: 'Front view',
    subtitle: 'Face the camera and align within the oval',
    step: 1,
  },
  left: {
    title: 'Left profile',
    subtitle: 'Turn slowly to show your left cheek',
    step: 2,
  },
  right: {
    title: 'Right profile',
    subtitle: 'Turn to show your right cheek',
    step: 3,
  },
};

export function ScanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [stepIndex, setStepIndex] = useState(0);
  const [captures, setCaptures] = useState<Partial<ScanImages>>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { quota, refresh: refreshQuota } = useScanQuota();

  const currentAngle = SCAN_ANGLES[stepIndex]!;
  const copy = STEP_COPY[currentAngle];
  const limitReached =
    quota?.plan === 'free' && quota.limit > 0 && quota.remaining <= 0;

  function handleClose() {
    navigation.getParent()?.goBack();
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
          skins uses your front camera to analyze your skin from three angles. Photos are sent
          securely for analysis.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || isCapturing || isAnalyzing || limitReached) return;

    setIsCapturing(true);
    setError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }

      const faceUri = await cropCaptureToFaceGuide(photo.uri, currentAngle);
      const nextCaptures = { ...captures, [currentAngle]: faceUri };
      setCaptures(nextCaptures);

      const isLastStep = stepIndex >= SCAN_ANGLES.length - 1;
      if (!isLastStep) {
        setStepIndex(stepIndex + 1);
        return;
      }

      setIsAnalyzing(true);
      const images = nextCaptures as ScanImages;
      const result = await submitScan(images);
      await refreshQuota();

      const serverImages: Partial<ScanImages> = {};
      if (result.image_urls?.front) serverImages.front = result.image_urls.front;
      if (result.image_urls?.left) serverImages.left = result.image_urls.left;
      if (result.image_urls?.right) serverImages.right = result.image_urls.right;

      navigation.navigate('ScanResult', {
        result,
        localImages: {
          front: serverImages.front ?? images.front,
          left: serverImages.left ?? images.left,
          right: serverImages.right ?? images.right,
        },
      });
    } catch (err) {
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
    } finally {
      setIsCapturing(false);
      setIsAnalyzing(false);
    }
  }

  function handleRetakeStep() {
    setError(null);
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" />

      <FaceGuideOverlay angle={currentAngle} />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Pressable style={styles.closeButton} onPress={handleClose} hitSlop={12}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
        <View style={styles.topBarCenter}>
          <View style={styles.stepDots}>
            {SCAN_ANGLES.map((angle, index) => (
              <View
                key={angle}
                style={[
                  styles.stepDot,
                  index <= stepIndex && styles.stepDotActive,
                  captures[angle] && index < stepIndex && styles.stepDotDone,
                ]}
              />
            ))}
          </View>
          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
          <Text style={styles.stepLabel}>Photo {copy.step} of 3</Text>
          {quota && quota.plan === 'free' && quota.limit > 0 && (
            <Text style={styles.quota}>
              {quota.remaining} free scan{quota.remaining === 1 ? '' : 's'} left
            </Text>
          )}
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {limitReached && (
          <Text style={styles.limitText}>
            Monthly scan limit reached. Upgrade to Pro for unlimited scans.
          </Text>
        )}

        <View style={styles.bottomActions}>
          {stepIndex > 0 && !isCapturing && !isAnalyzing && (
            <Pressable style={styles.retakeButton} onPress={handleRetakeStep}>
              <Text style={styles.retakeButtonText}>Back</Text>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.captureButton,
              (isCapturing || isAnalyzing || limitReached) && styles.captureButtonDisabled,
            ]}
            onPress={handleCapture}
            disabled={isCapturing || isAnalyzing || limitReached}
          >
            {isCapturing || isAnalyzing ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </Pressable>

          <View style={styles.retakeSpacer} />
        </View>

        <Text style={styles.hint}>
          {isAnalyzing
            ? 'Detecting your face & analyzing skin…'
            : isCapturing
              ? 'Framing your face…'
              : 'Align your face in the oval, then tap'}
        </Text>
      </View>
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
    marginBottom: 6,
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
    backgroundColor: colors.primary,
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
  subtitle: {
    ...type.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: spacing.item,
  },
  stepLabel: {
    ...type.caption,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  quota: {
    ...type.caption,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
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
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 40,
  },
  retakeButton: {
    width: 72,
    alignItems: 'center',
    paddingVertical: 10,
  },
  retakeButtonText: {
    ...type.link,
    color: colors.surface,
  },
  retakeSpacer: {
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
    borderColor: colors.primary,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
  },
  hint: {
    ...type.bodySmall,
    color: 'rgba(255,255,255,0.75)',
  },
  errorText: {
    ...type.bodySmall,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: spacing.section,
    marginBottom: 4,
  },
});
