import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const Card = ({ children, style, noPadding = false }) => {
  const { theme, isDark } = useTheme();
  return (
    <View style={[
      styles.card, 
      { backgroundColor: theme.cardBackground, shadowColor: isDark ? '#000' : '#888' },
      noPadding ? { padding: 0 } : {},
      style
    ]}>
      {children}
    </View>
  );
};

export const PrimaryButton = ({ title, onPress, style, loading, textStyle }) => {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.button, { backgroundColor: theme.primary }, style]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.buttonText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export const Badge = ({ text, type = 'default', style }) => {
  const { theme } = useTheme();
  
  let bgColor = theme.border;
  let textColor = theme.text;
  
  if (type === 'success') {
    bgColor = 'rgba(76, 175, 80, 0.2)';
    textColor = '#4CAF50';
  } else if (type === 'warning') {
    bgColor = 'rgba(255, 152, 0, 0.2)';
    textColor = '#FF9800';
  } else if (type === 'error') {
    bgColor = 'rgba(244, 67, 54, 0.2)';
    textColor = '#F44336';
  } else if (type === 'primary') {
    bgColor = `${theme.primary}33`;
    textColor = theme.primary;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{text}</Text>
    </View>
  );
};

export const SectionHeader = ({ title, style }) => {
  const { theme } = useTheme();
  return (
    <Text style={[styles.sectionHeader, { color: theme.text }, style]}>
      {title}
    </Text>
  );
};

export const FactorBar = ({ label, value, max = 10, format }) => {
  const { theme } = useTheme();
  const numeric = Number(value);
  const safeVal = Number.isFinite(numeric) ? numeric : 0;
  const safeMax = Number(max) > 0 ? Number(max) : 10;
  const percentage = Math.max(0, Math.min(100, (safeVal / safeMax) * 100));
  
  let barColor = theme.primary;
  if (percentage < 40) barColor = '#F44336';
  else if (percentage < 70) barColor = '#FF9800';
  else barColor = '#4CAF50';

  return (
    <View style={styles.factorContainer}>
      <View style={styles.factorLabelContainer}>
        <Text style={[styles.factorLabel, { color: theme.textSecondary }]}>{label}</Text>
        <Text style={[styles.factorValue, { color: theme.text }]}>{format ? format(safeVal) : safeVal}</Text>
      </View>
      <View style={[styles.factorTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.factorFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    flexDirection: 'row',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  factorContainer: {
    marginBottom: 10,
  },
  factorLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  factorLabel: {
    fontSize: 13,
  },
  factorValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  factorTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  factorFill: {
    height: '100%',
    borderRadius: 3,
  }
});
