import React, { createContext, useState, useContext } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    selectLocation: "Select Location",
    change: "Change",
    confirmBookingTitle: "Confirm Booking",
    confirmBookingMessage: "Do you want to proceed with the booking?",
    yes: "Yes",
    no: "No",
    serviceNotAvailable: "Sorry, our services are currently not available in {{loc}}. Please select another location.",
    // existing keys...
    // Header
    dashboard: "Dashboard",
    serviceAssistant: "Service Assistant",
    // Add other keys unchanged
    
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
    fallbackMsg: "We are connecting you securely. Please hold on a moment...",
    pollConnectionError: "We're experiencing technical difficulties connecting to the service. Please check your internet connection.",
  },
  ur: {
    // Header
    dashboard: "ڈیش بورڈ",
    serviceAssistant: "سروس اسسٹنٹ",
    
    // Header
    // Added UI strings
    selectLocation: "موقع منتخب کریں",
    change: "تبدیل کریں",
    confirmBookingTitle: "بکنگ کی تصدیق کریں",
    confirmBookingMessage: "کیا آپ بکنگ کے ساتھ آگے بڑھنا چاہتے ہیں؟",
    yes: "جی ہاں",
    no: "نہیں",
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
    fallbackMsg: "سسٹم نوٹ: متبادل چینل کے ذریعے رابطہ قائم کیا جا رہا ہے۔ براہ کرم انتظار کریں...",
    pollConnectionError: "سرور تک رسائی ممکن نہیں۔ اپنا کنکشن اور بیک اینڈ چیک کریں۔",
    serviceNotAvailable: "معذرت، ہماری خدمات فی الحال {{loc}} میں دستیاب نہیں ہیں۔ براہ کرم کوئی اور مقام منتخب کریں۔",
    }
};

export const LanguageProvider = ({ children }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locale, setLocale] = useState('en'); // 'en' | 'ur'

  const t = (key, params = {}) => {
    let str = translations[locale][key] || key;
    Object.keys(params).forEach(p => {
      str = str.replace(`{{${p}}}`, params[p]);
    });
    return str;
  };

  const toggleLanguage = () => {
    setLocale(prev => prev === 'en' ? 'ur' : 'en');
  };

  const isRTL = locale === 'ur';

  return (
    <LanguageContext.Provider value={{ locale, t, toggleLanguage, setLocale, isRTL, selectedLocation, setSelectedLocation }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
