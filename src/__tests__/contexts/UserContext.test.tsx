import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useUserContext, UserProvider } from '../../contexts/UserContext';

describe('UserContext', () => {
  it('context provides correct default values', () => {
    const { result } = renderHook(() => useUserContext(), {
      wrapper: ({ children }) => <UserProvider>{children}</UserProvider>,
    });

    expect(result.current.globalSettings.theme).toBe('light');
    expect(result.current.notificationSettings.email).toBe(true);
  });

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

  it('activity tracking behavior', () => {
    const { result } = renderHook(() => useUserContext(), {
      wrapper: ({ children }) => <UserProvider>{children}</UserProvider>,
    });

    act(() => {
      result.current.updateGlobalSettings({ locale: 'fr-FR' });
    });

    expect(result.current.globalSettings).toHaveProperty('lastActivity');
    const { lastActivity } = result.current.globalSettings as Record<string, unknown>;
    expect(lastActivity).toBeInstanceOf(Date);
  });

  it('error handling for missing context', () => {
    expect(() => renderHook(() => useUserContext())).toThrow(
      'useUserContext must be used within a UserProvider'
    );
  });
});
