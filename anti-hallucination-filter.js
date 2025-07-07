/**
 * Anti-Hallucination Filter
 * 
 * This module prevents AI from making false claims about capabilities it doesn't have.
 * It validates AI responses and rewrites them to be honest about actual system capabilities.
 */

class AntiHallucinationFilter {
    constructor() {
        // Define actual system capabilities (whitelist)
        this.actualCapabilities = {
            // ✅ Available capabilities
            taskManagement: {
                enabled: true,
                description: 'Add, complete, delete, edit, and list tasks'
            },
            conversationMemory: {
                enabled: true,
                description: 'Remember context within conversations'
            },
            taskClarification: {
                enabled: true,
                description: 'Provide A/B/C choices for ambiguous tasks'
            },
            generalAssistance: {
                enabled: true,
                description: 'Answer questions and provide AI assistance'
            },
            
            // ❌ NOT available capabilities
            calendarIntegration: {
                enabled: false,
                description: 'Calendar access and event creation',
                alternative: 'I can add calendar events as task reminders instead'
            },
            emailSending: {
                enabled: false,
                description: 'Send emails or email notifications',
                alternative: 'I can add email reminders as tasks instead'
            },
            fileSystemAccess: {
                enabled: false,
                description: 'Access files beyond task storage',
                alternative: 'I can only manage your task lists'
            },
            externalApiCalls: {
                enabled: false,
                description: 'Make API calls to external services',
                alternative: 'I can only access the internal task management system'
            },
            realTimeNotifications: {
                enabled: false,
                description: 'Send push notifications or alerts',
                alternative: 'I can add reminder tasks instead'
            },
            dataBackup: {
                enabled: false,
                description: 'Backup or sync data to external services',
                alternative: 'Tasks are stored locally in the system'
            },
            phoneIntegration: {
                enabled: false,
                description: 'Make phone calls or send SMS',
                alternative: 'I can add contact reminders as tasks'
            },
            documentCreation: {
                enabled: false,
                description: 'Create or edit documents, PDFs, etc.',
                alternative: 'I can add document creation as a task reminder'
            }
        };

        // Patterns that indicate false capability claims
        this.falseClaimPatterns = [
            // Calendar claims
            {
                patterns: [
                    /I['']?ve (added|scheduled|created|set up).*(calendar|event|appointment|meeting)/i,
                    /I['']?ll (add|schedule|create|set up).*(to your calendar|calendar event|appointment|meeting)/i,
                    /I['']?ll (schedule|add).*(meeting|appointment|event).*calendar/i,
                    /(added|scheduled|created|set up).*(to your calendar|calendar event|meeting)/i,
                    /calendar (event|appointment|meeting).*(has been|is) (added|scheduled|created)/i,
                    /schedule.*(meeting|appointment|event).*in your calendar/i,
                    /add.*(meeting|appointment|event).*calendar/i
                ],
                capability: 'calendarIntegration',
                severity: 'high'
            },
            
            // Email claims
            {
                patterns: [
                    /I['']?ve (sent|emailed|delivered).*(email|message|notification)/i,
                    /I['']?ll (send|email|deliver).*(email|message|notification)/i,
                    /I['']?ll email.*(team|person|contact|recipient)/i,
                    /(sent|emailed|delivered).*(email|message)/i,
                    /(email|message).*(has been|is) (sent|delivered)/i,
                    /send.*(email|message).*(to|about)/i
                ],
                capability: 'emailSending',
                severity: 'high'
            },
            
            // File system claims
            {
                patterns: [
                    /I['']?ve (saved|created|written|modified).*(file|document|PDF)/i,
                    /I['']?ll (save|create|write|modify).*(file|document|PDF)/i,
                    /(saved|created|written|modified).*(file|document)/i,
                    /(file|document).*(has been|is) (saved|created|written)/i
                ],
                capability: 'fileSystemAccess',
                severity: 'medium'
            },
            
            // External API claims
            {
                patterns: [
                    /I['']?ve (contacted|called|accessed|connected to).*(API|service|server)/i,
                    /I['']?ll (contact|call|access|connect to).*(API|service|server)/i,
                    /(contacted|called|accessed).*(external service|API)/i
                ],
                capability: 'externalApiCalls',
                severity: 'medium'
            },
            
            // Notification claims
            {
                patterns: [
                    /I['']?ve (sent|triggered|set up).*(notification|alert|reminder)/i,
                    /I['']?ll (send|trigger|set up).*(notification|alert)/i,
                    /(notification|alert).*(has been|is) (sent|triggered)/i
                ],
                capability: 'realTimeNotifications',
                severity: 'medium'
            },
            
            // Phone/SMS claims
            {
                patterns: [
                    /I['']?ve (called|texted|sent SMS).*(phone|number)/i,
                    /I['']?ll (call|text|send SMS)/i,
                    /I['']?ve (called|texted)/i,
                    /I['']?ve made.*phone call/i,
                    /(called|texted|sent SMS)/i,
                    /phone call.*made/i,
                    /called.*to (confirm|discuss|ask)/i
                ],
                capability: 'phoneIntegration',
                severity: 'high'
            }
        ];

        // Alternative response templates
        this.alternativeResponses = {
            calendarIntegration: [
                "I don't have calendar access yet, but I can add '{event}' as a task reminder. Would you like me to do that?",
                "I can't access your calendar directly, but I can create a task reminder for '{event}'. Shall I add it to your task list?",
                "Calendar integration isn't available, but I can add '{event}' to your tasks as a reminder."
            ],
            emailSending: [
                "I don't have email capabilities, but I can add 'Email {recipient} about {subject}' as a task reminder.",
                "I can't send emails directly, but I can create a task to remind you to email {recipient}.",
                "Email sending isn't available, but I can add an email reminder to your task list."
            ],
            fileSystemAccess: [
                "I don't have file access, but I can add 'Create {filename}' as a task reminder.",
                "I can't create files directly, but I can add document creation to your task list.",
                "File creation isn't available, but I can track this as a task for you."
            ],
            externalApiCalls: [
                "I don't have access to external services, but I can add this as a task reminder.",
                "I can't connect to external APIs, but I can help you track this in your tasks.",
                "External service access isn't available, but I can add this to your task list."
            ],
            realTimeNotifications: [
                "I can't send notifications, but I can add '{reminder}' as a task reminder.",
                "Notification sending isn't available, but I can create a task reminder for this.",
                "I don't have notification capabilities, but I can add this to your task list."
            ],
            phoneIntegration: [
                "I can't make phone calls, but I can add 'Call {contact}' as a task reminder.",
                "Phone integration isn't available, but I can create a task to remind you to call {contact}.",
                "I don't have phone access, but I can add this call to your task list."
            ]
        };
    }

