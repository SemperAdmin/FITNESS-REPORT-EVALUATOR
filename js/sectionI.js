// Section I Comment Generation Functions
let generatedSectionI = '';
let currentGenerationStyle = 'comprehensive';

// Section I Comment Templates
const sectionITemplates = {
    top: {
        openings: [
            "An exceptional Marine who consistently demonstrates outstanding performance across all areas of responsibility.",
            "A highly motivated and technically proficient Marine whose performance significantly exceeds expectations.",
            "An immensely talented and effective Marine who serves as a role model for subordinates and peers.",
            "A superior performer whose dedication to excellence and professional competence set the standard for others."
        ],
        performance: [
            "Demonstrates exceptional technical and tactical proficiency in all assigned duties.",
            "Consistently produces results that exceed unit standards and expectations.",
            "Shows remarkable initiative and problem-solving abilities in challenging situations.",
            "Exhibits outstanding attention to detail and commitment to mission accomplishment."
        ],
        leadership: [
            "Provides inspirational leadership that motivates subordinates to achieve their highest potential.",
            "Demonstrates exceptional judgment and decision-making ability under pressure.",
            "Mentors and develops subordinates with patience, skill, and genuine concern for their welfare.",
            "Serves as an exemplary role model, consistently demonstrating Marine Corps values."
        ],
        character: [
            "Demonstrates unwavering integrity and embodies Marine Corps values in all actions.",
            "Shows exceptional courage and moral strength in challenging situations.",
            "Maintains the highest standards of personal and professional conduct."
        ],
        promotion: [
            "Strongly recommended for immediate promotion and increased responsibility.",
            "Ready for promotion ahead of peers and assignment to positions of greater responsibility.",
            "Highly recommended for accelerated promotion and leadership positions.",
            "Recommended for promotion without reservation and selection for advanced training opportunities."
        ]
    },
    middle: {
        openings: [
            "A competent and reliable Marine who consistently meets expectations and demonstrates steady performance.",
            "A mature and dedicated Marine who performs duties with professionalism and attention to detail.",
            "A conscientious Marine who demonstrates solid performance and commitment to mission accomplishment.",
            "A dependable Marine who maintains appropriate standards and contributes positively to unit effectiveness."
        ],
        performance: [
            "Demonstrates competent technical knowledge and consistently completes assigned tasks.",
            "Shows good understanding of duties and performs them with appropriate attention to detail.",
            "Maintains required standards and contributes effectively to unit mission accomplishment.",
            "Exhibits reliable performance and adaptability in various operational environments."
        ],
        leadership: [
            "Demonstrates appropriate leadership skills and maintains good rapport with subordinates.",
            "Shows sound judgment in routine situations and handles responsibilities competently.",
            "Provides adequate supervision and guidance to assigned personnel.",
            "Maintains professional demeanor and sets a positive example for junior Marines."
        ],
        character: [
            "Maintains high standards of personal conduct and demonstrates Marine Corps values.",
            "Shows good moral character and makes sound ethical decisions.",
            "Demonstrates reliability and commitment to Marine Corps standards."
        ],
        promotion: [
            "Recommended for promotion with peers when due.",
            "Ready for promotion and additional responsibilities commensurate with grade.",
            "Recommend for continued professional development and promotion consideration.",
            "Suitable for promotion and assignment to positions of increased responsibility."
        ]
    },
    developing: {
        openings: [
            "A Marine who demonstrates potential but requires continued development and guidance.",
            "A developing Marine who shows improvement and commitment to professional growth.",
            "A Marine who operates at the level expected for rank but has room for improvement.",
            "A Marine who demonstrates basic competency but needs additional mentoring and development."
        ],
        performance: [
            "Demonstrates basic technical competency but requires continued development.",
            "Shows understanding of fundamental duties but needs improvement in execution.",
            "Performs routine tasks adequately but requires supervision for complex assignments.",
            "Exhibits potential for improvement with proper guidance and training."
        ],
        leadership: [
            "Demonstrates basic leadership potential but requires continued development.",
            "Shows improvement in supervisory skills but needs additional mentoring.",
            "Exhibits potential for leadership growth with proper guidance and experience.",
            "Requires continued development in decision-making and problem-solving abilities."
        ],
        character: [
            "Shows commitment to Marine Corps values and personal development.",
            "Demonstrates basic understanding of professional standards.",
            "Shows potential for growth in personal and professional conduct."
        ],
        promotion: [
            "Recommend for continued development and promotion consideration when ready.",
            "Suitable for promotion with additional training and mentoring.",
            "Recommend for professional development programs and promotion when due.",
            "Requires continued growth but shows potential for future advancement."
        ]
    }
};

