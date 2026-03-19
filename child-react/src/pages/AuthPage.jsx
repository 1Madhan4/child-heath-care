import { useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink
} from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';
import { useApp } from '../context/AppContext';
import { Storage } from '../utils/storage';
import {
    isLockedOut,
    getRemainingLockout,
    incrementFailedAttempt,
    clearFailedAttempts,
    getRemainingAttempts,
} from '../utils/auth';

export default function AuthPage() {
    const { navigate, showToast, login } = useApp();
    const [tab, setTab] = useState('signin'); // 'signin' | 'signup' | 'passwordless' | 'finish-profile'
    const [loading, setLoading] = useState(false);

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('');

    // For "finish-profile" step
    const [pendingUser, setPendingUser] = useState(null);

    const isSignup = tab === 'signup';
    const isPasswordless = tab === 'passwordless';
    const isFinishProfile = tab === 'finish-profile';

    // Handle Email Link Sign-in Redirect
    useEffect(() => {
        if (isSignInWithEmailLink(auth, window.location.href)) {
            let emailForLink = window.localStorage.getItem('emailForSignIn');
            if (!emailForLink) {
                emailForLink = window.prompt('Please provide your email for confirmation');
            }
            if (emailForLink) {
                setLoading(true);
                signInWithEmailLink(auth, emailForLink, window.location.href)
                    .then(async (result) => {
                        window.localStorage.removeItem('emailForSignIn');
                        await handlePostAuth(result.user);
                    })
                    .catch((err) => {
                        console.error(err);
                        showToast('Error signing in with link', 'error');
                        setLoading(false);
                    });
            }
        }
    }, [showToast]);

    const handlePostAuth = async (user) => {
        try {
            const profile = await Storage.getUserProfile(user.uid);
            if (!profile) {
                // New user - need to collect role/name
                setPendingUser(user);
                setName(user.displayName || '');
                setTab('finish-profile');
                setLoading(false);
            } else {
                // Existing user
                const sessionData = { uid: user.uid, email: user.email, ...profile };
                login(sessionData);
                showToast(`Welcome back, ${profile.name}! 👋`, 'success');
                setTimeout(() => navigate('dashboard'), 500);
            }
        } catch (err) {
            showToast('Error fetching user profile', 'error');
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await handlePostAuth(result.user);
        } catch (err) {
            console.error(err);
            if (err.code !== 'auth/popup-closed-by-user') {
                showToast('Google Sign-In failed', 'error');
            }
            setLoading(false);
        }
    };

    const handlePasswordlessSignIn = async (e) => {
        e.preventDefault();
        if (!email) { showToast('Please enter your email', 'error'); return; }

        setLoading(true);
        const actionCodeSettings = {
            url: window.location.href, // Return back to this page
            handleCodeInApp: true,
        };

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            showToast('Magic link sent! Please check your email.', 'success');
            setLoading(false);
        } catch (err) {
            console.error(err);
            showToast('Error sending magic link', 'error');
            setLoading(false);
        }
    };

    const handleFinishProfile = async (e) => {
        e.preventDefault();
        if (!name.trim() || !role) {
            showToast('Please provide your name and role', 'error');
            return;
        }

        setLoading(true);
        try {
            const profile = {
                name: name.trim(),
                role: role,
                email: pendingUser.email,
                createdAt: new Date().toISOString()
            };
            await Storage.saveUserProfile(pendingUser.uid, profile);
            login({ uid: pendingUser.uid, email: pendingUser.email, ...profile });
            showToast('Profile completed! Welcome to MindBloom 🌱', 'success');
            setTimeout(() => navigate('dashboard'), 500);
        } catch (err) {
            showToast('Error saving profile', 'error');
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isLockedOut()) {
            showToast(`Too many failed attempts. Try again in ${getRemainingLockout()}s.`, 'error');
            return;
        }

        if (!email || !password) {
            showToast('Please enter your email and password', 'error');
            return;
        }

        setLoading(true);
        try {
            if (isSignup) {
                if (password !== confirmPassword) {
                    showToast('Passwords do not match', 'error');
                    setLoading(false);
                    return;
                }
                if (password.length < 8) {
                    showToast('Password must be at least 8 characters', 'error');
                    setLoading(false);
                    return;
                }
                const result = await createUserWithEmailAndPassword(auth, email, password);
                await handlePostAuth(result.user);
            } else {
                try {
                    const result = await signInWithEmailAndPassword(auth, email, password);
                    clearFailedAttempts();
                    await handlePostAuth(result.user);
                } catch (err) {
                    incrementFailedAttempt();
                    if (isLockedOut()) {
                        showToast(`Too many failed attempts. Locked for ${getRemainingLockout()}s.`, 'error');
                    } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                        showToast(`Invalid email or password. ${getRemainingAttempts()} attempt(s) remaining.`, 'error');
                    } else {
                        showToast('Sign-In failed. Please check your credentials.', 'error');
                    }
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                showToast('An account with this email already exists', 'error');
            } else {
                showToast('Something went wrong. Please try again.', 'error');
            }
            setLoading(false);
        }
    };

    if (isFinishProfile) {
        return (
            <div className="auth-container view-enter">
                <div className="auth-card glass-card">
                    <div className="auth-logo">
                        <span className="logo-icon">📝</span>
                        <h1>Complete Profile</h1>
                        <p>Tell us a bit about yourself</p>
                    </div>
                    <form onSubmit={handleFinishProfile}>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" type="text" placeholder="John Doe"
                                value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">I am a...</label>
                            <select className="form-input" required value={role} onChange={e => setRole(e.target.value)}
                                style={{ appearance: 'auto', backgroundColor: 'white', color: 'black' }}>
                                <option value="" disabled>Select your role...</option>
                                <option value="parent">Parent</option>
                                <option value="teacher">Teacher</option>
                                <option value="counselor">Counselor</option>
                            </select>
                        </div>
                        <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
                            {loading ? 'Saving...' : 'Finish Setup'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container view-enter">
            <div className="auth-card glass-card">
                <div className="auth-logo">
                    <span className="logo-icon">🌱</span>
                    <h1>MindBloom</h1>
                    <p>Child Emotional Health Tracker</p>
                </div>

                <div className="auth-tabs">
                    <button className={`auth-tab ${tab === 'signin' ? 'active' : ''}`} onClick={() => setTab('signin')}>Email</button>
                    <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Join</button>
                    <button className={`auth-tab ${tab === 'passwordless' ? 'active' : ''}`} onClick={() => setTab('passwordless')}>Magic Link</button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)', fontSize: 'var(--font-sm)' }}>
                    <span className="auth-hint">
                        {isSignup ? 'Create your MindBloom account' : isPasswordless ? 'Sign in without a password' : 'Sign in with email'}
                    </span>
                </div>

                {isPasswordless ? (
                    <form onSubmit={handlePasswordlessSignIn}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input className="form-input" type="email" placeholder="you@example.com"
                                value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
                            {loading ? 'Sending link...' : 'Send Magic Link'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input className="form-input" type="email" placeholder="you@example.com"
                                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input className="form-input" type="password" placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)} required autoComplete={isSignup ? 'new-password' : 'current-password'} />
                        </div>
                        {isSignup && (
                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <input className="form-input" type="password" placeholder="••••••••"
                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
                            </div>
                        )}
                        <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
                            {loading ? 'Working...' : isSignup ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>
                )}

                <div className="auth-divider">
                    <span>or</span>
                </div>

                <button className="btn btn-google" onClick={handleGoogleSignIn} disabled={loading} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', backgroundColor: 'white', color: '#555', border: '1px solid #ddd' }}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" />
                    Continue with Google
                </button>
            </div>
        </div>
    );
}
