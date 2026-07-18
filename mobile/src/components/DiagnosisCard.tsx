import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { sharedCardStyles } from '../constants/cards';
import { colors, radii } from '../constants/colors';
import { spacing } from '../constants/spacing';
import { font, type } from '../constants/typography';
import type { SkinCondition } from '../services/scan';

interface DiagnosisCardProps {
  condition: SkinCondition;
}

export function DiagnosisCard({ condition }: DiagnosisCardProps) {
  const severityColor = colors.severity[condition.severity];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.conditionName}>{condition.name}</Text>
        <View style={[styles.badge, { backgroundColor: `${severityColor}22` }]}>
          <Text style={[styles.badgeText, { color: severityColor }]}>
            {condition.severity}
          </Text>
        </View>
      </View>

      <Text style={styles.explanation}>{condition.explanation}</Text>

      {condition.recommendations.length > 0 && (
        <View style={styles.recommendations}>
          <Text style={styles.recommendationsTitle}>Recommended products</Text>
          {condition.recommendations.map((product) => (
            <Pressable
              key={`${product.brand}-${product.name}`}
              style={styles.productRow}
              onPress={() => Linking.openURL(product.affiliate_url)}
            >
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productBrand}>{product.brand}</Text>
                <Text style={styles.productReason}>{product.reason}</Text>
              </View>
              <Text style={styles.productLink}>→</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...sharedCardStyles.surfaceCard,
    gap: spacing.item,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.item,
  },
  conditionName: {
    flex: 1,
    ...type.sectionTitle,
    fontSize: 18,
  },
  badge: {
    paddingHorizontal: spacing.item,
    paddingVertical: spacing.inner / 2,
    borderRadius: radii.full,
  },
  badgeText: {
    ...font.bold,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  explanation: {
    ...type.body,
  },
  recommendations: {
    marginTop: spacing.inner / 2,
    gap: spacing.item,
  },
  recommendationsTitle: {
    ...type.statLabel,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radii.sm,
    padding: 14,
    gap: spacing.inner,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    ...type.cardTitle,
  },
  productBrand: {
    ...type.caption,
    fontSize: 13,
  },
  productReason: {
    ...type.bodySmall,
    marginTop: spacing.inner / 2,
  },
  productLink: {
    ...font.semibold,
    fontSize: 18,
    color: colors.primary,
  },
});
