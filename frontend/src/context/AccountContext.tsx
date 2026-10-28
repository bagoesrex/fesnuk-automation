import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { accountsService } from '../services/accounts.ts';
import type { Account } from '../types/index.ts';

const STORAGE_KEY = 'fesnuk_selected_account_id';

interface AccountContextType {
  accounts: Account[];
  selectedAccount: Account | null;
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string) => void;
  refreshAccounts: () => Promise<void>;
  loading: boolean;
}

const AccountContext = createContext<AccountContextType>({
  accounts: [],
  selectedAccount: null,
  selectedAccountId: null,
  setSelectedAccountId: () => {},
  refreshAccounts: async () => {},
  loading: true,
});

export function useAccount() {
  return useContext(AccountContext);
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const refreshAccounts = async () => {
    try {
      const data = await accountsService.list();
      setAccounts(data);

      setSelectedAccountIdState((current) => {
        // If current selected ID still valid, keep it
        if (current && data.some((a) => a.id === current)) {
          return current;
        }
        // Otherwise pick first active account or first available
        const fallback = data.find((a) => a.isActive)?.id ?? data[0]?.id ?? null;
        if (fallback) {
          try {
            localStorage.setItem(STORAGE_KEY, fallback);
          } catch {
            // ignore
          }
        } else {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore
          }
        }
        return fallback;
      });
    } catch (err) {
      console.error('Failed to load accounts for context:', err);
    } finally {
      setLoading(false);
    }
  };

  const setSelectedAccountId = (id: string) => {
    setSelectedAccountIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void refreshAccounts();
  }, []);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccount,
        selectedAccountId,
        setSelectedAccountId,
        refreshAccounts,
        loading,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}