// Section I Analysis and Generation Functions
function analyzeTraitEvaluations() {
    const grades = Object.values(evaluationResults).map(r => r.gradeNumber);
    const total = grades.length;
    const average = grades.reduce((sum, grade) => sum + grade, 0) / total;
    const highGrades = grades.filter(g => g >= 6).length; // F and G grades
    const midGrades = grades.filter(g => g >= 4 && g <= 5).length; // D and E grades
    const lowGrades = grades.filter(g => g <= 3).length; // A, B, C grades
    
    // Determine performance tier
    let tier = 'middle';
    if (average >= 5.5 && highGrades >= total * 0.4) {
        tier = 'top';
    } else if (average <= 3.5 || lowGrades >= total * 0.3) {
        tier = 'developing';
    }
    
    return {
        tier,
        average: average.toFixed(2),
        total,
        highGrades,
        midGrades,
        lowGrades,
        percentageHigh: ((highGrades / total) * 100).toFixed(1),
        percentageMid: ((midGrades / total) * 100).toFixed(1),
        percentageLow: ((lowGrades / total) * 100).toFixed(1)
    };
}

function extractKeyAccomplishments() {
    const accomplishments = [];
    
    Object.values(evaluationResults).forEach(result => {
        if (result.gradeNumber >= 4) { // D grade or higher
            const justification = result.justification;
            // Extract meaningful sentences
            const sentences = justification.split(/[.!?]+/);
            const meaningful = sentences.find(s => 
                s.trim().length > 15 && 
                (s.toLowerCase().includes('led') || 
                 s.toLowerCase().includes('achieved') ||
                 s.toLowerCase().includes('improved') ||
                 s.toLowerCase().includes('exceeded') ||
                 s.toLowerCase().includes('completed') ||
                 s.toLowerCase().includes('managed'))
            );
            
            if (meaningful) {
                accomplishments.push({
                    section: result.section,
                    trait: result.trait,
                    grade: result.grade,
                    accomplishment: meaningful.trim()
                });
            }
        }
    });
    
    return accomplishments;
}

