import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../constants/colors';
import type { SkinMeasureId } from '../../utils/skinMeasures';

const ICON_CONFIG: Record<
  SkinMeasureId,
  { name: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  hydration: { name: 'water-outline', color: '#5B8FA8', bg: '#E8F2F7' },
  oiliness: { name: 'color-filter-outline', color: '#B8863A', bg: '#F7F0E4' },
  acne: { name: 'bandage-outline', color: '#C47070', bg: '#F9EBEB' },
  barrier: { name: 'shield-outline', color: '#6B8E6B', bg: '#E8F3E8' },
  aging: { name: 'scan-outline', color: '#8B7E9A', bg: '#F0ECF4' },
  texture: { name: 'grid-outline', color: '#6B7280', bg: '#F3F4F6' },
};

export function getMeasureIconBg(id: SkinMeasureId): string {
  return ICON_CONFIG[id].bg;
}

export function getMeasureIconColor(id: SkinMeasureId): string {
  return ICON_CONFIG[id].color;
}

interface MeasureIconProps {
  id: SkinMeasureId;
  size?: 'sm' | 'md';
}

export function MeasureIcon({ id, size = 'sm' }: MeasureIconProps) {
  const config = ICON_CONFIG[id];
  const dim = size === 'sm' ? 28 : 40;
  const iconSize = size === 'sm' ? 15 : 20;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: config.bg,
        },
      ]}
    >
      <Ionicons name={config.name} size={iconSize} color={config.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
