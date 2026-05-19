import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Platform } from 'react-native';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NavigationProvider, useNavigation } from './context/NavigationContext';
import { LanguageProvider } from './context/LanguageContext';

// Screens
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ChatScreen from './screens/ChatScreen';

function AppNavigator() {
  const { currentScreen } = useNavigation();
  const { theme, isDark } = useTheme();

  let CurrentComponent;
  switch (currentScreen) {
    case 'Login':
      CurrentComponent = LoginScreen;
      break;
    case 'Dashboard':
      CurrentComponent = DashboardScreen;
      break;
    case 'Chat':
      CurrentComponent = ChatScreen;
      break;
    default:
      CurrentComponent = LoginScreen;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      <CurrentComponent />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <NavigationProvider>
          <AppNavigator />
        </NavigationProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  }
});
