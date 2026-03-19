/* Auth Security Helpers */

// Removed manual hashPassword - Firebase Auth handles encryption.

const RATE_LIMIT_KEY = 'mindbloom_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 1000;

function getRateLimit() {
    try {
        return JSON.parse(sessionStorage.getItem(RATE_LIMIT_KEY)) || { count: 0, lockedUntil: 0 };
    } catch {
        return { count: 0, lockedUntil: 0 };
    }
}

export function incrementFailedAttempt() {
    const rl = getRateLimit();
    rl.count = (rl.count || 0) + 1;
    if (rl.count >= MAX_ATTEMPTS) {
        rl.lockedUntil = Date.now() + LOCKOUT_MS;
        rl.count = 0;
    }
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(rl));
}

export function clearFailedAttempts() {
    sessionStorage.removeItem(RATE_LIMIT_KEY);
}

export function isLockedOut() {
    const rl = getRateLimit();
    return rl.lockedUntil && Date.now() < rl.lockedUntil;
}

export function getRemainingLockout() {
    const rl = getRateLimit();
    return Math.ceil((rl.lockedUntil - Date.now()) / 1000);
}

export function getRemainingAttempts() {
    const rl = getRateLimit();
    return MAX_ATTEMPTS - (rl.count || 0);
}
