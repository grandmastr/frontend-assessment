import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface GlobalSettings {
  theme: string;
  locale: string;
  currency: string;
  timezone: string;
  featureFlags: Record<string, boolean>;
  userRole: string;
  permissions: string[];
  lastActivity: Date;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  frequency: string;
  categories: string[];
}

interface UserContextType {
  globalSettings: GlobalSettings;
  notificationSettings: NotificationSettings;
  updateGlobalSettings: (settings: GlobalSettings) => void;
  updateNotificationSettings: (settings: NotificationSettings) => void;
  trackActivity: (activity: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    theme: 'light',
    locale: 'en-US',
    currency: 'USD',
    timezone: 'UTC',
    featureFlags: { newDashboard: true, advancedFilters: false },
    userRole: 'user',
    permissions: ['read', 'write'],
    lastActivity: new Date(),
  });

  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      email: true,
      push: false,
      sms: false,
      frequency: 'daily',
      categories: ['transactions', 'alerts'],
    });

  const updateGlobalSettings = useCallback((settings: GlobalSettings) => {
    setGlobalSettings(prev => ({
      ...prev,
      ...settings,
      lastActivity: new Date(),
    }));
  }, []);

  const updateNotificationSettings = useCallback(
    (settings: NotificationSettings) => {
      setNotificationSettings(prev => ({ ...prev, ...settings }));
    },
    []
  );

  // TODO: figure what activity is and for
  const trackActivity = useCallback((activity: string) => {
    setGlobalSettings(prev => ({
      ...prev,
      lastActivity: new Date(),
    }));
  }, []);

  const value = useMemo(
    () => ({
      globalSettings,
      notificationSettings,
      updateGlobalSettings,
      updateNotificationSettings,
      trackActivity,
    }),
    [
      globalSettings,
      notificationSettings,
      trackActivity,
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
