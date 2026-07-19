import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { font } from '../constants/typography';
import { getFaceOvalLayout } from './FaceIdScanOverlay';

const MESH_STROKE = 'rgba(255,255,255,0.4)';
const DOT_FILL = 'rgba(255,255,255,0.92)';
const BAND_HEIGHT = 140;

const MESSAGES = [
  'Analyzing facial ratios',
  'Mapping skin texture',
  'Detecting problem areas',
  'Measuring symmetry',
  'Scoring skin health',
];

type Pt = { x: number; y: number };

/** Deterministic pseudo-random so the mesh looks organic but stable */
function seeded(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function buildMesh(cx: number, cy: number, rx: number, ry: number) {
  const pts: Pt[] = [];
  const lines: Array<[number, number]> = [];
  const addPt = (x: number, y: number) => pts.push({ x, y }) - 1;
  const link = (a: number, b: number) => lines.push([a, b]);

  // --- Concentric face rings (triangulated) ---
  const RINGS = 5;
  const SPOKES = 20;
  const ringIdx: number[][] = [];
  const center = addPt(cx, cy - ry * 0.05);

  for (let r = 0; r < RINGS; r += 1) {
    const f = (r + 1) / RINGS;
    const row: number[] = [];
    for (let s = 0; s < SPOKES; s += 1) {
      const th = (s / SPOKES) * Math.PI * 2 - Math.PI / 2;
      const jit = 0.94 + seeded(r * 57 + s) * 0.12;
      // Narrow toward the chin so the mesh reads as a face, not an oval
      const chin = 1 - 0.22 * f * Math.max(0, Math.sin(th));
      const x = cx + Math.cos(th) * rx * f * chin * jit;
      const y = cy + Math.sin(th) * ry * f * (0.97 + seeded(r * 31 + s * 7) * 0.06);
      row.push(addPt(x, y));
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
        link(ringIdx[r - 1]![(s + 1) % SPOKES]!, a);
      }
    }
  }

  // --- Eyes + brows ---
  for (const side of [-1, 1]) {
    const ex = cx + side * rx * 0.42;
    const ey = cy - ry * 0.16;
    const eyeCenter = addPt(ex, ey);
    const ring: number[] = [];
    for (let i = 0; i < 8; i += 1) {
      const th = (i / 8) * Math.PI * 2;
      ring.push(addPt(ex + Math.cos(th) * rx * 0.17, ey + Math.sin(th) * ry * 0.07));
    }
    ring.forEach((p, i) => {
      link(p, ring[(i + 1) % 8]!);
      link(p, eyeCenter);
    });

    let prevBrow = -1;
    for (let i = 0; i < 5; i += 1) {
      const t = i / 4 - 0.5;
      const bp = addPt(
        ex + t * rx * 0.42,
        ey - ry * 0.13 - Math.cos(t * Math.PI) * ry * 0.035,
      );
      if (prevBrow >= 0) link(prevBrow, bp);
      // Tie brow points to nearest eye-ring point
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

  // --- Nose bridge + nostril fan ---
  const bridge: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    bridge.push(
      addPt(cx + (seeded(i * 13) - 0.5) * 3, cy - ry * 0.28 + (i / 3) * ry * 0.44),
    );
    if (i > 0) link(bridge[i - 1]!, bridge[i]!);
  }
  let prevWing = -1;
  for (let i = 0; i < 5; i += 1) {
    const t = i / 4 - 0.5;
    const wp = addPt(
      cx + t * rx * 0.24,
      cy + ry * 0.21 + Math.cos(t * Math.PI) * ry * 0.015,
    );
    if (prevWing >= 0) link(prevWing, wp);
    link(wp, bridge[3]!);
    prevWing = wp;
  }

  // --- Lips (two arced rows, cross-linked) ---
  const rows: number[][] = [];
  for (let r = 0; r < 2; r += 1) {
    const row: number[] = [];
    for (let c = 0; c < 7; c += 1) {
      const t = c / 6 - 0.5;
      const x = cx + t * rx * 0.55;
      const y =
        cy +
        ry * (0.46 + r * 0.09) -
        Math.cos(t * Math.PI) * ry * 0.02 * (r === 0 ? 1 : -1);
      row.push(addPt(x, y));
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

  return { pts, lines };
}

interface AnalyzingMeshOverlayProps {
  /** Brand shown in the footer, e.g. 'thea' */
  brand?: string;
  /** Feature name shown after the divider, e.g. 'DeepScan' */
  feature?: string;
}

export function AnalyzingMeshOverlay({
  brand = 'thea',
  feature = 'DeepScan',
}: AnalyzingMeshOverlayProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { cx, cy, rx, ry } = getFaceOvalLayout(width, height);

  const mesh = useMemo(() => buildMesh(cx, cy, rx * 1.05, ry * 1.08), [cx, cy, rx, ry]);

  const appear = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const band = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    breatheLoop.start();

    const bandLoop = Animated.loop(
      Animated.timing(band, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    bandLoop.start();

    return () => {
      breatheLoop.stop();
      bandLoop.stop();
    };
  }, [appear, breathe, band]);

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
    }, 2200);
    return () => clearInterval(interval);
  }, [textOpacity]);

  const meshScale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });
  const meshShift = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });
  const meshGlow = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });

  const clipTop = cy - ry - 24;
  const clipHeight = ry * 2 + 48;
  const bandTranslate = band.interpolate({
    inputRange: [0, 1],
    outputRange: [-BAND_HEIGHT, clipHeight + BAND_HEIGHT],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Animated wireframe mesh */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: Animated.multiply(appear, meshGlow),
            transform: [{ scale: meshScale }, { translateY: meshShift }],
          },
        ]}
      >
        <Svg width={width} height={height}>
          {mesh.lines.map(([a, b], i) => (
            <Line
              key={`l${i}`}
              x1={mesh.pts[a]!.x}
              y1={mesh.pts[a]!.y}
              x2={mesh.pts[b]!.x}
              y2={mesh.pts[b]!.y}
              stroke={MESH_STROKE}
              strokeWidth={0.7}
            />
          ))}
          {mesh.pts.map((p, i) => (
            <Circle key={`p${i}`} cx={p.x} cy={p.y} r={1.7} fill={DOT_FILL} />
          ))}
        </Svg>
      </Animated.View>

      {/* Sweeping scan highlight, clipped to the face region */}
      <View
        style={{
          position: 'absolute',
          top: clipTop,
          left: 0,
          right: 0,
          height: clipHeight,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            width,
            height: BAND_HEIGHT,
            transform: [{ translateY: bandTranslate }],
          }}
        >
          <Svg width={width} height={BAND_HEIGHT}>
            <Defs>
              <LinearGradient id="scanBand" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.16" />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width={width} height={BAND_HEIGHT} fill="url(#scanBand)" />
          </Svg>
        </Animated.View>
      </View>

      {/* Status + brand footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <View style={styles.statusPill}>
          <Animated.Text style={[styles.statusText, { opacity: textOpacity }]}>
            {MESSAGES[messageIndex % MESSAGES.length]!}
          </Animated.Text>
        </View>
        <View style={styles.brandRow}>
          <Text style={styles.brandName}>{brand}</Text>
          <View style={styles.brandDivider} />
          <Text style={styles.brandFeature}>{feature}</Text>
        </View>
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
    gap: 18,
    backgroundColor: 'rgba(0,0,0,0.28)',
    paddingTop: 16,
  },
  statusPill: {
    alignSelf: 'stretch',
    marginHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(15,15,15,0.55)',
    paddingVertical: 16,
    alignItems: 'center',
  },
  statusText: {
    ...font.semibold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  brandName: {
    ...font.bold,
    fontSize: 21,
    letterSpacing: -0.3,
    color: '#FFFFFF',
  },
  brandDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  brandFeature: {
    ...font.semibold,
    fontSize: 19,
    color: '#FFFFFF',
  },
});
