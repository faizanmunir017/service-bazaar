import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import { Card, SectionHeader, FactorBar, Badge, PrimaryButton } from '../components/UIComponents';
import { CheckCircle, MapPin, Clock } from 'lucide-react-native';

export default function BookingConfirmationScreen() {
  const { theme } = useTheme();
  const { params, navigate } = useNavigation();
  const { t, isRTL } = useLanguage();

  const { booking_id, intent, match, pricing } = params || {};
  const provider = match?.selected;
  const runnerUp = match?.runner_up;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Booking Confirmed" showBack={false} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.successHeader}>
          <CheckCircle color="#4CAF50" size={64} />
          <Text style={[styles.successTitle, { color: theme.text }]}>Service Confirmed!</Text>
          <Badge text={`ID: ${booking_id}`} type="primary" style={{ marginTop: 8 }} />
        </View>

        {provider && (
          <Card>
            <SectionHeader title="Your Provider" />
            <View style={styles.providerRow}>
              <View style={[styles.avatar, { backgroundColor: theme.primary + '33' }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>{provider.name?.charAt(0) || 'P'}</Text>
              </View>
              <View style={styles.providerInfo}>
                <Text style={[styles.providerName, { color: theme.text }]}>{provider.name}</Text>
                <Text style={[styles.providerStats, { color: theme.textSecondary }]}>
                  ★ {provider.rating} • {provider.distance_km} km away
                </Text>
              </View>
            </View>

            {provider.breakdown && (
              <View style={styles.rationaleContainer}>
                <Text style={[styles.rationaleTitle, { color: theme.textSecondary }]}>Why they were chosen:</Text>
                <FactorBar label="Reliability" value={provider.breakdown.reliability || 80} max={100} />
                <FactorBar label="Distance Score" value={provider.breakdown.distance || 80} max={100} />
                <FactorBar label="Recency Score" value={provider.breakdown.recency || 70} max={100} />
              </View>
            )}

            {runnerUp && (
              <View style={[styles.runnerUpNote, { backgroundColor: theme.background }]}>
                <Text style={[styles.runnerUpText, { color: theme.textSecondary }]}>
                  💡 <Text style={{fontWeight: 'bold'}}>{runnerUp.name}</Text> was closer, but {provider.name} was selected due to a higher reliability score for this specific task.
                </Text>
              </View>
            )}
          </Card>
        )}

        <Card>
          <SectionHeader title="Service Details" />
          <View style={styles.detailRow}>
            <MapPin color={theme.textSecondary} size={16} />
            <Text style={[styles.detailText, { color: theme.text }]}>
              Sector {intent?.location?.toUpperCase() || 'Unknown'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Clock color={theme.textSecondary} size={16} />
            <Text style={[styles.detailText, { color: theme.text }]}>
              {intent?.urgency_level === 'High' || intent?.urgency === 'urgent'
                ? 'As soon as possible'
                : 'Scheduled'}
            </Text>
          </View>
        </Card>

        <Card>
          <SectionHeader title="Estimated Pricing" />
          {renderPricingBreakdown(pricing, pricing?.final_price, theme)}
        </Card>

        <View style={styles.actions}>
          <PrimaryButton
            title="View Appointment"
            onPress={() => navigate('BookingDetail', { booking_id })}
            style={{ marginBottom: 12 }}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('Dashboard')}
            style={styles.backButton}
          >
            <Text style={[styles.backButtonText, { color: theme.primary }]}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function renderPricingBreakdown(pricing, quotedPrice, theme) {
  let laborCost = 0;
  let travelCost = 0;
  let bookingFee = 150; // fallback
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

  return (
    <View style={styles.priceBreakdownContainer}>
      <View style={styles.priceRow}>
        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Labour & Service Cost</Text>
        <Text style={[styles.priceValue, { color: theme.text }]}>Rs. {laborCost}</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Travel Surcharge</Text>
        <Text style={[styles.priceValue, { color: theme.text }]}>Rs. {travelCost}</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Booking Fee</Text>
        <Text style={[styles.priceValue, { color: theme.text }]}>Rs. {bookingFee}</Text>
      </View>
      {discount > 0 && (
        <View style={styles.priceRow}>
          <Text style={[styles.priceLabel, { color: theme.primary }]}>Loyalty Discount</Text>
          <Text style={[styles.priceValue, { color: theme.primary }]}>-Rs. {discount}</Text>
        </View>
      )}
      <View style={[styles.priceDivider, { backgroundColor: theme.border }]} />
      <View style={styles.priceRowTotal}>
        <Text style={[styles.priceTotalLabel, { color: theme.text }]}>Total Amount</Text>
        <Text style={[styles.priceTotalValue, { color: theme.primary }]}>Rs. {total}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  providerStats: {
    fontSize: 14,
    marginTop: 4,
  },
  rationaleContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 12,
  },
  rationaleTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  runnerUpNote: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  runnerUpText: {
    fontSize: 12,
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 15,
  },
  priceLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceDetail: {
    fontSize: 13,
    lineHeight: 20,
  },
  actions: {
    marginTop: 16,
  },
  backButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceBreakdownContainer: {
    marginTop: 8,
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceDivider: {
    height: 1,
    marginVertical: 4,
  },
  priceRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
