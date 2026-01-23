/**
 * TeleBot Pro v2.0.0 - Telegram Manager
 * Handles Telegram user bot connections and operations
 */

class TelegramManager {
    constructor() {
        this.userSessions = new Map();
        this.activeConnections = new Map();
        this.messageQueue = [];
        this.apiBase = '/.netlify/functions';
        
        // Configuration
        this.config = {
            maxSessions: 5,
            autoReconnect: true,
            reconnectDelay: 5000,
            maxRetries: 3,
            messageQueueLimit: 1000
        };
        
        // Event listeners
        this.eventListeners = {};
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('📱 Telegram Manager initialized');
        this.loadSessionsFromStorage();
        this.setupEventListeners();
        this.setupQueueProcessor();
    }
    
    // Load sessions from localStorage
    loadSessionsFromStorage() {
        try {
            const savedSessions = localStorage.getItem('telegram_sessions');
            if (savedSessions) {
                const sessions = JSON.parse(savedSessions);
                sessions.forEach(session => {
                    this.userSessions.set(session.sessionId, session);
                });
                console.log(`✅ Loaded ${this.userSessions.size} Telegram sessions`);
            }
        } catch (error) {
            console.error('Failed to load Telegram sessions:', error);
        }
    }
    
    // Save sessions to localStorage
    saveSessionsToStorage() {
        try {
            const sessions = Array.from(this.userSessions.values());
            localStorage.setItem('telegram_sessions', JSON.stringify(sessions));
        } catch (error) {
            console.error('Failed to save Telegram sessions:', error);
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Listen for authentication changes
        if (window.authManager) {
            window.authManager.on('logout', () => {
                this.disconnectAllSessions();
            });
        }
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.handleConnectionRestored();
        });
        
