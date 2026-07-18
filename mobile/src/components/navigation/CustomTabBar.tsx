import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { type } from '../../constants/typography';

const TABS = [
  { name: 'Home', icon: 'home-outline' as const, activeIcon: 'home' as const, label: 'Home', activeBg: colors.tabActive.Home },
  { name: 'Progress', icon: 'trending-up-outline' as const, activeIcon: 'trending-up' as const, label: 'Progress', activeBg: colors.tabActive.Progress },
  { name: 'Shelf', icon: 'sparkles-outline' as const, activeIcon: 'sparkles' as const, label: 'Shelf', activeBg: colors.tabActive.Shelf },
  { name: 'Profile', icon: 'person-circle-outline' as const, activeIcon: 'person-circle' as const, label: 'Profile', activeBg: colors.tabActive.Profile },
] as const;

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  function openScan() {
    navigation.getParent()?.navigate('ScanFlow');
  }

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.bar}>
        {TABS.map((tab) => {
          const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
          if (routeIndex === -1) return null;

          const focused = state.index === routeIndex;

          return (
            <Pressable
              key={tab.name}
              style={styles.tab}
              onPress={() => navigation.navigate(tab.name)}
            >
              <View
                style={[
                  styles.tabInner,
                  focused && { backgroundColor: tab.activeBg },
                ]}
              >
                <Ionicons
                  name={focused ? tab.activeIcon : tab.icon}
                  size={20}
                  color={focused ? colors.text : colors.textMuted}
                />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.fab} onPress={openScan}>
        <Ionicons name="add" size={28} color={colors.surface} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
    gap: 12,
    pointerEvents: 'box-none',
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    maxWidth: 300,
  },
  tab: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  tabInner: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...type.caption,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.text,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.fab,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});
