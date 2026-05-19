import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    // Header
    dashboard: "Dashboard",
    serviceAssistant: "Service Assistant",
    
    // Login
    appName: "ServiceBazaar",
    loginTitle: "Log in to your account",
    username: "Username",
    password: "Password",
    loginBtn: "Login",
    
    // Dashboard
    welcome: "Welcome back, Admin",
    whatService: "Tell us what service do you need?",
    customService: "Other (Describe manually in chat)",
    plumbing: "Plumbing",
    electrical: "Electrical",
    tutoring: "Tutoring",
    beautician: "Beautician",
    mechanic: "Mechanic",
    moving: "Moving",
    
    // Chat
    chatInit: "Hi there! I am your AI service orchestrator. Tell me what you need help with.",
    placeholder: "Type your service request...",
    thinking: "Thinking...",
    currentLoc: "Current Location",
    feedbackTitle: "Service Lifecycle Feedback",
    feedbackPlaceholder: "File quality complaints, damages, or pricing disputes here...",
    submitFeedback: "Submit Lifecycle Feedback",
    fallbackMsg: "System Note: Connecting via fallback channel. Please hold..."
  },
  ur: {
    // Header
    dashboard: "ڈیش بورڈ",
    serviceAssistant: "سروس اسسٹنٹ",
    
    // Login
    appName: "سروس بازار",
    loginTitle: "اپنے اکاؤنٹ میں لاگ ان کریں",
    username: "صارف نام",
    password: "پاس ورڈ",
    loginBtn: "لاگ ان کریں",
    
    // Dashboard
    welcome: "خوش آمدید، ایڈمن",
    whatService: "ہمیں بتائیں کہ آپ کو کس سروس کی ضرورت ہے؟",
    customService: "دیگر (چیٹ میں خود لکھیں)",
    plumbing: "پلمبنگ",
    electrical: "بجلی کا کام",
    tutoring: "ٹیوشن",
    beautician: "بیوٹیشن",
    mechanic: "میکینک",
    moving: "سامان منتقل کرنا",
    
    // Chat
    chatInit: "سلام! میں آپ کا اے آئی سروس آرکیسٹریٹر ہوں۔ بتائیں میں آپ کی کیا مدد کر سکتا ہوں۔",
    placeholder: "اپنی سروس کی درخواست یہاں لکھیں...",
    thinking: "سوچ رہا ہے...",
    currentLoc: "موجودہ مقام",
    feedbackTitle: "سروس لائف سائیکل فیڈ بیک",
    feedbackPlaceholder: "کوالٹی کی شکایات، نقصانات، یا قیمت کے تنازعات یہاں درج کریں...",
    submitFeedback: "فیڈ بیک جمع کروائیں",
    fallbackMsg: "سسٹم نوٹ: متبادل چینل کے ذریعے رابطہ قائم کیا جا رہا ہے۔ براہ کرم انتظار کریں..."
  }
};

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en'); // 'en' | 'ur'

  const t = (key) => {
    return translations[locale][key] || key;
  };

  const toggleLanguage = () => {
    setLocale(prev => prev === 'en' ? 'ur' : 'en');
  };

  const isRTL = locale === 'ur';

  return (
    <LanguageContext.Provider value={{ locale, t, toggleLanguage, setLocale, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
