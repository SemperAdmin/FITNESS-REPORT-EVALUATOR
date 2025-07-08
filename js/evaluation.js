// Core Evaluation Logic
let currentTraitIndex = 0;
let currentEvaluationLevel = 'B';
let evaluationResults = {};
let allTraits = [];
let isReportingSenior = false;
let pendingEvaluation = null;
let evaluationMeta = {};

function startEvaluation() {
    const marineName = document.getElementById('marineNameInput').value.trim();
    const fromDate = document.getElementById('fromDateInput').value;
    const toDate = document.getElementById('toDateInput').value;
    const selection = document.getElementById('reportingSeniorSelect').value;
    const evaluatorName = document.getElementById('evaluatorNameInput').value.trim();
    
    if (!marineName || !fromDate || !toDate || !selection || !evaluatorName) {
        alert('Please complete all required fields before beginning the evaluation.');
        return;
    }
    
    evaluationMeta = {
        marineName,
        fromDate,
        toDate,
        evaluatorName
    };
    
    isReportingSenior = (selection === 'yes');
    initializeTraits();
    
    document.getElementById('setupCard').style.display = 'none';
    document.getElementById('howItWorksCard').style.display = 'none';
    document.getElementById('dataWarning').style.display = 'none';
    
    updateProgress();
    renderCurrentTrait();
}

function initializeTraits() {
    allTraits = [];
    ['D', 'E', 'F', 'G'].forEach(sectionKey => {
        const section = firepData.sections[sectionKey];
        Object.keys(section.traits).forEach(traitKey => {
            allTraits.push({
                sectionKey,
                traitKey,
                sectionTitle: section.title,
                ...section.traits[traitKey]
            });
        });
    });
    
    if (isReportingSenior) {
        const sectionH = firepData.sections.H;
        Object.keys(sectionH.traits).forEach(traitKey => {
            allTraits.push({
                sectionKey: 'H',
                traitKey,
                sectionTitle: sectionH.title,
                ...sectionH.traits[traitKey]
            });
        });
    }
}

function renderCurrentTrait() {
    const container = document.getElementById('evaluationContainer');
    
    if (currentTraitIndex >= allTraits.length) {
        container.innerHTML = '';
        showDirectedCommentsScreen();
        return;
    }

    const trait = allTraits[currentTraitIndex];
    const gradeInfo = firepData.gradeDescriptions[currentEvaluationLevel];
    const isAtA = currentEvaluationLevel === 'A';

    container.innerHTML = `
        <div class="evaluation-card active">
            <div class="trait-header">
                <div class="trait-title">${trait.sectionTitle}</div>
                <div class="trait-subtitle">${trait.name}</div>
                <div class="trait-description">${trait.description}</div>
            </div>
            
            <div class="grade-display ${gradeInfo.class}">
                <div class="grade-description">${gradeInfo.description}</div>
            </div>
            
            <div class="action-buttons">
                <button class="btn btn-does-not-meet" onclick="handleGradeAction('does-not-meet')" 
                        ${isAtA ? 'disabled' : ''}>
                    Does Not Meet
                </button>
                <button class="btn btn-meets" onclick="handleGradeAction('meets')">
                    Meets
                </button>
                <button class="btn btn-surpasses" onclick="handleGradeAction('surpasses')">
                    Surpasses
                </button>
            </div>
        </div>
    `;
}

function handleGradeAction(action) {
    const trait = allTraits[currentTraitIndex];
    let selectedGrade = currentEvaluationLevel;
    
    switch(action) {
        case 'does-not-meet':
            if (currentEvaluationLevel === 'B') selectedGrade = 'A';
            else if (currentEvaluationLevel === 'D') selectedGrade = 'C';
            else if (currentEvaluationLevel === 'F') selectedGrade = 'E';
            finalizeTrait(selectedGrade);
            break;
            
        case 'meets':
            finalizeTrait(currentEvaluationLevel);
            break;
            
        case 'surpasses':
            if (currentEvaluationLevel === 'B') {
                currentEvaluationLevel = 'D';
                renderCurrentTrait();
            } else if (currentEvaluationLevel === 'D') {
                currentEvaluationLevel = 'F';
                renderCurrentTrait();
            } else if (currentEvaluationLevel === 'F') {
                finalizeTrait('G');
            }
            break;
    }
}

function finalizeTrait(grade) {
    const trait = allTraits[currentTraitIndex];
    
    pendingEvaluation = {
        trait: trait,
        grade: grade,
        gradeNumber: getGradeNumber(grade)
    };
    
    showJustificationModal();
}

