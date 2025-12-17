// NotificationContext.jsx
import { createContext, useContext, useState } from "react";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerNotificationRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <NotificationContext.Provider
      value={{ refreshKey, triggerNotificationRefresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationRefresh = () =>
  useContext(NotificationContext);

