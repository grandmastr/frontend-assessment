import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

// defines global application settings including theme, locale, currency, and user permissions
// stores feature flags for enabling/disabling experimental features
// tracks user role and permissions for access control
interface GlobalSettings {
  theme?: string;
  locale?: string;
  currency?: string;
  timezone?: string;
  featureFlags?: Record<string, boolean>;
  userRole?: string;
  permissions?: string[];
}

// defines user notification preferences across multiple channels
// controls notification frequency and which categories trigger alerts
interface NotificationSettings {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  frequency?: string;
  categories?: string[];
}

// context type providing access to settings and update methods
// enables any component to read or modify user preferences
interface UserContextType {
  globalSettings: GlobalSettings;
  notificationSettings: NotificationSettings;
  updateGlobalSettings: (settings: GlobalSettings) => void;
  updateNotificationSettings: (settings: NotificationSettings) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// provider component that wraps the application to supply user context
// initializes default settings and provides methods to update them
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // initializes global settings with sensible defaults
  // TODO: should detect and use system theme preference instead of hardcoding 'light'
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    theme: 'light',
    locale: 'en-US',
    currency: 'USD',
    timezone: 'UTC',
    featureFlags: { newDashboard: true, advancedFilters: false },
    userRole: 'user',
    permissions: ['read', 'write'],
  });

  // initializes notification settings with conservative defaults
  // enables email notifications by default, disables push and sms
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings>({
      email: true,
      push: false,
      sms: false,
      frequency: 'daily',
      categories: ['transactions', 'alerts'],
    });

  // updates global settings while preserving existing values
  // tracks lastActivity timestamp for session management and analytics
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

  // updates notification settings while preserving existing values
  // allows partial updates without overwriting unspecified fields
  const updateNotificationSettings = useCallback(
    (settings: Partial<NotificationSettings>) => {
      setNotificationSettings(prev => ({ ...prev, ...settings }));
    },
    []
  );

  // memoizes context value to prevent unnecessary re-renders of consuming components
  // only updates when settings or update functions change
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

// hook to access user context from any component
// throws an error if used outside of UserProvider to catch configuration mistakes early
export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
