import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { CheckCircle, User, MapPin, Wrench, X } from 'lucide-react-native';

export default function ConfirmBookingModal({
  visible,
  payload,
  onConfirm,
  onCancel,
  confirming = false,
}) {
  const { theme, isDark } = useTheme();
  const { t, isRTL } = useLanguage();

  if (!visible || !payload) return null;

  const provider = payload.match?.selected;
  const intent = payload.intent || {};
  const price = payload.pricing?.final_price;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={confirming ? undefined : onCancel}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: isDark ? '#000' : '#64748b',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.background }]}
            onPress={onCancel}
            disabled={confirming}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X color={theme.textSecondary} size={20} />
          </TouchableOpacity>

          <View style={[styles.iconRing, { backgroundColor: theme.primary + '18' }]}>
            <CheckCircle color={theme.primary} size={40} />
          </View>

          <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>
            {t('confirmBookingTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
            {t('confirmBookingMessage')}
          </Text>

          <View style={[styles.summaryCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            {provider && (
              <View style={[styles.row, isRTL && styles.rowRtl]}>
                <User color={theme.primary} size={18} />
                <View style={styles.rowBody}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{t('confirmProvider')}</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>{provider.name}</Text>
                </View>
              </View>
            )}
            {intent.service_type && (
              <View style={[styles.row, isRTL && styles.rowRtl]}>
                <Wrench color={theme.primary} size={18} />
                <View style={styles.rowBody}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{t('confirmService')}</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>{intent.service_type}</Text>
                </View>
              </View>
            )}
            {intent.location && (
              <View style={[styles.row, isRTL && styles.rowRtl]}>
                <MapPin color={theme.primary} size={18} />
                <View style={styles.rowBody}>
                  <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>{t('confirmLocation')}</Text>
                  <Text style={[styles.rowValue, { color: theme.text }]}>{intent.location}</Text>
                </View>
              </View>
            )}
            {price != null && (
              <View style={[styles.priceRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>{t('confirmTotal')}</Text>
                <Text style={[styles.priceValue, { color: theme.primary }]}>PKR {price}</Text>
              </View>
            )}
          </View>

          <View style={[styles.actions, isRTL && styles.actionsRtl]}>
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: theme.border, backgroundColor: theme.background }]}
              onPress={onCancel}
              disabled={confirming}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnSecondaryText, { color: theme.text }]}>{t('no')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
              onPress={onConfirm}
              disabled={confirming}
              activeOpacity={0.85}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>{t('yes')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    paddingTop: 20,
    borderWidth: 1,
    elevation: 12,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowRtl: {
    flexDirection: 'row-reverse',
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionsRtl: {
    flexDirection: 'row-reverse',
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
