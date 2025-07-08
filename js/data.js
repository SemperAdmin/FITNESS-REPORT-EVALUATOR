// FITREP Trait Data Model
const firepData = {
    sections: {
        D: {
            title: "Mission Accomplishment",
            traits: {
                performance: {
                    name: "Performance",
                    description: "Results achieved during the reporting period. How well those duties inherent to a Marine's billet, plus all additional duties, formally and informally assigned, were carried out."
                },
                proficiency: {
                    name: "Proficiency", 
                    description: "Demonstrates technical knowledge and practical skill in the execution of the Marine's overall duties. Combines training, education and experience."
                }
            }
        },
        E: {
            title: "Individual Character",
            traits: {
                courage: {
                    name: "Courage",
                    description: "Moral or physical strength to overcome danger, fear, difficulty or anxiety. Personal acceptance of responsibility and accountability, placing conscience over competing interests regardless of consequences."
                },
                effectiveness_under_stress: {
                    name: "Effectiveness Under Stress",
                    description: "Thinking, functioning and leading effectively under conditions of physical and/or mental pressure. Maintaining composure appropriate for the situation."
                },
                initiative: {
                    name: "Initiative",
                    description: "Action in the absence of specific direction. Seeing what needs to be done and acting without prompting. The instinct to begin a task and follow through energetically."
                }
            }
        },
        F: {
            title: "Leadership",
            traits: {
                leading_subordinates: {
                    name: "Leading Subordinates",
                    description: "The inseparable relationship between leader and led. The application of leadership principles to provide direction and motivate subordinates."
                },
                developing_subordinates: {
                    name: "Developing Subordinates",
                    description: "Commitment to train, educate, and challenge all Marines regardless of race, religion, ethnic background, or gender. Mentorship and cultivating professional development."
                },
                setting_example: {
                    name: "Setting the Example",
                    description: "The most visible facet of leadership: how well a Marine serves as a role model for all others. Personal action demonstrates the highest standards of conduct."
                },
                ensuring_wellbeing: {
                    name: "Ensuring Well-being of Subordinates",
                    description: "Genuine interest in the well-being of Marines. Efforts enhance subordinates' ability to concentrate/focus on unit mission accomplishment."
                },
                communication_skills: {
                    name: "Communication Skills",
                    description: "The efficient transmission and receipt of thoughts and ideas that enable and enhance leadership. Equal importance given to listening, speaking, writing, and critical reading skills."
                }
            }
        },
        G: {
            title: "Intellect and Wisdom",
            traits: {
                pme: {
                    name: "Professional Military Education (PME)",
                    description: "Commitment to intellectual growth in ways beneficial to the Marine Corps. Increases the breadth and depth of warfighting and leadership aptitude."
                },
                decision_making: {
                    name: "Decision Making Ability",
                    description: "Viable and timely problem solution. Contributing elements are judgment and decisiveness. Decisions reflect the balance between an optimal solution and a satisfactory, workable solution."
                },
                judgment: {
                    name: "Judgment",
                    description: "The discretionary aspect of decision making. Draws on core values, knowledge, and personal experience to make wise choices."
                }
            }
        },
        H: {
            title: "Fulfillment of Evaluation Responsibilities",
            traits: {
                evaluations: {
                    name: "Evaluations",
                    description: "The extent to which this officer serving as a reporting official conducted, or required others to conduct, accurate, uninflated, and timely evaluations."
                }
            }
        }
    },
    
    gradeDescriptions: {
        A: {
            description: "Performance is significantly below standards and requires immediate corrective action. Does not meet basic requirements of the billet.",
            class: "adverse"
        },
        B: {
            description: "Meets requirements of billet and additional duties. Aptitude, commitment, and competence meet expectations. Results maintain status quo.",
            class: "below-standards"
        },
        D: {
            description: "Consistently produces quality results while measurably improving unit performance. Habitually makes effective use of time and resources; improves billet procedures and products. Positive impact extends beyond billet expectations.",
            class: "acceptable"
        },
        F: {
            description: "Results far surpass expectations. Recognizes and exploits new resources; creates opportunities. Emulated; sought after as an expert with influence beyond unit. Impact significant; innovative approaches to problems produce significant gains in quality and efficiency.",
            class: "excellent"
        }
    }
};

