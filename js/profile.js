// Profile Management System
let currentProfile = null;
let profileEvaluations = [];
let syncQueue = [];

// RV Calculation Cache
let rvCache = {
    data: null,
    timestamp: 0,
    evaluationCount: 0
};

// Get RV metrics with caching (5-second cache)
function getCachedRvMetrics(evaluations) {
    const now = Date.now();
    const cacheValid = rvCache.data &&
                      rvCache.evaluationCount === evaluations.length &&
                      (now - rvCache.timestamp) < 5000; // 5 second cache

    if (cacheValid) {
        return rvCache.data;
    }

    // Cache miss - compute fresh
    const { rvMap, cumRvMap } = computeAllRvMetrics(evaluations);

    // Update cache
    rvCache.data = { rvMap, cumRvMap };
    rvCache.timestamp = now;
    rvCache.evaluationCount = evaluations.length;

    return rvCache.data;
}

// Invalidate cache when evaluations change
function invalidateRvCache() {
    rvCache.data = null;
    rvCache.timestamp = 0;
    rvCache.evaluationCount = 0;
}

// Storage Quota Monitoring
function estimateStorageUsed() {
    let total = 0;
    try {
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += (localStorage[key].length + key.length) * 2; // UTF-16 encoding
            }
        }
    } catch (e) {
        console.warn('Failed to estimate storage:', e);
        return 0;
    }
    return total / (1024 * 1024); // Convert to MB
}

function checkStorageQuota() {
    const usedMB = estimateStorageUsed();
    const quotaMB = 5; // Most browsers limit to ~5-10MB
    const percentUsed = (usedMB / quotaMB) * 100;

    // Update storage indicator if it exists
    const indicator = document.getElementById('storageIndicator');
    if (indicator) {
        indicator.textContent = `${usedMB.toFixed(2)} MB / ${quotaMB} MB`;

        if (percentUsed > 90) {
            indicator.style.color = '#d32f2f';
            indicator.title = 'Storage almost full!';
        } else if (percentUsed > 75) {
            indicator.style.color = '#f57c00';
            indicator.title = 'Storage getting full';
        } else {
            indicator.style.color = '#4CAF50';
            indicator.title = 'Storage healthy';
        }
    }

    // Show warning if approaching limit
    if (percentUsed > 90) {
        showNotification(
            'Storage Almost Full',
            'You are using ' + percentUsed.toFixed(0) + '% of available storage. Consider exporting and archiving old evaluations.',
            'warning'
        );
        return false;
    } else if (percentUsed > 75) {
        showNotification(
            'Storage Getting Full',
            'You are using ' + percentUsed.toFixed(0) + '% of available storage.',
            'info'
        );
    }

    return true;
}

function showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-header">
            <strong>${title}</strong>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="notification-body">${message}</div>
    `;

    // Add to page
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    container.appendChild(notification);

    // Auto-remove after 8 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 8000);
}

// Keyboard Navigation Support
function handleCardKeydown(event, rank) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        applyRankFromSummary(rank);
    }
}

// Tooltip System
function showTooltip(event, tooltipId) {
    event.preventDefault();
    event.stopPropagation();

    // Hide all other tooltips
    document.querySelectorAll('.tooltip-content.active').forEach(t => {
        if (t.id !== tooltipId) t.classList.remove('active');
    });

    const tooltip = document.getElementById(tooltipId);
    if (!tooltip) return;

    // Position tooltip near the button
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    tooltip.style.top = (rect.bottom + 8) + 'px';
    tooltip.style.left = rect.left + 'px';

    // Toggle tooltip
    tooltip.classList.toggle('active');

    // Close on click outside
    if (tooltip.classList.contains('active')) {
        setTimeout(() => {
            document.addEventListener('click', function closeTooltip(e) {
                if (!tooltip.contains(e.target) && !button.contains(e.target)) {
                    tooltip.classList.remove('active');
                    document.removeEventListener('click', closeTooltip);
                }
            });
        }, 10);
    }
}

// Mode Selection Functions
function startStandaloneMode() {
    const modeCard = document.getElementById('modeSelectionCard');
    if (modeCard) {
        modeCard.classList.remove('active');
        modeCard.style.display = 'none';
    }

    // Skip profile login and go straight to setup
    skipProfileLogin();
}

function showProfileLogin() {
    const modeCard = document.getElementById('modeSelectionCard');
    const loginCard = document.getElementById('profileLoginCard');

    if (modeCard) {
        modeCard.classList.remove('active');
        modeCard.style.display = 'none';
    }

    if (loginCard) {
        loginCard.classList.add('active');
        loginCard.style.display = 'block';
    }

    // Hide app chrome
    const header = document.querySelector('.header');
    const warning = document.getElementById('dataWarning');
    if (header) header.style.display = 'none';
    if (warning) warning.style.display = 'none';
}

// Profile Authentication
async function profileLogin() {
    const rank = document.getElementById('rsRankInput').value.trim();
    const name = document.getElementById('rsNameInput').value.trim();
    const email = document.getElementById('rsEmailInput').value.trim();

    if (!rank || !name || !email) {
        alert('Complete all fields to access your profile.');
        return;
    }

    const profileKey = generateProfileKey(name, email);

    // Check localStorage first
    let profile = loadProfileFromLocal(profileKey);

    // Try to fetch from GitHub if online
    if (navigator.onLine) {
        try {
            const githubProfile = await fetchProfileFromGitHub(profileKey);
            if (githubProfile) {
                profile = mergeProfiles(profile, githubProfile);
                saveProfileToLocal(profileKey, profile);
            }
        } catch (error) {
            console.log('GitHub fetch failed, using local data:', error);
        }
    }

    // Create new profile if none exists
    if (!profile) {
        profile = {
            rsName: name,
            rsEmail: email,
            rsRank: rank,
            createdDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            totalEvaluations: 0,
            evaluationFiles: []
        };
    }

    currentProfile = profile;
    profileEvaluations = loadEvaluationsFromLocal(profileKey);

    // Persist snapshot for auto-load
    localStorage.setItem('current_profile', JSON.stringify(currentProfile));
    localStorage.setItem('current_evaluations', JSON.stringify(profileEvaluations));
    localStorage.setItem('has_profile', 'true');
    localStorage.setItem('login_source', 'form'); // mark session as form login

    showProfileDashboard();
}

// Skip -> show main app
function skipProfileLogin() {
    currentProfile = null;

    const login = document.getElementById('profileLoginCard');
    if (login) {
        login.classList.remove('active');
        login.style.display = 'none'; // ensure login card is hidden
    }

    const header = document.querySelector('.header');
    const warning = document.getElementById('dataWarning');
    if (header) header.style.display = '';
    if (warning) warning.style.display = '';

    const setup = document.getElementById('setupCard');
    if (setup) {
        setup.style.display = 'block';
        setup.classList.add('active');
    }

    // Ensure other cards remain hidden
    ['howItWorksCard','evaluationContainer','reviewCard','sectionIGenerationCard','directedCommentsCard','summaryCard']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.classList.remove('active'); el.style.display = 'none'; }
        });
}

// Show Dashboard -> keep app chrome hidden
// In showProfileDashboard(), initialize the rank button state to "All"
// State: selected rank on dashboard
let selectedRankFilter = '';

// New function to apply rank filter from summary table and open grid view
function applyRankFromSummary(rank) {
    setRankFilter(rank);
    toggleGridView(true);
    updateBreadcrumb(rank);
}

// Update breadcrumb navigation
function updateBreadcrumb(context) {
    const separator = document.getElementById('breadcrumbSeparator');
    const current = document.getElementById('breadcrumbCurrent');

    if (context) {
        // Show breadcrumb with context
        if (separator) separator.style.display = 'inline';
        if (current) {
            current.style.display = 'inline';
            current.textContent = `${context} Detailed View`;
        }
    } else {
        // Hide breadcrumb context (dashboard home)
        if (separator) separator.style.display = 'none';
        if (current) current.style.display = 'none';
    }
}

// Show RS Summary (main page) and clear any active rank filter
function showRankSummaryView() {
    // Clear the selected rank filter
    setRankFilter('');

    // Ensure the list (RS Summary) is shown and grid is hidden
    toggleGridView(false);

    // Re-render the summary list to reflect full dataset
    renderEvaluationsList();

    // Clear breadcrumb
    updateBreadcrumb(null);

    // Optional: scroll to top for dashboard feel
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Show Dashboard -> initialize and hide filters until a rank is chosen
function showProfileDashboard() {
    const login = document.getElementById('profileLoginCard');
    if (login) {
        login.classList.remove('active');
        login.style.display = 'none'; // Hide RS Login after login
    }

    const dash = document.getElementById('profileDashboardCard');
    if (dash) {
        dash.style.display = 'block';
        dash.classList.add('active');
    }

    const header = document.querySelector('.header');
    const warning = document.getElementById('dataWarning');
    if (header) header.style.display = 'none';
    if (warning) warning.style.display = 'none';

    // Hide all app cards while in Dashboard
    ['setupCard','howItWorksCard','evaluationContainer','reviewCard','sectionIGenerationCard','directedCommentsCard','summaryCard']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) { el.classList.remove('active'); el.style.display = 'none'; }
        });

    renderProfileHeader();
    renderEvaluationsList();
    // Initialize button bar to "All" and update visibility
    setRankFilter('');
}

function renderProfileHeader() {
    document.getElementById('profileHeaderName').textContent =
        `${currentProfile.rsRank} ${currentProfile.rsName}`;
    document.getElementById('profileHeaderEmail').textContent =
        currentProfile.rsEmail;
    document.getElementById('totalEvaluations').textContent =
        profileEvaluations.length;

    const pending = profileEvaluations.filter(e => e.syncStatus !== 'synced').length;
    // Removed pendingSync display as sync is not implemented

    // Check and update storage quota
    checkStorageQuota();
}

// Set rank summary sort preference
function setRankSummarySort(key) {
    window.rankSummarySort = key || 'reports';
    renderEvaluationsList();
}

function renderEvaluationsList() {
    const container = document.getElementById('evaluationsList');
    container.innerHTML = '';

    if (profileEvaluations.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No evaluations saved yet.</p>
                <button class="btn btn-meets" onclick="startNewEvaluation()">
                    Create Your First Evaluation
                </button>
            </div>
        `;
        return;
    }

    // Aggregate across ALL evaluations by rank
    const rankStats = new Map();
    profileEvaluations.forEach(e => {
        const rawRank = String(e.marineInfo?.rank || '').trim();
        if (!rawRank) return;

        const rank = normalizeRankLabel(rawRank);
        const avgNum = parseFloat(e.fitrepAverage || '0');
        if (!Number.isFinite(avgNum)) return;

        const s = rankStats.get(rank) || { sum: 0, count: 0, high: 0, low: Infinity };
        s.sum += avgNum;
        s.count += 1;
        s.high = Math.max(s.high, avgNum);
        s.low = Math.min(s.low, avgNum);
        rankStats.set(rank, s);
    });

    // Compute global bounds for progress bars
    const allAvgs = [];
    rankStats.forEach(s => {
        if (s.count) allAvgs.push(s.sum / s.count);
    });
    const globalHigh = allAvgs.length ? Math.max(...allAvgs) : 0;
    const globalLow = allAvgs.length ? Math.min(...allAvgs) : 0;
    const spread = Math.max(0.01, globalHigh - globalLow);

    // Only show ranks that have reports
    const orderedRanks = [
        'SGT','SSGT','GYSGT','MSGT','1STSGT',
        'WO','CWO2','CWO3','CWO4','CWO5',
        '2NDLT','1STLT','CAPT','MAJ','LTCOL','COL'
    ];

    // Prepare rows
    const rows = [];
    orderedRanks.forEach(rank => {
        if (!rankStats.has(rank)) return;
        const s = rankStats.get(rank);
        const avg = s.count ? s.sum / s.count : 0;
        rows.push({
            rank,
            avg,
            count: s.count,
            high: s.count ? s.high : 0,
            low: s.count && Number.isFinite(s.low) ? s.low : 0
        });
    });

    // Sorting
    const key = window.rankSummarySort || 'reports';
    if (key === 'avg') {
        rows.sort((a, b) => b.avg - a.avg || a.rank.localeCompare(b.rank));
    } else {
        rows.sort((a, b) => b.count - a.count || a.rank.localeCompare(b.rank));
    }

    // Toolbar
    const toolbarHtml = `
        <div class="summary-toolbar" role="toolbar" aria-label="Rank Summary controls">
            <span class="summary-title">Rank Summary</span>
            <div class="toolbar-spacer"></div>
            <span class="sort-label">Sort:</span>
            <button class="btn btn-secondary sort-btn ${key === 'reports' ? 'active' : ''}" onclick="setRankSummarySort('reports')">Reports</button>
            <button class="btn btn-secondary sort-btn ${key === 'avg' ? 'active' : ''}" onclick="setRankSummarySort('avg')">Average</button>
        </div>
    `;

    // Cards
    const cardsHtml = rows.map(r => {
        const pct = Math.round(((r.avg - globalLow) / spread) * 100);
        return `
            <button
                class="rank-summary-card"
                onclick="applyRankFromSummary('${r.rank}')"
                onkeydown="handleCardKeydown(event, '${r.rank}')"
                tabindex="0"
                aria-label="View ${r.rank} evaluations: ${r.count} reports, average ${r.avg.toFixed(2)}"
                title="Open ${r.rank} grid">
                <div class="rank-chip">${r.rank}</div>
                <div class="metric-group">
                    <div class="metric">
                        <span class="metric-label">Avg</span>
                        <span class="metric-value">${r.avg.toFixed(2)}</span>
                    </div>
                    <div class="metric-bar" aria-label="Average relative bar">
                        <div class="bar-fill" style="width:${pct}%"></div>
                    </div>
                    <div class="metric-row">
                        <span class="pill">Reports ${r.count}</span>
                        <span class="pill">High ${r.high.toFixed(2)}</span>
                        <span class="pill">Low ${r.low.toFixed(2)}</span>
                    </div>
                </div>
            </button>
        `;
    }).join('');

    container.innerHTML = toolbarHtml + `<div class="rank-summary-grid">${cardsHtml}</div>`;
}

