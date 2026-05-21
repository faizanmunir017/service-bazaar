import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import { Card, SectionHeader, FactorBar, Badge, PrimaryButton } from '../components/UIComponents';
import { PricingBreakdown } from '../components/PricingBreakdown';
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
      <Header title={t('bookingConfirmedHeader')} showBack={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.successHeader}>
          <CheckCircle color="#4CAF50" size={64} />
          <Text style={[styles.successTitle, { color: theme.text, textAlign: 'center' }]}>
            {t('serviceConfirmed')}
          </Text>
          <Badge text={t('bookingIdLabel', { id: booking_id })} type="primary" style={{ marginTop: 8 }} />
        </View>

        {provider && (
          <Card>
            <SectionHeader title={t('yourProvider')} />
            <View style={[styles.providerRow, isRTL && styles.rowRtl]}>
              <View style={[styles.avatar, { backgroundColor: theme.primary + '33' }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>{provider.name?.charAt(0) || 'P'}</Text>
              </View>
              <View style={styles.providerInfo}>
                <Text style={[styles.providerName, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                  {provider.name}
                </Text>
                <Text style={[styles.providerStats, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  ★ {provider.rating} • {t('kmAway', { km: provider.distance_km })}
                </Text>
              </View>
            </View>

            {provider.breakdown && (
              <View style={styles.rationaleContainer}>
                <Text style={[styles.rationaleTitle, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t('whyChosen')}
                </Text>
                <FactorBar label={t('reliability')} value={provider.breakdown.reliability} />
                <FactorBar label={t('rating')} value={provider.breakdown.rating} />
                <FactorBar label={t('distanceScore')} value={provider.breakdown.distance} />
                <FactorBar label={t('recencyScore')} value={provider.breakdown.recency} />
              </View>
            )}

            {runnerUp && (
              <View style={[styles.runnerUpNote, { backgroundColor: theme.background }]}>
                <Text style={[styles.runnerUpText, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  💡 {t('runnerUpNote', { runnerUp: runnerUp.name, provider: provider.name })}
                </Text>
              </View>
            )}
          </Card>
        )}

        <Card>
          <SectionHeader title={t('serviceDetails')} />
          <View style={[styles.detailRow, isRTL && styles.rowRtl]}>
            <MapPin color={theme.textSecondary} size={16} />
            <Text style={[styles.detailText, { color: theme.text }]}>
              {t('sector', { loc: intent?.location?.toUpperCase() || t('unknown') })}
            </Text>
          </View>
          <View style={[styles.detailRow, isRTL && styles.rowRtl]}>
            <Clock color={theme.textSecondary} size={16} />
            <Text style={[styles.detailText, { color: theme.text }]}>
              {intent?.urgency_level === 'High' || intent?.urgency === 'urgent'
                ? t('urgencyAsap')
                : t('urgencyScheduled')}
            </Text>
          </View>
        </Card>

        <Card>
          <SectionHeader title={t('estimatedPricing')} />
          <PricingBreakdown pricing={pricing} quotedPrice={pricing?.final_price} theme={theme} t={t} isRTL={isRTL} />
        </Card>

        <View style={styles.actions}>
          <PrimaryButton
            title={t('viewAppointment')}
            onPress={() => navigate('BookingDetail', { booking_id })}
            style={{ marginBottom: 12 }}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => navigate('Dashboard')} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: theme.primary }]}>{t('backToHome')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  successHeader: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  successTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rowRtl: { flexDirection: 'row-reverse' },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 16,
  },
  avatarText: { fontSize: 22, fontWeight: 'bold' },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 18, fontWeight: 'bold' },
  providerStats: { fontSize: 14, marginTop: 4 },
  rationaleContainer: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 12 },
  rationaleTitle: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  runnerUpNote: { marginTop: 12, padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#FF9800' },
  runnerUpText: { fontSize: 12, lineHeight: 18 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  detailText: { marginHorizontal: 8, fontSize: 15 },
  actions: { marginTop: 16 },
  backButton: { paddingVertical: 14, alignItems: 'center' },
  backButtonText: { fontSize: 16, fontWeight: '600' },
});
