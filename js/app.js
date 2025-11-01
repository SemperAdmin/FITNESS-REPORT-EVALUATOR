// Main Application Logic & Event Handlers

// Initialize application when DOM is loaded
// DOMContentLoaded initialization
document.addEventListener('DOMContentLoaded', () => {
    // Replace login-first boot with mode selection boot
    initializeVoiceRecognition();

    const mode = document.getElementById('modeSelectionCard');
    const login = document.getElementById('profileLoginCard');
    const dashboard = document.getElementById('profileDashboardCard');
    const setup = document.getElementById('setupCard');

    if (mode) { mode.classList.add('active'); mode.style.display = 'block'; }
    if (login) { login.classList.remove('active'); login.style.display = 'none'; }
    if (dashboard) { dashboard.classList.remove('active'); dashboard.style.display = 'none'; }
    if (setup) { setup.classList.remove('active'); setup.style.display = 'none'; }

    setTimeout(() => {
        if (typeof showProfileDashboardOnLoad === 'function') {
            try { showProfileDashboardOnLoad(); } catch (e) { console.warn('showProfileDashboardOnLoad failed:', e); }
        }
    }, 0);

    // Set default dates
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    document.getElementById('fromDateInput').value = oneYearAgo.toISOString().split('T')[0];
    document.getElementById('toDateInput').value = today.toISOString().split('T')[0];

    // Word count tracking and modal handlers remain
    document.addEventListener('input', function(e) {
        if (e.target.id === 'justificationText') {
            updateWordCount();
        } else if (e.target.id === 'sectionITextarea') {
            updateSectionIWordCount();
        }
    });

    // Close modal when clicking outside
    document.getElementById('justificationModal').addEventListener('click', function(e) {
        if (e.target === this) {
            cancelJustification();
        }
    });

    document.getElementById('helpModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeHelpModal();
        }
    });
});

// Add Single Evaluation entrypoint used by index.html button
function startStandaloneMode() {
    // Clear any RS-session flag and profile context
    try { sessionStorage.removeItem('login_source'); } catch (_) {}
    window.currentProfile = null;

    const mode = document.getElementById('modeSelectionCard');
    const login = document.getElementById('profileLoginCard');
    const dashboard = document.getElementById('profileDashboardCard');
    [mode, login, dashboard].forEach(el => {
        if (el) { el.classList.remove('active'); el.style.display = 'none'; }
    });

    const setup = document.getElementById('setupCard');
    if (setup) { setup.classList.add('active'); setup.style.display = 'block'; }

    // Align navigation state if available
    try {
        if (typeof jumpToStep === 'function' && typeof STEPS !== 'undefined') {
            jumpToStep(STEPS.setup);
        }
    } catch (_) {}

    window.scrollTo({ top: 0, behavior: 'auto' });
}

// Login-first routing helper
function showRSLoginFirst() {
    const login = document.getElementById('profileLoginCard');
    const header = document.querySelector('.header');
    const warning = document.getElementById('dataWarning');
    const mode = document.getElementById('modeSelectionCard');
    const cards = [
        'profileDashboardCard', // ensure dashboard is hidden
        'setupCard','howItWorksCard','evaluationContainer',
        'reviewCard','sectionIGenerationCard','directedCommentsCard','summaryCard'
    ];

    if (header) header.style.display = 'none';
    if (warning) warning.style.display = 'none';
    if (mode) { mode.classList.remove('active'); mode.style.display = 'none'; }

    cards.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('active');
        el.style.display = 'none';
    });

    if (login) {
        login.classList.add('active');
        login.style.display = 'block'; // show the login card only when RS Dashboard is chosen
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
}

// Backward-compat alias for legacy/cached markup
function showProfileLogin() {
    return showRSLoginFirst();
}
