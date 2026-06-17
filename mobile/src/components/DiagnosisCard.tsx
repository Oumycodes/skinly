import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/colors';
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  conditionName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  explanation: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  recommendations: {
    marginTop: 4,
    gap: 10,
  },
  recommendationsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  productBrand: {
    fontSize: 13,
    color: colors.textMuted,
  },
  productReason: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  productLink: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '600',
  },
});
