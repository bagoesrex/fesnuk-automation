import { NavLink } from 'react-router-dom';
import {
  SquaresFour,
  UsersThree,
  Article,
  CalendarCheck,
  Scroll,
  Key,
  Broadcast,
} from '@phosphor-icons/react';
import { BrandLogo } from './BrandLogo.tsx';

const links = [
  { to: '/', label: 'Dashboard', icon: SquaresFour },
  { to: '/groups', label: 'Groups', icon: UsersThree },
  { to: '/posts', label: 'Posts', icon: Article },
  { to: '/schedules', label: 'Schedules', icon: CalendarCheck },
  { to: '/logs', label: 'Logs', icon: Scroll },
  { to: '/session', label: 'Session', icon: Key },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-zinc-200/80 h-screen sticky top-0 flex flex-col justify-between select-none overflow-y-auto">
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
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-[10px] font-semibold text-emerald-700 tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
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

      {/* Engine Status Footer */}
      <div className="p-4 m-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
        <div className="flex items-center gap-2 mb-2">
          <Broadcast size={15} className="text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-700">Automation Engine</span>
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Playwright + stealth worker running. Schedules fire via node-cron.
        </p>
      </div>
    </aside>
  );
}
