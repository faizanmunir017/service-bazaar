import React, { createContext, useState, useContext } from 'react';

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState('Login'); // 'Login', 'Dashboard', 'Chat', 'BookingConfirmation', 'BookingDetail', 'MyBookings', 'OrchestratorTrace'
  const [params, setParams] = useState(null);

  const navigate = (screenName, screenParams = null) => {
    setParams(screenParams);
    setCurrentScreen(screenName);
  };

  return (
    <NavigationContext.Provider value={{ currentScreen, params, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => useContext(NavigationContext);
