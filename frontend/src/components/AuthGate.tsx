import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authService, type AuthStatus } from '../services/auth.ts';
import { LockScreen } from './LockScreen.tsx';
import { ServerOfflineScreen } from './ServerOfflineScreen.tsx';
import { SpinnerGap } from '@phosphor-icons/react';

interface AuthContextType {
  authRequired: boolean;
  authenticated: boolean;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  authRequired: false,
  authenticated: true,
  logout: () => {},
  refreshAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const check = async () => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await authService.getStatus();
      setStatus(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cannot connect to backend server';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();

    const handleExpired = () => {
      setStatus((prev) => (prev ? { ...prev, authenticated: false } : null));
    };

    const handleLogout = () => {
      setStatus((prev) => (prev ? { ...prev, authenticated: false } : null));
    };

    window.addEventListener('auth:expired', handleExpired);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:expired', handleExpired);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  const logout = () => {
    authService.logout();
  };

  const handleLoginSuccess = () => {
    setStatus({ authRequired: true, authenticated: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-zinc-50 flex flex-col items-center justify-center text-zinc-500 gap-3">
        <SpinnerGap size={24} className="animate-spin text-blue-600" />
        <span className="text-xs font-mono">Connecting to engine...</span>
      </div>
    );
  }

  // If backend is offline or unreachable, show dedicated ServerOfflineScreen!
  if (serverError) {
    return <ServerOfflineScreen error={serverError} onRetry={check} />;
  }

  if (status?.authRequired && !status.authenticated) {
    return <LockScreen onSuccess={handleLoginSuccess} />;
  }

  return (
    <AuthContext.Provider
      value={{
        authRequired: status?.authRequired ?? false,
        authenticated: status?.authenticated ?? true,
        logout,
        refreshAuth: check,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
