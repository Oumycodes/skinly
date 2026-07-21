import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font } from '../constants/typography';
import { getFaceOvalLayout } from './FaceIdScanOverlay';

const MESH_STROKE = 'rgba(255,255,255,0.42)';
const DOT_FILL = 'rgba(255,255,255,0.92)';
const ACCENT = '#1D9E75';

/** Build-in: dots pop in first (features → outward), lines connect after */
const BUILD_TICK_MS = 85;
const BUILD_TICKS = 30;
/** After build: mesh re-forms (vertices drift, triangulation reshuffles) */
const MORPH_INTERVAL_MS = 650;
const MESSAGE_INTERVAL_MS = 2400;

const MESSAGES = [
  'Mapping your skin',
  'Reading texture & tone',
  'Spotting breakouts & marks',
  'Checking evenness',
  'Building your skin score',
];

type Pt = { x: number; y: number; rev: number };

/** Deterministic pseudo-random so the mesh is organic but stable per seed */
function seeded(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function buildMesh(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
) {
  const pts: Pt[] = [];
  const lines: Array<[number, number]> = [];
  const S = seed * 97.3;
  const addPt = (x: number, y: number, rev: number) =>
    pts.push({ x, y, rev }) - 1;
  const link = (a: number, b: number) => lines.push([a, b]);
  /** Small per-seed drift so every morph shifts vertices a few px */
  const dx = (n: number) => (seeded(n + S) - 0.5) * 7;
  const dy = (n: number) => (seeded(n * 1.7 + S + 51) - 0.5) * 7;

  // --- Eyes + brows (revealed first, like landmark detection) ---
  for (const side of [-1, 1]) {
    const ex = cx + side * rx * 0.42;
    const ey = cy - ry * 0.16;
    const eyeCenter = addPt(ex + dx(side * 3), ey + dy(side * 3), 0.02);
    const ring: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const th = (i / 8) * Math.PI * 2;
      ring.push(
        addPt(
          ex + Math.cos(th) * rx * 0.17 + dx(side * 100 + i),
          ey + Math.sin(th) * ry * 0.07 + dy(side * 100 + i),
          0.02 + seeded(side * 11 + i) * 0.1,
        ),
      );
    }
    ring.forEach((p, i) => {
      link(p, ring[(i + 1) % 8]!);
      link(p, eyeCenter);
    });

    let prevBrow = -1;
    for (let i = 0; i < 5; i += 1) {
      const t = i / 4 - 0.5;
      const bp = addPt(
        ex + t * rx * 0.42 + dx(side * 200 + i),
        ey - ry * 0.13 - Math.cos(t * Math.PI) * ry * 0.035 + dy(side * 200 + i),
        0.08 + seeded(side * 17 + i) * 0.12,
      );
      if (prevBrow >= 0) link(prevBrow, bp);
      let nearest = ring[0]!;
      let best = Infinity;
      for (const rp of ring) {
        const d =
          (pts[rp]!.x - pts[bp]!.x) ** 2 + (pts[rp]!.y - pts[bp]!.y) ** 2;
        if (d < best) {
          best = d;
          nearest = rp;
        }
      }
      link(bp, nearest);
      prevBrow = bp;
    }
  }

  // --- Nose bridge + nostril fan (early reveal) ---
  const bridge: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    bridge.push(
      addPt(
        cx + (seeded(i * 13) - 0.5) * 3 + dx(300 + i),
        cy - ry * 0.28 + (i / 3) * ry * 0.44 + dy(300 + i),
        0.04 + i * 0.03,
      ),
    );
    if (i > 0) link(bridge[i - 1]!, bridge[i]!);
  }
  let prevWing = -1;
  for (let i = 0; i < 5; i += 1) {
    const t = i / 4 - 0.5;
    const wp = addPt(
      cx + t * rx * 0.24 + dx(320 + i),
      cy + ry * 0.21 + Math.cos(t * Math.PI) * ry * 0.015 + dy(320 + i),
      0.1 + seeded(23 + i) * 0.08,
    );
    if (prevWing >= 0) link(prevWing, wp);
    link(wp, bridge[3]!);
    prevWing = wp;
  }

  // --- Lips (early reveal) ---
  const rows: number[][] = [];
  for (let r = 0; r < 2; r += 1) {
    const row: number[] = [];
    for (let c = 0; c < 7; c += 1) {
      const t = c / 6 - 0.5;
      const x = cx + t * rx * 0.55 + dx(400 + r * 7 + c);
      const y =
        cy +
        ry * (0.46 + r * 0.09) -
        Math.cos(t * Math.PI) * ry * 0.02 * (r === 0 ? 1 : -1) +
        dy(400 + r * 7 + c);
      row.push(addPt(x, y, 0.05 + seeded(41 + r * 7 + c) * 0.12));
    }
    rows.push(row);
  }
  for (let c = 0; c < 7; c += 1) {
    if (c > 0) {
      link(rows[0]![c - 1]!, rows[0]![c]!);
      link(rows[1]![c - 1]!, rows[1]![c]!);
      link(rows[0]![c - 1]!, rows[1]![c]!);
    }
    link(rows[0]![c]!, rows[1]![c]!);
  }

  // --- Concentric face rings (spread outward after the features) ---
  const RINGS = 5;
  const SPOKES = 20;
  const ringIdx: number[][] = [];
  const center = addPt(cx + dx(1), cy - ry * 0.05 + dy(1), 0.3);

  for (let r = 0; r < RINGS; r += 1) {
    const f = (r + 1) / RINGS;
    const row: number[] = [];
    for (let s = 0; s < SPOKES; s += 1) {
      const th = (s / SPOKES) * Math.PI * 2 - Math.PI / 2;
      const jit = 0.94 + seeded(r * 57 + s + S) * 0.12;
      const chin = 1 - 0.22 * f * Math.max(0, Math.sin(th));
      const x = cx + Math.cos(th) * rx * f * chin * jit;
      const y =
        cy + Math.sin(th) * ry * f * (0.97 + seeded(r * 31 + s * 7 + S) * 0.06);
      // Outer rings appear later — mesh grows outward
      row.push(addPt(x, y, 0.3 + f * 0.55 + seeded(r * 5 + s) * 0.12));
    }
    ringIdx.push(row);
  }

  for (let r = 0; r < RINGS; r += 1) {
    for (let s = 0; s < SPOKES; s += 1) {
      const a = ringIdx[r]![s]!;
      const b = ringIdx[r]![(s + 1) % SPOKES]!;
      link(a, b);
      if (r === 0) {
        link(center, a);
      } else {
        link(ringIdx[r - 1]![s]!, a);
        // Diagonal flips per seed → triangulation reshuffles between morphs
        if (seeded(r * 91 + s * 3 + S) > 0.5) {
          link(ringIdx[r - 1]![(s + 1) % SPOKES]!, a);
        } else {
          link(ringIdx[r - 1]![s]!, b);
        }
      }
    }
  }

  return { pts, lines };
}

