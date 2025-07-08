// Voice Recognition Functions
let voiceRecognition = null;

function initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window) {
        voiceRecognition = new webkitSpeechRecognition();
        voiceRecognition.continuous = true;
        voiceRecognition.interimResults = true;
        voiceRecognition.lang = 'en-US';
        
        voiceRecognition.onresult = function(event) {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                const textarea = document.getElementById('justificationText');
                textarea.value += (textarea.value ? ' ' : '') + finalTranscript;
                updateWordCount();
            }
        };

        voiceRecognition.onerror = function(event) {
            console.error('Voice recognition error:', event.error);
            const btn = document.getElementById('voiceBtn');
            if (btn) {
                btn.classList.remove('active');
                btn.textContent = '🎤 Voice Input';
            }
        };
    }
}

function toggleVoiceInput() {
    const btn = document.getElementById('voiceBtn');
    if (!voiceRecognition) {
        alert('Voice recognition not supported in this browser');
        return;
    }
    
    if (btn.classList.contains('active')) {
        voiceRecognition.stop();
        btn.classList.remove('active');
        btn.textContent = '🎤 Voice Input';
    } else {
        voiceRecognition.start();
        btn.classList.add('active');
        btn.textContent = '🔴 Recording...';
    }
}

function toggleExamples() {
    const list = document.getElementById('examplesList');
    list.classList.toggle('active');
    
    if (list.classList.contains('active') && pendingEvaluation) {
        const trait = pendingEvaluation.trait;
        const examples = enhancedFirepData.examples[trait.sectionKey]?.[trait.traitKey];
        
        list.innerHTML = '';
        if (examples) {
            Object.keys(examples).forEach(grade => {
                const item = document.createElement('div');
                item.className = 'example-item';
                item.innerHTML = `<strong>Grade ${grade}:</strong> ${examples[grade]}`;
                item.onclick = () => {
                    const textarea = document.getElementById('justificationText');
                    textarea.value = examples[grade];
                    updateWordCount();
                    list.classList.remove('active');
                };
                list.appendChild(item);
            });
        } else {
            list.innerHTML = '<div class="example-item">No examples available for this trait</div>';
        }
    }
}

function spellCheck() {
    const textarea = document.getElementById('justificationText');
    if ('spellcheck' in textarea) {
        textarea.spellcheck = !textarea.spellcheck;
        alert(textarea.spellcheck ? 'Spell check enabled' : 'Spell check disabled');
    } else {
        // Basic spell check simulation - highlight potential issues
        const text = textarea.value;
        const commonMisspellings = {
            'teh': 'the',
            'adn': 'and',
            'recieve': 'receive',
            'seperate': 'separate',
            'definately': 'definitely',
            'occured': 'occurred',
            'acheive': 'achieve',
            'beleive': 'believe'
        };
        
        let correctedText = text;
        let corrections = [];
        
        Object.keys(commonMisspellings).forEach(misspelling => {
            const regex = new RegExp('\\b' + misspelling + '\\b', 'gi');
            if (regex.test(correctedText)) {
                correctedText = correctedText.replace(regex, commonMisspellings[misspelling]);
                corrections.push(`${misspelling} → ${commonMisspellings[misspelling]}`);
            }
        });
        
        if (corrections.length > 0) {
            if (confirm(`Found potential corrections:\n${corrections.join('\n')}\n\nApply corrections?`)) {
                textarea.value = correctedText;
                updateWordCount();
            }
        } else {
            alert('No common misspellings detected');
        }
    }
}