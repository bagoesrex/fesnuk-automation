import { api, setAuthToken, clearAuthToken } from './api.ts';

export interface AuthStatus {
  authRequired: boolean;
  authenticated: boolean;
}

export interface LoginResult {
  token: string;
  expiresIn: number;
}

export const authService = {
  getStatus: () => api.get<AuthStatus>('/auth/status'),
  login: async (password: string): Promise<LoginResult> => {
    const res = await api.post<LoginResult>('/auth/login', { password });
    if (res.token) {
      setAuthToken(res.token);
    }
    return res;
  },
  logout: () => {
    clearAuthToken();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  },
};