function generateSectionIComment() {
    const analysis = analyzeTraitEvaluations();
    const accomplishments = extractKeyAccomplishments();
    const templates = sectionITemplates[analysis.tier];
    
    updateAnalysisDisplay(analysis);
    
    let comment = '';
    
    // Opening statement
    comment += getRandomTemplate(templates.openings) + ' ';
    
    // Performance section with specific examples
    comment += getRandomTemplate(templates.performance) + ' ';
    if (accomplishments.length > 0 && currentGenerationStyle !== 'concise') {
        const topAccomplishment = accomplishments[0];
        comment += `Specifically, ${topAccomplishment.accomplishment.toLowerCase()}. `;
    }
    
    // Leadership section
    if (currentGenerationStyle === 'comprehensive' || analysis.tier === 'top') {
        comment += getRandomTemplate(templates.leadership) + ' ';
        
        // Add leadership example if available
        const leadershipAccomplishments = accomplishments.filter(a => a.section === 'Leadership');
        if (leadershipAccomplishments.length > 0 && currentGenerationStyle !== 'concise') {
            comment += `${leadershipAccomplishments[0].accomplishment}. `;
        }
    }
    
    // Character section
    comment += getRandomTemplate(templates.character) + ' ';
    
    // Add specific accomplishments for comprehensive style
    if (currentGenerationStyle === 'comprehensive' && accomplishments.length > 1) {
        comment += 'Notable achievements include ';
        const topAccomplishments = accomplishments.slice(0, 2);
        const achievementTexts = topAccomplishments.map(a => a.accomplishment.toLowerCase());
        comment += achievementTexts.join(' and ') + '. ';
    }
    
    // Promotion recommendation
    if (currentGenerationStyle === 'promotion-focused' || analysis.tier === 'top') {
        comment += getRandomTemplate(templates.promotion);
        
        // Add specific recommendations for top performers
        if (analysis.tier === 'top') {
            comment += ' Strongly endorse for advanced professional military education and leadership positions.';
        }
    } else {
        comment += getRandomTemplate(templates.promotion);
    }
    
    // Clean up the comment
    comment = comment.replace(/\s+/g, ' ').trim();
    
    // Set the generated comment
    document.getElementById('sectionITextarea').value = comment;
    generatedSectionI = comment;
    updateSectionIWordCount();
}

function getRandomTemplate(templates) {
    return templates[Math.floor(Math.random() * templates.length)];
}

function updateAnalysisDisplay(analysis) {
    const statsContainer = document.getElementById('analysisStats');
    const tierDisplay = document.getElementById('performanceTierDisplay');
    
    statsContainer.innerHTML = `
        <div class="stat-box">
            <div class="stat-value">${analysis.average}</div>
            <div class="stat-label">Average Grade</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${analysis.highGrades}</div>
            <div class="stat-label">F/G Grades</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${analysis.midGrades}</div>
            <div class="stat-label">D/E Grades</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${analysis.total}</div>
            <div class="stat-label">Total Traits</div>
        </div>
    `;
    
    tierDisplay.textContent = analysis.tier.charAt(0).toUpperCase() + analysis.tier.slice(1) + ' Performer';
    tierDisplay.className = `performance-tier-display tier-${analysis.tier}`;
}

function regenerateWithStyle(style) {
    currentGenerationStyle = style;
    generateSectionIComment();
}

function updateSectionIWordCount() {
    const textarea = document.getElementById('sectionITextarea');
    const counter = document.getElementById('sectionIWordCount');
    
    if (!textarea || !counter) return;
    
    const words = textarea.value.trim().split(/\s+/).filter(word => word.length > 0);
    const count = words.length;
    
    counter.textContent = `${count} words (Recommended: 200-400 words)`;
    counter.className = 'word-count-display';
    
    if (count >= 200 && count <= 400) {
        counter.classList.add('good');
    } else if (count > 400 || count < 150) {
        counter.classList.add('warning');
    }
}

function skipSectionI() {
    if (generatedSectionI && confirm('You have generated a Section I comment. Are you sure you want to skip it?')) {
        generatedSectionI = '';
    }
    
    evaluationMeta.sectionIComments = '';
    document.getElementById('sectionIGenerationCard').classList.remove('active');
    showSummary();
}

function finalizeSectionI() {
    const sectionIText = document.getElementById('sectionITextarea').value.trim();
    
    if (sectionIText) {
        evaluationMeta.sectionIComments = sectionIText;
    } else {
        evaluationMeta.sectionIComments = '';
    }
    
    // Update progress indicator
    document.getElementById('progressText').textContent = 'Evaluation Complete';
    
    document.getElementById('sectionIGenerationCard').classList.remove('active');
    showSummary();
}

function showSectionIGeneration() {
    document.getElementById('sectionIGenerationCard').classList.add('active');
    
    // Update progress indicator
    document.getElementById('progressText').textContent = 'Section I Comment Generation';
    
    // Initialize the analysis
    const analysis = analyzeTraitEvaluations();
    updateAnalysisDisplay(analysis);
}
    