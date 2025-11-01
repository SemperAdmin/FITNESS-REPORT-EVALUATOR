/**
 * GitHub API Service for Secure Data Persistence
 *
 * This module provides secure integration with GitHub for storing user profile
 * and evaluation data in a private repository.
 *
 * SECURITY NOTE:
 * - In production, the GitHub PAT (FITREP_DATA) should NEVER be stored in client-side code
 * - This implementation assumes one of the following secure approaches:
 *   1. Backend proxy server that handles GitHub API calls
 *   2. GitHub Actions workflow triggered by the application
 *   3. Serverless function (AWS Lambda, Netlify Functions, etc.)
 *
 * Repository: https://github.com/SemperAdmin/Fitness-Report-Evaluator-Data
 * Secret Name: FITREP_DATA
 */

// Configuration
const GITHUB_CONFIG = {
    owner: 'SemperAdmin',
    repo: 'Fitness-Report-Evaluator-Data',
    branch: 'main',
    apiBase: 'https://api.github.com'
};

/**
 * GitHub API Service Class
 */
class GitHubDataService {
    constructor() {
        this.token = null;
        this.initialized = false;
    }

    /**
     * Initialize the service with authentication token
     *
     * IMPORTANT: In production, this should be called with a token from:
     * - Environment variable (server-side)
     * - Secure backend API endpoint
     * - GitHub OAuth flow
     *
     * @param {string} token - GitHub Personal Access Token
     */
    initialize(token) {
        if (!token) {
            console.warn('GitHubDataService: No token provided. GitHub sync will not be available.');
            return false;
        }
        this.token = token;
        this.initialized = true;
        console.log('GitHubDataService: Initialized successfully');
        return true;
    }

    /**
     * Get authentication token from environment
     *
     * This is a placeholder that demonstrates different approaches:
     * - Client-side: Would need to call a backend API
     * - Server-side: Would read from process.env.FITREP_DATA
     * - GitHub Actions: Available as secrets.FITREP_DATA
     *
     * @returns {Promise<string|null>}
     */
    async getTokenFromEnvironment() {
        // Approach 1: Backend API proxy (RECOMMENDED for client-side apps)
        if (typeof window !== 'undefined') {
            try {
                const response = await fetch('/api/github-token', {
                    method: 'GET',
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    return data.token;
                }
            } catch (error) {
                console.warn('Could not fetch token from backend:', error);
            }
        }

        // Approach 2: Server-side environment variable
        if (typeof process !== 'undefined' && process.env) {
            return process.env.FITREP_DATA || null;
        }

        // Approach 3: GitHub Actions context
        if (typeof process !== 'undefined' && process.env && process.env.GITHUB_ACTIONS) {
            return process.env.FITREP_DATA || null;
        }

        return null;
    }

    /**
     * Serialize evaluation data to JSON string
     *
     * @param {Object} userData - User profile and evaluation data
     * @returns {string} JSON string
     */
    serializeData(userData) {
        const dataToSave = {
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            profile: {
                rsName: userData.rsName,
                rsEmail: userData.rsEmail,
                rsRank: userData.rsRank,
                totalEvaluations: userData.evaluations?.length || 0
            },
            evaluations: userData.evaluations || [],
            metadata: {
                exportedAt: new Date().toISOString(),
                exportedBy: userData.rsName,
                applicationVersion: '1.0'
            }
        };

        return JSON.stringify(dataToSave, null, 2);
    }

    /**
     * Encode string content to Base64
     * Required by GitHub Contents API
     *
     * @param {string} content - Content to encode
     * @returns {string} Base64 encoded string
     */
    encodeToBase64(content) {
        // Browser environment
        if (typeof btoa !== 'undefined') {
            return btoa(unescape(encodeURIComponent(content)));
        }

        // Node.js environment
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(content, 'utf-8').toString('base64');
        }

        throw new Error('No Base64 encoding method available');
    }

