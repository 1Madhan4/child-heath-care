import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '../utils/firebase';
import { Storage } from '../utils/storage';
import Toast from '../components/Toast';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [view, setView] = useState(null); // 'auth' | 'dashboard' | 'checkin' | 'observation'
    const [toast, setToast] = useState(null); // { message, type }
    const [session, setSession] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    const navigate = useCallback((v) => setView(v), []);

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type });
    }, []);

    // Listen for Firebase Auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // If user is logged in, fetch their profile from Realtime DB
                try {
                    const profile = await Storage.getUserProfile(user.uid);
                    const sessionData = {
                        uid: user.uid,
                        email: user.email,
                        ...profile
                    };
                    Storage.setSession(sessionData);
                    setSession(sessionData);
                } catch (err) {
                    console.error("Auth error:", err);
                    setSession(null);
                }
            } else {
                Storage.clearSession();
                setSession(null);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signOut = useCallback(async () => {
        try {
            await firebaseSignOut(auth);
            Storage.clearSession();
            setSession(null);
            showToast('Signed out successfully', 'success');
            setView('auth');
        } catch (err) {
            showToast('Error signing out', 'error');
        }
    }, [showToast]);

    const deleteAccount = useCallback(async () => {
        const s = session;
        if (!s || !auth.currentUser) return;

        const confirmed = window.confirm(
            `⚠️ Are you sure you want to delete your account (${s.email})?\n\nThis will permanently remove:\n• Your profile\n• All check-ins & observations linked to your email\n\nThis action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            const email = auth.currentUser.email;
            const uid = auth.currentUser.uid;

            await Storage.deleteCheckinsForUser(email);
            await Storage.deleteObservationsForUser(email);
            await Storage.deleteUserFromDB(uid);
            await auth.currentUser.delete();

            Storage.clearSession();
            setSession(null);
            showToast('Account deleted successfully', 'success');
            setView('auth');
        } catch (err) {
            console.error(err);
            showToast('Please re-login to delete your account (Security requirement)', 'error');
        }
    }, [showToast, session]);

    const login = useCallback((sessionData) => {
        // This is now mostly handled by onAuthStateChanged, 
        // but we can keep it for immediate UI transitions if needed.
        setSession(sessionData);
    }, []);

    return (
        <AppContext.Provider value={{
            view,
            navigate,
            showToast,
            signOut,
            deleteAccount,
            session,
            login,
            authLoading
        }}>
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
