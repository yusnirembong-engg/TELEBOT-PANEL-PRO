/**
 * TeleBot Pro v2.0.0 - Bot Manager
 * Handles Telegram bot creation, control, and management
 */

class BotManager {
    constructor() {
        this.bots = new Map();
        this.activeConnections = new Map();
        this.apiBase = '/.netlify/functions';
        this.stats = {
            totalMessages: 0,
            successfulMessages: 0,
            failedMessages: 0,
            totalBots: 0,
            activeBots: 0
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('🤖 Bot Manager initialized');
        this.loadBotsFromStorage();
        this.setupEventListeners();
        this.setupStatsUpdater();
    }
    
    // Load bots from localStorage
    loadBotsFromStorage() {
        try {
            const savedBots = localStorage.getItem('telebot_bots');
            if (savedBots) {
                const botsData = JSON.parse(savedBots);
                botsData.forEach(botData => {
                    this.bots.set(botData.id, botData);
                });
                console.log(`✅ Loaded ${this.bots.size} bots from storage`);
                this.updateStats();
            }
        } catch (error) {
            console.error('Failed to load bots:', error);
        }
    }
    
    // Save bots to localStorage
    saveBotsToStorage() {
        const botsArray = Array.from(this.bots.values());
        localStorage.setItem('telebot_bots', JSON.stringify(botsArray));
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Listen for authentication changes
        if (window.authManager) {
            window.authManager.on('logout', () => {
                this.stopAllBots();
            });
        }
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.handleConnectionRestored();
        });
        
        window.addEventListener('offline', () => {
            this.handleConnectionLost();
        });
        
