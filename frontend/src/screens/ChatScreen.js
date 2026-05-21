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
import {
  checkBackendHealth,
  submitServiceRequest,
  pollServiceResponse,
  confirmBooking,
  cancelPendingBooking,
} from '../api/serviceApi';
import { ClarificationCard, ErrorCard } from '../components/ChatCards';
import ConfirmBookingModal from '../components/ConfirmBookingModal';


export default function ChatScreen() {
  const { theme } = useTheme();
  const { params, navigate } = useNavigation();
  const { t, isRTL, locale, selectedLocation, setSelectedLocation } = useLanguage();

  const PIPELINE_STEPS = [t('pipeline1'), t('pipeline2'), t('pipeline3')];
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
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [confirmingBooking, setConfirmingBooking] = useState(false);

  const scrollViewRef = useRef();
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const pollIntervalRef = useRef(null);
  const pipelineIntervalRef = useRef(null);
  const sendingRef = useRef(false);
  const pollHandledRef = useRef(false);
  const pollInFlightRef = useRef(false);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) => (m.id === 'init' ? { ...m, text: t('chatInit') } : m))
    );
  }, [locale, t]);

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

  const goToBookingConfirmation = (payload) => {
    navigate('BookingConfirmation', {
      booking_id: payload.booking_id,
      intent: payload.intent,
      match: payload.match,
      pricing: payload.pricing,
      payment: payload.payment,
      booking: payload.booking,
    });
  };

  const promptConfirmBooking = (payload) => {
    setPendingBooking(payload);
    setConfirmModalVisible(true);
  };

  const handleDeclineBooking = async () => {
    setConfirmModalVisible(false);
    setPendingBooking(null);
    await cancelPendingBooking();
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'system',
      text: t('bookingDeclined'),
      timestamp: new Date().toISOString(),
    }]);
  };

  const handleAcceptBooking = async () => {
    setConfirmingBooking(true);
    const confirmed = await confirmBooking();
    setConfirmingBooking(false);
    setConfirmModalVisible(false);
    setPendingBooking(null);

    if (!confirmed.ok) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'error',
        text: confirmed.error || t('fallbackMsg'),
        timestamp: new Date().toISOString(),
      }]);
      return;
    }
    const data = confirmed.data?.data || confirmed.data || {};
      showToast(t('bookingConfirmedToast', { id: data.booking_id || '' }));
    goToBookingConfirmation(data);
  };

  const handlePollResult = (result) => {
    if (pollHandledRef.current) return true;

    const finishTerminal = () => {
      pollHandledRef.current = true;
      stopPolling();
      setIsLoading(false);
    };

    if (result.status === 'awaiting_confirmation') {
      finishTerminal();
      promptConfirmBooking(result.data || {});
      return true;
    }
    if (result.status === 'processed') {
      finishTerminal();
      const payload = result.data || {};
      showToast(t('bookingConfirmedToast', { id: payload.booking_id || '' }));
      goToBookingConfirmation(payload);
      return true;
    }
    if (result.status === 'cancelled') {
      finishTerminal();
      return true;
    }
    if (result.status === 'clarification_needed') {
      finishTerminal();
      const note = result.data?.orchestrator_note || t('clarificationNeeded');
      const questions = result.data?.questions || [];
      setMessages(prev => {
        const duplicate = prev.some(
          (m) => m.type === 'clarification' && m.text === note
        );
        if (duplicate) return prev;
        return [...prev, {
          id: `clar-${Date.now()}`,
          type: 'clarification',
          text: note,
          questions,
          timestamp: new Date().toISOString(),
        }];
      });
      return true;
    }
    if (result.status === 'error') {
      finishTerminal();
      const errText = `Swarm Execution Error:\n${result.data?.error_log?.join('\n') || 'Unknown execution issue.'}`;
      setMessages(prev => {
        if (prev.some((m) => m.type === 'error' && m.text === errText)) return prev;
        return [...prev, {
          id: `err-${Date.now()}`,
          type: 'error',
          text: errText,
          timestamp: new Date().toISOString(),
        }];
      });
      return true;
    }
    return false;
  };

  const startPolling = () => {
    stopPolling();
    pollHandledRef.current = false;
    pollInFlightRef.current = false;

    setPipelineStep(0);
    pipelineIntervalRef.current = setInterval(() => {
      setPipelineStep(prev => (prev < PIPELINE_STEPS.length - 1 ? prev + 1 : prev));
    }, 1500);

    let pollAttempts = 0;
    const maxPollAttempts = 30;

    const runPoll = async () => {
      if (pollHandledRef.current || pollInFlightRef.current) return;

      pollAttempts++;
      if (pollAttempts > maxPollAttempts) {
        if (!pollHandledRef.current) {
          pollHandledRef.current = true;
          stopPolling();
          setIsLoading(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'error',
            text: t('requestTimeout'),
            timestamp: new Date().toISOString()
          }]);
        }
        return;
      }

      pollInFlightRef.current = true;
      try {
        const result = await pollServiceResponse();
        if (!pollHandledRef.current) {
          handlePollResult(result);
        }
      } catch (err) {
        if (!pollHandledRef.current && pollAttempts >= 5) {
          pollHandledRef.current = true;
          stopPolling();
          setIsLoading(false);
          setMessages(prev => [...prev, {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: 'error',
            text: t('pollConnectionError'),
            timestamp: new Date().toISOString()
          }]);
        }
      } finally {
        pollInFlightRef.current = false;
      }
    };

    runPoll();
    pollIntervalRef.current = setInterval(runPoll, 2000);
  };

  const handleSend = async (customText = null) => {
    const textToSend = customText !== null ? customText : inputText;
    if (!textToSend.trim() || isLoading || sendingRef.current) return;

    sendingRef.current = true;
    const userMsg = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (customText === null) setInputText('');
    setIsLoading(true);

    let accepted = false;
    try {
      const result = await submitServiceRequest(textToSend, locale, selectedLocation);

      if (result.ok && result.data?.status === 'accepted') {
        accepted = true;
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
    } finally {
      sendingRef.current = false;
      if (!accepted) {
        setIsLoading(false);
      }
    }
  };

  const renderMessage = (msg) => {
    if (msg.type === 'clarification') {
      return (
        <View key={msg.id} style={styles.messageWrapperSystem}>
          <ClarificationCard
            message={msg.text}
            questions={msg.questions}
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
      <Text style={[styles.selectorTitle, { color: theme.text, textAlign: 'center' }]}>{t('islamabadOnlyTitle')}</Text>
      <Text style={{ color: theme.text, marginVertical: 12, textAlign: 'center' }}>
        {t('islamabadOnlyDesc')}
      </Text>
      <TouchableOpacity
        style={[styles.locationButton, { backgroundColor: theme.primary, alignSelf: 'center', width: '60%' }]}
        onPress={() => setSelectedLocation('Islamabad')}
      >
        <Text style={styles.locationButtonText}>{t('proceedIslamabad')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title={t('serviceAssistant')} showBack={true} />

      <ConfirmBookingModal
        visible={confirmModalVisible}
        payload={pendingBooking}
        confirming={confirmingBooking}
        onConfirm={handleAcceptBooking}
        onCancel={handleDeclineBooking}
      />

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
                blurOnSubmit={false}
                onSubmitEditing={() => {}}
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
