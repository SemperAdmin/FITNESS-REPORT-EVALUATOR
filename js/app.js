// Main Application Logic & Event Handlers

// Initialize application when DOM is loaded
// DOMContentLoaded initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize voice recognition
    initializeVoiceRecognition();

    // Always show RS Login first; hide Setup card on initial load
    const login = document.getElementById('profileLoginCard');
    const setup = document.getElementById('setupCard');
    if (login) login.classList.add('active');
    if (setup) {
        setup.classList.remove('active'); // rely on CSS to control visibility
    }

    // Let the dashboard loader decide whether to auto-open based on login_source flag
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

    // Word count tracking
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

// Login-first routing helper
function showRSLoginFirst() {
    const login = document.getElementById('profileLoginCard');
    const header = document.querySelector('.header');
    const warning = document.getElementById('dataWarning');
    const cards = [
        'profileDashboardCard', // ensure dashboard is hidden
        'setupCard','howItWorksCard','evaluationContainer',
        'reviewCard','sectionIGenerationCard','directedCommentsCard','summaryCard'
    ];

    if (header) header.style.display = 'none';
    if (warning) warning.style.display = 'none';

    cards.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('active');
        el.style.display = 'none';
    });

    if (login) {
        login.classList.add('active');
        login.style.display = 'block'; // critical: show the login card
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
}

// Backward-compat alias for legacy/cached markup
function showProfileLogin() {
    return showRSLoginFirst();
}
