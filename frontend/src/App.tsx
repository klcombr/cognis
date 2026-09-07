import { Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Landing from './pages/Landing'
import Start from './pages/Start'
import Home from './pages/Home'
import TopicView from './pages/TopicView'
import Session from './pages/Session'
import Knowledge from './pages/Knowledge'
import History from './pages/History'
import Settings from './pages/Settings'
import { api } from './lib/api'
import { I18nProvider } from './lib/i18n'

function App() {
  const { pathname } = useLocation();
  const isPublicRoute = pathname === '/';
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem('cognis_user_id');
    return stored ? parseInt(stored) : null;
  });

  useEffect(() => {
    if (isPublicRoute) return;
    if (!userId) {
      api.createUser().then((user) => {
        localStorage.setItem('cognis_user_id', String(user.id));
        setUserId(user.id);
      });
    }
  }, [isPublicRoute, userId]);

  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-text-muted">
        loading...
      </div>
    );
  }

  return (
    <I18nProvider>
      <Routes>
        <Route path="/start" element={<Start />} />
        <Route path="/home" element={<Home userId={userId} />} />
        <Route path="/topic/:topicId" element={<TopicView userId={userId} />} />
        <Route path="/session/:sessionId" element={<Session />} />
        <Route path="/knowledge" element={<Knowledge userId={userId} />} />
        <Route path="/history" element={<History userId={userId} />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </I18nProvider>
  );
}

export default App