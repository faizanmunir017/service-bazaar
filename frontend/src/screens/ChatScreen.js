import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Platform, ActivityIndicator, Keyboard, Animated
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import Header from '../components/Header';
import { Send, MapPin } from 'lucide-react-native';
import { checkBackendHealth, submitServiceRequest, pollServiceResponse } from '../api/serviceApi';
import { ClarificationCard, ErrorCard } from '../components/ChatCards';

const PIPELINE_STEPS = ["Analyzing your request...", "Checking availability...", "Finalizing details..."];

export default function ChatScreen() {
  const { theme } = useTheme();
  const { params, navigate } = useNavigation();
  const { t, isRTL, locale, selectedLocation, setSelectedLocation } = useLanguage();
  const { showToast } = useToast();

  const [messages, setMessages] = useState([
    {
      id: 'init',
      type: 'system',
      text: t('chatInit'),
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputText, setInputText] = useState(params?.initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [backendConnected, setBackendConnected] = useState(null);

  const scrollViewRef = useRef();
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const pollIntervalRef = useRef(null);
  const pipelineIntervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const health = await checkBackendHealth();
      if (cancelled) return;
      setBackendConnected(health.ok);
      if (!health.ok) {
        setMessages(prev => [...prev, {
          id: `conn-${Date.now()}`,
          type: 'error',
          text: health.error || t('fallbackMsg'),
          timestamp: new Date().toISOString(),
        }]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pipelineIntervalRef.current) clearInterval(pipelineIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    const onShow = (e) => {
      const buffer = 16;
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height + buffer,
        duration: e.duration || 250,
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: e.duration || 200,
        useNativeDriver: false,
      }).start();
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages, isLoading, pipelineStep]);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pipelineIntervalRef.current) {
      clearInterval(pipelineIntervalRef.current);
      pipelineIntervalRef.current = null;
    }
  };

  const handlePollResult = (result) => {
    if (result.status === 'processed') {
      stopPolling();
      setIsLoading(false);
      const payload = result.data || {};
      showToast(`Booking confirmed — ${payload.booking_id || ''}`);
      navigate('BookingConfirmation', {
        booking_id: payload.booking_id,
        intent: payload.intent,
        match: payload.match,
        pricing: payload.pricing,
        payment: payload.payment,
        booking: payload.booking,
      });
      return true;
    }
    if (result.status === 'clarification_needed') {
      stopPolling();
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'clarification',
        text: result.data?.orchestrator_note || 'Clarification needed.',
        questions: result.data?.questions || [],
        timestamp: new Date().toISOString()
      }]);
      return true;
    }
    if (result.status === 'error') {
      stopPolling();
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'error',
        text: `Swarm Execution Error:\n${result.data?.error_log?.join('\n') || 'Unknown execution issue.'}`,
        timestamp: new Date().toISOString()
      }]);
      return true;
    }
    return false;
  };

  const startPolling = () => {
    stopPolling();

    setPipelineStep(0);
    pipelineIntervalRef.current = setInterval(() => {
      setPipelineStep(prev => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, 1500);

    let pollAttempts = 0;
    const maxPollAttempts = 30;

    const runPoll = async () => {
      pollAttempts++;
      if (pollAttempts > maxPollAttempts) {
        stopPolling();
        setIsLoading(false);
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'error',
          text: 'Request timed out. Please try again.',
          timestamp: new Date().toISOString()
        }]);
        return;
      }

      try {
        const result = await pollServiceResponse();
        handlePollResult(result);
      } catch (err) {
        if (pollAttempts >= 5) {
          stopPolling();
          setIsLoading(false);
          setMessages(prev => [...prev, {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: 'error',
            text: t('pollConnectionError'),
            timestamp: new Date().toISOString()
          }]);
        }
      }
    };

    runPoll();
    pollIntervalRef.current = setInterval(runPoll, 2000);
  };

  const handleSend = async (customText = null) => {
    const textToSend = customText !== null ? customText : inputText;
    if (!textToSend.trim()) return;

    setMessages(prev => [...prev, {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    }]);

    if (customText === null) setInputText('');
    setIsLoading(true);

    const result = await submitServiceRequest(textToSend, locale, messages.slice(-10).map(m => ({ role: m.type, content: m.text })), selectedLocation);

    if (result.ok && result.data?.status === 'accepted') {
      startPolling();
      return;
    }

    setIsLoading(false);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'error',
      text: result.error || result.data?.message || t('fallbackMsg'),
      timestamp: new Date().toISOString(),
    }]);
  };

  const renderMessage = (msg) => {
    if (msg.type === 'clarification') {
      return (
        <View key={msg.id} style={styles.messageWrapperSystem}>
          <ClarificationCard
            message={msg.text}
            questions={msg.questions}
            onSelect={(q) => handleSend(q)}
          />
        </View>
      );
    }
    if (msg.type === 'error') {
      return (
        <View key={msg.id} style={styles.messageWrapperSystem}>
          <ErrorCard message={msg.text} />
        </View>
      );
    }
    const isUser = msg.type === 'user';
    return (
      <View key={msg.id} style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperSystem]}>
        <View style={[styles.messageBubble, isUser ? { backgroundColor: theme.messageUser, borderBottomRightRadius: 0 } : { backgroundColor: theme.messageSystem, borderBottomLeftRadius: 0, borderWidth: 1, borderColor: theme.border }]}>
          <Text style={{ color: isUser ? theme.messageUserText : theme.messageSystemText, fontSize: 15, lineHeight: 22, textAlign: isRTL ? 'right' : 'left' }}>
            {msg.text}
          </Text>
        </View>
      </View>
    );
  };

  const renderLocationSelector = () => (
    <View style={styles.locationSelector}>
      <Text style={[styles.selectorTitle, { color: theme.text, textAlign: 'center' }]}>We currently service only Islamabad</Text>
      <Text style={{ color: theme.text, marginVertical: 12, textAlign: 'center' }}>
        Our services are not yet available in Lahore,Karachi or any other area. Please continue with Islamabad.
      </Text>
      <TouchableOpacity
        style={[styles.locationButton, { backgroundColor: theme.primary, alignSelf: 'center', width: '60%' }]}
        onPress={() => setSelectedLocation('Islamabad')}
      >
        <Text style={styles.locationButtonText}>Proceed with Islamabad</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title={t('serviceAssistant')} showBack={true} />

      {!selectedLocation ? renderLocationSelector() : (
        <>
          <View style={[styles.locationBanner, { backgroundColor: theme.primary + '20' }]}>
            <MapPin color={theme.primary} size={16} />
            <Text style={[styles.locationText, { color: theme.primary }]}>{selectedLocation}</Text>
            <TouchableOpacity onPress={() => setSelectedLocation(null)}><Text style={{ color: theme.primary, marginLeft: 10, textDecorationLine: 'underline' }}>{t('change')}</Text></TouchableOpacity>
          </View>
          <ScrollView
            style={styles.chatContainer}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            ref={scrollViewRef}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(renderMessage)}
            {isLoading && (
              <View style={[styles.loadingContainer, { backgroundColor: theme.surface, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  {PIPELINE_STEPS[pipelineStep] || PIPELINE_STEPS[0]}
                </Text>
              </View>
            )}
          </ScrollView>
          <Animated.View style={{ marginBottom: keyboardOffset }}>
            <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderTopColor: theme.border }, isRTL && { flexDirection: 'row-reverse' }]}>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background, color: theme.text }, isRTL && { textAlign: 'right' }]}
                placeholder={t('placeholder')}
                placeholderTextColor={theme.textSecondary}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => { if (!isLoading) handleSend(null); }}
                editable={!isLoading}
                multiline
              />
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.sendButton, { backgroundColor: inputText.trim() ? theme.primary : theme.textSecondary }, isRTL ? { marginRight: 12 } : { marginLeft: 12 }]}
                onPress={() => handleSend(null)}
                disabled={!inputText.trim() || isLoading}
              >
                <View style={isRTL ? { transform: [{ rotate: '180deg' }] } : undefined}>
                  <Send color="#ffffff" size={20} />
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  locationSelector: { padding: 32, alignItems: 'center', justifyContent: 'center', flex: 1 },
  selectorTitle: { fontSize: 18, marginBottom: 16, fontWeight: 'bold' },
  locationButton: { padding: 16, borderRadius: 12, marginVertical: 8, width: '100%', alignItems: 'center' },
  locationButtonText: { color: '#ffffff', fontWeight: '600' },
  locationBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center' },
  locationText: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
  chatContainer: { flex: 1 },
  messageWrapper: { marginBottom: 16, maxWidth: '85%' },
  messageWrapperUser: { alignSelf: 'flex-end' },
  messageWrapperSystem: { alignSelf: 'flex-start' },
  messageBubble: { padding: 14, borderRadius: 16 },
  loadingContainer: { alignItems: 'center', alignSelf: 'flex-start', padding: 12, borderRadius: 16, borderBottomLeftRadius: 0, marginBottom: 16 },
  loadingText: { fontSize: 13, marginHorizontal: 8, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', padding: 12, alignItems: 'flex-end', borderTopWidth: 1 },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, paddingTop: 12, fontSize: 15, maxHeight: 120, minHeight: 44 },
  sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
