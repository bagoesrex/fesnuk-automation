import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from '../context/AccountContext.tsx';
import { UserCircle, CaretDown, Check, Plus, Globe, WarningCircle } from '@phosphor-icons/react';

export function Topbar() {
  const { accounts, selectedAccount, selectedAccountId, setSelectedAccountId, loading } = useAccount();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-6 py-2.5">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Active Context Indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider hidden sm:inline-block">
            Active Account:
          </span>

          {loading ? (
            <div className="h-8 w-36 bg-zinc-100 animate-pulse rounded-xl" />
          ) : accounts.length === 0 ? (
            <Link
              to="/session"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-100 transition-colors"
            >
              <WarningCircle size={15} weight="fill" className="text-amber-500" />
              <span>No Accounts Connected — Add Account</span>
            </Link>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 text-xs font-semibold text-zinc-900 transition shadow-xs cursor-pointer max-w-[240px] sm:max-w-xs"
              >
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <UserCircle size={16} weight="fill" />
                </div>
                <span className="truncate">{selectedAccount?.name ?? 'Select Account'}</span>

                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    selectedAccount?.isActive ? 'bg-emerald-500' : 'bg-zinc-300'
                  }`}
                  title={selectedAccount?.isActive ? 'Account Active' : 'Account Inactive'}
                />

                {selectedAccount?.proxyUrl && (
                  <span
                    className="hidden md:inline-flex items-center gap-0.5 text-[10px] text-zinc-500 font-mono bg-white px-1.5 py-0.5 rounded border border-zinc-200"
                    title={`Proxy: ${selectedAccount.proxyUrl}`}
                  >
                    <Globe size={11} className="text-zinc-400" />
                    Proxy
                  </span>
                )}

                <CaretDown size={12} weight="bold" className="text-zinc-400 shrink-0 ml-1" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl border border-zinc-200/90 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 border-b border-zinc-100 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Switch Facebook Account
                  </div>

                  <div className="max-h-60 overflow-y-auto py-1">
                    {accounts.map((acc) => {
                      const isSelected = acc.id === selectedAccountId;
                      return (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(acc.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/70 text-blue-700 font-semibold'
                              : 'text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                acc.isActive ? 'bg-emerald-500' : 'bg-zinc-300'
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{acc.name}</p>
                              {acc.proxyUrl && (
                                <p className="text-[10px] text-zinc-400 font-mono truncate">
                                  {acc.proxyUrl}
                                </p>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check size={14} weight="bold" className="text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-zinc-100 pt-1 px-1.5">
                    <Link
                      to="/session"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      <Plus size={14} weight="bold" />
                      <span>Manage / Add Account</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick Action / Badge */}
        <div className="flex items-center gap-2">
          {selectedAccount && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-[10px] font-semibold text-zinc-600 border border-zinc-200/60">
              Isolated Workspace
            </span>
          )}
          <Link
            to="/session"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200/60 transition cursor-pointer"
          >
            <Plus size={13} weight="bold" />
            <span className="hidden sm:inline">Add Account</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
