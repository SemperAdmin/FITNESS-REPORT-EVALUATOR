// Utility Functions

function getGradeNumber(grade) {
    const gradeNumbers = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 0 };
    return gradeNumbers[grade];
}

function updateWordCount() {
    const textarea = document.getElementById('justificationText');
    const counter = document.getElementById('wordCount');
    
    if (!textarea || !counter) return;
    
    const words = textarea.value.trim().split(/\s+/).filter(word => word.length > 0);
    const count = words.length;
    
    counter.textContent = `${count} words`;
    counter.className = 'word-count';
    
    if (count < 20) {
        counter.classList.add('error');
    } else if (count < 30) {
        counter.classList.add('warning');
    }
}

function updateProgress() {
    const progress = (currentTraitIndex / allTraits.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    
    if (currentTraitIndex < allTraits.length) {
        const currentTrait = allTraits[currentTraitIndex];
        document.getElementById('progressText').textContent = 
            `${currentTrait.sectionTitle}: ${currentTrait.name} (${currentTraitIndex + 1} of ${allTraits.length})`;
    } else {
        document.getElementById('progressText').textContent = 'Directed Comments Selection';
    }
}

function calculateFitrepAverage() {
    let totalPoints = 0;
    let observedAttributes = 0;
    
    Object.values(evaluationResults).forEach(result => {
        if (result.gradeNumber > 0) {
            totalPoints += result.gradeNumber;
            observedAttributes++;
        }
    });
    
    return observedAttributes > 0 ? (totalPoints / observedAttributes).toFixed(2) : 0;
}

function exportToClipboard() {
    const fitrepAverage = calculateFitrepAverage();
    let exportText = "USMC FITREP Evaluation Results\n";
    exportText += "================================\n\n";
    exportText += `Marine: ${evaluationMeta.marineName}\n`;
    exportText += `Period: ${evaluationMeta.fromDate} to ${evaluationMeta.toDate}\n`;
    exportText += `Reporting Senior: ${evaluationMeta.evaluatorName}\n`;
    exportText += `Completed: ${new Date().toLocaleDateString()}\n\n`;
    exportText += `FITREP Average: ${fitrepAverage}\n\n`;
    
    exportText += "TRAIT EVALUATIONS:\n";
    exportText += "==================\n";
    Object.keys(evaluationResults).forEach(key => {
        const result = evaluationResults[key];
        exportText += `${result.section}: ${result.trait}\n`;
        exportText += `Grade: ${result.grade} (Value: ${result.gradeNumber})\n`;
        exportText += `Justification: ${result.justification}\n\n`;
    });
    
    if (evaluationMeta.sectionIComments && evaluationMeta.sectionIComments.trim()) {
        exportText += "SECTION I - NARRATIVE COMMENTS:\n";
        exportText += "===============================\n";
        exportText += `${evaluationMeta.sectionIComments}\n\n`;
    }
    
    if (evaluationMeta.directedComments && evaluationMeta.directedComments.trim()) {
        exportText += "SECTION I - DIRECTED COMMENTS:\n";
        exportText += "==============================\n";
        exportText += `${evaluationMeta.directedComments}\n\n`;
    }
    
    navigator.clipboard.writeText(exportText).then(() => {
        alert('Results copied to clipboard!');
    });
}

function resetEvaluation() {
    if (confirm('Are you sure you want to start over? All progress will be lost.')) {
        // Reset all state variables
        currentTraitIndex = 0;
        currentEvaluationLevel = 'B';
        evaluationResults = {};
        allTraits = [];
        isReportingSenior = false;
        pendingEvaluation = null;
        evaluationMeta = {};
        selectedDirectedComments = [];
        directedCommentsData = {};
        generatedSectionI = '';
        currentGenerationStyle = 'comprehensive';
        
        location.reload();
    }
}

function openHelpModal() {
    document.getElementById('helpModal').classList.add('active');
}

function closeHelpModal() {
    document.getElementById('helpModal').classList.remove('active');
}