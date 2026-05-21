import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function PricingBreakdown({ pricing, quotedPrice, theme, t, isRTL }) {
  let laborCost = 0;
  let travelCost = 0;
  let bookingFee = 150;
  let discount = 0;
  let total = quotedPrice || 0;

  if (pricing) {
    const base = pricing.base_rate || 1000;
    const mult = pricing.complexity_multiplier || 1.0;
    laborCost = Math.round(base * mult);
    travelCost = pricing.distance_surcharge || 0;
    bookingFee = pricing.surge_fee || 0;
    discount = pricing.loyalty_discount || 0;
    total = pricing.final_price || total;
  } else if (total > 0) {
    laborCost = Math.round(total * 0.75);
    travelCost = Math.round(total * 0.15);
    bookingFee = total - laborCost - travelCost;
  }

  const rowStyle = [styles.priceRow, isRTL && styles.priceRowRtl];

  return (
    <View style={styles.container}>
      <View style={rowStyle}>
        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('labourCost')}</Text>
        <Text style={[styles.priceValue, { color: theme.text }]}>Rs. {laborCost}</Text>
      </View>
      <View style={rowStyle}>
        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('travelSurcharge')}</Text>
        <Text style={[styles.priceValue, { color: theme.text }]}>Rs. {travelCost}</Text>
      </View>
      <View style={rowStyle}>
        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('bookingFee')}</Text>
        <Text style={[styles.priceValue, { color: theme.text }]}>Rs. {bookingFee}</Text>
      </View>
      {discount > 0 && (
        <View style={rowStyle}>
          <Text style={[styles.priceLabel, { color: theme.primary }]}>{t('loyaltyDiscount')}</Text>
          <Text style={[styles.priceValue, { color: theme.primary }]}>-Rs. {discount}</Text>
        </View>
      )}
      <View style={[styles.priceDivider, { backgroundColor: theme.border }]} />
      <View style={[styles.priceRowTotal, isRTL && styles.priceRowRtl]}>
        <Text style={[styles.priceTotalLabel, { color: theme.text }]}>{t('totalAmount')}</Text>
        <Text style={[styles.priceTotalValue, { color: theme.primary }]}>Rs. {total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8, gap: 12 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowRtl: { flexDirection: 'row-reverse' },
  priceLabel: { fontSize: 14 },
  priceValue: { fontSize: 14, fontWeight: '600' },
  priceDivider: { height: 1, marginVertical: 4 },
  priceRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceTotalLabel: { fontSize: 16, fontWeight: 'bold' },
  priceTotalValue: { fontSize: 20, fontWeight: 'bold' },
});