function createEvaluationListItem(evaluation) {
    const div = document.createElement('div');
    div.className = 'evaluation-item';
    div.dataset.evalId = evaluation.evaluationId;

    div.innerHTML = `
        <div class="eval-header" onclick="toggleEvaluation(this)">
            <div class="eval-summary">
                <div class="eval-marine-info">
                    <span class="marine-rank">${evaluation.marineInfo.rank}</span>
                    <span class="marine-name">${evaluation.marineInfo.name}</span>
                </div>
                <div class="eval-meta">
                    <span class="eval-occasion">${evaluation.occasion}</span>
                    <span class="eval-dates">${evaluation.marineInfo.evaluationPeriod.from} to ${evaluation.marineInfo.evaluationPeriod.to}</span>
                    <span class="eval-average">Avg: ${evaluation.fitrepAverage}</span>
                </div>
            </div>
            <div class="eval-actions">
                <span class="sync-status ${evaluation.syncStatus || 'pending'}">
                    ${evaluation.syncStatus === 'synced' ? '✓ Synced' : '⏳ Pending'}
                </span>
                <button class="icon-btn" onclick="event.stopPropagation(); deleteEvaluation('${evaluation.evaluationId}')">
                    🗑️
                </button>
                <span class="expand-icon">▼</span>
            </div>
        </div>
        <div class="eval-details" style="display: none;">
            ${renderEvaluationDetails(evaluation)}
        </div>
    `;

    return div;
}

function renderEvaluationDetails(evaluation) {
    let justificationsHTML = '';
    Object.values(evaluation.traitEvaluations).forEach(trait => {
        justificationsHTML += `
            <div class="justification-item">
                <strong>${trait.trait} (${trait.grade}):</strong>
                <p>${trait.justification}</p>
            </div>
        `;
    });

    return `
        <div class="eval-details-grid">
            <div class="detail-section">
                <h4>Section I Comments</h4>
                <div class="comments-text">${evaluation.sectionIComments || 'No comments provided'}</div>
            </div>
            <div class="detail-section full-width">
                <h4>Justifications</h4>
                <div class="justifications-list">${justificationsHTML}</div>
            </div>
        </div>
        <div class="eval-detail-actions">
            <button class="btn btn-secondary" onclick="exportEvaluation('${evaluation.evaluationId}')">
                Export This Evaluation
            </button>
            <button class="btn btn-secondary" onclick="duplicateEvaluation('${evaluation.evaluationId}')">
                Use as Template
            </button>
        </div>
    `;
}

function toggleEvaluation(header) {
    const item = header.closest('.evaluation-item');
    const details = item.querySelector('.eval-details');

    if (details.style.display === 'none') {
        details.style.display = 'block';
        item.classList.add('expanded');
    } else {
        details.style.display = 'none';
        item.classList.remove('expanded');
    }
}

// Save Evaluation to Profile
function showSaveToProfilePrompt() {
    document.getElementById('saveProfileModal').classList.add('active');

    // Populate preview
    document.getElementById('savePreviewMarine').textContent = evaluationMeta.marineName;
    document.getElementById('savePreviewPeriod').textContent =
        `${evaluationMeta.fromDate} to ${evaluationMeta.toDate}`;
    document.getElementById('savePreviewAverage').textContent = calculateFitrepAverage();
}