// Enhanced FITREP Data with Examples
const enhancedFirepData = {
    ...firepData,
    examples: {
        D: {
            performance: {
                A: "Failed to complete assigned tasks, required constant supervision, consistently missed deadlines",
                B: "Completed all assigned duties adequately, met basic expectations and deadlines consistently",
                C: "Completed most duties with minimal supervision but showed limited initiative beyond requirements",
                D: "Exceeded expectations in daily tasks, improved unit procedures, and mentored junior Marines effectively",
                E: "Strong performance in most areas but occasionally fell short of exceptional standards",
                F: "Exceptional performance leading major initiatives, recognized by senior leadership for innovative solutions",
                G: "Outstanding performance exceeding all expectations, set new standards for unit excellence"
            },
            proficiency: {
                A: "Lacks basic technical skills required for position, requires extensive retraining",
                B: "Demonstrates competent technical knowledge and skills appropriate for grade and experience",
                C: "Shows basic proficiency with room for improvement in complex technical areas",
                D: "Strong technical expertise, effectively trains others and troubleshoots complex problems",
                E: "Good technical skills but not consistently at expert level in all required areas",
                F: "Technical expert sought after for complex problems, develops innovative solutions",
                G: "Exceptional technical mastery, recognized as subject matter expert by peers and seniors"
            }
        },
        E: {
            courage: {
                A: "Avoided difficult situations, failed to take responsibility for decisions and actions",
                B: "Demonstrated appropriate courage when required, accepted responsibility for actions",
                C: "Showed courage in routine situations but hesitated in more challenging circumstances",
                D: "Consistently brave in challenging situations, willingly accepted difficult responsibilities",
                E: "Good courage in most situations but occasionally showed reluctance in high-stress scenarios",
                F: "Exceptional bravery serving as inspiration to others, selflessly placed mission above personal safety",
                G: "Outstanding courage in all circumstances, legendary example of Marine Corps values"
            },
            effectiveness_under_stress: {
                A: "Poor performance under pressure, became overwhelmed and required significant support",
                B: "Maintained composure under normal stress levels, performed duties adequately",
                C: "Adequate stress management with some difficulty in high-pressure situations",
                D: "Excellent performance under pressure, provided stability and direction to unit",
                E: "Good stress management but occasionally showed strain during extended operations",
                F: "Exceptional performance under extreme stress, steadied others during crisis situations",
                G: "Outstanding resilience under all conditions, unflappable in most demanding circumstances"
            },
            initiative: {
                A: "Required constant direction, showed no initiative in identifying or solving problems",
                B: "Took appropriate initiative when situations arose, acted without prompting when needed",
                C: "Some initiative but generally waited for direction before taking action",
                D: "Proactive approach, identified and solved problems independently, anticipated needs",
                E: "Good initiative but not consistently proactive in all situations",
                F: "Exceptional initiative creating new opportunities, pioneered innovative approaches",
                G: "Outstanding proactive leadership, consistently anticipated and prevented problems"
            }
        },
        F: {
            leading_subordinates: {
                A: "Poor leadership resulting in low subordinate morale and performance",
                B: "Adequate leadership, subordinates performed duties satisfactorily under supervision",
                C: "Basic leadership skills with room for growth, inconsistent results with subordinates",
                D: "Strong leader who motivated subordinates to consistently high performance levels",
                E: "Good leadership but results were sometimes inconsistent with different subordinates",
                F: "Exceptional leader whose subordinates exceeded all expectations and sought additional responsibility",
                G: "Outstanding leadership inspiring extraordinary performance and loyalty from all subordinates"
            },
            developing_subordinates: {
                A: "Failed to develop subordinates, provided no meaningful mentorship or training",
                B: "Provided adequate training and development opportunities for assigned personnel",
                C: "Basic development efforts with limited measurable impact on subordinate growth",
                D: "Excellent mentor whose subordinates showed significant professional and personal growth",
                E: "Good developmental efforts but follow-through was inconsistent",
                F: "Exceptional mentor whose subordinates achieved remarkable growth and advancement",
                G: "Outstanding development program with lasting impact on subordinates' careers"
            },
            setting_example: {
                A: "Poor personal example with inappropriate conduct observed by subordinates",
                B: "Maintained proper standards and professional conduct consistently",
                C: "Generally good example with minor lapses in standards or conduct",
                D: "Excellent role model who inspired others through consistent professional example",
                E: "Good example but not consistently inspiring to subordinates and peers",
                F: "Exceptional role model widely emulated by subordinates, peers, and even seniors",
                G: "Outstanding example that set the standard for professional conduct and inspired all"
            },
            ensuring_wellbeing: {
                A: "Neglected subordinate welfare resulting in poor unit morale and family issues",
                B: "Ensured basic welfare needs were met and maintained appropriate unit morale",
                C: "Adequate attention to welfare with room for improvement in proactive care",
                D: "Excellent care for subordinates resulting in high unit morale and family satisfaction",
                E: "Good welfare efforts but not consistently comprehensive in all areas",
                F: "Exceptional welfare programs where subordinates felt genuinely cared for and supported",
                G: "Outstanding welfare leadership creating strong unit cohesion and family support"
            },
            communication_skills: {
                A: "Poor communication leading to frequent misunderstandings and confusion",
                B: "Communicated effectively in routine situations with clear direction to subordinates",
                C: "Adequate communication with occasional clarity issues in complex situations",
                D: "Excellent communicator providing clear, inspiring direction to subordinates and peers",
                E: "Good communication but sometimes unclear in complex or high-stress situations",
                F: "Exceptional communicator who influenced others effectively and inspired confidence",
                G: "Outstanding communication skills inspiring confidence and understanding in all situations"
            }
        },
        G: {
            pme: {
                A: "No effort toward professional development, failed to complete required PME",
                B: "Completed required PME and maintained basic professional knowledge appropriate for grade",
                C: "Adequate PME participation with basic engagement in professional development",
                D: "Pursued additional education beyond requirements, shared knowledge with subordinates",
                E: "Good educational efforts but not consistently applied to job performance",
                F: "Exceptional commitment to learning, recognized as intellectual leader in professional topics",
                G: "Outstanding intellectual growth benefiting entire organization through shared knowledge"
            },
            decision_making: {
                A: "Poor decision-making ability, indecisive under pressure with questionable judgment",
                B: "Made sound decisions in routine situations with appropriate consideration of consequences",
                C: "Adequate decision-making with occasional hesitation in complex situations",
                D: "Excellent decisions under pressure demonstrating superior judgment and analytical skills",
                E: "Good decision-making but sometimes slow to act in time-sensitive situations",
                F: "Exceptional decision-maker sought out for complex problems requiring innovative solutions",
                G: "Outstanding judgment inspiring confidence in all situations and serving as advisor to seniors"
            },
            judgment: {
                A: "Poor judgment with frequent questionable decisions affecting unit effectiveness",
                B: "Demonstrated sound judgment in most situations with decisions based on Marine Corps values",
                C: "Generally good judgment with occasional lapses in discretion or wisdom",
                D: "Excellent judgment with opinions valued by subordinates, peers, and seniors",
                E: "Good judgment but not consistently applied in all situations",
                F: "Exceptional judgment sought as advisor and counselor by others at all levels",
                G: "Outstanding wisdom inspiring confidence and serving as moral compass for others"
            }
        },
        H: {
            evaluations: {
                A: "Failed to complete evaluations properly, consistently late with inaccurate or inflated markings",
                B: "Completed evaluations on time with appropriate markings and adequate justifications",
                C: "Adequate evaluation completion with minor administrative issues or delays",
                D: "Excellent evaluation practices, consistently accurate and timely with quality justifications",
                E: "Good evaluation habits but occasional delays or minor administrative errors",
                F: "Exceptional evaluation standards, mentored others and never had reports returned for correction",
                G: "Outstanding evaluation leadership setting example for others and maintaining highest standards"
            }
        }
    }
};