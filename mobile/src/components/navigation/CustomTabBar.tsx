import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii } from '../../constants/colors';
import { fonts } from '../../constants/typography';

const TABS = [
  { name: 'Home', icon: '⌂', label: 'Home', activeBg: colors.tabActive.Home },
  { name: 'Progress', icon: '↗', label: 'Progress', activeBg: colors.tabActive.Progress },
  { name: 'Shelf', icon: '✦', label: 'Shelf', activeBg: colors.tabActive.Shelf },
  { name: 'Profile', icon: '○', label: 'Profile', activeBg: colors.tabActive.Profile },
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
                <Text style={[styles.icon, focused && styles.iconActive]}>{tab.icon}</Text>
              </View>
              <Text style={[styles.label, focused && styles.labelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.fab} onPress={openScan}>
        <Text style={styles.fabIcon}>+</Text>
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
    paddingHorizontal: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
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
  icon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  iconActive: {
    color: colors.text,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
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
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: colors.surface,
    lineHeight: 30,
    fontWeight: '300',
  },
});