async function confirmSaveToProfile() {
    // Check storage quota before saving
    const hasSpace = checkStorageQuota();
    if (!hasSpace) {
        const proceed = confirm('Storage is almost full. Do you want to continue saving? Consider exporting old data first.');
        if (!proceed) return;
    }

    // Use occasion type captured during setup (not from modal, as we removed that field)
    const occasion = evaluationMeta.occasionType || 'Not Specified';
    const shouldSyncToGitHub = document.getElementById('saveGitHub').checked;

    // If not logged in, create a local offline profile to persist the evaluation
    if (!currentProfile) {
        const offlineName = evaluationMeta.evaluatorName || 'Anonymous RS';
        currentProfile = {
            rsName: offlineName,
            rsEmail: 'offline@local',
            rsRank: 'Unknown',
            evaluations: []
        };
        const profileKey = generateProfileKey(currentProfile.rsName, currentProfile.rsEmail);
        const existing = loadEvaluationsFromLocal(profileKey) || [];
        profileEvaluations = Array.isArray(existing) ? existing : [];
        saveProfileToLocal(profileKey, currentProfile);
    }

    const evaluationId = `eval-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;

    const evaluation = {
        evaluationId,
        rsInfo: {
            name: currentProfile ? currentProfile.rsName : evaluationMeta.evaluatorName,
            email: currentProfile ? currentProfile.rsEmail : 'offline@local',
            rank: currentProfile ? currentProfile.rsRank : 'Unknown'
        },
        marineInfo: {
            name: evaluationMeta.marineName,
            rank: evaluationMeta.marineRank || 'Unknown', // use captured rank
            evaluationPeriod: {
                from: evaluationMeta.fromDate,
                to: evaluationMeta.toDate
            }
        },
        occasion,
        completedDate: new Date().toISOString(),
        fitrepAverage: calculateFitrepAverage(),
        traitEvaluations: evaluationResults,
        sectionIComments: evaluationMeta.sectionIComments || '',
        directedComments: evaluationMeta.directedComments || '',
        savedToProfile: true,
        syncStatus: 'pending'
    };

    // Save to localStorage
    const profileKey = generateProfileKey(currentProfile.rsName, currentProfile.rsEmail);
    profileEvaluations.push(evaluation);
    saveEvaluationsToLocal(profileKey, profileEvaluations);

    currentProfile.totalEvaluations = profileEvaluations.length;
    currentProfile.lastUpdated = new Date().toISOString();
    saveProfileToLocal(profileKey, currentProfile);

    // NEW: update session snapshot so Dashboard can detect the saved profile
    localStorage.setItem('current_profile', JSON.stringify(currentProfile));
    localStorage.setItem('current_evaluations', JSON.stringify(profileEvaluations));
    localStorage.setItem('has_profile', 'true');
    // IMPORTANT: mark this as an offline save, not a form login
    localStorage.setItem('login_source', 'offline');

    // Optional: sync to GitHub when online and logged in
    if (shouldSyncToGitHub && navigator.onLine) {
        const synced = await syncEvaluationToGitHub(evaluation);
        if (synced) {
            evaluation.syncStatus = 'synced';
        }
    }

    document.getElementById('saveProfileModal').classList.remove('active');
    alert('Evaluation saved to your profile!');
}

function skipSaveToProfile() {
    document.getElementById('saveProfileModal').classList.remove('active');
}

// New: Save and immediately return to RS Dashboard
async function confirmSaveToProfileAndReturn() {
    await confirmSaveToProfile();
    // Navigate to RS Dashboard to view the saved evaluation
    if (typeof showProfileDashboard === 'function') {
        showProfileDashboard();
    }
}

// Sync Operations
async function syncAllEvaluations() {
    if (!navigator.onLine) {
        alert('You are offline. Connect to the internet to sync evaluations.');
        return;
    }

    const pending = profileEvaluations.filter(e => e.syncStatus !== 'synced');

    if (pending.length === 0) {
        alert('All evaluations already synced!');
        return;
    }

    const btn = document.activeElement && document.activeElement.tagName === 'BUTTON' ? document.activeElement : null;
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Syncing...';
    }

    for (const evaluation of pending) {
        await syncEvaluationToGitHub(evaluation);
    }

    const profileKey = generateProfileKey(currentProfile.rsName, currentProfile.rsEmail);
    saveEvaluationsToLocal(profileKey, profileEvaluations);

    if (btn) {
        btn.disabled = false;
        btn.textContent = '🔄 Sync to GitHub';
    }

    renderEvaluationsList();
    alert('Sync complete!');
}

// Utility Functions
function startNewEvaluation() {
    const dash = document.getElementById('profileDashboardCard');
    if (dash) {
        dash.classList.remove('active');
        dash.style.display = 'none';
    }

    // Also hide login card if visible (skip flow)
    const login = document.getElementById('profileLoginCard');
    if (login) {
        login.classList.remove('active');
        login.style.display = 'none';
    }

    // Restore app chrome hidden by the dashboard
    const header = document.querySelector('.header');
    const warning = document.getElementById('dataWarning');
    if (header) header.style.display = '';
    if (warning) warning.style.display = '';

    // Show setup card
    const setup = document.getElementById('setupCard');
    if (setup) {
        setup.classList.add('active');
        setup.style.display = 'block';
    }

    // Align navigation state if available
    try {
        if (typeof jumpToStep === 'function' && typeof STEPS !== 'undefined') {
            jumpToStep(STEPS.setup);
        }
    } catch (e) {
        // no-op if navigation is not initialized
    }
}

function deleteEvaluation(evalId) {
    if (!confirm('Delete this evaluation? This cannot be undone.')) {
        return;
    }

    profileEvaluations = profileEvaluations.filter(e => e.evaluationId !== evalId);

    const profileKey = generateProfileKey(currentProfile.rsName, currentProfile.rsEmail);
    saveEvaluationsToLocal(profileKey, profileEvaluations);

    renderEvaluationsList();
}

function exportEvaluation(evalId) {
    const evaluation = profileEvaluations.find(e => e.evaluationId === evalId);
    if (!evaluation) return;

    const json = JSON.stringify(evaluation, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${evalId}.json`;
    a.click();
}

