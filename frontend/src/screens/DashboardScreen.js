import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import { MessageSquare, ArrowRight, Sparkles } from 'lucide-react-native';

export default function DashboardScreen() {
  const { theme } = useTheme();
  const { navigate } = useNavigation();
  const { t, isRTL } = useLanguage();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim, floatAnim]);

  const handleStartChat = () => {
    navigate('Chat');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title={t('dashboard')} />

      <View style={styles.centerContainer}>
        <View style={[styles.ambientGlow, { backgroundColor: theme.primary + '15', top: '25%' }]} />

        <View style={styles.welcomeSection}>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            {t('welcome')}
          </Text>
          <Text style={[styles.title, { color: theme.text }]}>
            {t('whatService')}
          </Text>
        </View>

        <Animated.View
          style={[
            styles.interactiveWrapper,
            {
              transform: [{ scale: pulseAnim }, { translateY: floatAnim }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.centralCircle,
              {
                backgroundColor: theme.surface,
                borderColor: theme.primary + '40',
                shadowColor: theme.primary,
              },
            ]}
            onPress={handleStartChat}
          >
            <View style={[styles.innerCircle, { backgroundColor: theme.primary + '15' }]}>
              <MessageSquare color={theme.primary} size={50} />
              <Sparkles color={theme.primary} size={22} style={styles.sparkleIcon} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.ctaButton,
            {
              backgroundColor: theme.primary,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={handleStartChat}
        >
          <Text style={styles.ctaText}>
            {isRTL ? 'سروس اسسٹنٹ سے بات کریں' : 'Consult AI Assistant'}
          </Text>
          <View style={[styles.arrowWrapper, isRTL && { transform: [{ rotate: '180deg' }] }]}>
            <ArrowRight color="#ffffff" size={20} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.secondaryButton,
            {
              borderColor: theme.primary,
              borderWidth: 1.5,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => navigate('MyBookings')}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>
            {isRTL ? 'میری بکنگز دیکھیں' : 'View My Bookings'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    filter: Platform.OS === 'web' ? 'blur(80px)' : undefined,
    opacity: 0.6,
    zIndex: -1,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 12,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
    paddingHorizontal: 12,
  },
  interactiveWrapper: {
    marginBottom: 50,
  },
  centralCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  innerCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sparkleIcon: {
    position: 'absolute',
    top: 32,
    right: 32,
  },
  ctaButton: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  arrowWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
});
