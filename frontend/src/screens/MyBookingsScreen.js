import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import { Badge, Card } from '../components/UIComponents';
import { getBackendBase } from '../config/api';
import { Calendar, ChevronRight } from 'lucide-react-native';

function statusLabel(status, t) {
  if (status === 'confirmed') return t('statusConfirmed');
  if (status === 'completed') return t('statusCompleted');
  if (status === 'payment_hold') return t('statusPaymentHold');
  return (status || 'completed').replace('_', ' ').toUpperCase();
}

export default function MyBookingsScreen() {
  const { theme } = useTheme();
  const { navigate } = useNavigation();
  const { t, isRTL } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = getBackendBase();
    if (!base) {
      setLoading(false);
      return;
    }
    fetch(`${base}/api/bookings`)
      .then((res) => res.json())
      .then((data) => {
        setBookings(data.bookings ? data.bookings.reverse() : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const renderItem = ({ item }) => {
    const status = item.status || 'completed';
    let badgeType = 'default';
    if (status === 'completed' || status === 'confirmed') badgeType = 'success';
    if (status === 'payment_hold') badgeType = 'warning';

    return (
      <TouchableOpacity activeOpacity={0.75} onPress={() => navigate('BookingDetail', { booking_id: item.booking_id })}>
        <Card style={styles.bookingCard}>
          <View style={[styles.cardLeft, isRTL && styles.rowRtl]}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.primary + '15' }]}>
              <Calendar color={theme.primary} size={24} />
            </View>
            <View>
              <Text style={[styles.bookingTitle, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
                {item.service_type || t('serviceBooking')}
              </Text>
              <Text style={[styles.bookingDate, { color: theme.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : t('recent')} • {t('bookingIdLabel', { id: item.booking_id })}
              </Text>
            </View>
          </View>
          <View style={[styles.cardRight, isRTL && styles.rowRtl]}>
            <Badge text={statusLabel(status, t)} type={badgeType} />
            <View style={[{ marginHorizontal: 8 }, isRTL && { transform: [{ rotate: '180deg' }] }]}>
              <ChevronRight color={theme.textSecondary} size={20} />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title={t('myBookings')} showBack={true} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('noBookings')}</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item, idx) => item.booking_id || idx.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16 },
  listContent: { padding: 16 },
  bookingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginBottom: 12 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowRtl: { flexDirection: 'row-reverse' },
  iconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginHorizontal: 16 },
  bookingTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  bookingDate: { fontSize: 13 },
  cardRight: { flexDirection: 'row', alignItems: 'center' },
});
