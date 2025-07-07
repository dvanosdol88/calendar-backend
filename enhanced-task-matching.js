/**
 * Enhanced Task Matching System
 * Fixes the critical issues with semantic task matching
 */

import axios from 'axios';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class EnhancedTaskMatching {
    constructor(baseUrl = 'http://localhost:3000') {
        this.baseUrl = baseUrl;
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        // Confidence thresholds
        this.EXACT_MATCH_THRESHOLD = 95;
        this.SEMANTIC_MATCH_THRESHOLD = 80;
        this.MINIMUM_CONFIDENCE = 70;
    }

    /**
     * Enhanced task matching with strict validation and confirmation
     */
    async findTasksWithConfirmation(searchText, taskType = null) {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tasks`);
            const allTasks = response.data.data;
            
            // Search in specified type or both types
            const typesToSearch = taskType ? [taskType] : ['work', 'personal'];
            let allMatches = [];
            
            for (const type of typesToSearch) {
                const tasks = allTasks[type] || [];
                const matches = this.scoreTaskMatches(tasks, searchText, type);
                allMatches = allMatches.concat(matches);
            }
            
            // Sort by score (highest first)
            allMatches.sort((a, b) => b.score - a.score);
            
            // Filter by minimum confidence
            const validMatches = allMatches.filter(match => 
                match.score >= this.MINIMUM_CONFIDENCE
            );
            
            return this.categorizeMatches(validMatches, searchText);
            
        } catch (error) {
            console.error('Error in enhanced task matching:', error);
            return { 
                found: false, 
                matches: [], 
                matchType: 'error',
                message: 'Failed to search tasks'
            };
        }
    }

    /**
     * Score task matches with multiple algorithms
     */
    scoreTaskMatches(tasks, searchText, taskType) {
        const searchLower = searchText.toLowerCase();
        const searchWords = this.extractKeywords(searchText);
        
        return tasks.map(task => {
            const taskLower = task.text.toLowerCase();
            let score = 0;
            let matchDetails = [];
            
            // 1. Exact substring match (highest priority)
            if (taskLower.includes(searchLower)) {
                score += 100;
                matchDetails.push('exact_substring');
            }
            
            // 2. Exact word sequence match
            if (this.hasExactWordSequence(taskLower, searchLower)) {
                score += 90;
                matchDetails.push('exact_word_sequence');
            }
            
            // 3. All keywords present
            const taskWords = this.extractKeywords(task.text);
            const keywordMatches = searchWords.filter(word => 
                taskWords.some(taskWord => 
                    taskWord.includes(word) || word.includes(taskWord)
                )
            );
            
            if (keywordMatches.length === searchWords.length) {
                score += 80;
                matchDetails.push('all_keywords');
            } else if (keywordMatches.length > 0) {
                score += (keywordMatches.length / searchWords.length) * 60;
                matchDetails.push(`partial_keywords_${keywordMatches.length}/${searchWords.length}`);
            }
            
            // 4. Semantic similarity boost for common task patterns
            const semanticScore = this.calculateSemanticScore(task.text, searchText);
            score += semanticScore;
            
            if (score > 0) {
                return {
                    ...task,
                    type: taskType,
                    score: Math.round(score),
                    matchDetails,
                    keywordMatches
                };
            }
            
            return null;
        }).filter(match => match !== null);
    }

    /**
     * Extract meaningful keywords from text
     */
    extractKeywords(text) {
        const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'a', 'an'];
        
        return text.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.includes(word))
            .map(word => word.replace(/[^\w]/g, ''));
    }

    /**
     * Check for exact word sequence match
     */
    hasExactWordSequence(taskText, searchText) {
        const taskWords = taskText.split(/\s+/);
        const searchWords = searchText.split(/\s+/);
        
        if (searchWords.length === 1) return false;
        
        const searchSequence = searchWords.join(' ');
        return taskText.includes(searchSequence);
    }

    /**
     * Calculate semantic similarity score
     */
    calculateSemanticScore(taskText, searchText) {
        const commonPatterns = [
            { pattern: /meeting|call|appointment/, boost: 10 },
            { pattern: /review|analyze|check/, boost: 10 },
            { pattern: /complete|finish|done/, boost: 15 },
            { pattern: /buy|purchase|get/, boost: 10 },
            { pattern: /study|learn|read/, boost: 10 }
        ];
        
        let score = 0;
        const taskLower = taskText.toLowerCase();
        const searchLower = searchText.toLowerCase();
        
        for (const { pattern, boost } of commonPatterns) {
            if (pattern.test(taskLower) && pattern.test(searchLower)) {
                score += boost;
            }
        }
        
        return score;
    }

    /**
     * Categorize matches by confidence level
     */
    categorizeMatches(matches, searchText) {
        if (matches.length === 0) {
            return {
                found: false,
                matches: [],
                matchType: 'no_match',
                message: `No tasks found matching "${searchText}"`
            };
        }

        const exactMatches = matches.filter(m => m.score >= this.EXACT_MATCH_THRESHOLD);
        const semanticMatches = matches.filter(m => 
            m.score >= this.SEMANTIC_MATCH_THRESHOLD && m.score < this.EXACT_MATCH_THRESHOLD
        );

        if (exactMatches.length === 1) {
            return {
                found: true,
                matches: exactMatches,
                matchType: 'exact_single',
                requiresConfirmation: true,
                message: `Found exact match: "${exactMatches[0].text}". Is this the task you meant?`
            };
        }

        if (exactMatches.length > 1) {
            return {
                found: true,
                matches: exactMatches,
                matchType: 'exact_multiple',
                requiresConfirmation: true,
                message: `Found ${exactMatches.length} exact matches. Please select:`
            };
        }

        if (semanticMatches.length === 1) {
            return {
                found: true,
                matches: semanticMatches,
                matchType: 'semantic_single',
                requiresConfirmation: true,
                message: `Found similar task: "${semanticMatches[0].text}". Is this what you meant?`
            };
        }

        if (semanticMatches.length > 1) {
            return {
                found: true,
                matches: semanticMatches,
                matchType: 'semantic_multiple',
                requiresConfirmation: true,
                message: `Found ${semanticMatches.length} similar tasks. Please select:`
            };
        }

        // Return all matches if no clear category
        return {
            found: true,
            matches: matches.slice(0, 5), // Limit to top 5
            matchType: 'uncertain',
            requiresConfirmation: true,
            message: `Found several possible matches. Please select the correct one:`
        };
    }

    /**
     * Enhanced command analysis with stricter validation
     */
    async analyzeTaskCommand(userInput) {
        const systemPrompt = `You are a strict task management command parser. 
        Only classify as task commands if confidence is HIGH (>90%).
        
        STRICT RULES:
        1. Must contain clear action words: "add", "complete", "mark done", "finish", "delete", "remove", "edit", "change"
        2. Must reference specific task content or clear task identification
        3. Vague statements like "did some work" should be REJECTED
        4. Must be actionable and specific
        
        EXAMPLES OF VALID COMMANDS:
        - "Mark 'Review Q4 reports' as complete"
        - "Add 'Call John about meeting' to work tasks"
        - "Delete the grocery shopping task"
        - "I completed the client portfolio review"
        
        EXAMPLES OF INVALID COMMANDS:
        - "I did some work today" (too vague)
        - "Had a productive morning" (no specific task)
        - "Things are going well" (not a task command)
        
        Response format (JSON only):
        {
            "isTaskCommand": boolean,
            "action": "add|complete|delete|edit|list|status",
            "taskType": "work|personal|null",
            "taskText": "specific text to match",
            "confidence": 0-100,
            "reasoning": "detailed explanation of classification"
        }`;

        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userInput }
                ],
                temperature: 0.1,
                max_tokens: 300
            });

            const response = completion.choices[0].message.content.trim();
            const analysis = JSON.parse(response);
            
            // Additional validation
            if (analysis.isTaskCommand && analysis.confidence < 90) {
                analysis.isTaskCommand = false;
                analysis.reasoning += " (Lowered confidence due to ambiguity)";
            }
            
            return analysis;
        } catch (error) {
            console.error('Error analyzing task command:', error);
            return { 
                isTaskCommand: false, 
                confidence: 0,
                reasoning: "Failed to analyze command"
            };
        }
    }

    /**
     * Generate confirmation message with match details
     */
    generateConfirmationMessage(matchResult) {
        const { matches, matchType, message } = matchResult;
        
        let confirmationMessage = message + "\n\n";
        
        matches.forEach((match, index) => {
            const letter = String.fromCharCode(65 + index);
            confirmationMessage += `${letter}. ${match.text} (${match.type}) - Score: ${match.score}%\n`;
            
            if (match.matchDetails.length > 0) {
                confirmationMessage += `   Match reasons: ${match.matchDetails.join(', ')}\n`;
            }
        });
        
        confirmationMessage += "\nPlease type A, B, C, etc. to select the correct task.";
        
        return confirmationMessage;
    }

    /**
     * Validate task completion to prevent wrong matches
     */
    async validateTaskCompletion(taskId, userInput) {
        try {
            const response = await axios.get(`${this.baseUrl}/api/tasks`);
            const allTasks = response.data.data;
            
            // Find the task being completed
            let targetTask = null;
            for (const [type, tasks] of Object.entries(allTasks)) {
                targetTask = tasks.find(task => task.id === taskId);
                if (targetTask) {
                    targetTask.type = type;
                    break;
                }
            }
            
            if (!targetTask) {
                return {
                    valid: false,
                    message: "Task not found for validation"
                };
            }
            
            // Use AI to validate the match
            const validationPrompt = `Validate if this task completion makes sense:
            
            User said: "${userInput}"
            Task being completed: "${targetTask.text}"
            
            Does this seem like the correct task based on what the user said?
            
            Response format (JSON):
            {
                "isValidMatch": boolean,
                "confidence": 0-100,
                "reasoning": "explanation"
            }`;
            
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: "system", content: "You are a task validation assistant." },
                    { role: "user", content: validationPrompt }
                ],
                temperature: 0.1,
                max_tokens: 200
            });
            
            const validation = JSON.parse(completion.choices[0].message.content);
            
            return {
                valid: validation.isValidMatch && validation.confidence >= 80,
                confidence: validation.confidence,
                reasoning: validation.reasoning,
                task: targetTask
            };
            
        } catch (error) {
            console.error('Error validating task completion:', error);
            return {
                valid: false,
                message: "Failed to validate task completion"
            };
        }
    }
}

export default EnhancedTaskMatching;