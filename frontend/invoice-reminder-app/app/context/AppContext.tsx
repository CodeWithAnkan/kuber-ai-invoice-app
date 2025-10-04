import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of our context data
interface AppContextType {
  refreshId: number;
  triggerRefresh: () => void;
}

// Create the context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Create a provider component that will wrap our app
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [refreshId, setRefreshId] = useState(0);

  // This function will be called by our notification listener
  const triggerRefresh = () => {
    console.log("Triggering global UI refresh...");
    setRefreshId(prevId => prevId + 1); // Incrementing the ID acts as a refresh signal
  };

  return (
    <AppContext.Provider value={{ refreshId, triggerRefresh }}>
      {children}
    </AppContext.Provider>
  );
};

// Create a custom hook to easily use the context in any component
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
