import { Image } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

import type { ScanAngle } from '../services/scan';

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err ?? new Error('Could not read image size')),
    );
  });
}

/**
 * Crop toward the on-screen face oval so the face fills most of the upload.
 * Tuned so face height is typically ≥30% of the cropped frame (backend QC).
 */
export async function cropCaptureToFaceGuide(
  uri: string,
  angle: ScanAngle,
): Promise<string> {
  const { width, height } = await getImageSize(uri);

  // Same crop for every angle — matches the uniform FaceId oval (~62% × 38%)
  const cropW = Math.round(width * 0.58);
  const cropH = Math.round(height * 0.46);
  const originX = Math.max(0, Math.min(Math.round((width - cropW) / 2), width - cropW));
  // Oval center is ~36% down the screen
  const ovalCy = height * 0.36;
  const originY = Math.max(
    0,
    Math.min(Math.round(ovalCy - cropH / 2), height - cropH),
  );

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX,
          originY,
          width: Math.min(cropW, width - originX),
          height: Math.min(cropH, height - originY),
        },
      },
      { resize: { width: 1080 } },
    ],
    {
      compress: 0.88,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return result.uri;
}
