import { useCallback, useRef, useState } from 'react';

export type FaceIdScanPhase = 'idle' | 'scanning' | 'checking' | 'analyzing';

export interface FaceIdWaypoint {
  id: string;
  progress: number;
  instruction: string;
  holdMs: number;
}

/**
 * Guided clockwise sweep. Captures a burst continuously while the user moves;
 * the backend picks the best frame for analysis.
 */
export const FACE_ID_WAYPOINTS: FaceIdWaypoint[] = [
  {
    id: 'center',
    progress: 0.12,
    instruction: 'Hold still — face the camera',
    holdMs: 900,
  },
  {
    id: 'left',
    progress: 0.32,
    instruction: 'Turn your head slowly to the left',
    holdMs: 1100,
  },
  {
    id: 'up',
    progress: 0.52,
    instruction: 'Tilt your chin up a little',
    holdMs: 1100,
  },
  {
    id: 'right',
    progress: 0.72,
    instruction: 'Turn your head slowly to the right',
    holdMs: 1100,
  },
  {
    id: 'front',
    progress: 1,
    instruction: 'Face the camera again',
    holdMs: 1200,
  },
];

const CAPTURES_PER_WAYPOINT = 2;

function sleep(ms: number, signal: { cancelled: boolean }) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      if (signal.cancelled) reject(new Error('cancelled'));
      else resolve();
    }, ms);
    if (signal.cancelled) {
      clearTimeout(t);
      reject(new Error('cancelled'));
    }
  });
}

export interface FaceIdSequenceResult {
  /** All stills captured during the sweep (order preserved) */
  allFrames: string[];
}

interface UseFaceIdScanSequenceArgs {
  takePicture: () => Promise<string>;
  onProgress?: (progress: number) => void;
}

export function useFaceIdScanSequence({ takePicture, onProgress }: UseFaceIdScanSequenceArgs) {
  const [phase, setPhase] = useState<FaceIdScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [instruction, setInstruction] = useState<string | null>(
    'Align your face in the oval, then start',
  );
  const [waypointIndex, setWaypointIndex] = useState(-1);
  const cancelRef = useRef({ cancelled: false });

  const setProgressSafe = useCallback(
    (value: number) => {
      setProgress(value);
      onProgress?.(value);
    },
    [onProgress],
  );

  const reset = useCallback(() => {
    cancelRef.current.cancelled = true;
    cancelRef.current = { cancelled: false };
    setPhase('idle');
    setProgressSafe(0);
    setWaypointIndex(-1);
    setInstruction('Align your face in the oval, then start');
  }, [setProgressSafe]);

  const cancel = useCallback(() => {
    cancelRef.current.cancelled = true;
  }, []);

  const runSequence = useCallback(async (): Promise<FaceIdSequenceResult> => {
    cancelRef.current.cancelled = false;
    const signal = cancelRef.current;
    setPhase('scanning');
    setProgressSafe(0);

    const allFrames: string[] = [];

    async function captureOnce() {
      if (signal.cancelled) throw new Error('cancelled');
      try {
        const uri = await takePicture();
        allFrames.push(uri);
      } catch {
        // Skip a failed still and keep the sweep going
      }
    }

    for (let i = 0; i < FACE_ID_WAYPOINTS.length; i += 1) {
      if (signal.cancelled) throw new Error('cancelled');
      const wp = FACE_ID_WAYPOINTS[i]!;
      setWaypointIndex(i);
      setInstruction(wp.instruction);

      const startP = i === 0 ? 0 : FACE_ID_WAYPOINTS[i - 1]!.progress;
      const steps = 8;
      const stepMs = Math.max(40, Math.floor(wp.holdMs / steps));
      const captureAt = new Set(
        Array.from({ length: CAPTURES_PER_WAYPOINT }, (_, k) =>
          Math.round(((k + 1) / (CAPTURES_PER_WAYPOINT + 1)) * steps),
        ),
      );

      for (let s = 1; s <= steps; s += 1) {
        if (signal.cancelled) throw new Error('cancelled');
        const t = s / steps;
        setProgressSafe(startP + (wp.progress - startP) * t);
        await sleep(stepMs, signal);
        if (captureAt.has(s)) {
          await captureOnce();
        }
      }
      setProgressSafe(wp.progress);
    }

    if (allFrames.length === 0) {
      throw new Error('No frames captured — try again');
    }

    setInstruction('Picking your best frames…');
    return { allFrames };
  }, [setProgressSafe, takePicture]);

  return {
    phase,
    setPhase,
    progress,
    instruction,
    setInstruction,
    waypointIndex,
    runSequence,
    reset,
    cancel,
  };
}