function exportProfile() {
    const exportData = {
        profile: currentProfile,
        evaluations: profileEvaluations
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profile-${currentProfile.rsName.replace(/[^a-z0-9]/gi, '-')}.json`;
    a.click();
}

function logoutProfile() {
    if (confirm('Log out? Unsaved changes will remain in local storage.')) {
        currentProfile = null;
        profileEvaluations = [];
        
        // Clear session snapshot and login flags
        localStorage.removeItem('current_profile');
        localStorage.removeItem('current_evaluations');
        localStorage.removeItem('has_profile');
        localStorage.removeItem('login_source');
        
        // Hide dashboard
        const dash = document.getElementById('profileDashboardCard');
        if (dash) {
            dash.classList.remove('active');
            dash.style.display = 'none';
        }
        
        // Route back to the login page (hide setup, hide app chrome)
        if (typeof showRSLoginFirst === 'function') {
            showRSLoginFirst();
        } else {
            const login = document.getElementById('profileLoginCard');
            const setup = document.getElementById('setupCard');
            const header = document.querySelector('.header');
            const warning = document.getElementById('dataWarning');

            if (header) header.style.display = 'none';
            if (warning) warning.style.display = 'none';
            if (setup) {
                setup.classList.remove('active');
                setup.style.display = 'none';
            }
            if (login) {
                login.classList.add('active');
                login.style.display = 'block';
            }
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    }
}

// Connection Status
function updateConnectionStatus() {
    const indicator = document.getElementById('connectionStatus');
    const dot = document.querySelector('.status-dot');

    if (navigator.onLine) {
        indicator.textContent = 'Connected - Sync available';
        dot.classList.add('online');
        dot.classList.remove('offline');
    } else {
        indicator.textContent = 'Offline - Changes saved locally';
        dot.classList.add('offline');
        dot.classList.remove('online');
    }
}

window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
window.addEventListener('load', updateConnectionStatus);

// Helper stubs for functions referenced from evaluation.js
function calculateFitrepAverage() {
    // Excel-style aliases for the 13/14 attributes
    const traitAliases = {
        Perf: ['Performance'],
        Prof: ['Proficiency'],
        Courage: ['Courage'],
        Stress: ['Effectiveness Under Stress', 'Stress Tolerance'],
        Initiative: ['Initiative'],
        Leading: ['Leading Subordinates', 'Leading'],
        Develop: ['Developing Subordinates', 'Developing Others'],
        'Set Exp': ['Setting the Example'],
        'Well Being': ['Ensuring Well-being of Subordinates', 'Well-Being/Health', 'Well Being', 'Well-being'],
        'Comm Skill': ['Communication Skills'],
        PME: ['Professional Military Education (PME)', 'Professional Military Education', 'PME'],
        Decision: ['Decision Making Ability', 'Decision Making'],
        Judgement: ['Judgment', 'Judgement'],
        Evals: ['Evaluations'] // Section H
    };

    const items = Object.values(evaluationResults || {});
    const getGradeNum = (aliases) => {
        const found = items.find(t =>
            aliases.some(a => (t.trait || '').trim().toLowerCase() === a.toLowerCase())
        );
        return found ? (found.gradeNumber || 0) : 0;
    };

    // Sum all 13 core traits + optional Section H (Evals)
    const total =
        getGradeNum(traitAliases['Perf']) +
        getGradeNum(traitAliases['Prof']) +
        getGradeNum(traitAliases['Courage']) +
        getGradeNum(traitAliases['Stress']) +
        getGradeNum(traitAliases['Initiative']) +
        getGradeNum(traitAliases['Leading']) +
        getGradeNum(traitAliases['Develop']) +
        getGradeNum(traitAliases['Set Exp']) +
        getGradeNum(traitAliases['Well Being']) +
        getGradeNum(traitAliases['Comm Skill']) +
        getGradeNum(traitAliases['PME']) +
        getGradeNum(traitAliases['Decision']) +
        getGradeNum(traitAliases['Judgement']) +
        getGradeNum(traitAliases['Evals']);

    // Denominator: 14 if Section H present; else 13
    const hasSectionH =
        items.some(t =>
            (t.trait || '').trim().toLowerCase() === 'evaluations' ||
            (t.section || '').trim().toLowerCase() === 'fulfillment of evaluation responsibilities'
        );

    const denom = hasSectionH ? 14 : 13;
    const avg = denom > 0 ? (total / denom) : 0;

    return avg.toFixed(2);
}

function duplicateEvaluation(evalId) {
    const original = profileEvaluations.find(e => e.evaluationId === evalId);
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.evaluationId = `eval-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
    copy.completedDate = new Date().toISOString();
    copy.syncStatus = 'pending';
    profileEvaluations.unshift(copy);
    const profileKey = generateProfileKey(currentProfile.rsName, currentProfile.rsEmail);
    saveEvaluationsToLocal(profileKey, profileEvaluations);
    renderEvaluationsList();
}

// Add RS Grid View rendering
// Grid view toggle is already present
function toggleGridView(show) {
    const list = document.getElementById('evaluationsList');
    const grid = document.getElementById('profileGridContainer');
    const header = document.querySelector('.header');
    const filters = document.querySelector('.evaluation-filters');
    const rankBar = document.getElementById('rankFilterBar');
    const actionsBar = document.querySelector('.profile-actions-bar');
    const statsHeader = document.querySelector('.profile-header-section');

    if (!list || !grid) return;
    if (show) {
        list.style.display = 'none';
        grid.style.display = 'block';
        grid.classList.add('fullscreen');        // Full-page mode
        if (header) header.style.display = 'none';
        if (filters) filters.style.display = 'none';
        if (rankBar) rankBar.style.display = 'none';
        if (actionsBar) actionsBar.style.display = 'none';
        if (statsHeader) statsHeader.style.display = 'none';
        renderProfileGrid();
    } else {
        grid.style.display = 'none';
        grid.classList.remove('fullscreen');     // Exit full-page mode
        list.style.display = 'flex';
        if (header) header.style.display = '';
        // Restore dashboard UI states
        if (rankBar) rankBar.style.display = '';
        if (actionsBar) actionsBar.style.display = '';
        if (statsHeader) statsHeader.style.display = '';
        if (filters) updateDashboardFiltersVisibility();
    }
}

// Add: sorting state and setter
let gridSort = 'DateDesc';

function setGridSort(value) {
    gridSort = value;
    renderProfileGrid();
}

// Patch: renderProfileGrid to apply sorting and support CSV generation
function renderProfileGrid() {
    const tbody = document.querySelector('#profileGrid tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const { rvMap, cumRvMap } = getCachedRvMetrics(profileEvaluations);

    // Define evals, apply filters, then sort
    const evals = [...getFilteredEvaluations()];
    evals.sort((a, b) => {
        const avgA = parseFloat(a.fitrepAverage || '0');
        const avgB = parseFloat(b.fitrepAverage || '0');
        const rvA = rvMap.get(a.evaluationId) ?? 0;
        const rvB = rvMap.get(b.evaluationId) ?? 0;
        const dateA = new Date(a.marineInfo?.evaluationPeriod?.to || 0).getTime();
        const dateB = new Date(b.marineInfo?.evaluationPeriod?.to || 0).getTime();
        switch (gridSort) {
            case 'AvgAsc': return avgA - avgB;
            case 'AvgDesc': return avgB - avgA;
            case 'RvAsc': return rvA - rvB;
            case 'RvDesc': return rvB - rvA;
            case 'DateAsc': return dateA - dateB;
            case 'DateDesc':
            default: return dateB - dateA;
        }
    });
    
    // Render rank summary bar (High/Avg/Low/#Rpts)
    renderRankSummary(evals);

    evals.forEach((evaluation, idx) => {
        const row = document.createElement('tr');
        const traitGrades = getTraitGrades(evaluation);
        const rv = rvMap.get(evaluation.evaluationId) ?? 0;
        const cumRv = cumRvMap.get(evaluation.evaluationId) ?? rv;
        const avg = parseFloat(evaluation.fitrepAverage || '0').toFixed(2);

        row.innerHTML = `
            <td>${idx + 1}</td>
            <td style="text-align: left;">${evaluation.marineInfo?.name || '-'}</td>
            <td>${capitalize(evaluation.occasion || '-')}</td>
            <td>${(evaluation.marineInfo?.evaluationPeriod?.to || '').slice(0, 10) || '-'}</td>
            <td class="grade-cell">${traitGrades['Performance'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Proficiency'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Courage'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Stress Tolerance'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Initiative'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Leading'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Developing Others'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Setting the Example'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Well-Being/Health'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Communication Skills'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Professional Military Education'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Decision Making'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Judgement'] || '-'}</td>
            <td class="avg-cell">${avg}</td>
            <td>${badgeForRv(rv)}</td>
            <td>${badgeForRv(cumRv)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Helpers for grid view
function getTraitGrades(evaluation) {
    const columnAliases = {
        'Performance': ['Performance'],
        'Proficiency': ['Proficiency'],
        'Courage': ['Courage'],
        'Stress Tolerance': ['Effectiveness Under Stress', 'Stress Tolerance'],
        'Initiative': ['Initiative'],
        'Leading': ['Leading Subordinates', 'Leading'],
        'Developing Others': ['Developing Subordinates', 'Developing Others'],
        'Setting the Example': ['Setting the Example'],
        'Well-Being/Health': [
            'Ensuring Well-being of Subordinates',
            'Ensuring Well-being',
            'Well-Being/Health',
            'Well Being',
            'Well-being'
        ],
        'Communication Skills': ['Communication Skills'],
        'Professional Military Education': [
            'Professional Military Education (PME)',
            'Professional Military Education',
            'PME'
        ],
        'Decision Making': ['Decision Making Ability', 'Decision Making'],
        'Judgement': ['Judgment', 'Judgement']
    };

    const items = Object.values(evaluation.traitEvaluations || {});
    const map = {};
    Object.keys(columnAliases).forEach(colName => {
        const synonyms = columnAliases[colName];
        const found = items.find(t =>
            synonyms.some(alias => (t.trait || '').trim().toLowerCase() === alias.toLowerCase())
        );
        map[colName] = found ? (found.grade || '-') : '-';
    });
    return map;
}

// Optimized: Compute both RV and Cumulative RV in a single pass
function computeAllRvMetrics(evals) {
    const rvMap = new Map();
    const cumRvMap = new Map();

    if (!Array.isArray(evals) || evals.length === 0) {
        return { rvMap, cumRvMap };
    }

    // Helper functions
    const getScore = (e) => {
        const n = parseFloat(e.fitrepAverage || '0');
        return Number.isFinite(n) ? n : 0;
    };

    const getEndTs = (e) => {
        const s = e.marineInfo?.evaluationPeriod?.to || e.completedDate || '';
        const d = new Date(s);
        return Number.isFinite(d.getTime()) ? d.getTime() : 0;
    };

    // Pre-sort by date once
    const byDateAsc = [...evals].sort((a, b) => getEndTs(a) - getEndTs(b));

    // Single pass computation
    byDateAsc.forEach((currentEval, idx) => {
        const currentEnd = getEndTs(currentEval);
        const curScore = getScore(currentEval);

        // Window: all evaluations up to and including current
        const window = byDateAsc.slice(0, idx + 1);
        const scores = window.map(getScore).filter(Number.isFinite);

        // Compute RV (per-evaluation metric)
        if (window.length < 3) {
            rvMap.set(currentEval.evaluationId, 'N/A');
        } else {
            const avg = scores.reduce((s, x) => s + x, 0) / scores.length;
            const max = Math.max(...scores);
            const denom = max - avg;

            let rv;
            if (!Number.isFinite(avg) || !Number.isFinite(max) || denom === 0) {
                rv = 90; // fallback when spread is zero
            } else {
                rv = 90 + 10 * ((curScore - avg) / denom);
            }
            rv = Math.max(80, Math.round(rv));
            rvMap.set(currentEval.evaluationId, rv);
        }

        // Compute Cumulative RV (running average)
        if (curScore === 0) {
            cumRvMap.set(currentEval.evaluationId, 80);
        } else {
            const nonZeroScores = scores.filter(s => s > 0);
            if (nonZeroScores.length < 3) {
                cumRvMap.set(currentEval.evaluationId, 'N/A');
            } else {
                const avg = nonZeroScores.reduce((sum, s) => sum + s, 0) / nonZeroScores.length;
                const max = Math.max(...nonZeroScores);
                const denom = max - avg;

                let rv;
                if (denom === 0 || !Number.isFinite(denom)) {
                    rv = 90;
                } else {
                    rv = 90 + 10 * ((curScore - avg) / denom);
                }
                rv = Math.max(80, Math.round(rv));
                cumRvMap.set(currentEval.evaluationId, rv);
            }
        }
    });

    return { rvMap, cumRvMap };
}

// Legacy wrapper functions for backward compatibility
function computeRvValues(evals) {
    return computeAllRvMetrics(evals).rvMap;
}

function computeCumulativeRv(evals, rvMap) {
    return computeAllRvMetrics(evals).cumRvMap;
}

function badgeForRv(rv) {
    if (rv === 'N/A' || !Number.isFinite(rv)) {
        return `<span class="rv-badge rv-mid">N/A</span>`;
    }
    const cls = rv >= 90 ? 'rv-high' : rv >= 75 ? 'rv-mid' : 'rv-low';
    return `<span class="rv-badge ${cls}">${rv}</span>`;
}

// New: Rank Summary bar (Excel-style)
// High = MAX(T:T)
// Avg = AVERAGEIF(R:R,"<>H",T:T)  -> average of fitrepAverage where fitrepAverage > 0
// Low = MINIFS(T:T,R:R,"<>H")     -> minimum of fitrepAverage where fitrepAverage > 0
// # Rpts = COUNTA(C:C) - COUNTIF(R:R,"H") - 1 -> total - zeros - 1
function renderRankSummary(evals) {
    const container = document.getElementById('profileGridContainer');
    if (!container) return;

    let summaryEl = document.getElementById('rankSummaryBar');
    if (!summaryEl) {
        summaryEl = document.createElement('div');
        summaryEl.id = 'rankSummaryBar';
        summaryEl.style.display = 'flex';
        summaryEl.style.justifyContent = 'flex-end';
        summaryEl.style.gap = '10px';
        summaryEl.style.margin = '8px 0';
        summaryEl.style.padding = '8px';
        summaryEl.style.border = '2px solid #c2185b';
        summaryEl.style.borderRadius = '6px';
        summaryEl.style.background = '#fff';
        summaryEl.style.alignItems = 'center'; // center badges vertically
        // Insert just above the table
        const actions = container.querySelector('.profile-grid-actions');
        if (actions && actions.nextSibling) {
            container.insertBefore(summaryEl, actions.nextSibling);
        } else {
            container.appendChild(summaryEl);
        }
    }

    const scores = (evals || [])
        .map(e => parseFloat(e.fitrepAverage || '0'))
        .filter(n => Number.isFinite(n));
    const nonZero = scores.filter(n => n > 0);
    const high = scores.length ? Math.max(...scores) : 0;
    const avg = nonZero.length ? (nonZero.reduce((s, x) => s + x, 0) / nonZero.length) : 0;
    const low = nonZero.length ? Math.min(...nonZero) : 0;
    const zeroCount = scores.filter(n => n === 0).length;
    const rpts = Math.max(0, scores.length - zeroCount);

    const fmt = (n) => Number.isFinite(n) ? n.toFixed(2) : '0.00';
    const pill = (label, value, color) =>
        `<span style="background:${color};color:#fff;padding:4px 8px;border-radius:14px;font-weight:700;">${label}: ${value}</span>`;

    summaryEl.innerHTML = [
        pill('High', fmt(high), '#2e7d32'),
        pill('Avg', fmt(avg), '#1565c0'),
        pill('Low', fmt(low), '#c62828'),
        pill('# Rpts', rpts, '#6a1b9a')
    ].join(' ');
    
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setText('rankHighVal', high.toFixed(2));
    setText('rankAvgVal', avg.toFixed(2));
    setText('rankLowVal', low.toFixed(2));
    setText('rankRptsVal', rpts);
}

// Compute High / Avg / Low / # Rpts from the table's Avg column
function renderRankSummaryFromDom() {
    const tbody = document.querySelector('#profileGrid tbody');
    if (!tbody) return;

    const container = document.getElementById('profileGridContainer');
    if (!container) return;

    let summaryEl = document.getElementById('rankSummaryBar');
    if (!summaryEl) {
        summaryEl = document.createElement('div');
        summaryEl.id = 'rankSummaryBar';
        summaryEl.style.display = 'flex';
        summaryEl.style.justifyContent = 'flex-end';
        summaryEl.style.gap = '10px';
        summaryEl.style.margin = '8px 0';
        summaryEl.style.padding = '8px';
        summaryEl.style.border = '2px solid #c2185b';
        summaryEl.style.borderRadius = '6px';
        summaryEl.style.background = '#fff';
        summaryEl.style.alignItems = 'center'; // center badges vertically
        // Insert just above the table
        const actions = container.querySelector('.profile-grid-actions');
        if (actions && actions.nextSibling) {
            container.insertBefore(summaryEl, actions.nextSibling);
        } else {
            container.appendChild(summaryEl);
        }
    }

    const avgCells = Array.from(tbody.querySelectorAll('.avg-cell'));
    const values = avgCells.map(cell => {
        const v = parseFloat((cell.textContent || '').trim().replace(/[^\d.-]/g, ''));
        return Number.isFinite(v) ? v : 0;
    });

    const nonZero = values.filter(n => n > 0);
    const high = values.length ? Math.max(...values) : 0;
    const avg = nonZero.length ? (nonZero.reduce((s, x) => s + x, 0) / nonZero.length) : 0;
    const low = nonZero.length ? Math.min(...nonZero) : 0;
    const zeroCount = values.filter(n => n === 0).length;
    const rpts = Math.max(0, values.length - zeroCount);

    const fmt = (n) => Number.isFinite(n) ? n.toFixed(2) : '0.00';
    const pill = (label, value, color) =>
        `<span style="background:${color};color:#fff;padding:4px 8px;border-radius:14px;font-weight:700;">${label}: ${value}</span>`;

    summaryEl.innerHTML = [
        pill('High', fmt(high), '#2e7d32'),
        pill('Avg', fmt(avg), '#1565c0'),
        pill('Low', fmt(low), '#c62828'),
        pill('# Rpts', rpts, '#6a1b9a')
    ].join(' ');
    
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setText('rankHighVal', high.toFixed(2));
    setText('rankAvgVal', avg.toFixed(2));
    setText('rankLowVal', low.toFixed(2));
    setText('rankRptsVal', rpts);
    
    // Also update alternative element IDs if they exist
    const highEl = document.getElementById('rankHighValue');
    const avgEl = document.getElementById('rankAvgValue');
    const lowEl = document.getElementById('rankLowValue');
    const rptsEl = document.getElementById('rankReportsValue');

    if (highEl) highEl.textContent = high.toFixed(2);
    if (avgEl) avgEl.textContent = avg.toFixed(2);
    if (lowEl) lowEl.textContent = low.toFixed(2);
    if (rptsEl) rptsEl.textContent = String(rpts);
}

function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Add: CSV export based on current render order
function exportProfileGridCsv() {
    try {
        const { rvMap, cumRvMap } = getCachedRvMetrics(profileEvaluations);

        const evals = [...profileEvaluations];
    evals.sort((a, b) => {
        const avgA = parseFloat(a.fitrepAverage || '0');
        const avgB = parseFloat(b.fitrepAverage || '0');
        const rvA = rvMap.get(a.evaluationId) ?? 0;
        const rvB = rvMap.get(b.evaluationId) ?? 0;
        const dateA = new Date(a.marineInfo?.evaluationPeriod?.to || 0).getTime();
        const dateB = new Date(b.marineInfo?.evaluationPeriod?.to || 0).getTime();
        switch (gridSort) {
            case 'AvgAsc': return avgA - avgB;
            case 'AvgDesc': return avgB - avgA;
            case 'RvAsc': return rvA - rvB;
            case 'RvDesc': return rvB - rvA;
            case 'DateAsc': return dateA - dateB;
            case 'DateDesc':
            default: return dateB - dateA;
        }
    });

    const headers = [
        'Rank','Marine','Occasion','Ending Date',
        'Performance','Proficiency','Courage','Stress Tolerance','Initiative','Leading','Developing Others',
        'Setting the Example','Well-Being/Health','Communication Skills','PME','Decision Making','Judgement',
        'Avg','RV','Cum RV'
    ];

    // Precompute Cum RV for rank calculation on the export set
    const cumList = evals.map(e => (cumRvMap.get(e.evaluationId) ?? (rvMap.get(e.evaluationId) ?? 0)));

    const rows = evals.map((e, i) => {
        const traits = getTraitGrades(e);
        const avg = parseFloat(e.fitrepAverage || '0').toFixed(2);
        const rv = (rvMap.get(e.evaluationId) ?? 0);
        const cumRv = (cumRvMap.get(e.evaluationId) ?? rv);
        const endDate = (e.marineInfo?.evaluationPeriod?.to || '').slice(0, 10) || '-';
        
        // Excel-style rank: =COUNTIFS(V:V,">"&[@[Cum RV]])+1
        const rankPos = 1 + cumList.filter(v => v > cumRv).length;
        
        return [
            rankPos,
            e.marineInfo?.name || '-',
            capitalize(e.occasion || '-'),
            endDate,
            traits['Performance'] || '-',
            traits['Proficiency'] || '-',
            traits['Courage'] || '-',
            traits['Stress Tolerance'] || '-',
            traits['Initiative'] || '-',
            traits['Leading'] || '-',
            traits['Developing Others'] || '-',
            traits['Setting the Example'] || '-',
            traits['Well-Being/Health'] || '-',
            traits['Communication Skills'] || '-',
            traits['Professional Military Education'] || '-',
            traits['Decision Making'] || '-',
            traits['Judgement'] || '-',
            avg,
            rv,
            cumRv
        ];
    });

    const csv = [headers, ...rows]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `RS_Profile_Grid_${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification('Export Successful', 'Grid exported as CSV', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showNotification(
            'Export Failed',
            'Failed to export CSV: ' + error.message,
            'error'
        );
    }
}

// Show Dashboard directly from the login card
function openProfileDashboardFromLogin() {
    const loginCard = document.getElementById('profileLoginCard');
    const dashboardCard = document.getElementById('profileDashboardCard');

    if (!loginCard || !dashboardCard) {
        console.warn('Profile cards not found in DOM.');
        return;
    }

    const stored = loadProfileFromStorage();
    if (!stored) {
        alert('No saved RS profile found. Please login first or save an evaluation.');
        return;
    }

    // Make stored profile the active session
    window.currentProfile = {
        rsName: stored.rsName,
        rsEmail: stored.rsEmail,
        rsRank: stored.rsRank,
        totalEvaluations: (stored.evaluations || []).length,
        lastUpdated: stored.lastUpdated || new Date().toISOString()
    };
    window.profileEvaluations = stored.evaluations || [];

    // Ensure routing sees this as an explicit user action
    localStorage.setItem('login_source', 'form');
    
    // Render via the existing dashboard entrypoint
    showProfileDashboard();
}

// Auto-open Dashboard on load if a profile exists
function showProfileDashboardOnLoad() {
    const loginCard = document.getElementById('profileLoginCard');
    const dashboardCard = document.getElementById('profileDashboardCard');
    if (!loginCard || !dashboardCard) return;

    // Only auto-open if the user explicitly logged in via the form
    const hasProfile = localStorage.getItem('has_profile') === 'true';
    const loginSource = localStorage.getItem('login_source');
    if (!hasProfile || loginSource !== 'form') {
        // Keep the login page visible by default and hide Setup
        loginCard.style.display = 'block';
        dashboardCard.style.display = 'none';
        const setupCard = document.getElementById('setupCard');
        if (setupCard) {
            setupCard.classList.remove('active');
            setupCard.style.display = 'none';
        }
        return;
    }

    const stored = loadProfileFromStorage();
    if (!stored) return;

    window.currentProfile = {
        rsName: stored.rsName,
        rsEmail: stored.rsEmail,
        rsRank: stored.rsRank,
        totalEvaluations: (stored.evaluations || []).length,
        lastUpdated: stored.lastUpdated || new Date().toISOString()
    };
    window.profileEvaluations = stored.evaluations || [];

    showProfileDashboard();

    // Prefer showing Dashboard instead of login/setup when a profile exists
    loginCard.style.display = 'none';
    dashboardCard.style.display = 'block';

    const setupCard = document.getElementById('setupCard');
    if (setupCard) setupCard.style.display = 'none';
}

// Profile persistence helpers and GitHub stubs (added)
function loadProfileFromStorage() {
    try {
        const profJson = localStorage.getItem('current_profile');
        if (!profJson) return null;
        const evalsJson = localStorage.getItem('current_evaluations');
        const profile = JSON.parse(profJson);
        const evaluations = evalsJson ? JSON.parse(evalsJson) : [];
        return { ...profile, evaluations };
    } catch (e) {
        console.warn('loadProfileFromStorage failed:', e);
        return null;
    }
}

function generateProfileKey(name, email) {
    const n = String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const e = String(email || '').toLowerCase().trim();
    return `rs:${n}|${e}`;
}

function loadProfileFromLocal(profileKey) {
    try {
        return JSON.parse(localStorage.getItem(`profile:${profileKey}`) || 'null');
    } catch (err) {
        console.warn('loadProfileFromLocal failed:', err);
        return null;
    }
}

function saveProfileToLocal(profileKey, profile) {
    try {
        localStorage.setItem(`profile:${profileKey}`, JSON.stringify(profile));
    } catch (err) {
        console.warn('saveProfileToLocal failed:', err);
    }
}

function loadEvaluationsFromLocal(profileKey) {
    try {
        return JSON.parse(localStorage.getItem(`evaluations:${profileKey}`) || '[]');
    } catch (err) {
        console.warn('loadEvaluationsFromLocal failed:', err);
        return [];
    }
}

function saveEvaluationsToLocal(profileKey, evaluations) {
    try {
        localStorage.setItem(`evaluations:${profileKey}`, JSON.stringify(evaluations));
        invalidateRvCache(); // Invalidate cache when data changes
    } catch (err) {
        console.error('saveEvaluationsToLocal failed:', err);
        if (err.name === 'QuotaExceededError') {
            showNotification(
                'Storage Full',
                'Cannot save evaluation - storage quota exceeded. Please export and delete old evaluations.',
                'error'
            );
        } else {
            showNotification(
                'Save Failed',
                'Failed to save evaluation: ' + err.message,
                'error'
            );
        }
        throw err; // Re-throw so caller knows it failed
    }
}

// GitHub integration using githubService
async function fetchProfileFromGitHub(profileKey) {
    // Extract email from profile key format: "rs:name|email"
    const email = profileKey.split('|')[1];
    if (!email) {
        console.warn('Invalid profile key format');
        return null;
    }

    // Check if GitHub service is available and initialized
    if (typeof githubService === 'undefined' || !githubService.initialized) {
        console.log('GitHub service not initialized, skipping remote fetch');
        return null;
    }

    try {
        const userData = await githubService.loadUserData(email);
        if (!userData) {
            console.log('No profile found on GitHub for:', email);
            return null;
        }

        // Convert GitHub data format to local profile format
        return {
            rsName: userData.profile.rsName,
            rsEmail: userData.profile.rsEmail,
            rsRank: userData.profile.rsRank,
            totalEvaluations: userData.evaluations?.length || 0,
            evaluationFiles: [],
            lastUpdated: userData.lastUpdated,
            evaluations: userData.evaluations || []
        };

    } catch (error) {
        console.error('Error fetching profile from GitHub:', error);
        return null;
    }
}

function mergeProfiles(local, remote) {
    if (!local) return remote || null;
    if (!remote) return local;
    return {
        ...local,
        ...remote,
        evaluationFiles: Array.from(new Set([...(local.evaluationFiles || []), ...(remote.evaluationFiles || [])])),
        totalEvaluations: Math.max(local.totalEvaluations || 0, remote.totalEvaluations || 0),
        lastUpdated: new Date().toISOString()
    };
}

async function syncEvaluationToGitHub(evaluation) {
    // Check if GitHub service is available and initialized
    if (typeof githubService === 'undefined' || !githubService.initialized) {
        console.log('GitHub service not initialized, sync skipped');
        return false;
    }

    try {
        const userEmail = evaluation.rsInfo.email;
        if (!userEmail) {
            console.warn('No user email in evaluation, cannot sync');
            return false;
        }

        // Save evaluation using GitHub service
        const result = await githubService.saveEvaluation(evaluation, userEmail);

        if (result.success) {
            console.log('Evaluation synced to GitHub:', result.message);
            return true;
        } else {
            console.error('Failed to sync evaluation:', result.message);
            return false;
        }

    } catch (error) {
        console.error('Error syncing evaluation to GitHub:', error);
        return false;
    }
}

// Control visibility of dashboard filters and Grid View based on rank selection
function updateDashboardFiltersVisibility() {
    const filters = document.querySelector('.evaluation-filters');
    const gridBtn = document.getElementById('gridViewBtn');
    const rankBar = document.getElementById('rankFilterBar');
    const shouldShow = !!selectedRankFilter;
    
    // Always show filters for the RS Summary list
    if (filters) {
        filters.style.display = '';
    }
    
    // RS Summary View button should always be enabled and visible
    if (gridBtn) {
        gridBtn.disabled = false;
        gridBtn.style.display = '';
        gridBtn.textContent = '📊 RS Summary View';
    }
    
    // Hide legacy rank filter bar (we use summary Grade buttons now)
    if (rankBar) {
        rankBar.style.display = 'none';
    }
}

// New: rank filter setter wired to button bar and dropdown
function setRankFilter(rank) {
    selectedRankFilter = rank || '';

    // Sync dropdown value (even if hidden)
    const rankSelect = document.getElementById('filterByRank');
    if (rankSelect) rankSelect.value = selectedRankFilter;

    // Update button visual state
    const bar = document.getElementById('rankFilterBar');
    if (bar) {
        bar.querySelectorAll('button').forEach(btn => {
            const isActive = (btn.dataset.rank || '') === selectedRankFilter;
            btn.classList.toggle('btn-meets', isActive);
            btn.classList.toggle('btn-secondary', !isActive);
        });
    }

    // Update visibility for filters and Grid View
    updateDashboardFiltersVisibility();

    // Close grid if rank cleared
    const grid = document.getElementById('profileGridContainer');
    if (!selectedRankFilter && grid && grid.style.display === 'block') {
        toggleGridView(false);
    }

    // Re-render list with filters scoped by rank
    renderEvaluationsList();
}

// Only allow opening grid when a rank is selected
function toggleGridView(show) {
    if (show && !selectedRankFilter) {
        alert('Select a rank first to open Grid View.');
        return;
    }
    const list = document.getElementById('evaluationsList');
    const grid = document.getElementById('profileGridContainer');
    if (!list || !grid) return;
    if (show) {
        list.style.display = 'none';
        grid.style.display = 'block';
        renderProfileGrid();
    } else {
        grid.style.display = 'none';
        list.style.display = 'flex';
    }
}

// Apply filters: rank always required to show filters; others applied only when rank selected
function getFilteredEvaluations() {
    const rankVal = selectedRankFilter || '';
    const filtersVisible = !!selectedRankFilter;

    // Base filter by rank (normalize both sides to avoid label mismatches)
    let list = profileEvaluations.filter(e => {
        const evalRankRaw = String(e.marineInfo?.rank || '');
        const evalRank = normalizeRankLabel(evalRankRaw);
        const selected = normalizeRankLabel(rankVal);
        return selected ? evalRank === selected : true;
    });

    if (!filtersVisible) return list;

    // Additional filters (only after a rank is selected)
    const nameVal = (document.getElementById('filterByName')?.value || '').trim().toLowerCase();
    const occasionVal = (document.getElementById('filterByOccasion')?.value || '').trim().toLowerCase();
    const yearVal = (document.getElementById('filterByYear')?.value || '').trim();
    const gradeVal = (document.getElementById('filterByGrade')?.value || '').trim().toUpperCase();

    return list.filter(e => {
        const nameOk = nameVal ? (e.marineInfo?.name || '').toLowerCase().includes(nameVal) : true;
        const occasionOk = occasionVal ? (String(e.occasion || '').toLowerCase() === occasionVal) : true;
        const endDateStr = (e.marineInfo?.evaluationPeriod?.to || '').slice(0, 10);
        const yearOk = yearVal ? (endDateStr && new Date(endDateStr).getFullYear().toString() === yearVal) : true;
        const gradeOk = gradeVal
            ? Object.values(e.traitEvaluations || {}).some(t => String(t.grade || '').toUpperCase() === gradeVal)
            : true;
        return nameOk && occasionOk && yearOk && gradeOk;
    });
}

// Keep renderEvaluationsList and renderProfileGrid using getFilteredEvaluations()
function renderProfileGrid() {
    const tbody = document.querySelector('#profileGrid tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const { rvMap, cumRvMap } = getCachedRvMetrics(profileEvaluations);

    // Define evals, apply filters, then sort
    const evals = [...getFilteredEvaluations()];
    evals.sort((a, b) => {
        const avgA = parseFloat(a.fitrepAverage || '0');
        const avgB = parseFloat(b.fitrepAverage || '0');
        const rvA = rvMap.get(a.evaluationId) ?? 0;
        const rvB = rvMap.get(b.evaluationId) ?? 0;
        const dateA = new Date(a.marineInfo?.evaluationPeriod?.to || 0).getTime();
        const dateB = new Date(b.marineInfo?.evaluationPeriod?.to || 0).getTime();
        switch (gridSort) {
            case 'AvgAsc': return avgA - avgB;
            case 'AvgDesc': return avgB - avgA;
            case 'RvAsc': return rvA - rvB;
            case 'RvDesc': return rvB - rvA;
            case 'DateAsc': return dateA - dateB;
            case 'DateDesc':
            default: return dateB - dateA;
        }
    });
    
    // Precompute Cum RV list for rank calculation (Excel-style)
    const cumValuesById = new Map(
        evals.map(e => [e.evaluationId, (cumRvMap.get(e.evaluationId) ?? (rvMap.get(e.evaluationId) ?? 0))])
    );
    const cumList = Array.from(cumValuesById.values());
    
    // Compute column count for details row spanning
    const headerRow = document.querySelector('#profileGrid thead tr');
    const colCount = headerRow ? headerRow.children.length : 20;

    evals.forEach((evaluation, idx) => {
        const row = document.createElement('tr');
        const traitGrades = getTraitGrades(evaluation);
        const rv = rvMap.get(evaluation.evaluationId) ?? 0;
        const cumRv = cumValuesById.get(evaluation.evaluationId) ?? rv;
        const avg = parseFloat(evaluation.fitrepAverage || '0').toFixed(2);
        
        // Excel-style rank by Cum RV
        const rankPos = 1 + cumList.filter(v => v > cumRv).length;
        
        row.setAttribute('data-eval-id', evaluation.evaluationId);
        row.innerHTML = `
            <td>${rankPos}</td>
            <td style="text-align: left;">${evaluation.marineInfo?.name || '-'}</td>
            <td>${capitalize(evaluation.occasion || '-')}</td>
            <td>${(evaluation.marineInfo?.evaluationPeriod?.to || '').slice(0, 10) || '-'}</td>
            <td class="grade-cell">${traitGrades['Performance'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Proficiency'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Courage'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Stress Tolerance'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Initiative'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Leading'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Developing Others'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Setting the Example'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Well-Being/Health'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Communication Skills'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Professional Military Education'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Decision Making'] || '-'}</td>
            <td class="grade-cell">${traitGrades['Judgement'] || '-'}</td>
            <td class="avg-cell">${avg}</td>
            <td>${badgeForRv(rv)}</td>
            <td>${badgeForRv(cumRv)}</td>
            <td class="actions-cell" style="text-align:right;">
                <span class="sync-status ${evaluation.syncStatus || 'pending'}">
                    ${evaluation.syncStatus === 'synced' ? '✓ Synced' : '⏳ Pending'}
                </span>
                <button class="icon-btn" onclick="deleteEvaluation('${evaluation.evaluationId}')">🗑️</button>
                <span class="expand-icon" onclick="toggleGridDetails(this)">▼</span>
            </td>
        `;
        tbody.appendChild(row);
        
        // Details row (hidden by default, reused content from list view)
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'grid-details-row';
        detailsRow.style.display = 'none';
        detailsRow.setAttribute('data-eval-id', evaluation.evaluationId);
        detailsRow.innerHTML = `
            <td colspan="${colCount}">
                ${renderEvaluationDetails(evaluation)}
            </td>
        `;
        tbody.appendChild(detailsRow);
    });
    
    // Update summary from the Avg column cells that were just rendered
    renderRankSummaryFromDom();}

// Helpers for grid view
function getTraitGrades(evaluation) {
    const columnAliases = {
        'Performance': ['Performance'],
        'Proficiency': ['Proficiency'],
        'Courage': ['Courage'],
        'Stress Tolerance': ['Effectiveness Under Stress', 'Stress Tolerance'],
        'Initiative': ['Initiative'],
        'Leading': ['Leading Subordinates', 'Leading'],
        'Developing Others': ['Developing Subordinates', 'Developing Others'],
        'Setting the Example': ['Setting the Example'],
        'Well-Being/Health': [
            'Ensuring Well-being of Subordinates',
            'Ensuring Well-being',
            'Well-Being/Health',
            'Well Being',
            'Well-being'
        ],
        'Communication Skills': ['Communication Skills'],
        'Professional Military Education': [
            'Professional Military Education (PME)',
            'Professional Military Education',
            'PME'
        ],
        'Decision Making': ['Decision Making Ability', 'Decision Making'],
        'Judgement': ['Judgment', 'Judgement']
    };

    const items = Object.values(evaluation.traitEvaluations || {});
    const map = {};
    Object.keys(columnAliases).forEach(colName => {
        const synonyms = columnAliases[colName];
        const found = items.find(t =>
            synonyms.some(alias => (t.trait || '').trim().toLowerCase() === alias.toLowerCase())
        );
        map[colName] = found ? (found.grade || '-') : '-';
    });
    return map;
}

function computeRvValues(evals) {
    const sorted = [...evals].sort((a, b) => parseFloat(b.fitrepAverage || '0') - parseFloat(a.fitrepAverage || '0'));
    const n = sorted.length;
    const rvMap = new Map();
    if (n === 0) return rvMap;
    if (n === 1) {
        rvMap.set(sorted[0].evaluationId, 100);
        return rvMap;
    }
    sorted.forEach((e, i) => {
        const rv = Math.round(100 - (i * 100 / (n - 1)));
        rvMap.set(e.evaluationId, rv);
    });
    return rvMap;
}

function computeCumulativeRv(evals, rvMap) {
    // Cumulative RV: running average over numeric RVs only; "N/A" until any numeric RV present.
    const byDate = [...evals].sort((a, b) => new Date(a.completedDate || 0) - new Date(b.completedDate || 0));
    const cumMap = new Map();
    let sum = 0;
    let count = 0;
    byDate.forEach(e => {
        const rv = rvMap.get(e.evaluationId);
        if (typeof rv === 'number' && Number.isFinite(rv)) {
            sum += rv;
            count += 1;
            cumMap.set(e.evaluationId, Math.round(sum / count));
        } else {
            // Still no numeric RVs — show N/A
            cumMap.set(e.evaluationId, count > 0 ? Math.round(sum / count) : 'N/A');
        }
    });
    return cumMap;
}

function badgeForRv(rv) {
    if (rv === 'N/A' || !Number.isFinite(rv)) {
        return `<span class="rv-badge rv-mid">N/A</span>`;
    }
    const cls = rv >= 90 ? 'rv-high' : rv >= 75 ? 'rv-mid' : 'rv-low';
    return `<span class="rv-badge ${cls}">${rv}</span>`;
}

function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// Add: CSV export based on current render order
function exportProfileGridCsv() {
    try {
        const { rvMap, cumRvMap } = getCachedRvMetrics(profileEvaluations);

        const evals = [...profileEvaluations];
    evals.sort((a, b) => {
        const avgA = parseFloat(a.fitrepAverage || '0');
        const avgB = parseFloat(b.fitrepAverage || '0');
        const rvA = rvMap.get(a.evaluationId) ?? 0;
        const rvB = rvMap.get(b.evaluationId) ?? 0;
        const dateA = new Date(a.marineInfo?.evaluationPeriod?.to || 0).getTime();
        const dateB = new Date(b.marineInfo?.evaluationPeriod?.to || 0).getTime();
        switch (gridSort) {
            case 'AvgAsc': return avgA - avgB;
            case 'AvgDesc': return avgB - avgA;
            case 'RvAsc': return rvA - rvB;
            case 'RvDesc': return rvB - rvA;
            case 'DateAsc': return dateA - dateB;
            case 'DateDesc':
            default: return dateB - dateA;
        }
    });

    const headers = [
        'Rank','Marine','Occasion','Ending Date',
        'Performance','Proficiency','Courage','Stress Tolerance','Initiative','Leading','Developing Others',
        'Setting the Example','Well-Being/Health','Communication Skills','PME','Decision Making','Judgement',
        'Avg','RV','Cum RV'
    ];

    const rows = evals.map((e, i) => {
        const traits = getTraitGrades(e);
        const avg = parseFloat(e.fitrepAverage || '0').toFixed(2);
        const rv = (computeRvValues(evals).get(e.evaluationId) ?? 0);
        const cumRv = (computeCumulativeRv(evals, computeRvValues(evals)).get(e.evaluationId) ?? rv);
        const endDate = (e.marineInfo?.evaluationPeriod?.to || '').slice(0, 10) || '-';
        return [
            i + 1,
            e.marineInfo?.name || '-',
            capitalize(e.occasion || '-'),
            endDate,
            traits['Performance'] || '-',
            traits['Proficiency'] || '-',
            traits['Courage'] || '-',
            traits['Stress Tolerance'] || '-',
            traits['Initiative'] || '-',
            traits['Leading'] || '-',
            traits['Developing Others'] || '-',
            traits['Setting the Example'] || '-',
            traits['Well-Being/Health'] || '-',
            traits['Communication Skills'] || '-',
            traits['Professional Military Education'] || '-',
            traits['Decision Making'] || '-',
            traits['Judgement'] || '-',
            avg,
            rv,
            cumRv
        ];
    });

    const csv = [headers, ...rows]
        .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `RS_Profile_Grid_${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showNotification('Export Successful', 'Grid exported as CSV', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showNotification(
            'Export Failed',
            'Failed to export CSV: ' + error.message,
            'error'
        );
    }
}

function toggleGridDetails(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const detailsRow = row.nextElementSibling;
    if (!detailsRow || !detailsRow.classList.contains('grid-details-row')) return;

    const isHidden = detailsRow.style.display === 'none' || !detailsRow.style.display;
    detailsRow.style.display = isHidden ? 'table-row' : 'none';
    btn.textContent = isHidden ? 'Details ▲' : 'Details ▼';
}

function normalizeRankLabel(rank) {
    // Map common rank inputs to the desired display labels
    const map = {
        // Enlisted
        'sgt': 'SGT',
        'ssgt': 'SSGT',
        'gysgt': 'GYSGT',
        'msgt': 'MSGT',
        '1stsgt': '1STSGT',
        '1st sgt': '1STSGT',
        // Warrant
        'wo': 'WO',
        'cwo2': 'CWO2',
        'cwo3': 'CWO3',
        'cwo4': 'CWO4',
        'cwo5': 'CWO5',
        // Officer
        '2ndlt': '2NDLT',
        '2nd lt': '2NDLT',
        '1stlt': '1STLT',
        '1st lt': '1STLT',
        'capt': 'CAPT',
        'maj': 'MAJ',
        'ltcol': 'LTCOL',
        'col': 'COL'
    };
    const key = rank.replace(/\./g, '').replace(/\s+/g, '').toLowerCase();
    return map[key] || rank.toUpperCase();
}

// Show Dashboard directly from the login card
function openProfileDashboardFromLogin() {
    const loginCard = document.getElementById('profileLoginCard');
    const dashboardCard = document.getElementById('profileDashboardCard');

    if (!loginCard || !dashboardCard) {
        console.warn('Profile cards not found in DOM.');
        return;
    }

    const stored = loadProfileFromStorage();
    if (!stored) {
        alert('No saved RS profile found. Please login first or save an evaluation.');
        return;
    }

    // Hydrate session from storage snapshot
    window.currentProfile = {
        rsName: stored.rsName,
        rsEmail: stored.rsEmail,
        rsRank: stored.rsRank,
        totalEvaluations: (stored.evaluations || []).length,
        lastUpdated: stored.lastUpdated || new Date().toISOString()
    };
    window.profileEvaluations = stored.evaluations || [];

    // Render consistently via the dashboard entrypoint
    showProfileDashboard();
}

// Auto-open Dashboard on load if a profile exists
function showProfileDashboardOnLoad() {
    const loginCard = document.getElementById('profileLoginCard');
    const dashboardCard = document.getElementById('profileDashboardCard');
    if (!loginCard || !dashboardCard) return;

    // Only auto-open if the user explicitly logged in via the form
    const hasProfile = localStorage.getItem('has_profile') === 'true';
    const loginSource = localStorage.getItem('login_source');
    if (!hasProfile || loginSource !== 'form') {
        // Keep the login page visible by default and hide Setup
        loginCard.style.display = 'block';
        dashboardCard.style.display = 'none';
        const setupCard = document.getElementById('setupCard');
        if (setupCard) {
            setupCard.classList.remove('active');
            setupCard.style.display = 'none';
        }
        return;
    }

    const stored = loadProfileFromStorage();
    if (!stored) return;

    window.currentProfile = {
        rsName: stored.rsName,
        rsEmail: stored.rsEmail,
        rsRank: stored.rsRank,
        totalEvaluations: (stored.evaluations || []).length,
        lastUpdated: stored.lastUpdated || new Date().toISOString()
    };
    window.profileEvaluations = stored.evaluations || [];

    showProfileDashboard();

    // Prefer showing Dashboard instead of login/setup when a profile exists
    loginCard.style.display = 'none';
    dashboardCard.style.display = 'block';

    const setupCard = document.getElementById('setupCard');
    if (setupCard) setupCard.style.display = 'none';
}

// Profile persistence helpers and GitHub stubs (added)
function generateProfileKey(name, email) {
    const n = String(name || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const e = String(email || '').toLowerCase().trim();
    return `rs:${n}|${e}`;
}

function loadProfileFromLocal(profileKey) {
    try {
        return JSON.parse(localStorage.getItem(`profile:${profileKey}`) || 'null');
    } catch (err) {
        console.warn('loadProfileFromLocal failed:', err);
        return null;
    }
}

function saveProfileToLocal(profileKey, profile) {
    try {
        localStorage.setItem(`profile:${profileKey}`, JSON.stringify(profile));
    } catch (err) {
        console.warn('saveProfileToLocal failed:', err);
    }
}

function loadEvaluationsFromLocal(profileKey) {
    try {
        return JSON.parse(localStorage.getItem(`evaluations:${profileKey}`) || '[]');
    } catch (err) {
        console.warn('loadEvaluationsFromLocal failed:', err);
        return [];
    }
}

function saveEvaluationsToLocal(profileKey, evaluations) {
    try {
        localStorage.setItem(`evaluations:${profileKey}`, JSON.stringify(evaluations));
        invalidateRvCache(); // Invalidate cache when data changes
    } catch (err) {
        console.error('saveEvaluationsToLocal failed:', err);
        if (err.name === 'QuotaExceededError') {
            showNotification(
                'Storage Full',
                'Cannot save evaluation - storage quota exceeded. Please export and delete old evaluations.',
                'error'
            );
        } else {
            showNotification(
                'Save Failed',
                'Failed to save evaluation: ' + err.message,
                'error'
            );
        }
        throw err; // Re-throw so caller knows it failed
    }
}

// GitHub integration using githubService
async function fetchProfileFromGitHub(profileKey) {
    // Extract email from profile key format: "rs:name|email"
    const email = profileKey.split('|')[1];
    if (!email) {
        console.warn('Invalid profile key format');
        return null;
    }

    // Check if GitHub service is available and initialized
    if (typeof githubService === 'undefined' || !githubService.initialized) {
        console.log('GitHub service not initialized, skipping remote fetch');
        return null;
    }

    try {
        const userData = await githubService.loadUserData(email);
        if (!userData) {
            console.log('No profile found on GitHub for:', email);
            return null;
        }

        // Convert GitHub data format to local profile format
        return {
            rsName: userData.profile.rsName,
            rsEmail: userData.profile.rsEmail,
            rsRank: userData.profile.rsRank,
            totalEvaluations: userData.evaluations?.length || 0,
            evaluationFiles: [],
            lastUpdated: userData.lastUpdated,
            evaluations: userData.evaluations || []
        };

    } catch (error) {
        console.error('Error fetching profile from GitHub:', error);
        return null;
    }
}

function mergeProfiles(local, remote) {
    if (!local) return remote || null;
    if (!remote) return local;
    return {
        ...local,
        ...remote,
        evaluationFiles: Array.from(new Set([...(local.evaluationFiles || []), ...(remote.evaluationFiles || [])])),
        totalEvaluations: Math.max(local.totalEvaluations || 0, remote.totalEvaluations || 0),
        lastUpdated: new Date().toISOString()
    };
}

async function syncEvaluationToGitHub(evaluation) {
    // Check if GitHub service is available and initialized
    if (typeof githubService === 'undefined' || !githubService.initialized) {
        console.log('GitHub service not initialized, sync skipped');
        return false;
    }

    try {
        const userEmail = evaluation.rsInfo.email;
        if (!userEmail) {
            console.warn('No user email in evaluation, cannot sync');
            return false;
        }

        // Save evaluation using GitHub service
        const result = await githubService.saveEvaluation(evaluation, userEmail);

        if (result.success) {
            console.log('Evaluation synced to GitHub:', result.message);
            return true;
        } else {
            console.error('Failed to sync evaluation:', result.message);
            return false;
        }

    } catch (error) {
        console.error('Error syncing evaluation to GitHub:', error);
        return false;
    }
}
// Initialize GitHub Service on page load
async function initializeGitHubService() {
    if (typeof githubService === 'undefined') {
        console.log('GitHub service not loaded, sync features will be unavailable');
        return;
    }

    try {
        // Attempt to get token from environment
        const token = await githubService.getTokenFromEnvironment();

        if (token) {
            githubService.initialize(token);
            const isConnected = await githubService.verifyConnection();

            if (isConnected) {
                console.log('✓ GitHub sync available');
                updateConnectionStatus(); // Update UI status indicator
            } else {
                console.warn('GitHub token found but connection failed');
            }
        } else {
            console.log('No GitHub token available - operating in offline mode');
        }
    } catch (error) {
        console.error('Failed to initialize GitHub service:', error);
    }
}

// Call initialization on page load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', initializeGitHubService);
}

// ============================================================================
// GitHub Token Configuration Functions
// ============================================================================

/**
 * Open GitHub configuration modal
 */
function openGitHubConfigModal() {
    const modal = document.getElementById('githubConfigModal');
    if (modal) {
        modal.style.display = 'flex';
        
        // Clear previous input
        const input = document.getElementById('githubTokenInput');
        if (input) input.value = '';
        
        // Hide status
        const status = document.getElementById('githubConfigStatus');
        if (status) status.style.display = 'none';
    }
}

/**
 * Close GitHub configuration modal
 */
function closeGitHubConfigModal() {
    const modal = document.getElementById('githubConfigModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Toggle token visibility
 */
function toggleTokenVisibility() {
    const input = document.getElementById('githubTokenInput');
    const checkbox = document.getElementById('showTokenCheckbox');
    
    if (input && checkbox) {
        input.type = checkbox.checked ? 'text' : 'password';
    }
}

/**
 * Save and test GitHub token
 */
async function saveGitHubToken() {
    const input = document.getElementById('githubTokenInput');
    const status = document.getElementById('githubConfigStatus');
    
    if (!input || !status) return;
    
    const token = input.value.trim();
    
    // Validate token format
    if (!token) {
        showConfigStatus('error', '❌ Please enter a GitHub token');
        return;
    }
    
    if (!token.startsWith('ghp_')) {
        showConfigStatus('error', '❌ Invalid token format. Must start with "ghp_"');
        return;
    }
    
    // Show loading
    showConfigStatus('loading', '⏳ Testing connection...');
    
    try {
        // Store token
        const stored = githubService.storeToken(token);
        if (!stored) {
            showConfigStatus('error', '❌ Failed to store token');
            return;
        }
        
        // Initialize service
        githubService.initialize(token);
        
        // Test connection
        const connected = await githubService.verifyConnection();
        
        if (connected) {
            showConfigStatus('success', '✅ Successfully connected to GitHub!');
            
            // Update connection status in UI
            updateConnectionStatus();
            
            // Re-initialize to ensure everything is set up
            await initializeGitHubService();
            
            // Close modal after 2 seconds
            setTimeout(() => {
                closeGitHubConfigModal();
            }, 2000);
        } else {
            showConfigStatus('error', '❌ Connection failed. Check token permissions and repository access.');
            githubService.clearToken();
        }
    } catch (error) {
        console.error('Error testing GitHub connection:', error);
        showConfigStatus('error', `❌ Error: ${error.message}`);
        githubService.clearToken();
    }
}

/**
 * Clear stored GitHub token
 */
function clearGitHubToken() {
    if (confirm('Are you sure you want to clear the stored GitHub token?\n\nGitHub sync will be disabled.')) {
        githubService.clearToken();
        showConfigStatus('success', '✅ Token cleared');
        updateConnectionStatus();
        
        setTimeout(() => {
            closeGitHubConfigModal();
        }, 1500);
    }
}

/**
 * Show status message in config modal
 */
function showConfigStatus(type, message) {
    const status = document.getElementById('githubConfigStatus');
    if (!status) return;
    
    status.className = type;
    status.textContent = message;
    status.style.display = 'block';
}

/**
 * Update connection status indicator in UI
 */
function updateConnectionStatus() {
    // Update in profile dashboard if it exists
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('connectionStatus');
    
    if (githubService.initialized) {
        if (statusDot) {
            statusDot.className = 'status-dot online';
        }
        if (statusText) {
            statusText.textContent = 'Online - GitHub sync enabled';
        }
    } else {
        if (statusDot) {
            statusDot.className = 'status-dot offline';
        }
        if (statusText) {
            statusText.textContent = 'Offline - Changes saved locally';
        }
    }
}

// Add button to profile dashboard for GitHub configuration
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        // Add GitHub config button to profile actions bar if it exists
        const actionsBar = document.querySelector('.profile-actions-bar');
        if (actionsBar && typeof githubService !== 'undefined') {
            // Check if button doesn't already exist
            if (!document.getElementById('githubConfigBtn')) {
                const configBtn = document.createElement('button');
                configBtn.id = 'githubConfigBtn';
                configBtn.className = 'btn btn-secondary';
                configBtn.onclick = openGitHubConfigModal;
                configBtn.innerHTML = githubService.hasStoredToken() ? '⚙️ GitHub Settings' : '🔗 Connect GitHub';
                
                // Insert before logout button
                const logoutBtn = Array.from(actionsBar.children).find(btn => 
                    btn.textContent.includes('Logout')
                );
                if (logoutBtn) {
                    actionsBar.insertBefore(configBtn, logoutBtn);
                } else {
                    actionsBar.appendChild(configBtn);
                }
            }
        }
    });
}
