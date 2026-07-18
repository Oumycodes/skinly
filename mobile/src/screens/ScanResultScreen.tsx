import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScanResultsView } from '../components/scan/ScanResultsView';
import { colors, radii } from '../constants/colors';
import { layout } from '../constants/layout';
import { spacing } from '../constants/spacing';
import { type } from '../constants/typography';
import type { ScanStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ScanStackParamList, 'ScanResult'>;

export function ScanResultScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { result, localImages } = route.params;
  const [photoZoomed, setPhotoZoomed] = useState(false);

  return (
    <View style={[styles.container, { paddingTop: insets.top + layout.screenPaddingTop }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.getParent()?.goBack()}>
          <Text style={styles.backButton}>← Done</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Your results</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        scrollEnabled={!photoZoomed}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.section }]}
        showsVerticalScrollIndicator={false}
      >
        <ScanResultsView
          result={result}
          imageUrls={localImages}
          onZoomChange={setPhotoZoomed}
        />

        <Pressable style={styles.rescanButton} onPress={() => navigation.goBack()}>
          <Text style={styles.rescanButtonText}>Scan again</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.item,
  },
  backButton: {
    ...type.link,
    width: 72,
  },
  headerTitle: {
    ...type.cardTitle,
  },
  headerSpacer: {
    width: 72,
  },
  content: {
    paddingHorizontal: spacing.screen,
    gap: spacing.section,
  },
  rescanButton: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.card,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rescanButtonText: {
    ...type.link,
  },
});
