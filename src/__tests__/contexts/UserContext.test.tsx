/*
* unit test for the UserContext testing:
* - default context values initialization
* - settings update functions (global and notifications)
* - activity tracking on user actions
* - error handling when context is used outside provider
**/
import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UserProvider, useUserContext } from '../../contexts/UserContext';

describe('UserContext', () => {
  // verifies that the context initializes with correct default values for theme and notifications
  it('context provides correct default values', () => {
    const { result } = renderHook(() => useUserContext(), {
      wrapper: ({ children }) => <UserProvider>{children}</UserProvider>,
    });

    expect(result.current.globalSettings.theme).toBe('light');
    expect(result.current.notificationSettings.email).toBe(true);
  });

  // verifies that update functions correctly modify global settings and notification settings
  it('settings update functions', () => {
    const { result } = renderHook(() => useUserContext(), {
      wrapper: ({ children }) => <UserProvider>{children}</UserProvider>,
    });

    act(() => {
      result.current.updateGlobalSettings({ theme: 'dark' });
      result.current.updateNotificationSettings({ sms: true });
    });

    expect(result.current.globalSettings.theme).toBe('dark');
    expect(result.current.notificationSettings.sms).toBe(true);
  });

  // verifies that user actions are tracked and lastActivity timestamp is updated
  it('activity tracking behavior', () => {
    const { result } = renderHook(() => useUserContext(), {
      wrapper: ({ children }) => <UserProvider>{children}</UserProvider>,
    });

    act(() => {
      result.current.updateGlobalSettings({ locale: 'fr-FR' });
    });

    expect(result.current.globalSettings).toHaveProperty('lastActivity');
    const { lastActivity } = result.current.globalSettings as Record<
      string,
      unknown
    >;
    expect(lastActivity).toBeInstanceOf(Date);
  });

  // verifies that using the context outside of UserProvider throws an error
  it('error handling for missing context', () => {
    expect(() => renderHook(() => useUserContext())).toThrow(
      'useUserContext must be used within a UserProvider'
    );
  });
});
