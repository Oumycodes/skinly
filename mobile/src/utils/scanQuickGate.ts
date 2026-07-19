import * as ImageManipulator from 'expo-image-manipulator';
import jpeg from 'jpeg-js';

export type QuickGateFail =
  | { ok: false; reason: 'too_dark' | 'too_bright' | 'blurry'; message: string }
  | { ok: true };

const LUMA_MIN = 70;
const LUMA_MAX = 200;
const BLUR_MIN = 60;

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Stage 1 on-device quick gate (Expo Go-safe).
 * Brightness + blur on the face crop. Face presence / size / pose are
 * checked next via POST /scan/qc (authoritative MediaPipe) until a
 * vision-camera / ML Kit face detector is wired in a dev build.
 */
export async function runOnDeviceQuickGate(imageUri: string): Promise<QuickGateFail> {
  const sample = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 160 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!sample.base64) {
    return { ok: true };
  }

  const decoded = jpeg.decode(base64ToBytes(sample.base64), {
    useTArray: true,
    formatAsRGBA: true,
  });

  const { width, height, data } = decoded;
  const gray = new Float32Array(width * height);
  let lumaSum = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const y = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!;
    gray[p] = y;
    lumaSum += y;
  }

  const meanLuma = lumaSum / gray.length;
  if (meanLuma < LUMA_MIN) {
    return {
      ok: false,
      reason: 'too_dark',
      message: 'Find brighter light',
    };
  }
  if (meanLuma > LUMA_MAX) {
    return {
      ok: false,
      reason: 'too_bright',
      message: 'Too bright — turn away from direct light',
    };
  }

  let lapSum = 0;
  let lapSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      const lap =
        -gray[i - width]! -
        gray[i - 1]! +
        4 * gray[i]! -
        gray[i + 1]! -
        gray[i + width]!;
      lapSum += lap;
      lapSq += lap * lap;
      n += 1;
    }
  }
  const mean = lapSum / Math.max(n, 1);
  const variance = lapSq / Math.max(n, 1) - mean * mean;

  if (variance < BLUR_MIN) {
    return {
      ok: false,
      reason: 'blurry',
      message: 'Hold still',
    };
  }

  return { ok: true };
}
