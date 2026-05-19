import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  StyleSheet, Platform, ActivityIndicator, Keyboard, Animated
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Header';
import { Send, MapPin, Star } from 'lucide-react-native';

const BACKEND_URL = 'http://10.0.0.2:8000/api/request';

export default function ChatScreen() {
  const { theme } = useTheme();
  const { params } = useNavigation();
  const { t, isRTL } = useLanguage();
  
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
  const [detectedLocation, setDetectedLocation] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [disputeText, setDisputeText] = useState('');

  const scrollViewRef = useRef();
  // This Animated value represents how far the input bar has been pushed up from the bottom
  const keyboardOffset = useRef(new Animated.Value(0)).current;

  // When the language changes, refresh the initial system message
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'init') {
        return [{ id: 'init', type: 'system', text: t('chatInit'), timestamp: new Date().toISOString() }];
      }
      return prev;
    });
  }, [t]);

  // Listen to keyboard events and animate the input bar up/down
  useEffect(() => {
    const onShow = (e) => {
      // Add a nice, comfortable 16px buffer so the input floats cleanly above the keyboard
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

    // keyboardWillShow fires early on iOS (smoother). keyboardDidShow is more reliable on Android.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages, isLoading]);

  const handleSend = async (customText = null) => {
    const textToSend = customText !== null ? customText : inputText;
    if (!textToSend.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      type: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (customText === null) setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSend })
      });
      const data = await response.json();

      if (data.extracted_meta?.location) {
        setDetectedLocation(`Sector ${data.extracted_meta.location.toUpperCase()}`);
      }

      const sysMsg = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        text: data.response_text || 'Transaction processed.',
        timestamp: new Date().toISOString(),
        bookingStatus: data.bookingStatus,
        workerId: data.workerId
      };
      setMessages(prev => [...prev, sysMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'system',
        text: t('fallbackMsg'),
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFeedback = (workerId = 'UNKNOWN') => {
    const payloadStr = `/dispute [Worker: ${workerId}] [Rating: ${userRating} Stars] - Complaint: ${disputeText}`;
    handleSend(payloadStr);
  };

  const renderMessage = (msg) => {
    const isUser = msg.type === 'user';
    return (
      <View key={msg.id} style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperSystem]}>
        <View style={[
          styles.messageBubble, 
          isUser 
            ? { backgroundColor: theme.messageUser, borderBottomRightRadius: 0 } 
            : { backgroundColor: theme.messageSystem, borderBottomLeftRadius: 0, borderWidth: 1, borderColor: theme.border }
        ]}>
          <Text style={{ color: isUser ? theme.messageUserText : theme.messageSystemText, fontSize: 15, lineHeight: 22, textAlign: isRTL ? 'right' : 'left' }}>
            {msg.text}
          </Text>
        </View>

        {!isUser && msg.bookingStatus === 'booking_completed' && (
          <View style={[styles.feedbackCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.feedbackTitle, { color: theme.text, textAlign: isRTL ? 'right' : 'left' }]}>
              {t('feedbackTitle')}
            </Text>
            <View style={[styles.starsContainer, isRTL && { flexDirection: 'row-reverse' }]}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
                  <Star size={28} color={userRating >= star ? '#eab308' : theme.textSecondary} fill={userRating >= star ? '#eab308' : 'transparent'} />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.feedbackInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }, isRTL && { textAlign: 'right' }]}
              placeholder={t('feedbackPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={disputeText}
              onChangeText={setDisputeText}
              multiline
            />
            <TouchableOpacity style={styles.submitFeedbackBtn} onPress={() => handleSubmitFeedback(msg.workerId || 'UNKNOWN')}>
              <Text style={styles.submitFeedbackText}>{t('submitFeedback')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    // The outer View fills the whole screen
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title={t('serviceAssistant')} showBack={true} />

      {detectedLocation ? (
        <View style={[styles.locationBanner, { backgroundColor: theme.primary + '20' }]}>
          <MapPin color={theme.primary} size={16} />
          <Text style={[styles.locationText, { color: theme.primary }]}>{t('currentLoc')}: {detectedLocation}</Text>
        </View>
      ) : null}

      {/* Messages fill the remaining space */}
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
            <Text style={[styles.loadingText, { color: theme.textSecondary }]}>{t('thinking')}</Text>
          </View>
        )}
      </ScrollView>

      {/*
        The Animated.View shifts the entire input bar up by exactly the keyboard height.
        This is the same technique used by native messaging apps.
      */}
      <Animated.View style={{ marginBottom: keyboardOffset }}>
        <View style={[
          styles.inputContainer,
          { backgroundColor: theme.surface, borderTopColor: theme.border },
          isRTL && { flexDirection: 'row-reverse' }
        ]}>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: theme.background, color: theme.text },
              isRTL && { textAlign: 'right' }
            ]}
            placeholder={t('placeholder')}
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend(null)}
            multiline
            autoFocus={!!params?.initialPrompt}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? theme.primary : theme.textSecondary },
              isRTL ? { marginRight: 12 } : { marginLeft: 12 }
            ]}
            onPress={() => handleSend(null)}
            disabled={!inputText.trim() || isLoading}
          >
            <View style={isRTL ? { transform: [{ rotate: '180deg' }] } : undefined}>
              <Send color="#ffffff" size={20} />
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  chatContainer: {
    flex: 1,
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  messageWrapperUser: {
    alignSelf: 'flex-end',
  },
  messageWrapperSystem: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 14,
    borderRadius: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 0,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 13,
    marginHorizontal: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-end',
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
    fontSize: 15,
    maxHeight: 120,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackCard: {
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    width: '100%',
    minWidth: 250,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  feedbackInput: {
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    marginBottom: 16,
  },
  submitFeedbackBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitFeedbackText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
