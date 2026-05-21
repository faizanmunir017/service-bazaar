import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, Badge, FactorBar, SectionHeader, PrimaryButton } from './UIComponents';

export const IntentCard = ({ intent }) => {
  const { theme } = useTheme();
  if (!intent) return null;
  
  return (
    <Card style={styles.chatCard}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Service Understood</Text>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Service:</Text>
        <Text style={[styles.value, { color: theme.text }]}>{intent.service_type || 'Unknown'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Location:</Text>
        <Text style={[styles.value, { color: theme.text }]}>{intent.location || 'Unknown'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Urgency:</Text>
        <Badge
          text={intent.urgency_level || intent.urgency || 'Medium'}
          type={String(intent.urgency_level || '').toLowerCase() === 'high' ? 'error' : 'default'}
        />
      </View>
    </Card>
  );
};

export const ProviderMatchCard = ({ match }) => {
  const { theme } = useTheme();
  if (!match || !match.selected) return null;
  
  const p = match.selected;
  
  return (
    <Card style={styles.chatCard}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Provider Matched</Text>
      <View style={styles.providerHeader}>
        <View style={[styles.avatar, { backgroundColor: theme.primary + '33' }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>{p.name?.charAt(0) || 'P'}</Text>
        </View>
        <View style={styles.providerInfo}>
          <Text style={[styles.providerName, { color: theme.text }]}>{p.name}</Text>
          <Text style={[styles.providerStats, { color: theme.textSecondary }]}>
            ★ {p.rating} • {p.distance_km} km away
          </Text>
        </View>
      </View>
    </Card>
  );
};

export const PricingCard = ({ pricing }) => {
  const { theme } = useTheme();
  if (!pricing) return null;
  
  return (
    <Card style={styles.chatCard}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Estimated Price</Text>
      <Text style={[styles.priceLarge, { color: theme.primary }]}>Rs. {pricing.final_price || pricing.estimated_total}</Text>
      <Text style={[styles.priceDetail, { color: theme.textSecondary }]}>{pricing.breakdown_md?.substring(0, 100)}...</Text>
    </Card>
  );
};

export const ClarificationCard = ({ message, questions }) => {
  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const safeQuestions = (questions || []).filter((q) => typeof q === 'string' && q.trim());

  return (
    <Card style={[styles.chatCard, { borderColor: theme.primary, borderWidth: 1 }]}>
      <Text style={[styles.messageText, { color: theme.text, marginBottom: safeQuestions.length ? 12 : 8 }]}>
        {message}
      </Text>
      {safeQuestions.length > 0 && (
        <>
          <Text style={[styles.missingTitle, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('missingDetailsTitle')}
          </Text>
          <View style={styles.chipsContainer}>
            {safeQuestions.map((q, idx) => (
              <View
                key={idx}
                style={[styles.chip, styles.chipStatic, { backgroundColor: theme.background, borderColor: theme.border }]}
              >
                <Text style={[styles.chipText, { color: theme.text }]}>{q}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      <Text style={[styles.hintText, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
        {t('clarificationTypeHint')}
      </Text>
    </Card>
  );
};

export const ErrorCard = ({ message }) => {
  const { theme } = useTheme();
  
  return (
    <Card style={[styles.chatCard, { backgroundColor: 'rgba(244, 67, 54, 0.1)', borderColor: '#F44336', borderWidth: 1 }]}>
      <Text style={[styles.cardTitle, { color: '#F44336' }]}>Error</Text>
      <Text style={[styles.messageText, { color: theme.text }]}>{message}</Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  chatCard: {
    maxWidth: '85%',
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderBottomLeftRadius: 4,
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  label: {
    width: 60,
    fontSize: 13,
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
  },
  providerStats: {
    fontSize: 13,
    marginTop: 2,
  },
  priceLarge: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceDetail: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  missingTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
    maxWidth: '100%',
  },
  chipStatic: {
    opacity: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