    /**
     * Analyzes a response for false capability claims
     * @param {string} response - The AI response to analyze
     * @returns {Object} Analysis result with detected issues
     */
    analyzeResponse(response) {
        const issues = [];
        
        for (const patternGroup of this.falseClaimPatterns) {
            for (const pattern of patternGroup.patterns) {
                const matches = response.match(pattern);
                if (matches) {
                    issues.push({
                        pattern: pattern.source,
                        match: matches[0],
                        capability: patternGroup.capability,
                        severity: patternGroup.severity,
                        fullMatch: matches
                    });
                }
            }
        }
        
        return {
            hasFalseClaims: issues.length > 0,
            issues,
            requiresRewrite: issues.some(issue => issue.severity === 'high')
        };
    }

    /**
     * Extracts key information from false claims for rewriting
     * @param {string} response - The original response
     * @param {Array} issues - Detected issues
     * @returns {Object} Extracted information for alternatives
     */
    extractClaimInfo(response, issues) {
        const info = {};
        
        for (const issue of issues) {
            switch (issue.capability) {
                case 'calendarIntegration':
                    // Extract event/meeting details
                    const eventMatch = response.match(/['"]([^'"]*(?:meeting|event|appointment|call)[^'"]*)['"]|(?:meeting|event|appointment|call)(?:\s+with\s+)?(?:\s+about\s+)?([^,.!?\n]*)/i);
                    if (eventMatch) {
                        info.event = eventMatch[1] || eventMatch[2] || 'calendar event';
                    }
                    break;
                    
                case 'emailSending':
                    // Extract recipient and subject
                    const emailMatch = response.match(/email(?:\s+to)?\s+([^,.\s]+)|to\s+([^,.\s]+)/i);
                    const subjectMatch = response.match(/about\s+([^,.!?\n]+)|subject[:\s]+([^,.!?\n]+)/i);
                    if (emailMatch) {
                        info.recipient = emailMatch[1] || emailMatch[2] || 'recipient';
                    }
                    if (subjectMatch) {
                        info.subject = subjectMatch[1] || subjectMatch[2] || 'this matter';
                    }
                    break;
                    
                case 'fileSystemAccess':
                    // Extract filename/document type
                    const fileMatch = response.match(/['"]([^'"]*(?:\.pdf|\.doc|\.txt|file|document)[^'"]*)['"]|(?:file|document)\s+([^,.!?\n]*)/i);
                    if (fileMatch) {
                        info.filename = fileMatch[1] || fileMatch[2] || 'document';
                    }
                    break;
                    
                case 'phoneIntegration':
                    // Extract contact name
                    const contactMatch = response.match(/(?:call|text|SMS)\s+(?:to\s+)?([^,.!?\n]+)|to\s+([^,.!?\n]+)/i);
                    if (contactMatch) {
                        info.contact = contactMatch[1] || contactMatch[2] || 'contact';
                    }
                    break;
                    
                case 'realTimeNotifications':
                    // Extract reminder content
                    const reminderMatch = response.match(/(?:reminder|notification|alert)(?:\s+about\s+|\s+for\s+|\s+to\s+)?([^,.!?\n]+)/i);
                    if (reminderMatch) {
                        info.reminder = reminderMatch[1] || 'reminder';
                    }
                    break;
            }
        }
        
        return info;
    }

    /**
     * Generates an honest alternative response
     * @param {string} originalResponse - The original response with false claims
     * @param {Array} issues - Detected issues
     * @param {Object} extractedInfo - Extracted information from false claims
     * @returns {string} Rewritten honest response
     */
    generateAlternativeResponse(originalResponse, issues, extractedInfo) {
        // Group issues by capability
        const capabilityIssues = {};
        for (const issue of issues) {
            if (!capabilityIssues[issue.capability]) {
                capabilityIssues[issue.capability] = [];
            }
            capabilityIssues[issue.capability].push(issue);
        }
        
        let rewrittenResponse = '';
        
        // Generate alternatives for each capability issue
        for (const [capability, issueList] of Object.entries(capabilityIssues)) {
            const capabilityInfo = this.actualCapabilities[capability];
            const templates = this.alternativeResponses[capability] || [];
            
            if (templates.length > 0) {
                // Choose first template and populate with extracted info
                let template = templates[0];
                
                // Replace placeholders with extracted information
                for (const [key, value] of Object.entries(extractedInfo)) {
                    const placeholder = `{${key}}`;
                    if (template.includes(placeholder)) {
                        template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
                    }
                }
                
                rewrittenResponse += template + '\n';
            } else {
                // Fallback generic response
                rewrittenResponse += `I don't have ${capabilityInfo.description.toLowerCase()} capabilities yet. ${capabilityInfo.alternative || 'I can help you track this in your tasks instead.'}\n`;
            }
        }
        
        // Add capability summary if multiple false claims
        if (Object.keys(capabilityIssues).length > 1) {
            rewrittenResponse += '\nHere\'s what I can actually do:\n';
            for (const [key, capability] of Object.entries(this.actualCapabilities)) {
                if (capability.enabled) {
                    rewrittenResponse += `✅ ${capability.description}\n`;
                }
            }
        }
        
        return rewrittenResponse.trim();
    }

    /**
     * Main filter method - analyzes and potentially rewrites responses
     * @param {string} response - The AI response to filter
     * @param {Object} options - Filtering options
     * @returns {Object} Filtered response with metadata
     */
    filterResponse(response, options = {}) {
        const analysis = this.analyzeResponse(response);
        
        if (!analysis.hasFalseClaims) {
            return {
                response,
                wasRewritten: false,
                issues: [],
                confidence: 100
            };
        }
        
        const extractedInfo = this.extractClaimInfo(response, analysis.issues);
        
        // Determine if rewrite is necessary
        const shouldRewrite = analysis.requiresRewrite || options.strict === true;
        
        if (shouldRewrite) {
            const rewrittenResponse = this.generateAlternativeResponse(
                response, 
                analysis.issues, 
                extractedInfo
            );
            
            return {
                response: rewrittenResponse,
                wasRewritten: true,
                originalResponse: response,
                issues: analysis.issues,
                extractedInfo,
                confidence: this.calculateConfidence(analysis.issues)
            };
        } else {
            // Add disclaimer for medium-severity issues
            const disclaimer = '\n\n⚠️ Note: Some capabilities mentioned may not be fully available yet.';
            
            return {
                response: response + disclaimer,
                wasRewritten: true,
                originalResponse: response,
                issues: analysis.issues,
                extractedInfo,
                confidence: this.calculateConfidence(analysis.issues)
            };
        }
    }

    /**
     * Calculates confidence score based on detected issues
     * @param {Array} issues - Detected issues
     * @returns {number} Confidence score (0-100)
     */
    calculateConfidence(issues) {
        if (issues.length === 0) return 100;
        
        const severityWeights = {
            high: 40,
            medium: 20,
            low: 10
        };
        
        let totalPenalty = 0;
        for (const issue of issues) {
            totalPenalty += severityWeights[issue.severity] || 10;
        }
        
        return Math.max(0, 100 - totalPenalty);
    }

    /**
     * Gets system capabilities summary
     * @returns {Object} Available and unavailable capabilities
     */
    getCapabilitiesSummary() {
        const available = [];
        const unavailable = [];
        
        for (const [key, capability] of Object.entries(this.actualCapabilities)) {
            if (capability.enabled) {
                available.push({
                    name: key,
                    description: capability.description
                });
            } else {
                unavailable.push({
                    name: key,
                    description: capability.description,
                    alternative: capability.alternative
                });
            }
        }
        
        return { available, unavailable };
    }

    /**
     * Validates that a response doesn't contain any false claims
     * @param {string} response - Response to validate
     * @returns {boolean} True if response is honest about capabilities
     */
    validateResponse(response) {
        const analysis = this.analyzeResponse(response);
        return !analysis.hasFalseClaims;
    }
}

export default AntiHallucinationFilter;