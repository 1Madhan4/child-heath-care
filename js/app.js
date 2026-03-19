/* ============================================
   App Module — Router & Global Utilities
   ============================================ */

const App = {
    init() {
        // App boot logic: check locally stored session
        const session = Storage.getSession();

        // Timeout to ensure modules and DOM are fully ready
        // since we are using type="module" in index.html, things load async
        setTimeout(() => {
            if (session) {
                // Refresh their profile in DB in background if needed
                Storage.saveUserProfile(session).catch(() => { });

                if (!document.querySelector('.dashboard')) {
                    this.navigate('dashboard');
                }
            } else {
                this.navigate('auth');
            }
        }, 100);
    },

    async navigate(view) {
        const container = document.getElementById('app');

        // Show spinner for async renders
        if (view !== 'auth') {
            container.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100vh;">
                <div style="width:50px; height:50px; border:4px solid rgba(255,255,255,0.1); border-left-color:var(--accent-blue); border-radius:50%; animation:spin 1s linear infinite;"></div>
            </div>`;
        }

        switch (view) {
            case 'auth':
                Auth.render(container);
                break;
            case 'dashboard':
                if (!Storage.getSession()) { this.navigate('auth'); return; }
                await Dashboard.render(container);
                break;
            case 'checkin':
                if (!Storage.getSession()) { this.navigate('auth'); return; }
                await Checkin.renderChildForm(container);
                break;
            case 'observation':
                if (!Storage.getSession()) { this.navigate('auth'); return; }
                await Checkin.renderObservationForm(container);
                break;
            default:
                this.navigate('auth');
        }
    },

    signOut() {
        Storage.clearSession();
        this.showToast('Signed out successfully', 'success');
        this.navigate('auth');
    },

    async deleteAccount() {
        const session = Storage.getSession();
        if (!session) return;

        const confirmed = confirm(
            `⚠️ Are you sure you want to delete your account (${session.email})?\n\nThis will permanently remove:\n• Your profile\n• All check-ins & observations linked to your email\n\nThis action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            document.getElementById('delete-account-btn').textContent = 'Deleting...';
            document.getElementById('delete-account-btn').disabled = true;

            await Storage.deleteCheckinsForUser(session.email);
            await Storage.deleteObservationsForUser(session.email);
            await Storage.deleteUserFromDB(session.email);

            Storage.clearSession();
            this.showToast('Account deleted successfully', 'success');
            this.navigate('auth');
        } catch (error) {
            console.warn('[MindBloom] Account deletion failed.');
            this.showToast('Error deleting account. Please try again.', 'error');
            document.getElementById('delete-account-btn').textContent = '🗑️ Delete Account';
            document.getElementById('delete-account-btn').disabled = false;
        }
    },

    showToast(message, type = 'info') {
        const old = document.querySelector('.toast');
        if (old) old.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 3000);
    }
};

window.App = App;

// Bootstrap
window.addEventListener('click', (e) => {
    // Close user menu if clicked outside
    const userMenu = document.getElementById('user-menu-wrapper');
    if (userMenu && !userMenu.contains(e.target)) {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
    // Close legacy role dropdown if open
    const roleDropdown = document.getElementById('role-dropdown');
    if (roleDropdown && roleDropdown.classList.contains('open') && !roleDropdown.contains(e.target)) {
        roleDropdown.classList.remove('open');
    }
});

// We wait for DOM content because the script type is 'module', but just to be safe:
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
