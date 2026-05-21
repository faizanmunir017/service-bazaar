import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import Header from '../components/Header';
import { getBackendBase } from '../config/api';

export default function OrchestratorTraceScreen() {
  const { theme } = useTheme();
  const [traces, setTraces] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getBackendBase()}/api/traces/latest?limit=100`)
      .then(res => res.json())
      .then(data => {
        setTraces(data.traces || 'No traces found.');
        setLoading(false);
      })
      .catch(err => {
        console.log("Fetch error:", err);
        setTraces(`Error fetching traces: ${err.message}`);
        setLoading(false);
      });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Orchestrator Traces" showBack={true} />
      
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
    backgroundColor: '#1e1e1e', // Classic terminal background
    margin: 16,
    borderRadius: 8,
  },
  terminalText: {
    color: '#00ff00', // Hacker green
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  }
});
