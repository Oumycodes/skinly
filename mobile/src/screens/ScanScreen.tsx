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
import { useScanQuota } from '../hooks/useScanQuota';
import type { ScanStackParamList } from '../navigation/types';
import { ApiError } from '../services/api';
import { submitScan } from '../services/scan';

type Props = NativeStackScreenProps<ScanStackParamList, 'ScanCamera'>;

export function ScanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { quota, refresh: refreshQuota } = useScanQuota();

  const limitReached =
    quota?.plan === 'free' && quota.remaining <= 0;

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, styles.permissionScreen]}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          Skinly uses your front camera to analyze your skin. Photos are sent securely for
          analysis.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow camera</Text>
        </Pressable>
      </View>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || isCapturing || limitReached) return;

    setIsCapturing(true);
    setError(null);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Failed to capture photo');
      }

      const result = await submitScan(photo.uri);
      await refreshQuota();
      navigation.navigate('ScanResult', { result });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Scan failed. Please try again.';
      setError(message);
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="front" />

      <FaceGuideOverlay />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Skin scan</Text>
        <Text style={styles.subtitle}>Align your face within the oval</Text>
        {quota && quota.plan === 'free' && (
          <Text style={styles.quota}>
            {quota.remaining} free scan{quota.remaining === 1 ? '' : 's'} left
          </Text>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {limitReached && (
          <Text style={styles.limitText}>
            Monthly scan limit reached. Upgrade to Pro for unlimited scans.
          </Text>
        )}

        <Pressable
          style={[
            styles.captureButton,
            (isCapturing || limitReached) && styles.captureButtonDisabled,
          ]}
          onPress={handleCapture}
          disabled={isCapturing || limitReached}
        >
          {isCapturing ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <View style={styles.captureButtonInner} />
          )}
        </Pressable>

        <Text style={styles.hint}>
          {isCapturing ? 'Analyzing your skin…' : 'Tap to capture'}
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
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.surface,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  quota: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  limitText: {
    fontSize: 13,
    color: colors.warning,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 12,
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
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 4,
  },
});
