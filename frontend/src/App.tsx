import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.tsx';
import { AuthGate } from './components/AuthGate.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Groups from './pages/Groups.tsx';
import Posts from './pages/Posts.tsx';
import Schedules from './pages/Schedules.tsx';
import Logs from './pages/Logs.tsx';
import Session from './pages/Session.tsx';

export default function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden bg-zinc-50">
          <Sidebar />
          <main className="flex-1 h-screen overflow-y-auto">
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
      </BrowserRouter>
    </AuthGate>
  );
}
