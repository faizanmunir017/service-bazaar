import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import { getBackendBase } from '../config/api';

export default function OrchestratorTraceScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [traces, setTraces] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getBackendBase()}/api/traces/latest?limit=100`)
      .then((res) => res.json())
      .then((data) => {
        setTraces(data.traces || t('noTraces'));
        setLoading(false);
      })
      .catch((err) => {
        setTraces(t('tracesFetchError', { msg: err.message }));
        setLoading(false);
      });
  }, [t]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title={t('orchestratorTraces')} showBack={true} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.terminalContainer}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.terminalText}>{traces}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  terminalContainer: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    margin: 16,
    borderRadius: 8,
  },
  terminalText: {
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
