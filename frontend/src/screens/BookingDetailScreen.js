import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import { Card, SectionHeader, Badge, PrimaryButton } from '../components/UIComponents';
import { PricingBreakdown } from '../components/PricingBreakdown';
import { CheckCircle, MessageCircle, MapPin, Camera, Star, AlertTriangle, Clock } from 'lucide-react-native';
import { submitDispute } from '../api/serviceApi';
import { getBackendBase } from '../config/api';

export default function BookingDetailScreen() {
  const { theme } = useTheme();
  const { params } = useNavigation();
  const { t, isRTL } = useLanguage();

  const TIMELINE_STEPS = useMemo(() => [
    { id: 'confirmed', label: t('timelineConfirmed'), icon: CheckCircle },
    { id: 'notified', label: t('timelineNotified'), icon: MessageCircle },
    { id: 'en_route', label: t('timelineEnRoute'), icon: MapPin },
    { id: 'in_progress', label: t('timelineInProgress'), icon: Camera },
    { id: 'completed', label: t('timelineCompleted'), icon: Star },
  ], [t]);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [disputeText, setDisputeText] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [resolution, setResolution] = useState(null);

  const bookingId = params?.booking_id || 'BK-MOCK';

  useEffect(() => {
    const base = getBackendBase();
    if (!base) {
      setLoading(false);
      return;
    }
    fetch(`${base}/api/bookings/${bookingId}`)
      .then((res) => res.json())
      .then((data) => {
        setBooking(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const timer = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < TIMELINE_STEPS.length - 1) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [bookingId, TIMELINE_STEPS.length]);

  const handleSubmitFeedback = async () => {
    if (!disputeText.trim() || userRating === 0) return;
    setDisputeLoading(true);

    const providerId = booking?.match?.selected?.id || booking?.booking?.provider_id || 'UNKNOWN';
    const result = await submitDispute({
      booking_id: bookingId,
      provider_id: providerId,
      rating: userRating,
      complaint: disputeText,
      severity: userRating === 1 ? 'extreme' : userRating <= 3 ? 'high' : 'low',
    });

    if (result.ok && result.data?.status === 'resolved') {
      setResolution(result.data.data);
    } else {
      setResolution({ error: result.error || t('disputeFailed') });
    }
    setDisputeLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const isCompleted = activeStep === TIMELINE_STEPS.length - 1;
  const bookingData = booking?.booking || {};
  const providerName = booking?.match?.selected?.name || bookingData.provider_name || t('assignedProvider');
  const providerRating = booking?.match?.selected?.rating || '4.8';
  const providerDistance = booking?.match?.selected?.distance_km || '2.4';
  const location = String(bookingData.location || 'Islamabad');
  const urgency = bookingData.urgency || 'Medium';
  const customerQuery = bookingData.customer_query || '';
  const pricingData = booking?.pricing || null;
  const quotedPrice = parseFloat(bookingData.quoted_price || '0');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title={t('bookingDetails')} showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.headerRow, isRTL && styles.rowRtl]}>
          <Text style={[styles.bookingId, { color: theme.text }]}>{t('bookingIdLabel', { id: bookingId })}</Text>
          <Badge text={isCompleted ? t('completed') : t('inProgress')} type={isCompleted ? 'success' : 'primary'} />
        </View>

        <Card>
          <SectionHeader title={t('liveTimeline')} />
          <View style={styles.timelineContainer}>
            {TIMELINE_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index <= activeStep;
              const isCurrent = index === activeStep;
              const iconSize = isCurrent ? 36 : 32;
              return (
                <View key={step.id} style={[styles.timelineStep, isRTL && styles.rowRtl]}>
                  <View style={styles.timelineIconContainer}>
                    <View style={[
                      styles.timelineIcon,
                      {
                        backgroundColor: isActive ? theme.primary : theme.border,
                        width: iconSize,
                        height: iconSize,
                        borderRadius: iconSize / 2,
                      },
                    ]}>
                      <StepIcon color="#fff" size={16} />
                    </View>
                    {index < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: isActive ? theme.primary : theme.border }]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, { color: isActive ? theme.text : theme.textSecondary, fontWeight: isCurrent ? 'bold' : 'normal', textAlign: isRTL ? 'right' : 'left' }]}>
                      {step.label}
                    </Text>
                    {isCurrent && index === 3 && (
                      <Text style={[styles.timelineSub, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {t('verifyingChecklist')}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        <Card>
          <SectionHeader title={t('yourProvider')} />
          <View style={[styles.providerRow, isRTL && styles.rowRtl]}>
            <View style={[styles.avatar, { backgroundColor: theme.primary + '33' }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>{providerName.charAt(0)}</Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={[styles.providerName, { color: theme.text }]}>{providerName}</Text>
              <Text style={[styles.providerStats, { color: theme.textSecondary }]}>
                ★ {providerRating} • {t('kmAway', { km: providerDistance })}
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <SectionHeader title={t('serviceDetails')} />
          <View style={[styles.detailRow, isRTL && styles.rowRtl]}>
            <MapPin color={theme.textSecondary} size={16} />
            <Text style={[styles.detailText, { color: theme.text }]}>{t('sectorLabel', { loc: location.toUpperCase() })}</Text>
          </View>
          <View style={[styles.detailRow, isRTL && styles.rowRtl]}>
            <Clock color={theme.textSecondary} size={16} />
            <Text style={[styles.detailText, { color: theme.text }]}>{t('urgencyLabel', { urgency })}</Text>
          </View>
          {customerQuery ? (
            <View style={[styles.queryContainer, { backgroundColor: theme.background }]}>
              <Text style={[styles.queryTitle, { color: theme.textSecondary }]}>{t('yourRequest')}</Text>
              <Text style={[styles.queryText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>"{customerQuery}"</Text>
            </View>
          ) : null}
        </Card>

        <Card>
          <SectionHeader title={t('servicePricing')} />
          <PricingBreakdown pricing={pricingData} quotedPrice={quotedPrice} theme={theme} t={t} isRTL={isRTL} />
        </Card>

        {isCompleted && !resolution && (
          <Card style={{ borderColor: theme.primary, borderWidth: 1 }}>
            <SectionHeader title={t('rateFeedback')} />
            <Text style={{ color: theme.textSecondary, marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>
              {t('rateFeedbackDesc')}
            </Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} activeOpacity={0.7} onPress={() => setUserRating(star)}>
                  <Star size={36} color={userRating >= star ? '#eab308' : theme.textSecondary} fill={userRating >= star ? '#eab308' : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.feedbackInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={t('feedbackPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={disputeText}
              onChangeText={setDisputeText}
              multiline
            />
            <PrimaryButton
              title={t('submitFeedback')}
              onPress={handleSubmitFeedback}
              loading={disputeLoading}
              style={{ backgroundColor: userRating > 0 && userRating <= 3 ? '#dc2626' : theme.primary }}
            />
          </Card>
        )}

        {resolution && !resolution.error && (
          <Card style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', borderColor: '#FF9800', borderWidth: 1 }}>
            <View style={[styles.resolutionHeader, isRTL && styles.rowRtl]}>
              <AlertTriangle color="#FF9800" size={24} />
              <Text style={styles.resolutionTitle}>{t('disputeHandled')}</Text>
            </View>
            <Text style={[styles.resolutionText, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
              "{resolution.ai_response}"
            </Text>
            <View style={styles.resolutionStats}>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>{t('providerReputationUpdated')}</Text>
              <Text style={{ color: theme.textSecondary }}>{t('actionLabel', { action: resolution.action })}</Text>
              <Text style={{ color: theme.textSecondary }}>
                {t('reliabilityChange', { old: resolution.reliability_score.old, new: resolution.reliability_score.new })}
              </Text>
            </View>
          </Card>
        )}

        {resolution?.error && (
          <Card style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)', borderColor: '#F44336', borderWidth: 1 }}>
            <Text style={{ color: '#F44336', fontWeight: 'bold' }}>{t('errorCardTitle')}: {resolution.error}</Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rowRtl: { flexDirection: 'row-reverse' },
  bookingId: { fontSize: 18, fontWeight: 'bold' },
  timelineContainer: { marginTop: 8 },
  timelineStep: { flexDirection: 'row', marginBottom: 20 },
  timelineIconContainer: { alignItems: 'center', marginHorizontal: 16 },
  timelineIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  timelineLine: { width: 2, height: 40, position: 'absolute', top: 32, zIndex: 1 },
  timelineContent: { flex: 1, justifyContent: 'center' },
  timelineLabel: { fontSize: 16 },
  timelineSub: { fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  starsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 20 },
  feedbackInput: { borderRadius: 12, padding: 16, height: 100, textAlignVertical: 'top', borderWidth: 1, marginBottom: 20 },
  resolutionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  resolutionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FF9800', marginHorizontal: 8 },
  resolutionText: { fontSize: 15, fontStyle: 'italic', marginBottom: 16, lineHeight: 22 },
  resolutionStats: { borderTopWidth: 1, borderTopColor: 'rgba(255, 152, 0, 0.2)', paddingTop: 12 },
  providerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginHorizontal: 16 },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  providerStats: { fontSize: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  detailText: { fontSize: 15, marginHorizontal: 12 },
  queryContainer: { marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  queryTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  queryText: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
});
