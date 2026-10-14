import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/groups', label: 'Groups' },
  { to: '/posts', label: 'Posts' },
  { to: '/schedules', label: 'Schedules' },
  { to: '/logs', label: 'Logs' },
  { to: '/session', label: 'Session' },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-gray-700">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">FB Auto-Poster</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
