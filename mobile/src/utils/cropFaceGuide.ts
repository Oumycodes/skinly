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
  const isProfile = angle === 'left' || angle === 'right';

  // Tighter than before — matches FaceId oval (~62% × 38% of screen)
  const cropW = Math.round(width * (isProfile ? 0.55 : 0.58));
  const cropH = Math.round(height * (isProfile ? 0.48 : 0.46));
  const shiftX = isProfile ? Math.round(width * (angle === 'left' ? 0.04 : -0.04)) : 0;
  const originX = Math.max(0, Math.min(Math.round((width - cropW) / 2 + shiftX), width - cropW));
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
