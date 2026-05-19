import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import { ChevronLeft, Moon, Sun, Languages } from 'lucide-react-native';

export default function Header({ title, showBack = false }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { navigate } = useNavigation();
  const { toggleLanguage, locale, isRTL } = useLanguage();

  return (
    <View style={[
      styles.header, 
      { backgroundColor: theme.surface, borderBottomColor: theme.border },
      isRTL && { flexDirection: 'row-reverse' }
    ]}>
      <View style={[styles.left, isRTL && { alignItems: 'flex-end' }]}>
        {showBack && (
          <TouchableOpacity onPress={() => navigate('Dashboard')} style={styles.iconBtn}>
            <ChevronLeft color={theme.text} size={24} style={isRTL && { transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={[styles.title, { color: theme.text }, isRTL && { textAlign: 'center' }]}>
        {title}
      </Text>
      
      <View style={[styles.right, { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }]}>
        <TouchableOpacity onPress={toggleLanguage} style={styles.iconBtn}>
          <Text style={[styles.langText, { color: theme.primary }]}>
            {locale === 'en' ? 'اردو' : 'EN'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
          {isDark ? <Sun color={theme.text} size={20} /> : <Moon color={theme.text} size={20} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 16,
    borderBottomWidth: 1,
    height: 60,
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  right: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  iconBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langText: {
    fontSize: 13,
    fontWeight: 'bold',
  }
});
