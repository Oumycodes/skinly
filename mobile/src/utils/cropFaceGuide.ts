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
 * Crop the capture toward the on-screen face oval so uploads are face-first.
 * The backend still runs real face detection and tightens the crop.
 */
export async function cropCaptureToFaceGuide(
  uri: string,
  angle: ScanAngle,
): Promise<string> {
  const { width, height } = await getImageSize(uri);
  const isProfile = angle === 'left' || angle === 'right';

  const cropW = Math.round(width * (isProfile ? 0.58 : 0.72));
  const cropH = Math.round(height * (isProfile ? 0.55 : 0.58));
  const shiftX = isProfile ? Math.round(width * (angle === 'left' ? 0.04 : -0.04)) : 0;
  const originX = Math.max(0, Math.min(Math.round((width - cropW) / 2 + shiftX), width - cropW));
  const originY = Math.max(0, Math.min(Math.round(height * 0.1), height - cropH));

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