function showJustificationModal() {
    const modal = document.getElementById('justificationModal');
    const trait = pendingEvaluation.trait;
    
    document.getElementById('justificationTitle').textContent = 
        `${trait.sectionTitle}: ${trait.name}`;
    document.getElementById('justificationGrade').textContent = 
        `Grade: ${pendingEvaluation.grade} (Value: ${pendingEvaluation.gradeNumber})`;
    document.getElementById('justificationText').value = '';
    
    // Reset tools
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.classList.remove('active');
        voiceBtn.textContent = '🎤 Voice Input';
    }
    
    updateWordCount();
    modal.classList.add('active');
    document.getElementById('justificationText').focus();
}

function saveJustification() {
    const justificationText = document.getElementById('justificationText').value.trim();
    
    if (!justificationText) {
        alert('Please provide justification for this marking before continuing.');
        return;
    }

    const trait = pendingEvaluation.trait;
    
    evaluationResults[`${trait.sectionKey}_${trait.traitKey}`] = {
        section: trait.sectionTitle,
        trait: trait.name,
        grade: pendingEvaluation.grade,
        gradeNumber: pendingEvaluation.gradeNumber,
        justification: justificationText
    };
    
    // Stop voice recording if active
    if (voiceRecognition) {
        voiceRecognition.stop();
    }
    
    // Reset voice button
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.classList.remove('active');
        voiceBtn.textContent = '🎤 Voice Input';
    }
    
    // Close examples dropdown
    const examplesList = document.getElementById('examplesList');
    if (examplesList) {
        examplesList.classList.remove('active');
    }
    
    document.getElementById('justificationModal').classList.remove('active');
    pendingEvaluation = null;
    
    currentTraitIndex++;
    currentEvaluationLevel = 'B';
    updateProgress();
    renderCurrentTrait();
}

function cancelJustification() {
    // Stop voice recording if active
    if (voiceRecognition) {
        voiceRecognition.stop();
    }
    
    // Reset voice button
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.classList.remove('active');
        voiceBtn.textContent = '🎤 Voice Input';
    }
    
    // Close examples dropdown
    const examplesList = document.getElementById('examplesList');
    if (examplesList) {
        examplesList.classList.remove('active');
    }
    
    document.getElementById('justificationModal').classList.remove('active');
    pendingEvaluation = null;
}

function showSummary() {
    document.getElementById('summaryCard').classList.add('active');
    
    const fitrepAverage = calculateFitrepAverage();
    document.getElementById('fitrepAverage').textContent = 
        `FITREP Average: ${fitrepAverage}`;
    
    const metaDiv = document.getElementById('evaluationMeta');
    metaDiv.innerHTML = `
        <strong>Marine:</strong> ${evaluationMeta.marineName} | 
        <strong>Period:</strong> ${evaluationMeta.fromDate} to ${evaluationMeta.toDate} | 
        <strong>Reporting Senior:</strong> ${evaluationMeta.evaluatorName} | 
        <strong>Completed:</strong> ${new Date().toLocaleDateString()}
    `;
    
    const summaryGrid = document.getElementById('summaryGrid');
    summaryGrid.innerHTML = '';
    
    // Add trait evaluations
    Object.keys(evaluationResults).forEach(key => {
        const result = evaluationResults[key];
        const item = document.createElement('div');
        item.className = 'summary-item';
        item.innerHTML = `
            <div class="summary-trait">${result.section}: ${result.trait}</div>
            <div class="summary-grade">Grade: ${result.grade} (${result.gradeNumber})</div>
            <div class="summary-justification">${result.justification}</div>
        `;
        summaryGrid.appendChild(item);
    });
    
    // Add Section I comments if present
    if (evaluationMeta.sectionIComments && evaluationMeta.sectionIComments.trim()) {
        const sectionIItem = document.createElement('div');
        sectionIItem.className = 'summary-item';
        sectionIItem.style.gridColumn = '1 / -1'; // Span full width
        sectionIItem.style.background = '#e8f5e8';
        sectionIItem.innerHTML = `
            <div class="summary-trait">Section I - Narrative Comments</div>
            <div class="summary-justification" style="max-height: none; font-size: 13px; line-height: 1.4; white-space: pre-line;">
                ${evaluationMeta.sectionIComments}
            </div>
        `;
        summaryGrid.appendChild(sectionIItem);
    }
    
    // Add directed comments if present
    if (evaluationMeta.directedComments && evaluationMeta.directedComments.trim()) {
        const directedCommentsItem = document.createElement('div');
        directedCommentsItem.className = 'summary-item';
        directedCommentsItem.style.gridColumn = '1 / -1'; // Span full width
        directedCommentsItem.style.background = '#f0f7ff';
        directedCommentsItem.innerHTML = `
            <div class="summary-trait">Section I - Directed Comments</div>
            <div class="summary-justification" style="max-height: none; font-size: 13px; line-height: 1.4; white-space: pre-line;">
                ${evaluationMeta.directedComments}
            </div>
        `;
        summaryGrid.appendChild(directedCommentsItem);
    }
}