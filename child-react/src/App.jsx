import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Storage } from './utils/storage';
import BgBlobs from './components/BgBlobs';
import Spinner from './components/Spinner';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import CheckinPage from './pages/CheckinPage';
import ObservationPage from './pages/ObservationPage';

function AppRouter() {
  const { view, navigate, session } = useApp();

  // Boot: check session on mount and choose initial view
  useEffect(() => {
    const s = Storage.getSession();
    if (s) {
      navigate('dashboard');
    } else {
      navigate('auth');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Guard: if no session and trying to access protected view, redirect to auth
  useEffect(() => {
    if (view && view !== 'auth' && !session) {
      navigate('auth');
    }
  }, [view, session, navigate]);

  if (!view) return <Spinner />;

  switch (view) {
    case 'auth':
      return <AuthPage />;
    case 'dashboard':
      return <DashboardPage />;
    case 'checkin':
      return <CheckinPage />;
    case 'observation':
      return <ObservationPage />;
    default:
      return <AuthPage />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <BgBlobs />
      <AppRouter />
    </AppProvider>
  );
}