        window.addEventListener('offline', () => {
            this.handleConnectionLost();
        });
    }
    
    // Setup message queue processor
    setupQueueProcessor() {
        // Process queue every second
        setInterval(() => {
            this.processMessageQueue();
        }, 1000);
    }
    
    // Get authentication headers
    getAuthHeaders() {
        try {
            // Prioritize authManager if available
            if (window.authManager && window.authManager.getAuthHeaders) {
                return window.authManager.getAuthHeaders();
            }
            
            // Fallback: get token from localStorage
            const token = localStorage.getItem('auth_token');
            if (!token) {
                console.warn('No authentication token found');
                return {
                    'Content-Type': 'application/json'
                };
            }
            
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        } catch (error) {
            console.error('Error getting auth headers:', error);
            return {
                'Content-Type': 'application/json'
            };
        }
    }
    
    // Validate authentication
    validateAuthentication() {
        try {
            // Check authManager first
            if (window.authManager && window.authManager.isAuthenticated) {
                return window.authManager.isAuthenticated();
            }
            
            // Fallback: check token in localStorage
            const token = localStorage.getItem('auth_token');
            return !!token;
        } catch (error) {
            console.error('Authentication validation error:', error);
            return false;
        }
    }
    
    // Connect a user bot
    async connectUserBot(apiId, apiHash, phoneNumber) {
        try {
            // Validate authentication
            if (!this.validateAuthentication()) {
                throw new Error('Authentication required. Please login first.');
            }
            
            // Check session limit
            if (this.userSessions.size >= this.config.maxSessions) {
                throw new Error(`Maximum ${this.config.maxSessions} sessions allowed`);
            }
            
            console.log(`Connecting user bot with API ID: ${apiId}`);
            
            // Get auth headers
            const headers = this.getAuthHeaders();
            
            const response = await fetch(`${this.apiBase}/telegram-api`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    action: 'connect',
                    apiId: apiId,
                    apiHash: apiHash,
                    phoneNumber: phoneNumber
                })
            });
            
            // Check response status
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            // SELALU simpan session sementara, bahkan jika butuh verifikasi
            const session = {
                sessionId: data.sessionId,
                apiId: apiId,
                apiHash: this.maskApiHash(apiHash),
                phoneNumber: phoneNumber,
                status: 'verifying', // Status khusus untuk verifikasi
                createdAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                stats: {
                    messagesSent: 0,
                    messagesReceived: 0,
                    dialogsLoaded: 0
                }
            };
            
            this.userSessions.set(data.sessionId, session);
            this.saveSessionsToStorage();
            
            if (data.requiresVerification) {
                // Need verification code
                return {
                    success: true,
                    requiresVerification: true,
                    sessionId: data.sessionId,
                    message: data.message || 'Please enter verification code'
                };
            } else {
                // Langsung terkoneksi (rare case)
                session.status = 'connected';
                session.user = data.user;
                session.verifiedAt = new Date().toISOString();
                this.userSessions.set(data.sessionId, session);
                this.saveSessionsToStorage();
                
                console.log(`✅ User bot connected: ${data.user?.username || data.user?.phone || phoneNumber}`);
                
                // Setup monitoring
                this.setupSessionMonitoring(data.sessionId);
                
                this.emitEvent('session-connected', { sessionId: data.sessionId, user: data.user });
                
                return {
                    success: true,
                    sessionId: data.sessionId,
                    user: data.user,
                    message: 'Connected successfully'
                };
            }
        } catch (error) {
            console.error('Connection error:', error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred'
            };
        }
    }
    
    // Verify connection with code
    async verifyConnection(sessionId, verificationCode) {
        try {
            console.log(`🔐 Verifying session: ${sessionId} with code: ${verificationCode}`);
            
            // Validate authentication
            if (!this.validateAuthentication()) {
                throw new Error('Authentication required. Please login first.');
            }
            
            if (!verificationCode || verificationCode.length !== 5) {
                throw new Error('Verification code must be 5 digits');
            }
            
            const session = this.userSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            
            console.log(`Verifying session: ${sessionId}`);
            
            // Get auth headers
            const headers = this.getAuthHeaders();
            
            const response = await fetch(`${this.apiBase}/telegram-api`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    action: 'verify',
                    sessionId: sessionId,
                    verificationCode: verificationCode
                })
            });
            
            console.log('📥 Verification response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('📥 Verification response data:', data);
            
            if (response.ok && data.success) {
                // Update session
                session.status = 'connected';
                session.user = data.user;
                session.verifiedAt = new Date().toISOString();
                session.lastActivity = new Date().toISOString();
                
                this.userSessions.set(sessionId, session);
                this.saveSessionsToStorage();
                
                console.log(`✅ Session verified: ${sessionId}`);
                
                // Setup monitoring
                this.setupSessionMonitoring(sessionId);
                
                this.emitEvent('session-verified', { sessionId: sessionId, user: data.user });
                
                return {
                    success: true,
                    sessionId: sessionId,
                    user: data.user,
                    message: 'Verified and connected successfully!'
                };
            } else {
                console.error('❌ Verification failed:', data.error);
                return {
                    success: false,
                    error: data.error || 'Verification failed'
                };
            }
        } catch (error) {
            console.error('❌ Verification error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Send message through user bot
    async sendMessage(sessionId, chatId, message, options = {}) {
        try {
            // Validate authentication
            if (!this.validateAuthentication()) {
                throw new Error('Authentication required. Please login first.');
            }
            
            const session = this.userSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            
            if (session.status !== 'connected') {
                throw new Error('Session is not connected');
            }
            
            console.log(`Sending message via session ${sessionId} to chat ${chatId}`);
            
            // Get auth headers
            const headers = this.getAuthHeaders();
            
            const response = await fetch(`${this.apiBase}/telegram-api`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    action: 'send',
                    sessionId: sessionId,
                    chatId: chatId,
                    message: message,
                    ...options
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update session stats
                session.stats.messagesSent = (session.stats.messagesSent || 0) + 1;
                session.lastActivity = new Date().toISOString();
                this.userSessions.set(sessionId, session);
                this.saveSessionsToStorage();
                
                console.log(`✅ Message sent via session ${sessionId}`);
                
                this.emitEvent('message-sent', { 
                    sessionId: sessionId, 
                    chatId: chatId, 
                    messageId: data.messageId 
                });
                
                return {
                    success: true,
                    messageId: data.messageId,
                    timestamp: data.timestamp
                };
            } else {
                console.error('Send message failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Send message error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Schedule a message
    async scheduleMessage(sessionId, chatId, message, scheduleTime, options = {}) {
        try {
            // Validate authentication
            if (!this.validateAuthentication()) {
                throw new Error('Authentication required. Please login first.');
            }
            
            const scheduleDate = new Date(scheduleTime);
            const now = new Date();
            
            if (scheduleDate <= now) {
                throw new Error('Schedule time must be in the future');
            }
            
            console.log(`Scheduling message for ${scheduleDate.toLocaleString()}`);
            
            // Get auth headers
            const headers = this.getAuthHeaders();
            
            const response = await fetch(`${this.apiBase}/telegram-api`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    action: 'schedule',
                    sessionId: sessionId,
                    chatId: chatId,
                    message: message,
                    scheduleTime: scheduleTime,
                    ...options
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Add to local queue for tracking
                const scheduledMessage = {
                    jobId: data.jobId,
                    sessionId: sessionId,
                    chatId: chatId,
                    message: message,
                    scheduledFor: scheduleTime,
                    status: 'scheduled',
                    createdAt: new Date().toISOString()
                };
                
                this.addToMessageQueue(scheduledMessage);
                
                this.emitEvent('message-scheduled', { 
                    jobId: data.jobId,
                    scheduledFor: scheduleTime 
                });
                
                return {
                    success: true,
                    jobId: data.jobId,
                    scheduledFor: data.scheduledFor,
                    inSeconds: data.inSeconds
                };
            } else {
                console.error('Schedule message failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Schedule message error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get user dialogs
    async getUserDialogs(sessionId) {
        try {
            // Validate authentication
            if (!this.validateAuthentication()) {
                throw new Error('Authentication required. Please login first.');
            }
            
            const session = this.userSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            
            console.log(`Getting dialogs for session ${sessionId}`);
            
            // Get auth headers
            const headers = this.getAuthHeaders();
            
            const response = await fetch(`${this.apiBase}/telegram-api`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    action: 'dialogs',
                    sessionId: sessionId
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update session
                session.lastActivity = new Date().toISOString();
                session.stats.dialogsLoaded = data.dialogs?.length || 0;
                this.userSessions.set(sessionId, session);
                this.saveSessionsToStorage();
                
                this.emitEvent('dialogs-loaded', { 
                    sessionId: sessionId, 
                    count: data.dialogs?.length || 0 
                });
                
                return {
                    success: true,
                    dialogs: data.dialogs,
                    count: data.count
                };
            } else {
                console.error('Get dialogs failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Get dialogs error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get session status
    async getSessionStatus(sessionId) {
        try {
            // Validate authentication
            if (!this.validateAuthentication()) {
                throw new Error('Authentication required. Please login first.');
            }
            
            const session = this.userSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            
            // Get auth headers
            const headers = this.getAuthHeaders();
            
            const response = await fetch(`${this.apiBase}/telegram-api`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    action: 'status',
                    sessionId: sessionId
                })
            });
            
            if (!response.ok) {
                // If unauthorized, mark session as disconnected
                if (response.status === 401) {
                    session.status = 'disconnected';
                    this.userSessions.set(sessionId, session);
                    this.saveSessionsToStorage();
                    
                    return {
                        success: false,
                        error: 'Authentication expired',
                        status: 'disconnected'
                    };
                }
                
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update local session data
                session.status = data.status;
                session.user = data.user;
                session.stats = data.stats || session.stats;
                session.lastActivity = new Date().toISOString();
                this.userSessions.set(sessionId, session);
                this.saveSessionsToStorage();
                
                return {
                    success: true,
                    status: data.status,
                    user: data.user,
                    stats: data.stats,
                    sessionInfo: data.sessionInfo
                };
            } else {
                console.error('Get status failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Get status error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Disconnect session
    async disconnectSession(sessionId) {
        try {
            // Validate authentication
            if (!this.validateAuthentication()) {
                throw new Error('Authentication required. Please login first.');
            }
            
            const session = this.userSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            
            console.log(`Disconnecting session: ${sessionId}`);
            
            // Get auth headers
            const headers = this.getAuthHeaders();
            
            const response = await fetch(`${this.apiBase}/telegram-api`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    action: 'disconnect',
                    sessionId: sessionId
                })
            });
            
            // Even if API call fails, remove locally
            if (response.ok) {
                const data = await response.json();
                if (!data.success) {
                    console.warn('API disconnect failed, removing locally:', data.error);
                }
            }
            
            // Remove from local storage
            this.userSessions.delete(sessionId);
            this.saveSessionsToStorage();
            
            // Stop monitoring
            this.stopSessionMonitoring(sessionId);
            
            console.log(`✅ Session disconnected: ${sessionId}`);
            
            this.emitEvent('session-disconnected', { sessionId: sessionId });
            
            return {
                success: true,
                message: 'Disconnected successfully'
            };
        } catch (error) {
            console.error('Disconnect error:', error);
            
            // Still try to remove locally
            this.userSessions.delete(sessionId);
            this.saveSessionsToStorage();
            this.stopSessionMonitoring(sessionId);
            
            return {
                success: false,
                error: error.message,
                message: 'Disconnected locally'
            };
        }
    }
    
    // Get user chats
    async getUserChats(sessionId) {
        try {
            // Validate authentication
            if (!this.validateAuthentication()) {
                throw new Error('Authentication required. Please login first.');
            }
            
            const session = this.userSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            
            console.log(`Getting chats for session ${sessionId}`);
            
            // Get auth headers
            const headers = this.getAuthHeaders();
            
            const response = await fetch(`${this.apiBase}/telegram-api`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    action: 'chats',
                    sessionId: sessionId
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Update session
                session.lastActivity = new Date().toISOString();
                this.userSessions.set(sessionId, session);
                this.saveSessionsToStorage();
                
                return {
                    success: true,
                    chats: data.chats,
                    stats: data.stats
                };
            } else {
                console.error('Get chats failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Get chats error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Setup auto-text
    async setupAutoText(sessionId, targets, message, interval = 60, repeat = 1, startNow = false) {
        try {
            // Validate authentication
            if (!this.validateAuthentication()) {
                throw new Error('Authentication required. Please login first.');
            }
            
            const session = this.userSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            
            console.log(`Setting up auto-text for session ${sessionId}`);
            
            // Get auth headers
            const headers = this.getAuthHeaders();
            
            const response = await fetch(`${this.apiBase}/telegram-api`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    action: 'auto-text',
                    sessionId: sessionId,
                    targets: Array.isArray(targets) ? targets : [targets],
                    message: message,
                    interval: interval,
                    repeat: repeat,
                    startNow: startNow
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.emitEvent('auto-text-configured', { 
                    sessionId: sessionId, 
                    jobId: data.jobId 
                });
                
                return {
                    success: true,
                    jobId: data.jobId,
                    config: data.config
                };
            } else {
                console.error('Auto-text setup failed:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Auto-text setup error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Setup session monitoring
    setupSessionMonitoring(sessionId) {
        if (this.activeConnections.has(sessionId)) {
            clearInterval(this.activeConnections.get(sessionId));
        }
        
        const monitor = setInterval(async () => {
            const session = this.userSessions.get(sessionId);
            if (!session || session.status !== 'connected') {
                clearInterval(monitor);
                this.activeConnections.delete(sessionId);
                return;
            }
            
            try {
                await this.getSessionStatus(sessionId);
            } catch (error) {
                console.error(`Monitoring error for session ${sessionId}:`, error);
                
                // Attempt reconnection if enabled
                if (this.config.autoReconnect) {
                    this.attemptReconnection(sessionId);
                }
            }
        }, 30000); // Check every 30 seconds
        
        this.activeConnections.set(sessionId, monitor);
    }
    
    // Stop session monitoring
    stopSessionMonitoring(sessionId) {
        if (this.activeConnections.has(sessionId)) {
            clearInterval(this.activeConnections.get(sessionId));
            this.activeConnections.delete(sessionId);
        }
    }
    
    // Attempt reconnection
    async attemptReconnection(sessionId) {
        const session = this.userSessions.get(sessionId);
        if (!session) return;
        
        // Update status
        session.status = 'reconnecting';
        session.reconnectionAttempts = (session.reconnectionAttempts || 0) + 1;
        this.userSessions.set(sessionId, session);
        
        console.log(`Attempting reconnection for session ${sessionId} (attempt ${session.reconnectionAttempts})`);
        
        if (session.reconnectionAttempts > this.config.maxRetries) {
            console.error(`Max reconnection attempts reached for session ${sessionId}`);
            session.status = 'disconnected';
            this.userSessions.set(sessionId, session);
            this.saveSessionsToStorage();
            
            this.emitEvent('session-disconnected', { 
                sessionId: sessionId, 
                reason: 'max-reconnection-attempts' 
            });
            
            return;
        }
        
        // Try to get status (which will attempt reconnection)
        try {
            const result = await this.getSessionStatus(sessionId);
            if (result.success) {
                console.log(`✅ Reconnection successful for session ${sessionId}`);
                session.reconnectionAttempts = 0;
                this.userSessions.set(sessionId, session);
                
                this.emitEvent('session-reconnected', { sessionId: sessionId });
            }
        } catch (error) {
            // Schedule next attempt
            setTimeout(() => {
                this.attemptReconnection(sessionId);
            }, this.config.reconnectDelay);
        }
    }
    
    // Disconnect all sessions
    async disconnectAllSessions() {
        const results = [];
        const sessionIds = Array.from(this.userSessions.keys());
        
        for (const sessionId of sessionIds) {
            if (this.userSessions.get(sessionId).status === 'connected') {
                try {
                    await this.disconnectSession(sessionId);
                    results.push({ sessionId, success: true });
                } catch (error) {
                    results.push({ sessionId, success: false, error: error.message });
                }
            }
        }
        
        this.emitEvent('all-sessions-disconnected', { results });
        return results;
    }
    
    // Handle connection lost
    handleConnectionLost() {
        console.warn('⚠️ Connection lost, updating session statuses');
        
        for (const [sessionId, session] of this.userSessions) {
            if (session.status === 'connected') {
                session.status = 'disconnected';
                this.userSessions.set(sessionId, session);
            }
        }
        
        this.saveSessionsToStorage();
        this.emitEvent('connection-lost');
    }
    
    // Handle connection restored
    handleConnectionRestored() {
        console.log('✅ Connection restored, attempting to reconnect sessions');
        
        for (const [sessionId, session] of this.userSessions) {
            if (session.status === 'disconnected' && this.config.autoReconnect) {
                this.attemptReconnection(sessionId);
            }
        }
        
        this.emitEvent('connection-restored');
    }
    
    // Add message to queue
    addToMessageQueue(message) {
        this.messageQueue.push(message);
        
        // Limit queue size
        if (this.messageQueue.length > this.config.messageQueueLimit) {
            this.messageQueue.shift();
        }
    }
    
    // Process message queue
    async processMessageQueue() {
        if (this.messageQueue.length === 0) return;
        
        const now = new Date();
        const processed = [];
        
        for (let i = 0; i < this.messageQueue.length; i++) {
            const message = this.messageQueue[i];
            
            if (message.status === 'scheduled') {
                const scheduledTime = new Date(message.scheduledFor);
                
                if (now >= scheduledTime) {
                    try {
                        // Time to send the message
                        const result = await this.sendMessage(
                            message.sessionId,
                            message.chatId,
                            message.message
                        );
                        
                        message.status = result.success ? 'sent' : 'failed';
                        message.sentAt = new Date().toISOString();
                        message.result = result;
                        
                        this.emitEvent('queue-message-processed', { 
                            jobId: message.jobId, 
                            success: result.success 
                        });
                    } catch (error) {
                        message.status = 'failed';
                        message.error = error.message;
                        console.error('Queue processing error:', error);
                    }
                    
                    processed.push(i);
                }
            }
        }
        
        // Remove processed messages (reverse order to maintain indices)
        for (let i = processed.length - 1; i >= 0; i--) {
            this.messageQueue.splice(processed[i], 1);
        }
    }
    
    // Get all sessions
    getAllSessions() {
        return Array.from(this.userSessions.values());
    }
    
    // Get session by ID
    getSession(sessionId) {
        return this.userSessions.get(sessionId);
    }
    
    // Update session
    updateSession(sessionId, updates) {
        const session = this.userSessions.get(sessionId);
        if (!session) return false;
        
        const updatedSession = { ...session, ...updates, updatedAt: new Date().toISOString() };
        this.userSessions.set(sessionId, updatedSession);
        this.saveSessionsToStorage();
        
        this.emitEvent('session-updated', { sessionId: sessionId, updates: updates });
        
        return true;
    }
    
    // Mask API hash for display
    maskApiHash(apiHash) {
        if (!apiHash || apiHash.length < 8) return '***';
        return apiHash.substring(0, 4) + '***' + apiHash.substring(apiHash.length - 4);
    }
    
    // Validate API credentials
    validateApiCredentials(apiId, apiHash) {
        const errors = [];
        
        if (!apiId || !apiId.trim()) {
            errors.push('API ID is required');
        } else if (!/^\d+$/.test(apiId)) {
            errors.push('API ID must be numeric');
        }
        
        if (!apiHash || !apiHash.trim()) {
            errors.push('API Hash is required');
        } else if (apiHash.length < 10) {
            errors.push('API Hash is too short');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    // Validate phone number
    validatePhoneNumber(phoneNumber) {
        if (!phoneNumber || !phoneNumber.trim()) {
            return { valid: false, error: 'Phone number is required' };
        }
        
        // Basic validation - should start with +
        if (!phoneNumber.startsWith('+')) {
            return { valid: false, error: 'Phone number must start with +' };
        }
        
        // Remove non-digits for length check
        const digits = phoneNumber.replace(/\D/g, '');
        if (digits.length < 8) {
            return { valid: false, error: 'Phone number is too short' };
        }
        
        return { valid: true, cleaned: phoneNumber };
    }
    
    // Get session statistics
    getSessionStats() {
        const stats = {
            total: this.userSessions.size,
            connected: 0,
            disconnected: 0,
            reconnecting: 0,
            totalMessages: 0
        };
        
        for (const session of this.userSessions.values()) {
            if (session.status === 'connected') stats.connected++;
            if (session.status === 'disconnected') stats.disconnected++;
            if (session.status === 'reconnecting') stats.reconnecting++;
            if (session.status === 'verifying') stats.reconnecting++; // Treat verifying as reconnecting for stats
            
            stats.totalMessages += session.stats?.messagesSent || 0;
        }
        
        return stats;
    }
    
    // Export sessions data
    exportSessions() {
        const exportData = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            sessions: Array.from(this.userSessions.values()).map(session => ({
                sessionId: session.sessionId,
                apiId: session.apiId,
                phoneNumber: session.phoneNumber,
                user: session.user,
                status: session.status,
                stats: session.stats,
                // Note: API hash is not exported for security
            })),
            stats: this.getSessionStats()
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    // Import sessions data
    importSessions(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!data.version || !Array.isArray(data.sessions)) {
                throw new Error('Invalid import data format');
            }
            
            console.log(`Importing ${data.sessions.length} sessions from v${data.version}`);
            
            // Note: Sessions need to be reconnected as API hash is not stored
            this.emitEvent('sessions-imported', { count: data.sessions.length });
            
            return {
                success: true,
                count: data.sessions.length,
                message: 'Import successful. Note: Sessions need to be reconnected with API credentials.'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Clear all sessions
    clearAllSessions() {
        this.disconnectAllSessions();
        this.userSessions.clear();
        this.saveSessionsToStorage();
        this.messageQueue = [];
        
        console.log('🧹 All Telegram sessions cleared');
        this.emitEvent('all-sessions-cleared');
        
        return { success: true, count: 0 };
    }
    
    // Get session uptime
    getSessionUptime(sessionId) {
        const session = this.userSessions.get(sessionId);
        if (!session || !session.connectedAt) return '0s';
        
        const now = new Date();
        const connected = new Date(session.connectedAt);
        const diff = now - connected;
        
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
    
    // Get message queue status
    getQueueStatus() {
        return {
            total: this.messageQueue.length,
            scheduled: this.messageQueue.filter(m => m.status === 'scheduled').length,
            sent: this.messageQueue.filter(m => m.status === 'sent').length,
            failed: this.messageQueue.filter(m => m.status === 'failed').length
        };
    }
    
    // Clear message queue
    clearMessageQueue() {
        const count = this.messageQueue.length;
        this.messageQueue = [];
        console.log(`🗑️ Cleared ${count} messages from queue`);
        
        this.emitEvent('queue-cleared', { count });
        
        return { success: true, count };
    }
    
    // Event system
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
    
    // Get session by phone number
    getSessionByPhoneNumber(phoneNumber) {
        return Array.from(this.userSessions.values()).find(session => 
            session.phoneNumber === phoneNumber
        );
    }
    
    // Search sessions
    searchSessions(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.userSessions.values()).filter(session =>
            session.phoneNumber.toLowerCase().includes(lowerQuery) ||
            (session.user?.username && session.user.username.toLowerCase().includes(lowerQuery)) ||
            (session.user?.phone && session.user.phone.toLowerCase().includes(lowerQuery))
        );
    }
    
    // Filter sessions by status
    filterSessionsByStatus(status) {
        return Array.from(this.userSessions.values()).filter(session => session.status === status);
    }
    
    // Get recent sessions
    getRecentSessions(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return Array.from(this.userSessions.values()).filter(session => {
            const connected = new Date(session.connectedAt);
            return connected >= cutoff;
        });
    }
    
    // Get top sessions by messages sent
    getTopSessions(limit = 5) {
        return Array.from(this.userSessions.values())
            .sort((a, b) => (b.stats.messagesSent || 0) - (a.stats.messagesSent || 0))
            .slice(0, limit);
    }
    
    // Create session configuration template
    createSessionConfigTemplate() {
        return {
            apiId: '',
            apiHash: '',
            phoneNumber: '',
            settings: {
                autoReconnect: true,
                logMessages: true,
                saveSession: true,
                downloadDialogs: true
            }
        };
    }
    
    // Health check
    async healthCheck() {
        try {
            const sessions = this.getAllSessions();
            const results = [];
            
            for (const session of sessions) {
                try {
                    const status = await this.getSessionStatus(session.sessionId);
                    results.push({
                        sessionId: session.sessionId,
                        status: status.success ? 'healthy' : 'unhealthy',
                        details: status
                    });
                } catch (error) {
                    results.push({
                        sessionId: session.sessionId,
                        status: 'error',
                        error: error.message
                    });
                }
            }
            
            return {
                success: true,
                total: sessions.length,
                healthy: results.filter(r => r.status === 'healthy').length,
                unhealthy: results.filter(r => r.status === 'unhealthy').length,
                errors: results.filter(r => r.status === 'error').length,
                details: results
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Create global instance
window.telegramManager = new TelegramManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramManager;
}
