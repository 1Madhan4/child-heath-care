import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Storage } from '../utils/storage';
import {
    hashPassword,
    isLockedOut,
    getRemainingLockout,
    incrementFailedAttempt,
    clearFailedAttempts,
    getRemainingAttempts,
} from '../utils/auth';

export default function AuthPage() {
    const { navigate, showToast, login } = useApp();
    const [tab, setTab] = useState('signin');
    const [loading, setLoading] = useState(false);

    // Form fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const isSignup = tab === 'signup';

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isLockedOut()) {
            showToast(`Too many failed attempts. Try again in ${getRemainingLockout()}s.`, 'error');
            return;
        }

        const usernameTrimmed = username.trim().toLowerCase();
        const emailTrimmed = email.trim().toLowerCase();

        if (!usernameTrimmed || !password) {
            showToast('Please enter your username and password', 'error');
            return;
        }

        if (isSignup && password.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }

        setLoading(true);

        try {
            let userProfile = null;

            if (isSignup) {
                if (!emailTrimmed) { showToast('Please enter your email', 'error'); setLoading(false); return; }
                if (!role) { showToast('Please select if you are a Parent, Teacher, or Counselor', 'error'); setLoading(false); return; }
                if (password !== confirmPassword) { showToast('Passwords do not match', 'error'); setLoading(false); return; }

                const existing = await Storage.getUserProfile(usernameTrimmed);
                if (existing) { showToast('An account with this username already exists', 'error'); setLoading(false); return; }

                const pwdHash = await hashPassword(password);
                userProfile = {
                    name: usernameTrimmed,
                    email: emailTrimmed,
                    username: usernameTrimmed,
                    role,
                    pwdHash,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                };
                await Storage.saveUserProfile(userProfile);
                clearFailedAttempts();
                showToast(`Account created! Welcome, ${usernameTrimmed} 🌱`, 'success');
            } else {
                const existing = await Storage.getUserProfile(usernameTrimmed);
                if (existing) {
                    const pwdHash = await hashPassword(password);
                    if (existing.pwdHash && existing.pwdHash !== pwdHash) {
                        incrementFailedAttempt();
                        if (isLockedOut()) {
                            showToast(`Too many failed attempts. Locked for ${getRemainingLockout()}s.`, 'error');
                        } else {
                            showToast(`Incorrect password. ${getRemainingAttempts()} attempt(s) remaining.`, 'error');
                        }
                        setLoading(false);
                        return;
                    }
                    clearFailedAttempts();
                    userProfile = { ...existing, lastLogin: new Date().toISOString() };
                    Storage.saveUserProfile(userProfile).catch(() => { });
                    showToast(`Welcome back, ${userProfile.name}! 👋`, 'success');
                } else {
                    incrementFailedAttempt();
                    showToast('Account not found. Please Sign Up first.', 'error');
                    setLoading(false);
                    return;
                }
            }

            const sessionData = { ...userProfile };
            delete sessionData.pwdHash;
            login(sessionData);
            setTimeout(() => navigate('dashboard'), 500);
        } catch {
            showToast('Something went wrong. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container view-enter">
            <div className="auth-card glass-card">
                <div className="auth-logo">
                    <span className="logo-icon">🌱</span>
                    <h1>MindBloom</h1>
                    <p>Child Emotional Health Tracker</p>
                </div>

                <div className="auth-tabs">
                    <button className={`auth-tab ${tab === 'signin' ? 'active' : ''}`} onClick={() => setTab('signin')}>Sign In</button>
                    <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>Sign Up</button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 'var(--space-md)', fontSize: 'var(--font-sm)' }}>
                    <span className="auth-hint">
                        {isSignup
                            ? 'New here? Enter your details to create an account.'
                            : 'Welcome back! Please enter your username and password to access your dashboard.'}
                    </span>
                </div>

                <form onSubmit={handleSubmit}>
                    {isSignup && (
                        <>
                            <div className="form-group">
                                <label className="form-label" htmlFor="auth-email">Email Address</label>
                                <input className="form-input" type="email" id="auth-email" placeholder="you@example.com"
                                    value={email} onChange={e => setEmail(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="auth-role">I am a...</label>
                                <select className="form-input" id="auth-role" required value={role} onChange={e => setRole(e.target.value)}
                                    style={{ cursor: 'pointer', appearance: 'auto', backgroundColor: 'var(--bg-input)', color: 'black' }}>
                                    <option value="" disabled>Select your role...</option>
                                    <option value="parent">Parent</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="counselor">Counselor</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="auth-username">Username</label>
                        <input className="form-input" type="text" id="auth-username" placeholder="Enter your username"
                            required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="auth-password">Password</label>
                        <input className="form-input" type="password" id="auth-password" placeholder="••••••••"
                            required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>

                    {isSignup && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="auth-confirm-password">Confirm Password</label>
                            <input className="form-input" type="password" id="auth-confirm-password" placeholder="••••••••"
                                autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </div>
                    )}

                    <button className="btn btn-primary" type="submit" id="auth-submit-btn"
                        style={{ width: '100%', marginTop: '12px' }} disabled={loading}>
                        {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
