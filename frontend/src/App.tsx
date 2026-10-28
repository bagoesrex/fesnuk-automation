import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.tsx';
import { Topbar } from './components/Topbar.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import { AccountProvider } from './context/AccountContext.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Groups from './pages/Groups.tsx';
import Posts from './pages/Posts.tsx';
import Schedules from './pages/Schedules.tsx';
import Logs from './pages/Logs.tsx';
import Session from './pages/Session.tsx';

export default function App() {
  return (
    <AuthGate>
      <AccountProvider>
        <BrowserRouter>
          <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-zinc-50">
            <Sidebar />
            <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
              <Topbar />
              <main className="flex-1 min-w-0 overflow-y-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/groups" element={<Groups />} />
                  <Route path="/posts" element={<Posts />} />
                  <Route path="/schedules" element={<Schedules />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/session" element={<Session />} />
                </Routes>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </AccountProvider>
    </AuthGate>
  );
}