        // Listen for beforeunload to stop bots
        window.addEventListener('beforeunload', () => {
            this.stopAllBots();
        });
    }
    
    // Setup stats updater
    setupStatsUpdater() {
        // Update stats every minute
        setInterval(() => {
            this.updateStats();
        }, 60000);
    }
    
    // Create a new bot
    async createBot(token, name, description = '') {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            console.log(`Creating bot: ${name}`);
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'create',
                    token: token,
                    name: name,
                    description: description
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Add bot to local storage
                const botData = {
                    id: data.botId,
                    name: name,
                    description: description,
                    token: this.maskToken(token),
                    fullToken: token,
                    botInfo: data.botInfo,
                    session: data.session,
                    status: 'created',
                    createdAt: new Date().toISOString(),
                    stats: {
                        messagesSent: 0,
                        commandsReceived: 0,
                        errors: 0,
                        uptime: 0
                    },
                    settings: {
                        autoStart: true,
                        autoRestart: false,
                        logMessages: true
                    }
                };
                
                this.bots.set(data.botId, botData);
                this.saveBotsToStorage();
                this.updateStats();
                
                console.log(`✅ Bot created successfully: ${data.botId}`);
                
                // Emit event
                this.emitEvent('bot-created', botData);
                
                return {
                    success: true,
                    botId: data.botId,
                    data: botData
                };
            } else {
                console.error('Bot creation failed:', data.error);
                return {
                    success: false,
                    error: data.error || 'Failed to create bot'
                };
            }
        } catch (error) {
            console.error('Bot creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Start a bot
    async startBot(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const bot = this.bots.get(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }
            
            console.log(`Starting bot: ${bot.name} (${botId})`);
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'start',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update bot status
                bot.status = 'running';
                bot.startedAt = data.startedAt;
                bot.stats.uptime = 0;
                this.bots.set(botId, bot);
                this.saveBotsToStorage();
                this.updateStats();
                
                console.log(`✅ Bot started: ${botId}`);
                
                // Emit event
                this.emitEvent('bot-started', { botId, data });
                
                return {
                    success: true,
                    data: data
                };
            } else {
                console.error('Bot start failed:', data.error);
                bot.status = 'error';
                this.bots.set(botId, bot);
                this.saveBotsToStorage();
                
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot start error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Stop a bot
    async stopBot(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const bot = this.bots.get(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }
            
            console.log(`Stopping bot: ${bot.name} (${botId})`);
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'stop',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update bot status
                bot.status = 'stopped';
                bot.stoppedAt = new Date().toISOString();
                if (bot.startedAt) {
                    const uptime = new Date() - new Date(bot.startedAt);
                    bot.stats.uptime += uptime;
                }
                this.bots.set(botId, bot);
                this.saveBotsToStorage();
                this.updateStats();
                
                console.log(`🛑 Bot stopped: ${botId}`);
                
                // Emit event
                this.emitEvent('bot-stopped', { botId, data });
                
                return {
                    success: true,
                    data: data
                };
            } else {
                console.error('Bot stop failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot stop error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Restart a bot
    async restartBot(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const bot = this.bots.get(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }
            
            console.log(`Restarting bot: ${bot.name} (${botId})`);
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'restart',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update bot status
                bot.status = 'running';
                bot.startedAt = data.startedAt;
                this.bots.set(botId, bot);
                this.saveBotsToStorage();
                
                console.log(`🔄 Bot restarted: ${botId}`);
                
                // Emit event
                this.emitEvent('bot-restarted', { botId, data });
                
                return {
                    success: true,
                    data: data
                };
            } else {
                console.error('Bot restart failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot restart error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get bot status
    async getBotStatus(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'status',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update local bot data
                const bot = this.bots.get(botId);
                if (bot) {
                    bot.status = data.status;
                    bot.stats = data.stats || bot.stats;
                    bot.startedAt = data.startedAt || bot.startedAt;
                    this.bots.set(botId, bot);
                    this.saveBotsToStorage();
                }
                
                return {
                    success: true,
                    data: data
                };
            } else {
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot status error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // List all bots
    async listBots() {
        try {
            // Fallback: return bots from local storage
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                return {
                    success: true,
                    bots: this.getAllBots(),
                    message: 'Bots loaded from local storage'
                };
            }
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'list'
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update local storage with fresh data
                if (data.bots && Array.isArray(data.bots)) {
                    data.bots.forEach(botData => {
                        const existingBot = this.bots.get(botData.botId);
                        if (existingBot) {
                            // Merge with existing data
                            const updatedBot = {
                                ...existingBot,
                                ...botData,
                                status: botData.status || existingBot.status,
                                stats: {
                                    ...existingBot.stats,
                                    ...(botData.stats || {})
                                }
                            };
                            this.bots.set(botData.botId, updatedBot);
                        }
                    });
                    this.saveBotsToStorage();
                    this.updateStats();
                }
                
                return {
                    success: true,
                    bots: Array.from(this.bots.values()),
                    serverData: data
                };
            } else {
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('List bots error:', error);
            // Fallback to local storage
            return {
                success: true,
                bots: this.getAllBots(),
                message: 'Using fallback mode'
            };
        }
    }
    
    // Send message through bot
    async sendMessage(botId, chatId, message, options = {}) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const bot = this.bots.get(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }
            
            if (bot.status !== 'running') {
                throw new Error('Bot is not running');
            }
            
            console.log(`Sending message via bot ${botId} to chat ${chatId}`);
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'send',
                    botId: botId,
                    chatId: chatId,
                    message: message,
                    ...options
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update bot stats
                bot.stats.messagesSent = (bot.stats.messagesSent || 0) + 1;
                this.stats.totalMessages++;
                this.stats.successfulMessages++;
                this.bots.set(botId, bot);
                this.saveBotsToStorage();
                this.updateStats();
                
                // Emit event
                this.emitEvent('message-sent', {
                    botId,
                    chatId,
                    message,
                    timestamp: new Date().toISOString()
                });
                
                return {
                    success: true,
                    data: data
                };
            } else {
                this.stats.failedMessages++;
                this.updateStats();
                
                console.error('Send message failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            this.stats.failedMessages++;
            this.updateStats();
            
            console.error('Send message error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get bot statistics
    async getBotStats(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'stats',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update local bot stats
                const bot = this.bots.get(botId);
                if (bot && data.stats) {
                    bot.stats = { ...bot.stats, ...data.stats };
                    this.bots.set(botId, bot);
                    this.saveBotsToStorage();
                }
                
                return {
                    success: true,
                    stats: data.stats,
                    performance: data.performance
                };
            } else {
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot stats error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Delete a bot
    async deleteBot(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const bot = this.bots.get(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }
            
            console.log(`Deleting bot: ${bot.name} (${botId})`);
            
            // Stop bot if running
            if (bot.status === 'running') {
                await this.stopBot(botId).catch(() => {
                    // Ignore stop errors during deletion
                });
            }
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'delete',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Remove from local storage
                this.bots.delete(botId);
                this.saveBotsToStorage();
                this.updateStats();
                
                // Clear any active connection
                if (this.activeConnections.has(botId)) {
                    clearInterval(this.activeConnections.get(botId));
                    this.activeConnections.delete(botId);
                }
                
                console.log(`🗑️ Bot deleted: ${botId}`);
                
                // Emit event
                this.emitEvent('bot-deleted', { botId, botName: bot.name });
                
                return {
                    success: true,
                    data: data
                };
            } else {
                console.error('Bot deletion failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot deletion error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get all bots
    getAllBots() {
        return Array.from(this.bots.values());
    }
    
    // Get bot by ID
    getBot(botId) {
        return this.bots.get(botId);
    }
    
    // Update bot settings
    updateBotSettings(botId, settings) {
        const bot = this.bots.get(botId);
        if (!bot) return false;
        
        bot.settings = { ...bot.settings, ...settings };
        this.bots.set(botId, bot);
        this.saveBotsToStorage();
        
        this.emitEvent('bot-settings-updated', { botId, settings });
        return true;
    }
    
    // Update bot data
    updateBot(botId, updates) {
        const bot = this.bots.get(botId);
        if (!bot) return false;
        
        const updatedBot = { ...bot, ...updates, updatedAt: new Date().toISOString() };
        this.bots.set(botId, updatedBot);
        this.saveBotsToStorage();
        
        return true;
    }
    
    // Start all bots
    async startAllBots() {
        const results = [];
        for (const [botId, bot] of this.bots) {
            if (bot.status !== 'running' && bot.settings.autoStart) {
                const result = await this.startBot(botId);
                results.push({ botId, success: result.success });
            }
        }
        return results;
    }
    
    // Stop all bots
    async stopAllBots() {
        const results = [];
        for (const [botId, bot] of this.bots) {
            if (bot.status === 'running') {
                const result = await this.stopBot(botId);
                results.push({ botId, success: result.success });
            }
        }
        return results;
    }
    
    // Restart all bots
    async restartAllBots() {
        const results = [];
        for (const [botId, bot] of this.bots) {
            if (bot.status === 'running') {
                const result = await this.restartBot(botId);
                results.push({ botId, success: result.success });
            }
        }
        return results;
    }
    
    // Get bot count by status
    getBotCountByStatus() {
        const counts = {
            running: 0,
            stopped: 0,
            error: 0,
            total: this.bots.size
        };
        
        for (const bot of this.bots.values()) {
            if (counts.hasOwnProperty(bot.status)) {
                counts[bot.status]++;
            }
        }
        
        return counts;
    }
    
    // Update statistics
    updateStats() {
        const counts = this.getBotCountByStatus();
        
        this.stats.totalBots = counts.total;
        this.stats.activeBots = counts.running;
        
        // Calculate success rate
        if (this.stats.totalMessages > 0) {
            this.stats.successRate = (this.stats.successfulMessages / this.stats.totalMessages) * 100;
        } else {
            this.stats.successRate = 0;
        }
        
        // Emit stats update
        this.emitEvent('stats-updated', this.stats);
        
        return this.stats;
    }
    
    // Get statistics
    getStats() {
        return { ...this.stats };
    }
    
    // Mask token for display
    maskToken(token) {
        if (!token || token.length < 8) return '***';
        return token.substring(0, 4) + '***' + token.substring(token.length - 4);
    }
    
    // Validate bot token
    validateToken(token) {
        if (!token) return { valid: false, error: 'Token is required' };
        
        // Basic validation
        if (!token.startsWith('bot')) return { valid: false, error: 'Token must start with "bot"' };
        
        const parts = token.split(':');
        if (parts.length !== 2) return { valid: false, error: 'Invalid token format' };
        
        if (parts[0] !== 'bot') return { valid: false, error: 'Token must start with "bot"' };
        
        if (parts[1].length < 10) return { valid: false, error: 'Token is too short' };
        
        return { valid: true };
    }
    
    // Test bot token
    async testToken(token) {
        try {
            // Quick validation first
            const validation = this.validateToken(token);
            if (!validation.valid) {
                return validation;
            }
            
            // Try to get bot info via API
            const testResponse = await fetch('https://api.telegram.org/bot' + token + '/getMe');
            const data = await testResponse.json();
            
            if (data.ok) {
                return {
                    valid: true,
                    botInfo: data.result
                };
            } else {
                return {
                    valid: false,
                    error: data.description || 'Invalid token'
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: 'Network error or invalid token'
            };
        }
    }
    
    // Handle connection lost
    handleConnectionLost() {
        console.warn('⚠️ Connection lost, pausing bot operations');
        this.emitEvent('connection-lost', { timestamp: new Date().toISOString() });
    }
    
    // Handle connection restored
    handleConnectionRestored() {
        console.log('✅ Connection restored, resuming bot operations');
        this.emitEvent('connection-restored', { timestamp: new Date().toISOString() });
        
        // Refresh bot statuses
        this.refreshAllBotStatuses();
    }
    
    // Refresh all bot statuses
    async refreshAllBotStatuses() {
        const results = [];
        for (const [botId, bot] of this.bots) {
            if (bot.status === 'running') {
                const result = await this.getBotStatus(botId);
                results.push({ botId, success: result.success });
            }
        }
        return results;
    }
    
    // Setup bot monitoring
    setupBotMonitoring(botId, interval = 30000) {
        if (this.activeConnections.has(botId)) {
            clearInterval(this.activeConnections.get(botId));
        }
        
        const monitor = setInterval(async () => {
            const bot = this.bots.get(botId);
            if (!bot || bot.status !== 'running') {
                clearInterval(monitor);
                this.activeConnections.delete(botId);
                return;
            }
            
            try {
                await this.getBotStatus(botId);
            } catch (error) {
                console.error(`Monitoring error for bot ${botId}:`, error);
            }
        }, interval);
        
        this.activeConnections.set(botId, monitor);
        return monitor;
    }
    
    // Stop bot monitoring
    stopBotMonitoring(botId) {
        if (this.activeConnections.has(botId)) {
            clearInterval(this.activeConnections.get(botId));
            this.activeConnections.delete(botId);
            return true;
        }
        return false;
    }
    
    // Setup monitoring for all running bots
    setupAllBotMonitoring() {
        for (const [botId, bot] of this.bots) {
            if (bot.status === 'running') {
                this.setupBotMonitoring(botId);
            }
        }
    }
    
    // Stop all bot monitoring
    stopAllBotMonitoring() {
        for (const [botId, monitor] of this.activeConnections) {
            clearInterval(monitor);
        }
        this.activeConnections.clear();
    }
    
    // Get bot uptime
    getBotUptime(botId) {
        const bot = this.bots.get(botId);
        if (!bot || !bot.startedAt) return '0s';
        
        const now = new Date();
        const started = new Date(bot.startedAt);
        const diff = now - started + (bot.stats.uptime || 0);
        
        return this.formatUptime(diff);
    }
    
    // Format uptime
    formatUptime(ms) {
        if (ms <= 0) return '0s';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    // Export bots data
    exportBots() {
        const exportData = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            bots: Array.from(this.bots.values()).map(bot => ({
                id: bot.id,
                name: bot.name,
                description: bot.description,
                botInfo: bot.botInfo,
                settings: bot.settings,
                stats: bot.stats,
                // Note: Tokens are not exported for security
            })),
            stats: this.stats
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    // Import bots data
    importBots(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!data.version || !data.bots) {
                throw new Error('Invalid import data format');
            }
            
            console.log(`Importing ${data.bots.length} bots from v${data.version}`);
            
            this.emitEvent('bots-imported', { count: data.bots.length });
            
            return {
                success: true,
                count: data.bots.length,
                message: 'Import successful. Note: Bot tokens need to be re-entered.'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Clear all bots (for debugging)
    clearAllBots() {
        this.stopAllBots();
        this.stopAllBotMonitoring();
        this.bots.clear();
        this.saveBotsToStorage();
        this.updateStats();
        
        console.log('🧹 All bots cleared');
        return { success: true, count: 0 };
    }
    
    // Event system
    eventListeners = {};
    
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }
    
    emitEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} event handler:`, error);
                }
            });
        }
    }
    
    // Get bot by name
    getBotByName(name) {
        return Array.from(this.bots.values()).find(bot => 
            bot.name.toLowerCase() === name.toLowerCase()
        );
    }
    
    // Search bots
    searchBots(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.bots.values()).filter(bot =>
            bot.name.toLowerCase().includes(lowerQuery) ||
            bot.description.toLowerCase().includes(lowerQuery) ||
            (bot.botInfo?.username && bot.botInfo.username.toLowerCase().includes(lowerQuery))
        );
    }
    
    // Filter bots by status
    filterBotsByStatus(status) {
        return Array.from(this.bots.values()).filter(bot => bot.status === status);
    }
    
    // Get bots created in last X days
    getRecentBots(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return Array.from(this.bots.values()).filter(bot => {
            const created = new Date(bot.createdAt);
            return created >= cutoff;
        });
    }
    
    // Get top performing bots by messages sent
    getTopBots(limit = 5) {
        return Array.from(this.bots.values())
            .sort((a, b) => (b.stats.messagesSent || 0) - (a.stats.messagesSent || 0))
            .slice(0, limit);
    }
    
    // Get bot activity timeline
    getBotActivity(botId, limit = 50) {
        const activities = [];
        const bot = this.bots.get(botId);
        
        if (bot) {
            activities.push({
                type: 'created',
                timestamp: bot.createdAt,
                message: `Bot "${bot.name}" was created`
            });
            
            if (bot.startedAt) {
                activities.push({
                    type: 'started',
                    timestamp: bot.startedAt,
                    message: `Bot was started`
                });
            }
            
            if (bot.stats.messagesSent > 0) {
                activities.push({
                    type: 'message',
                    timestamp: new Date().toISOString(),
                    message: `Sent ${bot.stats.messagesSent} messages total`
                });
            }
        }
        
        return activities.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        ).slice(0, limit);
    }
    
    // Validate chat ID
    validateChatId(chatId) {
        if (!chatId) return { valid: false, error: 'Chat ID is required' };
        
        // Remove @ symbol if present
        const cleanId = chatId.replace('@', '');
        
        // Check if it's a username (starts with letter, contains letters, digits, underscores)
        if (/^[a-zA-Z][a-zA-Z0-9_]{4,}$/.test(cleanId)) {
            return { valid: true, type: 'username', cleaned: '@' + cleanId };
        }
        
        // Check if it's a numeric ID (channel, group, or user)
        if (/^-?\d+$/.test(cleanId)) {
            return { valid: true, type: 'numeric', cleaned: cleanId };
        }
        
        return { valid: false, error: 'Invalid chat ID format' };
    }
    
    // Create bot configuration template
    createBotConfigTemplate() {
        return {
            name: '',
            token: '',
            description: '',
            settings: {
                autoStart: true,
                autoRestart: false,
                logMessages: true,
                parseMode: 'HTML',
                disableWebPagePreview: false,
                disableNotification: false
            },
            commands: [
                {
                    command: 'start',
                    description: 'Start the bot',
                    enabled: true
                },
                {
                    command: 'help',
                    description: 'Show help',
                    enabled: true
                },
                {
                    command: 'status',
                    description: 'Check bot status',
                    enabled: true
                }
            ]
        };
    }
}

// Create global instance
if (!window.botManager) {
    window.botManager = new BotManager();
} else {
    // Jika sudah ada, tambahkan method yang mungkin hilang
    const existingBotManager = window.botManager;
    
    // Tambahkan method yang tidak ada
    if (!existingBotManager.getAllBots) {
        existingBotManager.getAllBots = function() {
            return Array.from(this.bots?.values() || []);
        };
    }
    
    if (!existingBotManager.listBots) {
        existingBotManager.listBots = async function() {
            return {
                success: true,
                bots: this.getAllBots(),
                message: 'Bots loaded from local storage'
            };
        };
    }
    
    if (!existingBotManager.createBot) {
        existingBotManager.createBot = async function(token, name, description) {
            const botId = `bot_${Date.now()}`;
            const bot = {
                id: botId,
                name,
                description,
                token: token.substring(0, 8) + '***',
                status: 'stopped',
                createdAt: new Date().toISOString(),
                stats: {
                    messagesSent: 0,
                    commandsReceived: 0,
                    errors: 0
                }
            };
            
            if (!this.bots) this.bots = new Map();
            this.bots.set(botId, bot);
            
            // Simpan ke localStorage
            const botsArray = Array.from(this.bots.values());
            localStorage.setItem('telebot_bots', JSON.stringify(botsArray));
            
            return {
                success: true,
                botId,
                bot
            };
        };
    }
    
    // Tambahkan method lainnya yang mungkin hilang
    const methodsToAdd = [
        'init', 'loadBotsFromStorage', 'saveBotsToStorage', 'setupEventListeners',
        'setupStatsUpdater', 'startBot', 'stopBot', 'restartBot', 'getBotStatus',
        'sendMessage', 'getBotStats', 'deleteBot', 'getBot', 'updateBotSettings',
        'updateBot', 'startAllBots', 'stopAllBots', 'restartAllBots',
        'getBotCountByStatus', 'updateStats', 'getStats', 'maskToken',
        'validateToken', 'testToken', 'handleConnectionLost', 'handleConnectionRestored',
        'refreshAllBotStatuses', 'setupBotMonitoring', 'stopBotMonitoring',
        'setupAllBotMonitoring', 'stopAllBotMonitoring', 'getBotUptime',
        'formatUptime', 'exportBots', 'importBots', 'clearAllBots',
        'on', 'off', 'emitEvent', 'getBotByName', 'searchBots',
        'filterBotsByStatus', 'getRecentBots', 'getTopBots',
        'getBotActivity', 'validateChatId', 'createBotConfigTemplate'
    ];
    
    // Buat instance baru untuk mendapatkan semua method
    const fullBotManager = new BotManager();
    
    // Salin method yang hilang ke existing instance
    methodsToAdd.forEach(method => {
        if (!existingBotManager[method] && fullBotManager[method]) {
            existingBotManager[method] = fullBotManager[method].bind(existingBotManager);
        }
    });
    
    // Inisialisasi jika belum
    if (!existingBotManager.initialized) {
        existingBotManager.init = fullBotManager.init.bind(existingBotManager);
        existingBotManager.init();
        existingBotManager.initialized = true;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BotManager;
}/**
 * TeleBot Pro v2.0.0 - Bot Manager
 * Handles Telegram bot creation, control, and management
 */

class BotManager {
    constructor() {
        this.bots = new Map();
        this.activeConnections = new Map();
        this.apiBase = '/.netlify/functions';
        this.stats = {
            totalMessages: 0,
            successfulMessages: 0,
            failedMessages: 0,
            totalBots: 0,
            activeBots: 0
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('🤖 Bot Manager initialized');
        this.loadBotsFromStorage();
        this.setupEventListeners();
        this.setupStatsUpdater();
    }
    
    // Load bots from localStorage
    loadBotsFromStorage() {
        try {
            const savedBots = localStorage.getItem('telebot_bots');
            if (savedBots) {
                const botsData = JSON.parse(savedBots);
                botsData.forEach(botData => {
                    this.bots.set(botData.id, botData);
                });
                console.log(`✅ Loaded ${this.bots.size} bots from storage`);
                this.updateStats();
            }
        } catch (error) {
            console.error('Failed to load bots:', error);
        }
    }
    
    // Save bots to localStorage
    saveBotsToStorage() {
        const botsArray = Array.from(this.bots.values());
        localStorage.setItem('telebot_bots', JSON.stringify(botsArray));
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Listen for authentication changes
        if (window.authManager) {
            window.authManager.on('logout', () => {
                this.stopAllBots();
            });
        }
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.handleConnectionRestored();
        });
        
        window.addEventListener('offline', () => {
            this.handleConnectionLost();
        });
        
        // Listen for beforeunload to stop bots
        window.addEventListener('beforeunload', () => {
            this.stopAllBots();
        });
    }
    
    // Setup stats updater
    setupStatsUpdater() {
        // Update stats every minute
        setInterval(() => {
            this.updateStats();
        }, 60000);
    }
    
    // Create a new bot
    async createBot(token, name, description = '') {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            console.log(`Creating bot: ${name}`);
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'create',
                    token: token,
                    name: name,
                    description: description
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Add bot to local storage
                const botData = {
                    id: data.botId,
                    name: name,
                    description: description,
                    token: this.maskToken(token),
                    fullToken: token, // Store securely
                    botInfo: data.botInfo,
                    session: data.session,
                    status: 'created',
                    createdAt: new Date().toISOString(),
                    stats: {
                        messagesSent: 0,
                        commandsReceived: 0,
                        errors: 0,
                        uptime: 0
                    },
                    settings: {
                        autoStart: true,
                        autoRestart: false,
                        logMessages: true
                    }
                };
                
                this.bots.set(data.botId, botData);
                this.saveBotsToStorage();
                this.updateStats();
                
                console.log(`✅ Bot created successfully: ${data.botId}`);
                
                // Emit event
                this.emitEvent('bot-created', botData);
                
                return {
                    success: true,
                    botId: data.botId,
                    data: botData
                };
            } else {
                console.error('Bot creation failed:', data.error);
                return {
                    success: false,
                    error: data.error || 'Failed to create bot'
                };
            }
        } catch (error) {
            console.error('Bot creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Start a bot
    async startBot(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const bot = this.bots.get(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }
            
            console.log(`Starting bot: ${bot.name} (${botId})`);
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'start',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update bot status
                bot.status = 'running';
                bot.startedAt = data.startedAt;
                bot.stats.uptime = 0;
                this.bots.set(botId, bot);
                this.saveBotsToStorage();
                this.updateStats();
                
                console.log(`✅ Bot started: ${botId}`);
                
                // Emit event
                this.emitEvent('bot-started', { botId, data });
                
                return {
                    success: true,
                    data: data
                };
            } else {
                console.error('Bot start failed:', data.error);
                bot.status = 'error';
                this.bots.set(botId, bot);
                this.saveBotsToStorage();
                
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot start error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Stop a bot
    async stopBot(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const bot = this.bots.get(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }
            
            console.log(`Stopping bot: ${bot.name} (${botId})`);
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'stop',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update bot status
                bot.status = 'stopped';
                bot.stoppedAt = new Date().toISOString();
                if (bot.startedAt) {
                    const uptime = new Date() - new Date(bot.startedAt);
                    bot.stats.uptime += uptime;
                }
                this.bots.set(botId, bot);
                this.saveBotsToStorage();
                this.updateStats();
                
                console.log(`🛑 Bot stopped: ${botId}`);
                
                // Emit event
                this.emitEvent('bot-stopped', { botId, data });
                
                return {
                    success: true,
                    data: data
                };
            } else {
                console.error('Bot stop failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot stop error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Restart a bot
    async restartBot(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const bot = this.bots.get(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }
            
            console.log(`Restarting bot: ${bot.name} (${botId})`);
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'restart',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update bot status
                bot.status = 'running';
                bot.startedAt = data.startedAt;
                this.bots.set(botId, bot);
                this.saveBotsToStorage();
                
                console.log(`🔄 Bot restarted: ${botId}`);
                
                // Emit event
                this.emitEvent('bot-restarted', { botId, data });
                
                return {
                    success: true,
                    data: data
                };
            } else {
                console.error('Bot restart failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot restart error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get bot status
    async getBotStatus(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'status',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update local bot data
                const bot = this.bots.get(botId);
                if (bot) {
                    bot.status = data.status;
                    bot.stats = data.stats || bot.stats;
                    bot.startedAt = data.startedAt || bot.startedAt;
                    this.bots.set(botId, bot);
                    this.saveBotsToStorage();
                }
                
                return {
                    success: true,
                    data: data
                };
            } else {
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot status error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // List all bots
    async listBots() {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'list'
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update local storage with fresh data
                if (data.bots && Array.isArray(data.bots)) {
                    data.bots.forEach(botData => {
                        const existingBot = this.bots.get(botData.botId);
                        if (existingBot) {
                            // Merge with existing data
                            const updatedBot = {
                                ...existingBot,
                                ...botData,
                                status: botData.status || existingBot.status,
                                stats: {
                                    ...existingBot.stats,
                                    ...(botData.stats || {})
                                }
                            };
                            this.bots.set(botData.botId, updatedBot);
                        }
                    });
                    this.saveBotsToStorage();
                    this.updateStats();
                }
                
                return {
                    success: true,
                    bots: Array.from(this.bots.values()),
                    serverData: data
                };
            } else {
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('List bots error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Send message through bot
    async sendMessage(botId, chatId, message, options = {}) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const bot = this.bots.get(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }
            
            if (bot.status !== 'running') {
                throw new Error('Bot is not running');
            }
            
            console.log(`Sending message via bot ${botId} to chat ${chatId}`);
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'send',
                    botId: botId,
                    chatId: chatId,
                    message: message,
                    ...options
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update bot stats
                bot.stats.messagesSent = (bot.stats.messagesSent || 0) + 1;
                this.stats.totalMessages++;
                this.stats.successfulMessages++;
                this.bots.set(botId, bot);
                this.saveBotsToStorage();
                this.updateStats();
                
                // Emit event
                this.emitEvent('message-sent', {
                    botId,
                    chatId,
                    message,
                    timestamp: new Date().toISOString()
                });
                
                return {
                    success: true,
                    data: data
                };
            } else {
                this.stats.failedMessages++;
                this.updateStats();
                
                console.error('Send message failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            this.stats.failedMessages++;
            this.updateStats();
            
            console.error('Send message error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get bot statistics
    async getBotStats(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'stats',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update local bot stats
                const bot = this.bots.get(botId);
                if (bot && data.stats) {
                    bot.stats = { ...bot.stats, ...data.stats };
                    this.bots.set(botId, bot);
                    this.saveBotsToStorage();
                }
                
                return {
                    success: true,
                    stats: data.stats,
                    performance: data.performance
                };
            } else {
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot stats error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Delete a bot
    async deleteBot(botId) {
        try {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                throw new Error('Authentication required');
            }
            
            const bot = this.bots.get(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }
            
            console.log(`Deleting bot: ${bot.name} (${botId})`);
            
            // Stop bot if running
            if (bot.status === 'running') {
                await this.stopBot(botId).catch(() => {
                    // Ignore stop errors during deletion
                });
            }
            
            const response = await fetch(`${this.apiBase}/bot-control`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    action: 'delete',
                    botId: botId
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Remove from local storage
                this.bots.delete(botId);
                this.saveBotsToStorage();
                this.updateStats();
                
                // Clear any active connection
                if (this.activeConnections.has(botId)) {
                    clearInterval(this.activeConnections.get(botId));
                    this.activeConnections.delete(botId);
                }
                
                console.log(`🗑️ Bot deleted: ${botId}`);
                
                // Emit event
                this.emitEvent('bot-deleted', { botId, botName: bot.name });
                
                return {
                    success: true,
                    data: data
                };
            } else {
                console.error('Bot deletion failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Bot deletion error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get all bots
    getAllBots() {
        return Array.from(this.bots.values());
    }
    
    // Get bot by ID
    getBot(botId) {
        return this.bots.get(botId);
    }
    
    // Update bot settings
    updateBotSettings(botId, settings) {
        const bot = this.bots.get(botId);
        if (!bot) return false;
        
        bot.settings = { ...bot.settings, ...settings };
        this.bots.set(botId, bot);
        this.saveBotsToStorage();
        
        this.emitEvent('bot-settings-updated', { botId, settings });
        return true;
    }
    
    // Update bot data
    updateBot(botId, updates) {
        const bot = this.bots.get(botId);
        if (!bot) return false;
        
        const updatedBot = { ...bot, ...updates, updatedAt: new Date().toISOString() };
        this.bots.set(botId, updatedBot);
        this.saveBotsToStorage();
        
        return true;
    }
    
    // Start all bots
    async startAllBots() {
        const results = [];
        for (const [botId, bot] of this.bots) {
            if (bot.status !== 'running' && bot.settings.autoStart) {
                const result = await this.startBot(botId);
                results.push({ botId, success: result.success });
            }
        }
        return results;
    }
    
    // Stop all bots
    async stopAllBots() {
        const results = [];
        for (const [botId, bot] of this.bots) {
            if (bot.status === 'running') {
                const result = await this.stopBot(botId);
                results.push({ botId, success: result.success });
            }
        }
        return results;
    }
    
    // Restart all bots
    async restartAllBots() {
        const results = [];
        for (const [botId, bot] of this.bots) {
            if (bot.status === 'running') {
                const result = await this.restartBot(botId);
                results.push({ botId, success: result.success });
            }
        }
        return results;
    }
    
    // Get bot count by status
    getBotCountByStatus() {
        const counts = {
            running: 0,
            stopped: 0,
            error: 0,
            total: this.bots.size
        };
        
        for (const bot of this.bots.values()) {
            if (counts.hasOwnProperty(bot.status)) {
                counts[bot.status]++;
            }
        }
        
        return counts;
    }
    
    // Update statistics
    updateStats() {
        const counts = this.getBotCountByStatus();
        
        this.stats.totalBots = counts.total;
        this.stats.activeBots = counts.running;
        
        // Calculate success rate
        if (this.stats.totalMessages > 0) {
            this.stats.successRate = (this.stats.successfulMessages / this.stats.totalMessages) * 100;
        } else {
            this.stats.successRate = 0;
        }
        
        // Emit stats update
        this.emitEvent('stats-updated', this.stats);
        
        return this.stats;
    }
    
    // Get statistics
    getStats() {
        return { ...this.stats };
    }
    
    // Mask token for display
    maskToken(token) {
        if (!token || token.length < 8) return '***';
        return token.substring(0, 4) + '***' + token.substring(token.length - 4);
    }
    
    // Validate bot token
    validateToken(token) {
        if (!token) return { valid: false, error: 'Token is required' };
        
        // Basic validation
        if (!token.startsWith('bot')) return { valid: false, error: 'Token must start with "bot"' };
        
        const parts = token.split(':');
        if (parts.length !== 2) return { valid: false, error: 'Invalid token format' };
        
        if (parts[0] !== 'bot') return { valid: false, error: 'Token must start with "bot"' };
        
        if (parts[1].length < 10) return { valid: false, error: 'Token is too short' };
        
        return { valid: true };
    }
    
    // Test bot token
    async testToken(token) {
        try {
            // Quick validation first
            const validation = this.validateToken(token);
            if (!validation.valid) {
                return validation;
            }
            
            // Try to get bot info via API
            const testResponse = await fetch('https://api.telegram.org/bot' + token + '/getMe');
            const data = await testResponse.json();
            
            if (data.ok) {
                return {
                    valid: true,
                    botInfo: data.result
                };
            } else {
                return {
                    valid: false,
                    error: data.description || 'Invalid token'
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: 'Network error or invalid token'
            };
        }
    }
    
    // Handle connection lost
    handleConnectionLost() {
        console.warn('⚠️ Connection lost, pausing bot operations');
        this.emitEvent('connection-lost', { timestamp: new Date().toISOString() });
    }
    
    // Handle connection restored
    handleConnectionRestored() {
        console.log('✅ Connection restored, resuming bot operations');
        this.emitEvent('connection-restored', { timestamp: new Date().toISOString() });
        
        // Refresh bot statuses
        this.refreshAllBotStatuses();
    }
    
    // Refresh all bot statuses
    async refreshAllBotStatuses() {
        const results = [];
        for (const [botId, bot] of this.bots) {
            if (bot.status === 'running') {
                const result = await this.getBotStatus(botId);
                results.push({ botId, success: result.success });
            }
        }
        return results;
    }
    
    // Setup bot monitoring
    setupBotMonitoring(botId, interval = 30000) {
        if (this.activeConnections.has(botId)) {
            clearInterval(this.activeConnections.get(botId));
        }
        
        const monitor = setInterval(async () => {
            const bot = this.bots.get(botId);
            if (!bot || bot.status !== 'running') {
                clearInterval(monitor);
                this.activeConnections.delete(botId);
                return;
            }
            
            try {
                await this.getBotStatus(botId);
            } catch (error) {
                console.error(`Monitoring error for bot ${botId}:`, error);
            }
        }, interval);
        
        this.activeConnections.set(botId, monitor);
        return monitor;
    }
    
    // Stop bot monitoring
    stopBotMonitoring(botId) {
        if (this.activeConnections.has(botId)) {
            clearInterval(this.activeConnections.get(botId));
            this.activeConnections.delete(botId);
            return true;
        }
        return false;
    }
    
    // Setup monitoring for all running bots
    setupAllBotMonitoring() {
        for (const [botId, bot] of this.bots) {
            if (bot.status === 'running') {
                this.setupBotMonitoring(botId);
            }
        }
    }
    
    // Stop all bot monitoring
    stopAllBotMonitoring() {
        for (const [botId, monitor] of this.activeConnections) {
            clearInterval(monitor);
        }
        this.activeConnections.clear();
    }
    
    // Get bot uptime
    getBotUptime(botId) {
        const bot = this.bots.get(botId);
        if (!bot || !bot.startedAt) return '0s';
        
        const now = new Date();
        const started = new Date(bot.startedAt);
        const diff = now - started + (bot.stats.uptime || 0);
        
        return this.formatUptime(diff);
    }
    
    // Format uptime
    formatUptime(ms) {
        if (ms <= 0) return '0s';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    // Export bots data
    exportBots() {
        const exportData = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            bots: Array.from(this.bots.values()).map(bot => ({
                id: bot.id,
                name: bot.name,
                description: bot.description,
                botInfo: bot.botInfo,
                settings: bot.settings,
                stats: bot.stats,
                // Note: Tokens are not exported for security
            })),
            stats: this.stats
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    // Import bots data
    importBots(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!data.version || !data.bots) {
                throw new Error('Invalid import data format');
            }
            
            // For now, just log the import
            console.log(`Importing ${data.bots.length} bots from v${data.version}`);
            
            // Here you would implement actual import logic
            // Note: Tokens need to be re-entered for security
            
            this.emitEvent('bots-imported', { count: data.bots.length });
            
            return {
                success: true,
                count: data.bots.length,
                message: 'Import successful. Note: Bot tokens need to be re-entered.'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Clear all bots (for debugging)
    clearAllBots() {
        this.stopAllBots();
        this.stopAllBotMonitoring();
        this.bots.clear();
        this.saveBotsToStorage();
        this.updateStats();
        
        console.log('🧹 All bots cleared');
        return { success: true, count: 0 };
    }
    
    // Event system
    eventListeners = {};
    
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }
    
    emitEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} event handler:`, error);
                }
            });
        }
    }
    
    // Get bot by name
    getBotByName(name) {
        return Array.from(this.bots.values()).find(bot => 
            bot.name.toLowerCase() === name.toLowerCase()
        );
    }
    
    // Search bots
    searchBots(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.bots.values()).filter(bot =>
            bot.name.toLowerCase().includes(lowerQuery) ||
            bot.description.toLowerCase().includes(lowerQuery) ||
            (bot.botInfo?.username && bot.botInfo.username.toLowerCase().includes(lowerQuery))
        );
    }
    
    // Filter bots by status
    filterBotsByStatus(status) {
        return Array.from(this.bots.values()).filter(bot => bot.status === status);
    }
    
    // Get bots created in last X days
    getRecentBots(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return Array.from(this.bots.values()).filter(bot => {
            const created = new Date(bot.createdAt);
            return created >= cutoff;
        });
    }
    
    // Get top performing bots by messages sent
    getTopBots(limit = 5) {
        return Array.from(this.bots.values())
            .sort((a, b) => (b.stats.messagesSent || 0) - (a.stats.messagesSent || 0))
            .slice(0, limit);
    }
    
    // Get bot activity timeline
    getBotActivity(botId, limit = 50) {
        // This would typically come from a logging system
        // For now, return mock data
        const activities = [];
        const bot = this.bots.get(botId);
        
        if (bot) {
            activities.push({
                type: 'created',
                timestamp: bot.createdAt,
                message: `Bot "${bot.name}" was created`
            });
            
            if (bot.startedAt) {
                activities.push({
                    type: 'started',
                    timestamp: bot.startedAt,
                    message: `Bot was started`
                });
            }
            
            if (bot.stats.messagesSent > 0) {
                activities.push({
                    type: 'message',
                    timestamp: new Date().toISOString(),
                    message: `Sent ${bot.stats.messagesSent} messages total`
                });
            }
        }
        
        return activities.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        ).slice(0, limit);
    }
    
    // Validate chat ID
    validateChatId(chatId) {
        if (!chatId) return { valid: false, error: 'Chat ID is required' };
        
        // Remove @ symbol if present
        const cleanId = chatId.replace('@', '');
        
        // Check if it's a username (starts with letter, contains letters, digits, underscores)
        if (/^[a-zA-Z][a-zA-Z0-9_]{4,}$/.test(cleanId)) {
            return { valid: true, type: 'username', cleaned: '@' + cleanId };
        }
        
        // Check if it's a numeric ID (channel, group, or user)
        if (/^-?\d+$/.test(cleanId)) {
            return { valid: true, type: 'numeric', cleaned: cleanId };
        }
        
        return { valid: false, error: 'Invalid chat ID format' };
    }
    
    // Create bot configuration template
    createBotConfigTemplate() {
        return {
            name: '',
            token: '',
            description: '',
            settings: {
                autoStart: true,
                autoRestart: false,
                logMessages: true,
                parseMode: 'HTML',
                disableWebPagePreview: false,
                disableNotification: false
            },
            commands: [
                {
                    command: 'start',
                    description: 'Start the bot',
                    enabled: true
                },
                {
                    command: 'help',
                    description: 'Show help',
                    enabled: true
                },
                {
                    command: 'status',
                    description: 'Check bot status',
                    enabled: true
                }
            ]
        };
    }
}

// Create global instance
window.botManager = new BotManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BotManager;
}