interface AnalyzingMeshOverlayProps {
  /** Frozen frame (front selfie) shown behind the mesh while analyzing */
  imageUri?: string | null;
  /** Mirror the frozen frame so it matches the front-camera preview */
  mirror?: boolean;
}

export function AnalyzingMeshOverlay({
  imageUri,
  mirror = true,
}: AnalyzingMeshOverlayProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { cx, cy, rx, ry } = getFaceOvalLayout(width, height);

  const [tick, setTick] = useState(0);
  const [seedState, setSeed] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  const meshFade = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;

  const mesh = useMemo(
    () => buildMesh(cx, cy, rx * 1.05, ry * 1.08, seedState),
    [cx, cy, rx, ry, seedState],
  );

  const buildProgress = Math.min(1, tick / BUILD_TICKS);
  const built = tick >= BUILD_TICKS;

  // Phase 1 — build-in: dots pop in feature-first, lines connect behind them
  useEffect(() => {
    if (built) return undefined;
    const interval = setInterval(() => setTick((t) => t + 1), BUILD_TICK_MS);
    return () => clearInterval(interval);
  }, [built]);

  // Phase 2 — morph: soft opacity dip while vertices drift + mesh re-forms
  useEffect(() => {
    if (!built) return undefined;
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(meshFade, {
          toValue: 0.55,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(meshFade, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => setSeed((s) => s + 1), 180);
    }, MORPH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [built, meshFade]);

  // Gentle glow pulse the whole time
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);

  // Cycling status copy
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start(() => {
        setMessageIndex((i) => (i + 1) % MESSAGES.length);
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }).start();
      });
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [textOpacity]);

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  // Dots appear at their reveal time; lines connect slightly after both ends
  const dots = mesh.pts
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => buildProgress >= p.rev);
  const wires = mesh.lines
    .map((l, i) => ({ l, i }))
    .filter(
      ({ l }) =>
        buildProgress >=
        Math.min(
          0.99,
          Math.max(mesh.pts[l[0]]!.rev, mesh.pts[l[1]]!.rev) + 0.12,
        ),
    );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Frozen capture — covers the live preview so the image holds still */}
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[
            StyleSheet.absoluteFill,
            mirror && { transform: [{ scaleX: -1 }] },
          ]}
          resizeMode="cover"
          fadeDuration={0}
        />
      ) : null}

      {/* Wireframe mesh: builds in, then continuously re-forms */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: Animated.multiply(meshFade, glowOpacity) },
        ]}
      >
        <Svg width={width} height={height}>
          {wires.map(({ l, i }) => (
            <Line
              key={`l${i}`}
              x1={mesh.pts[l[0]]!.x}
              y1={mesh.pts[l[0]]!.y}
              x2={mesh.pts[l[1]]!.x}
              y2={mesh.pts[l[1]]!.y}
              stroke={MESH_STROKE}
              strokeWidth={0.7}
            />
          ))}
          {dots.map(({ p, i }) => (
            <Circle key={`p${i}`} cx={p.x} cy={p.y} r={1.7} fill={DOT_FILL} />
          ))}
        </Svg>
      </Animated.View>

      {/* Status footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.statusRow}>
          <Animated.View style={[styles.statusDot, { opacity: glowOpacity }]} />
          <Animated.Text style={[styles.statusText, { opacity: textOpacity }]}>
            {MESSAGES[messageIndex % MESSAGES.length]!}
          </Animated.Text>
        </View>
        <Text style={styles.wordmark}>skins</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: 12,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(15,15,15,0.5)',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  statusText: {
    ...font.semibold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  wordmark: {
    ...font.bold,
    fontSize: 15,
    letterSpacing: 3,
    textTransform: 'lowercase',
    color: 'rgba(255,255,255,0.75)',
  },
});
