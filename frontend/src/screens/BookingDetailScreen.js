import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import { Card, SectionHeader, Badge, PrimaryButton } from '../components/UIComponents';
import { CheckCircle, Phone, MessageCircle, MapPin, Camera, Star, AlertTriangle, Clock } from 'lucide-react-native';
import { submitDispute } from '../api/serviceApi';
import { getBackendBase } from '../config/api';

const TIMELINE_STEPS = [
  { id: 'confirmed', label: 'Booking Confirmed', icon: CheckCircle },
  { id: 'notified', label: 'Provider Notified (SMS/WhatsApp)', icon: MessageCircle },
  { id: 'en_route', label: 'Provider En Route', icon: MapPin },
  { id: 'in_progress', label: 'Service In Progress', icon: Camera },
  { id: 'completed', label: 'Job Completed', icon: Star },
];

export default function BookingDetailScreen() {
  const { theme, isDark } = useTheme();
  const { params, navigate } = useNavigation();
  const { t, isRTL } = useLanguage();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [disputeText, setDisputeText] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [resolution, setResolution] = useState(null);

  const bookingId = params?.booking_id || 'BK-MOCK';

  useEffect(() => {
    // Fetch booking details from API
    fetch(`${getBackendBase()}/api/bookings/${bookingId}`)
      .then(res => res.json())
      .then(data => {
        setBooking(data);
        setLoading(false);
      })
      .catch(err => {
        console.log("Fetch error:", err);
        setLoading(false);
      });
      
    // Simulate timeline progression for the demo
    const timer = setInterval(() => {
      setActiveStep(prev => {
        if (prev < TIMELINE_STEPS.length - 1) return prev + 1;
        clearInterval(timer);
        return prev;
      });
    }, 3000);
    
    return () => clearInterval(timer);
  }, [bookingId]);

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
      setResolution({ error: result.error || 'Failed to lodge dispute. Admin notified.' });
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
  const providerName = booking?.match?.selected?.name || bookingData.provider_name || 'Assigned Provider';
  const providerRating = booking?.match?.selected?.rating || '4.8';
  const providerDistance = booking?.match?.selected?.distance_km || '2.4';
  const serviceType = bookingData.service_type || 'General Service';
  const location = bookingData.location || 'Islamabad';
  const urgency = bookingData.urgency || 'Medium';
  const customerQuery = bookingData.customer_query || '';
  const pricingData = booking?.pricing || null;
  const quotedPrice = parseFloat(bookingData.quoted_price || '0');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Booking Details" showBack={true} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.bookingId, { color: theme.text }]}>ID: {bookingId}</Text>
          <Badge text={isCompleted ? "Completed" : "In Progress"} type={isCompleted ? "success" : "primary"} />
        </View>

        <Card>
          <SectionHeader title="Live Timeline" />
          <View style={styles.timelineContainer}>
            {TIMELINE_STEPS.map((step, index) => {
              const isActive = index <= activeStep;
              const isCurrent = index === activeStep;
              return (
                <View key={step.id} style={styles.timelineStep}>
                  <View style={styles.timelineIconContainer}>
                    <View style={[
                      styles.timelineIcon, 
                      { 
                        backgroundColor: isActive ? theme.primary : theme.border,
                        transform: [{ scale: isCurrent ? 1.2 : 1 }]
                      }
                    ]}>
                      <step.icon color="#fff" size={16} />
                    </View>
                    {index < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: isActive ? theme.primary : theme.border }]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, { color: isActive ? theme.text : theme.textSecondary, fontWeight: isCurrent ? 'bold' : 'normal' }]}>
                      {step.label}
                    </Text>
                    {isCurrent && index === 3 && (
                      <Text style={[styles.timelineSub, { color: theme.textSecondary }]}>
                        Verifying service checklist...
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        <Card>
          <SectionHeader title="Your Provider" />
          <View style={styles.providerRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primary + '33' }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>{providerName.charAt(0)}</Text>
            </View>
            <View style={styles.providerInfo}>
              <Text style={[styles.providerName, { color: theme.text }]}>{providerName}</Text>
              <Text style={[styles.providerStats, { color: theme.textSecondary }]}>
                ★ {providerRating} • {providerDistance} km away
              </Text>
            </View>
          </View>
        </Card>

        <Card>
          <SectionHeader title="Service Details" />
          <View style={styles.detailRow}>
            <MapPin color={theme.textSecondary} size={16} />
            <Text style={[styles.detailText, { color: theme.text }]}>
              Sector: {location.toUpperCase()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Clock color={theme.textSecondary} size={16} />
            <Text style={[styles.detailText, { color: theme.text }]}>
              Urgency: {urgency}
            </Text>
          </View>
          {customerQuery ? (
            <View style={[styles.queryContainer, { backgroundColor: theme.background }]}>
              <Text style={[styles.queryTitle, { color: theme.textSecondary }]}>Your Request:</Text>
              <Text style={[styles.queryText, { color: theme.text }]}>"{customerQuery}"</Text>
            </View>
          ) : null}
        </Card>

        <Card>
          <SectionHeader title="Service Pricing" />
          {renderPricingBreakdown(pricingData, quotedPrice, theme)}
        </Card>

        {isCompleted && !resolution && (
          <Card style={{ borderColor: theme.primary, borderWidth: 1 }}>
            <SectionHeader title="Rate & Feedback" />
            <Text style={{ color: theme.textSecondary, marginBottom: 16 }}>
              How was your experience? If there was an issue, our agentic system will resolve it automatically.
            </Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} activeOpacity={0.7} onPress={() => setUserRating(star)}>
                  <Star size={36} color={userRating >= star ? '#eab308' : theme.textSecondary} fill={userRating >= star ? '#eab308' : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={[styles.feedbackInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Describe your experience or lodge a complaint..."
              placeholderTextColor={theme.textSecondary}
              value={disputeText}
              onChangeText={setDisputeText}
              multiline
            />
            
            <PrimaryButton 
              title="Submit Feedback" 
              onPress={handleSubmitFeedback} 
              loading={disputeLoading}
              style={{ backgroundColor: userRating > 0 && userRating <= 3 ? '#dc2626' : theme.primary }}
            />
          </Card>
        )}

        {resolution && !resolution.error && (
          <Card style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', borderColor: '#FF9800', borderWidth: 1 }}>
            <View style={styles.resolutionHeader}>
              <AlertTriangle color="#FF9800" size={24} />
              <Text style={styles.resolutionTitle}>Dispute Handled by AI</Text>
            </View>
            <Text style={[styles.resolutionText, { color: theme.text }]}>
              "{resolution.ai_response}"
            </Text>
            <View style={styles.resolutionStats}>
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>Provider Reputation Updated:</Text>
              <Text style={{ color: theme.textSecondary }}>Action: {resolution.action}</Text>
              <Text style={{ color: theme.textSecondary }}>Reliability: {resolution.reliability_score.old} → {resolution.reliability_score.new}</Text>
            </View>
          </Card>
        )}
        
        {resolution && resolution.error && (
          <Card style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)', borderColor: '#F44336', borderWidth: 1 }}>
            <Text style={{ color: '#F44336', fontWeight: 'bold' }}>Error: {resolution.error}</Text>
          </Card>
        )}

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
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  bookingId: { fontSize: 18, fontWeight: 'bold' },
  timelineContainer: { marginTop: 8 },
  timelineStep: { flexDirection: 'row', marginBottom: 20 },
  timelineIconContainer: { alignItems: 'center', marginRight: 16 },
  timelineIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  timelineLine: { width: 2, height: 40, position: 'absolute', top: 32, zIndex: 1 },
  timelineContent: { flex: 1, justifyContent: 'center' },
  timelineLabel: { fontSize: 16 },
  timelineSub: { fontSize: 13, marginTop: 4, fontStyle: 'italic' },
  starsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 20 },
  feedbackInput: { borderRadius: 12, padding: 16, height: 100, textAlignVertical: 'top', borderWidth: 1, marginBottom: 20 },
  resolutionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  resolutionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FF9800', marginLeft: 8 },
  resolutionText: { fontSize: 15, fontStyle: 'italic', marginBottom: 16, lineHeight: 22 },
  resolutionStats: { borderTopWidth: 1, borderTopColor: 'rgba(255, 152, 0, 0.2)', paddingTop: 12 },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  providerStats: {
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 15,
    marginLeft: 12,
  },
  queryContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  queryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  queryText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  priceBreakdownContainer: {
    paddingVertical: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceDivider: {
    height: 1,
    marginVertical: 12,
  },
  priceRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priceTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
