/* ============================================
   Auth Module — Secure Local Session
   ============================================ */

// ── Security: SHA-256 password hash via Web Crypto API ──
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Security: Rate limiting — track failed login attempts ──
const RATE_LIMIT_KEY = 'mindbloom_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000; // 30 seconds

function getRateLimit() {
    try {
        return JSON.parse(sessionStorage.getItem(RATE_LIMIT_KEY)) || { count: 0, lockedUntil: 0 };
    } catch { return { count: 0, lockedUntil: 0 }; }
}

function incrementFailedAttempt() {
    const rl = getRateLimit();
    rl.count = (rl.count || 0) + 1;
    if (rl.count >= MAX_ATTEMPTS) {
        rl.lockedUntil = Date.now() + LOCKOUT_MS;
        rl.count = 0;
    }
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(rl));
}

function clearFailedAttempts() {
    sessionStorage.removeItem(RATE_LIMIT_KEY);
}

function isLockedOut() {
    const rl = getRateLimit();
    return rl.lockedUntil && Date.now() < rl.lockedUntil;
}

function getRemainingLockout() {
    const rl = getRateLimit();
    return Math.ceil((rl.lockedUntil - Date.now()) / 1000);
}

const Auth = {
    render(container) {
        const html = `
        <div class="auth-container view-enter">
            <div class="auth-card glass-card">
                <div class="auth-logo">
                    <span class="logo-icon">🌱</span>
                    <h1>MindBloom</h1>
                    <p>Child Emotional Health Tracker</p>
                </div>

                <div class="auth-tabs">
                    <button class="auth-tab active" id="tab-signin" onclick="Auth.switchTab('signin')">Sign In</button>
                    <button class="auth-tab" id="tab-signup" onclick="Auth.switchTab('signup')">Sign Up</button>
                </div>

                <div style="text-align:center; margin-bottom:var(--space-md); color:var(--text-secondary); font-size:var(--font-sm);">
                    <span id="auth-hint">Welcome back! Please enter your username and password to access your dashboard.</span>
                </div>

                <form id="auth-form" onsubmit="Auth.handleSubmit(event)">
                    <div id="signup-fields" style="display:none">
                        <div class="form-group">
                            <label class="form-label" for="auth-email">Email Address</label>
                            <input class="form-input" type="email" id="auth-email" placeholder="you@example.com">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="auth-role">I am a...</label>
                            <select class="form-input" id="auth-role" required style="cursor: pointer; appearance: auto; background-color: var(--bg-input); color: black;">
                                <option value="" disabled selected>Select your role...</option>
                                <option value="parent">Parent</option>
                                <option value="teacher">Teacher</option>
                                <option value="counselor">Counselor</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="auth-username">Username</label>
                        <input class="form-input" type="text" id="auth-username" placeholder="Enter your username" required autocomplete="username">
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="auth-password">Password</label>
                        <input class="form-input" type="password" id="auth-password" placeholder="••••••••" required autocomplete="current-password">
                    </div>

                    <div id="signup-password-confirm" style="display:none">
                        <div class="form-group">
                            <label class="form-label" for="auth-confirm-password">Confirm Password</label>
                            <input class="form-input" type="password" id="auth-confirm-password" placeholder="••••••••" autocomplete="new-password">
                        </div>
                    </div>

                    <button class="btn btn-primary" type="submit" id="auth-submit-btn" style="width:100%; margin-top: 12px;">Sign In</button>
                </form>
            </div>
        </div>`;
        container.innerHTML = html;
        this.currentTab = 'signin';
    },

    currentTab: 'signin',

    switchTab(tab) {
        this.currentTab = tab;
        document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
        document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');

        document.getElementById('signup-fields').style.display = tab === 'signup' ? 'block' : 'none';
        document.getElementById('signup-password-confirm').style.display = tab === 'signup' ? 'block' : 'none';

        document.getElementById('auth-submit-btn').textContent = tab === 'signup' ? 'Create Account' : 'Sign In';
        document.getElementById('auth-hint').textContent = tab === 'signup'
            ? 'New here? Enter your details to create an account.'
            : 'Welcome back! Please enter your username and password to access your dashboard.';
    },

    async handleSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('auth-submit-btn');

        // ── Rate limit check ──
        if (isLockedOut()) {
            const secs = getRemainingLockout();
            App.showToast(`Too many failed attempts. Try again in ${secs}s.`, 'error');
            return;
        }

        const usernameInput = document.getElementById('auth-username').value.trim().toLowerCase();
        const emailInput = document.getElementById('auth-email') ? document.getElementById('auth-email').value.trim().toLowerCase() : '';
        const roleSelect = document.getElementById('auth-role');
        const roleInput = roleSelect ? roleSelect.value : '';
        const passwordInput = document.getElementById('auth-password').value;
        const confirmPasswordInput = document.getElementById('auth-confirm-password') ? document.getElementById('auth-confirm-password').value : '';

        if (!usernameInput || !passwordInput) {
            App.showToast('Please enter your username and password', 'error'); return;
        }

        // ── Validate password strength on sign-up ──
        if (this.currentTab === 'signup' && passwordInput.length < 8) {
            App.showToast('Password must be at least 8 characters', 'error'); return;
        }

        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Please wait...';

        try {
            let userProfile = null;

            if (this.currentTab === 'signup') {
                if (!emailInput) {
                    App.showToast('Please enter your email', 'error');
                    btn.disabled = false; btn.textContent = originalText; return;
                }
                if (!roleInput) {
                    App.showToast('Please select if you are a Parent, Teacher, or Counselor', 'error');
                    btn.disabled = false; btn.textContent = originalText; return;
                }
                if (passwordInput !== confirmPasswordInput) {
                    App.showToast('Passwords do not match', 'error');
                    btn.disabled = false; btn.textContent = originalText; return;
                }

                const existingProfile = await Storage.getUserProfile(usernameInput);
                if (existingProfile) {
                    App.showToast('An account with this username already exists', 'error');
                    btn.disabled = false; btn.textContent = originalText; return;
                }

                // ── Security: Real SHA-256 hash (not reversible like btoa) ──
                const pwdHash = await hashPassword(passwordInput);

                userProfile = {
                    name: usernameInput,
                    email: emailInput,
                    username: usernameInput,
                    role: roleInput,
                    pwdHash,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString()
                };

                await Storage.saveUserProfile(userProfile);
                clearFailedAttempts();
                App.showToast(`Account created! Welcome, ${usernameInput} 🌱`, 'success');

            } else {
                const existingProfile = await Storage.getUserProfile(usernameInput);

                if (existingProfile) {
                    const pwdHash = await hashPassword(passwordInput);

                    if (existingProfile.pwdHash && existingProfile.pwdHash !== pwdHash) {
                        incrementFailedAttempt();
                        const rl = getRateLimit();
                        const remaining = MAX_ATTEMPTS - rl.count;
                        if (isLockedOut()) {
                            App.showToast(`Too many failed attempts. Locked for ${getRemainingLockout()}s.`, 'error');
                        } else {
                            App.showToast(`Incorrect password. ${remaining} attempt(s) remaining.`, 'error');
                        }
                        btn.disabled = false; btn.textContent = originalText; return;
                    }

                    clearFailedAttempts();
                    userProfile = existingProfile;
                    userProfile.lastLogin = new Date().toISOString();
                    Storage.saveUserProfile(userProfile).catch(() => { });
                    App.showToast(`Welcome back, ${userProfile.name}! 👋`, 'success');
                } else {
                    incrementFailedAttempt();
                    App.showToast('Account not found. Please Sign Up first.', 'error');
                    btn.disabled = false; btn.textContent = originalText; return;
                }
            }

            const sessionData = { ...userProfile };
            delete sessionData.pwdHash;
            Storage.setSession(sessionData);

            setTimeout(() => { App.navigate('dashboard'); }, 500);

        } catch {
            // ── Security: Don't expose internal error details ──
            App.showToast('Something went wrong. Please try again.', 'error');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
};

window.Auth = Auth;
