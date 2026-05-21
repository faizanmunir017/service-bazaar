import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import Header from '../components/Header';
import { Badge, Card } from '../components/UIComponents';
import { getBackendBase } from '../config/api';
import { Calendar, ChevronRight } from 'lucide-react-native';

export default function MyBookingsScreen() {
  const { theme } = useTheme();
  const { navigate } = useNavigation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getBackendBase()}/api/bookings`)
      .then(res => res.json())
      .then(data => {
        setBookings(data.bookings ? data.bookings.reverse() : []);
        setLoading(false);
      })
      .catch(err => {
        console.log("Fetch error:", err);
        setLoading(false);
      });
  }, []);

  const renderItem = ({ item }) => {
    // Assuming status logic or fields based on CSV structure
    // If not present, default to "completed" for past ledger items
    const status = item.status || 'completed';
    
    let badgeType = 'default';
    if (status === 'completed' || status === 'confirmed') badgeType = 'success';
    if (status === 'payment_hold') badgeType = 'warning';
    if (status === 'clarification') badgeType = 'primary';
    
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={() => navigate('BookingDetail', { booking_id: item.booking_id })}>
        <Card style={styles.bookingCard}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.primary + '15' }]}>
              <Calendar color={theme.primary} size={24} />
            </View>
            <View>
              <Text style={[styles.bookingTitle, { color: theme.text }]}>
                {item.service_type || 'Service Booking'}
              </Text>
              <Text style={[styles.bookingDate, { color: theme.textSecondary }]}>
                {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Recent'} • ID: {item.booking_id}
              </Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Badge text={status.replace('_', ' ').toUpperCase()} type={badgeType} />
            <ChevronRight color={theme.textSecondary} size={20} style={{ marginLeft: 8 }} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="My Bookings" showBack={true} />
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No recent bookings found.</Text>
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
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  bookingTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  bookingDate: { fontSize: 13 },
  cardRight: { flexDirection: 'row', alignItems: 'center' },
});
