// Main Application Logic & Event Handlers

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize voice recognition
    initializeVoiceRecognition();
    
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
    
    // Close examples when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.examples-dropdown')) {
            const examplesList = document.getElementById('examplesList');
            if (examplesList) {
                examplesList.classList.remove('active');
            }
        }
    });
});
    