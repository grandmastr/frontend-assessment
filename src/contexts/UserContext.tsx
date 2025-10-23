import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface GlobalSettings {
  theme?: string;
  locale?: string;
  currency?: string;
  timezone?: string;
  featureFlags?: Record<string, boolean>;
  userRole?: string;
  permissions?: string[];
}

interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  frequency?: string;
  categories?: string[];
}

interface UserContextType {
  globalSettings: GlobalSettings;
  notificationSettings: NotificationSettings;
  updateGlobalSettings: (settings: GlobalSettings) => void;
  updateNotificationSettings: (settings: NotificationSettings) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    theme: 'light', // TODO: default this to system theme
    locale: 'en-US',
    currency: 'USD',
    timezone: 'UTC',
    featureFlags: { newDashboard: true, advancedFilters: false },
    userRole: 'user',
    permissions: ['read', 'write'],
  });

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      email: true,
      push: false,
      sms: false,
      frequency: 'daily',
      categories: ['transactions', 'alerts'],
    });

  /**
   * Updates the global settings and tracks the activity.
   */
  const updateGlobalSettings = useCallback(
    (settings: Partial<GlobalSettings>) => {
      setGlobalSettings(prev => ({
        ...prev,
        ...settings,
        lastActivity: new Date(),
      }));
    },
    []
  );

  /**
   * Updates the notification settings.
   */
  const updateNotificationSettings = useCallback(
    (settings: Partial<NotificationSettings>) => {
      setNotificationSettings(prev => ({ ...prev, ...settings }));
    },
    []
  );

  // Wrapped up the context value in useMemo to avoid unnecessary re-renders
  const value = useMemo(
    () => ({
      globalSettings,
      notificationSettings,
      updateGlobalSettings,
      updateNotificationSettings,
    }),
    [
      globalSettings,
      notificationSettings,
      updateGlobalSettings,
      updateNotificationSettings,
    ]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
