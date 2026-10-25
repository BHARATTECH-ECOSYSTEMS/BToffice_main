/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from "react";
import { getBackendUrl } from "../utils/backendUrl";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // courses are free and lectures are YouTube links (owner's 2A 4A): no currency or upload settings
  const value = { backendUrl: getBackendUrl() };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppConfig = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppConfig must be used within AppProvider");
  }
  return context;
};
