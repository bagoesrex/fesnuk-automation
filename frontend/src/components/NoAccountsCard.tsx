import { Link } from 'react-router-dom';
import { UserPlus, ArrowRight } from '@phosphor-icons/react';

export function NoAccountsCard() {
  return (
    <div className="p-6 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0 mt-0.5">
          <UserPlus size={22} weight="bold" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-950">No Facebook Account Connected</h3>
          <p className="text-xs text-zinc-600 mt-0.5">
            Connect your first Facebook account to begin managing groups, posts, and automated schedules.
          </p>
        </div>
      </div>
      <Link
        to="/session"
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-sm shrink-0"
      >
        Connect Account
        <ArrowRight size={14} weight="bold" />
      </Link>
    </div>
  );
}