    /**
     * Decode Base64 string to regular string
     *
     * @param {string} base64Content - Base64 encoded string
     * @returns {string} Decoded string
     */
    decodeFromBase64(base64Content) {
        // Browser environment
        if (typeof atob !== 'undefined') {
            return decodeURIComponent(escape(atob(base64Content)));
        }

        // Node.js environment
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(base64Content, 'base64').toString('utf-8');
        }

        throw new Error('No Base64 decoding method available');
    }

    /**
     * Generate unique filename for user data
     * Format: [email_username]_[timestamp].json
     *
     * @param {string} userEmail - User's email address
     * @returns {string} Unique filename
     */
    generateFileName(userEmail) {
        const emailPrefix = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        return `${emailPrefix}_${timestamp}.json`;
    }

    /**
     * Generate consistent filename based on user identifier
     * Format: [user_id].json where user_id is derived from email
     *
     * @param {string} userEmail - User's email address
     * @returns {string} Filename
     */
    generateUserFileName(userEmail) {
        const userId = userEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
        return `${userId}.json`;
    }

    /**
     * Get existing file SHA (required for updates)
     *
     * @param {string} filePath - Path to file in repository
     * @returns {Promise<string|null>} File SHA or null if not found
     */
    async getFileSha(filePath) {
        if (!this.initialized) {
            throw new Error('GitHubDataService not initialized. Call initialize() first.');
        }

        const url = `${GITHUB_CONFIG.apiBase}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 404) {
                return null; // File doesn't exist
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`GitHub API error: ${error.message || response.statusText}`);
            }

            const data = await response.json();
            return data.sha;

        } catch (error) {
            if (error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Create or update a file in the GitHub repository
     * Uses GitHub Contents API: PUT /repos/{owner}/{repo}/contents/{path}
     *
     * @param {string} filePath - Path where file should be stored (e.g., "users/john_doe.json")
     * @param {string} content - File content (will be Base64 encoded)
     * @param {string} commitMessage - Git commit message
     * @param {string|null} sha - File SHA (required for updates, null for new files)
     * @returns {Promise<Object>} GitHub API response
     */
    async createOrUpdateFile(filePath, content, commitMessage, sha = null) {
        if (!this.initialized) {
            throw new Error('GitHubDataService not initialized. Call initialize() first.');
        }

        const url = `${GITHUB_CONFIG.apiBase}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

        // Encode content to Base64
        const base64Content = this.encodeToBase64(content);

        // Prepare request body
        const body = {
            message: commitMessage,
            content: base64Content,
            branch: GITHUB_CONFIG.branch
        };

        // Include SHA for updates
        if (sha) {
            body.sha = sha;
        }

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`GitHub API error: ${error.message || response.statusText}`);
            }

            const result = await response.json();
            console.log('File created/updated successfully:', result.content.path);
            return result;

        } catch (error) {
            console.error('Failed to create/update file:', error);
            throw error;
        }
    }

    /**
     * Get file content from repository
     *
     * @param {string} filePath - Path to file in repository
     * @returns {Promise<Object|null>} Parsed JSON content or null if not found
     */
    async getFileContent(filePath) {
        if (!this.initialized) {
            throw new Error('GitHubDataService not initialized. Call initialize() first.');
        }

        const url = `${GITHUB_CONFIG.apiBase}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.status === 404) {
                return null; // File doesn't exist
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`GitHub API error: ${error.message || response.statusText}`);
            }

            const data = await response.json();
            const decodedContent = this.decodeFromBase64(data.content);
            return JSON.parse(decodedContent);

        } catch (error) {
            if (error.message.includes('404')) {
                return null;
            }
            console.error('Failed to get file content:', error);
            throw error;
        }
    }

    /**
     * Save user profile and evaluations to GitHub
     * Main method to persist data
     *
     * @param {Object} userData - User profile and evaluation data
     * @param {string} userData.rsName - Reporting Senior name
     * @param {string} userData.rsEmail - Reporting Senior email
     * @param {string} userData.rsRank - Reporting Senior rank
     * @param {Array} userData.evaluations - Array of evaluation objects
     * @returns {Promise<Object>} Result object with success status
     */
    async saveUserData(userData) {
        if (!this.initialized) {
            return {
                success: false,
                error: 'Service not initialized',
                message: 'GitHub service is not initialized. Please configure authentication.'
            };
        }

        try {
            // Validate input
            if (!userData.rsEmail) {
                throw new Error('User email is required');
            }

            // Generate filename
            const fileName = this.generateUserFileName(userData.rsEmail);
            const filePath = `users/${fileName}`;

            // Serialize data to JSON
            const jsonContent = this.serializeData(userData);

            // Check if file exists (get SHA for update)
            const existingSha = await this.getFileSha(filePath);

            // Create commit message
            const commitMessage = existingSha
                ? `Update profile for ${userData.rsName} - ${new Date().toISOString()}`
                : `Create profile for ${userData.rsName} - ${new Date().toISOString()}`;

            // Create or update file
            const result = await this.createOrUpdateFile(
                filePath,
                jsonContent,
                commitMessage,
                existingSha
            );

            return {
                success: true,
                filePath: filePath,
                fileName: fileName,
                isUpdate: !!existingSha,
                commitSha: result.commit.sha,
                message: existingSha ? 'Profile updated successfully' : 'Profile created successfully'
            };

        } catch (error) {
            console.error('Error saving user data to GitHub:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to save data: ${error.message}`
            };
        }
    }

    /**
     * Load user profile and evaluations from GitHub
     *
     * @param {string} userEmail - User's email address
     * @returns {Promise<Object|null>} User data or null if not found
     */
    async loadUserData(userEmail) {
        if (!this.initialized) {
            console.warn('Service not initialized');
            return null;
        }

        try {
            const fileName = this.generateUserFileName(userEmail);
            const filePath = `users/${fileName}`;

            const content = await this.getFileContent(filePath);
            return content;

        } catch (error) {
            console.error('Error loading user data from GitHub:', error);
            return null;
        }
    }

    /**
     * Save a single evaluation to GitHub
     * Appends to existing user data file
     *
     * @param {Object} evaluation - Evaluation object
     * @param {string} userEmail - User's email address
     * @returns {Promise<Object>} Result object
     */
    async saveEvaluation(evaluation, userEmail) {
        try {
            // Load existing data
            let userData = await this.loadUserData(userEmail);

            if (!userData) {
                // Create new user data structure
                userData = {
                    rsName: evaluation.rsInfo.name,
                    rsEmail: userEmail,
                    rsRank: evaluation.rsInfo.rank,
                    evaluations: []
                };
            }

            // Add or update evaluation
            const existingIndex = userData.evaluations.findIndex(
                e => e.evaluationId === evaluation.evaluationId
            );

            if (existingIndex >= 0) {
                userData.evaluations[existingIndex] = evaluation;
            } else {
                userData.evaluations.push(evaluation);
            }

            // Save updated data
            return await this.saveUserData(userData);

        } catch (error) {
            console.error('Error saving evaluation:', error);
            return {
                success: false,
                error: error.message,
                message: `Failed to save evaluation: ${error.message}`
            };
        }
    }

    /**
     * Check if service is properly configured and authenticated
     *
     * @returns {Promise<boolean>}
     */
    async verifyConnection() {
        if (!this.initialized) {
            return false;
        }

        try {
            // Try to access the repository
            const url = `${GITHUB_CONFIG.apiBase}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            return response.ok;

        } catch (error) {
            console.error('Failed to verify GitHub connection:', error);
            return false;
        }
    }
}

// Create singleton instance
const githubService = new GitHubDataService();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GitHubDataService, githubService, GITHUB_CONFIG };
}
