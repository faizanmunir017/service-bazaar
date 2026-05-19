import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginScreen() {
  const { theme } = useTheme();
  const { navigate } = useNavigation();
  const { t, toggleLanguage, locale, isRTL } = useLanguage();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');

  const handleLogin = () => {
    if (username === 'admin' && password === 'password') {
      navigate('Dashboard');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={styles.card}>
        {/* Language selector on startup page */}
        <TouchableOpacity 
          onPress={toggleLanguage} 
          style={[styles.langBtn, { borderColor: theme.border, alignSelf: isRTL ? 'flex-start' : 'flex-end' }]}
        >
          <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
            {locale === 'en' ? 'اردو' : 'English'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.title, { color: theme.text, textAlign: 'center' }]}>
          {t('appName')}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary, textAlign: 'center' }]}>
          {t('loginTitle')}
        </Text>
        
        <View style={[styles.inputContainer, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={[styles.label, { color: theme.text }]}>{t('username')}</Text>
          <TextInput
            style={[
              styles.input, 
              { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border },
              isRTL && { textAlign: 'right' }
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder="admin"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
          />
        </View>

        <View style={[styles.inputContainer, isRTL && { alignItems: 'flex-end' }]}>
          <Text style={[styles.label, { color: theme.text }]}>{t('password')}</Text>
          <TextInput
            style={[
              styles.input, 
              { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border },
              isRTL && { textAlign: 'right' }
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder="password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={[styles.loginBtn, { backgroundColor: theme.primary }]}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.loginBtnText}>{t('loginBtn')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    gap: 16,
  },
  langBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    width: '100%',
  },
  loginBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
