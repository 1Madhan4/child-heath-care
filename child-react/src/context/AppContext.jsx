import { createContext, useContext, useState, useCallback } from 'react';
import { Storage } from '../utils/storage';
import Toast from '../components/Toast';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [view, setView] = useState(null); // 'auth' | 'dashboard' | 'checkin' | 'observation'
    const [toast, setToast] = useState(null); // { message, type }
    const [session, setSession] = useState(() => Storage.getSession());

    const navigate = useCallback((v) => setView(v), []);

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type });
    }, []);

    const signOut = useCallback(() => {
        Storage.clearSession();
        setSession(null);
        showToast('Signed out successfully', 'success');
        setView('auth');
    }, [showToast]);

    const deleteAccount = useCallback(async () => {
        const s = Storage.getSession();
        if (!s) return;
        const confirmed = window.confirm(
            `⚠️ Are you sure you want to delete your account (${s.email})?\n\nThis will permanently remove:\n• Your profile\n• All check-ins & observations linked to your email\n\nThis action cannot be undone.`
        );
        if (!confirmed) return;
        try {
            await Storage.deleteCheckinsForUser(s.email);
            await Storage.deleteObservationsForUser(s.email);
            await Storage.deleteUserFromDB(s.email);
            Storage.clearSession();
            setSession(null);
            showToast('Account deleted successfully', 'success');
            setView('auth');
        } catch {
            showToast('Error deleting account. Please try again.', 'error');
        }
    }, [showToast]);

    const login = useCallback((sessionData) => {
        Storage.setSession(sessionData);
        setSession(sessionData);
    }, []);

    return (
        <AppContext.Provider value={{ view, navigate, showToast, signOut, deleteAccount, session, login }}>
            {children}
            {toast && (
                <Toast
                    key={toast.message + toast.type + Date.now()}
                    message={toast.message}
                    type={toast.type}
                    onDone={() => setToast(null)}
                />
            )}
        </AppContext.Provider>
    );
}

export function useApp() {
    return useContext(AppContext);
}
