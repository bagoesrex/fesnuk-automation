import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  SquaresFour,
  UsersThree,
  Article,
  CalendarCheck,
  Scroll,
  Key,
  Broadcast,
  SignOut,
  List,
  X,
} from '@phosphor-icons/react';
import { BrandLogo } from './BrandLogo.tsx';
import { useAuth } from './AuthGate.tsx';

const links = [
  { to: '/', label: 'Dashboard', icon: SquaresFour },
  { to: '/groups', label: 'Groups', icon: UsersThree },
  { to: '/posts', label: 'Posts', icon: Article },
  { to: '/schedules', label: 'Schedules', icon: CalendarCheck },
  { to: '/logs', label: 'Logs', icon: Scroll },
  { to: '/session', label: 'Session', icon: Key },
];

export function Sidebar() {
  const { authRequired, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const navContent = (
    <>
      <div>
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size={30} />
            <div>
              <p className="text-sm font-bold text-zinc-950 tracking-tight leading-none">
                AutoPoster
              </p>
              <p className="text-[10px] font-medium text-zinc-400 mt-1 uppercase tracking-wider">
                Facebook Console
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-[10px] font-semibold text-emerald-700 tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Close navigation"
            >
              <X size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Workspace
          </div>
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50/80 text-blue-700 shadow-xs border border-blue-100/80 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/70 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={19}
                    weight={isActive ? 'fill' : 'regular'}
                    className={`transition-colors ${
                      isActive ? 'text-blue-600' : 'text-zinc-400 group-hover:text-zinc-700'
                    }`}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Engine Status Footer & Logout */}
      <div className="p-3 m-3 space-y-2">
        <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
          <div className="flex items-center gap-2 mb-1.5">
            <Broadcast size={15} className="text-zinc-400" />
            <span className="text-xs font-semibold text-zinc-700">Automation Engine</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Playwright + stealth worker running. Schedules fire via node-cron.
          </p>
        </div>

        {authRequired && (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-zinc-600 hover:text-red-600 hover:bg-red-50 border border-zinc-200/60 hover:border-red-200 transition cursor-pointer"
          >
            <SignOut size={14} />
            <span>Lock Dashboard</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Sticky Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200/80 sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={26} />
          <div>
            <span className="text-sm font-bold text-zinc-950 tracking-tight block leading-none">
              AutoPoster
            </span>
            <span className="text-[9px] font-medium text-zinc-400 uppercase tracking-wider">
              Facebook Console
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-[10px] font-semibold text-emerald-700 tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 border border-zinc-200/60 transition cursor-pointer"
            aria-label="Open navigation menu"
          >
            <List size={20} weight="bold" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col justify-between select-none z-10 overflow-y-auto animate-in slide-in-from-left duration-200">
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 bg-white border-r border-zinc-200/80 h-screen sticky top-0 flex-col justify-between select-none overflow-y-auto">
        {navContent}
      </aside>
    </>
  );
}
