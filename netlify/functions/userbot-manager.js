const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const EventEmitter = require('events');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    JWT_SECRET: process.env.JWT_SECRET || "f8d7a3c6b5e49201738a1d2f4c9b6a7e5d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2",
    MAX_USER_BOTS: parseInt(process.env.MAX_USER_BOTS) || 5,
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    AUTO_TEXT_MAX_TARGETS: parseInt(process.env.AUTO_TEXT_MAX_TARGETS) || 50,
    MAX_MESSAGE_HISTORY: parseInt(process.env.MAX_MESSAGE_HISTORY) || 1000
};

// ============================================
// STORAGE SYSTEMS
// ============================================
class UserBotStorage {
    constructor() {
        this.userBots = new Map();          // userId -> botId -> botData
        this.autoTextJobs = new Map();      // userId -> jobId -> jobData
        this.messageHistory = new Map();    // userId -> message array
        this.connectedChats = new Map();    // userId -> chat array
        this.userSessions = new Map();      // userId -> session data
    }
    
    // User Bot Management
    addUserBot(userId, botData) {
        if (!this.userBots.has(userId)) {
            this.userBots.set(userId, new Map());
        }
        
        const userBots = this.userBots.get(userId);
        userBots.set(botData.id, botData);
        return botData;
    }
    
    getUserBot(userId, botId) {
        const userBots = this.userBots.get(userId);
        return userBots ? userBots.get(botId) : null;
    }
    
    getUserBots(userId) {
        const userBots = this.userBots.get(userId);
        return userBots ? Array.from(userBots.values()) : [];
    }
    
    updateUserBot(userId, botId, updates) {
        const bot = this.getUserBot(userId, botId);
        if (bot) {
            Object.assign(bot, updates, {
                updatedAt: Date.now(),
                lastActivity: Date.now()
            });
            return bot;
        }
        return null;
    }
    
    deleteUserBot(userId, botId) {
        const userBots = this.userBots.get(userId);
        if (userBots) {
            userBots.delete(botId);
            
            // Clean up related data
            this.cleanupBotData(userId, botId);
            return true;
        }
        return false;
    }
    
    // Auto Text Jobs
    addAutoTextJob(userId, jobData) {
        if (!this.autoTextJobs.has(userId)) {
            this.autoTextJobs.set(userId, new Map());
        }
        
        const userJobs = this.autoTextJobs.get(userId);
        userJobs.set(jobData.id, jobData);
        return jobData;
    }
    
    getAutoTextJob(userId, jobId) {
        const userJobs = this.autoTextJobs.get(userId);
        return userJobs ? userJobs.get(jobId) : null;
    }
    
    getAutoTextJobs(userId) {
        const userJobs = this.autoTextJobs.get(userId);
        return userJobs ? Array.from(userJobs.values()) : [];
    }
    
    updateAutoTextJob(userId, jobId, updates) {
        const job = this.getAutoTextJob(userId, jobId);
        if (job) {
            Object.assign(job, updates, {
                updatedAt: Date.now()
            });
            return job;
        }
        return null;
    }
    
    deleteAutoTextJob(userId, jobId) {
        const userJobs = this.autoTextJobs.get(userId);
        if (userJobs) {
            userJobs.delete(jobId);
            return true;
        }
        return false;
    }
    
    // Message History
    addMessage(userId, message) {
        if (!this.messageHistory.has(userId)) {
            this.messageHistory.set(userId, []);
        }
        
        const history = this.messageHistory.get(userId);
        history.unshift(message);
        
        // Keep only recent messages
        if (history.length > CONFIG.MAX_MESSAGE_HISTORY) {
            history.splice(CONFIG.MAX_MESSAGE_HISTORY);
        }
        
        return message;
    }
    
    getMessageHistory(userId, limit = 50, botId = null) {
        const history = this.messageHistory.get(userId) || [];
        
        let filtered = history;
        if (botId) {
            filtered = history.filter(msg => msg.botId === botId);
        }
        
        return filtered.slice(0, limit);
    }
    
    // Connected Chats
    addConnectedChat(userId, chatData) {
        if (!this.connectedChats.has(userId)) {
            this.connectedChats.set(userId, []);
        }
        
        const chats = this.connectedChats.get(userId);
        
        // Update if exists, else add
        const existingIndex = chats.findIndex(c => c.id === chatData.id);
        if (existingIndex >= 0) {
            chats[existingIndex] = chatData;
        } else {
            chats.push(chatData);
            
            // Keep maximum 200 chats
            if (chats.length > 200) {
                chats.shift();
            }
        }
        
        return chatData;
    }
    
    getConnectedChats(userId) {
        return this.connectedChats.get(userId) || [];
    }
    
    // Session Management
    setUserSession(userId, sessionData) {
        this.userSessions.set(userId, {
            ...sessionData,
            userId,
            lastActive: Date.now()
        });
    }
    
    getUserSession(userId) {
        return this.userSessions.get(userId);
    }
    
    updateUserSession(userId, updates) {
        const session = this.getUserSession(userId);
        if (session) {
            Object.assign(session, updates, {
                lastActive: Date.now()
            });
            return session;
        }
        return null;
    }
    
    // Cleanup
    cleanupBotData(userId, botId) {
        // Remove bot's messages from history
        const history = this.messageHistory.get(userId);
        if (history) {
            const filtered = history.filter(msg => msg.botId !== botId);
            this.messageHistory.set(userId, filtered);
        }
        
        // Remove bot's auto text jobs
        const jobs = this.autoTextJobs.get(userId);
        if (jobs) {
            for (const [jobId, job] of jobs.entries()) {
                if (job.botId === botId) {
                    jobs.delete(jobId);
                }
            }
        }
    }
    
    cleanupOldData() {
        const now = Date.now();
        
        // Clean up old sessions
        for (const [userId, session] of this.userSessions.entries()) {
            if (now - session.lastActive > CONFIG.SESSION_TIMEOUT) {
                this.userSessions.delete(userId);
            }
        }
        
        // Clean up old message history (older than 30 days)
        const maxAge = 30 * 24 * 60 * 60 * 1000;
        for (const [userId, history] of this.messageHistory.entries()) {
            const recent = history.filter(msg => 
                now - new Date(msg.timestamp).getTime() < maxAge
            );
            this.messageHistory.set(userId, recent);
        }
    }
}

// ============================================
// AUTO TEXT SCHEDULER
// ============================================
class AutoTextScheduler extends EventEmitter {
    constructor(storage) {
        super();
        this.storage = storage;
        this.activeJobs = new Map();
        this.cronJobs = new Map();
        this.isRunning = false;
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        
        // Check for jobs every minute
        setInterval(() => this.checkAndRunJobs(), 60 * 1000);
        
        console.log('✅ Auto Text Scheduler started');
    }
    
    async checkAndRunJobs() {
        const now = new Date();
        
        // Iterate through all users
        for (const [userId] of this.storage.autoTextJobs) {
            const jobs = this.storage.getAutoTextJobs(userId);
            
            for (const job of jobs) {
                if (job.status === 'running' && job.nextRun) {
                    const nextRunTime = new Date(job.nextRun);
                    
                    if (now >= nextRunTime) {
                        await this.executeJob(userId, job.id);
                    }
                }
            }
        }
    }
    
    async executeJob(userId, jobId) {
        const job = this.storage.getAutoTextJob(userId, jobId);
        if (!job || job.status !== 'running') return;
        
        console.log(`🔄 Executing auto-text job: ${jobId}`);
        
        try {
            // Update job status
            job.status = 'executing';
            job.lastExecution = new Date().toISOString();
            
            // Here you would connect to Telegram and send messages
            // For now, we'll simulate the process
            
            // Simulate sending to each target
            for (const target of job.targets) {
                // Create message record
                const message = {
                    id: `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
                    botId: job.botId,
                    chatId: target,
                    message: job.message,
                    status: 'sent',
                    timestamp: new Date().toISOString(),
                    type: 'auto-text',
                    jobId: job.id
                };
                
                // Add to history
                this.storage.addMessage(userId, message);
                
                // Simulate delay between messages
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Update job statistics
            job.executions = (job.executions || 0) + 1;
            job.totalSent = (job.totalSent || 0) + job.targets.length;
            job.lastSuccess = new Date().toISOString();
            
            // Schedule next run if repeat not reached
            if (!job.repeat || job.executions < job.repeat) {
                const nextRun = new Date(Date.now() + job.interval * 1000);
                job.nextRun = nextRun.toISOString();
                job.status = 'running';
                
                console.log(`✅ Job ${jobId} executed. Next run: ${nextRun.toLocaleString()}`);
            } else {
                job.status = 'completed';
                job.completedAt = new Date().toISOString();
                console.log(`🎉 Job ${jobId} completed after ${job.executions} executions`);
            }
            
            // Update storage
            this.storage.updateAutoTextJob(userId, jobId, job);
            
            // Emit event
            this.emit('jobExecuted', { userId, jobId, job });
            
        } catch (error) {
            console.error(`❌ Error executing job ${jobId}:`, error);
            
            job.status = 'error';
            job.lastError = {
                message: error.message,
                timestamp: new Date().toISOString()
            };
            
            // Retry logic
            if (!job.retryCount) job.retryCount = 0;
            job.retryCount++;
            
            if (job.retryCount <= 3) {
                // Retry in 5 minutes
                const retryTime = new Date(Date.now() + 5 * 60 * 1000);
                job.nextRun = retryTime.toISOString();
                job.status = 'running';
                console.log(`🔄 Job ${jobId} will retry at ${retryTime.toLocaleString()}`);
            } else {
                job.status = 'failed';
                console.error(`❌ Job ${jobId} failed after 3 retries`);
            }
            
            this.storage.updateAutoTextJob(userId, jobId, job);
            this.emit('jobError', { userId, jobId, error: error.message });
        }
    }
    
    startJob(userId, jobId) {
        const job = this.storage.getAutoTextJob(userId, jobId);
        if (!job) return false;
        
        job.status = 'running';
        job.startedAt = job.startedAt || new Date().toISOString();
        
        // Set next run time
        const nextRun = new Date(Date.now() + 1000); // Start in 1 second
        job.nextRun = nextRun.toISOString();
        
        this.storage.updateAutoTextJob(userId, jobId, job);
        console.log(`▶️ Started auto-text job: ${jobId}`);
        
        return true;
    }
    
    stopJob(userId, jobId) {
        const job = this.storage.getAutoTextJob(userId, jobId);
        if (!job) return false;
        
        job.status = 'stopped';
        job.stoppedAt = new Date().toISOString();
        job.nextRun = null;
        
        this.storage.updateAutoTextJob(userId, jobId, job);
        console.log(`⏸️ Stopped auto-text job: ${jobId}`);
        
        return true;
    }
    
    pauseJob(userId, jobId) {
        const job = this.storage.getAutoTextJob(userId, jobId);
        if (!job) return false;
        
        job.status = 'paused';
        job.pausedAt = new Date().toISOString();
        
        this.storage.updateAutoTextJob(userId, jobId, job);
        console.log(`⏸️ Paused auto-text job: ${jobId}`);
        
        return true;
    }
    
    resumeJob(userId, jobId) {
        const job = this.storage.getAutoTextJob(userId, jobId);
        if (!job || job.status !== 'paused') return false;
        
        job.status = 'running';
        const nextRun = new Date(Date.now() + 1000);
        job.nextRun = nextRun.toISOString();
        
        this.storage.updateAutoTextJob(userId, jobId, job);
        console.log(`▶️ Resumed auto-text job: ${jobId}`);
        
        return true;
    }
    
    deleteJob(userId, jobId) {
        const success = this.storage.deleteAutoTextJob(userId, jobId);
        if (success) {
            console.log(`🗑️ Deleted auto-text job: ${jobId}`);
        }
        return success;
    }
}

// ============================================
// GLOBAL INSTANCES
// ============================================
const storage = new UserBotStorage();
const scheduler = new AutoTextScheduler(storage);

// Start scheduler
scheduler.start();

// Cleanup old data every hour
setInterval(() => storage.cleanupOldData(), 60 * 60 * 1000);

// ============================================
// HELPER FUNCTIONS
// ============================================
function corsHeaders(origin = '*') {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    };
}

function response(statusCode, body, origin = '*') {
    return {
        statusCode,
        headers: corsHeaders(origin),
        body: JSON.stringify(body, null, 2)
    };
}

function verifyToken(token) {
    try {
        return jwt.verify(token, CONFIG.JWT_SECRET);
    } catch {
        return null;
    }
}

function generateId(prefix = '') {
    return `${prefix}${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ============================================
// MAIN HANDLER
// ============================================
exports.handler = async (event, context) => {
    console.log('👤 UserBot Manager function called');
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return response(200, { message: 'CORS preflight' }, event.headers.origin);
    }
    
    const origin = event.headers.origin || '*';
    const authHeader = event.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response(401, { error: 'Authentication required' }, origin);
    }
    
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    
    if (!user) {
        return response(401, { error: 'Invalid or expired token' }, origin);
    }
    
    const userId = user.user;
    
    try {
        const requestData = JSON.parse(event.body || '{}');
        const { action, botId, jobId, ...data } = requestData;
        
        console.log(`📥 Action: ${action}, User: ${userId}`);
        
        switch (action) {
            // User Bot Operations
            case 'create-bot':
                return await createUserBot(data, userId, origin);
                
            case 'list-bots':
                return await listUserBots(userId, origin);
                
            case 'get-bot':
                return await getUserBot(botId, userId, origin);
                
            case 'update-bot':
                return await updateUserBot(botId, data, userId, origin);
                
            case 'delete-bot':
                return await deleteUserBot(botId, userId, origin);
                
            // Auto Text Operations
            case 'create-auto-text':
                return await createAutoText(data, userId, origin);
                
            case 'list-auto-texts':
                return await listAutoTexts(userId, origin);
                
            case 'get-auto-text':
                return await getAutoText(jobId, userId, origin);
                
            case 'start-auto-text':
                return await startAutoText(jobId, userId, origin);
                
            case 'stop-auto-text':
                return await stopAutoText(jobId, userId, origin);
                
            case 'pause-auto-text':
                return await pauseAutoText(jobId, userId, origin);
                
            case 'resume-auto-text':
                return await resumeAutoText(jobId, userId, origin);
                
            case 'update-auto-text':
                return await updateAutoText(jobId, data, userId, origin);
                
            case 'delete-auto-text':
                return await deleteAutoText(jobId, userId, origin);
                
            // Message History
            case 'get-message-history':
                return await getMessageHistory(data, userId, origin);
                
            case 'clear-message-history':
                return await clearMessageHistory(userId, origin);
                
            // Connected Chats
            case 'get-connected-chats':
                return await getConnectedChats(userId, origin);
                
            case 'add-connected-chat':
                return await addConnectedChat(data, userId, origin);
                
            case 'remove-connected-chat':
                return await removeConnectedChat(data, userId, origin);
                
            // Statistics
            case 'get-stats':
                return await getUserStats(userId, origin);
                
            default:
                return response(400, { error: 'Invalid action' }, origin);
        }
        
    } catch (error) {
        console.error('❌ UserBot Manager error:', error);
        return response(500, { 
            error: 'Internal server error',
            message: error.message 
        }, origin);
    }
};

// ============================================
// USER BOT OPERATIONS
// ============================================
async function createUserBot(data, userId, origin) {
    const { name, apiId, apiHash, phoneNumber, description = '' } = data;
    
    if (!name || !apiId || !apiHash || !phoneNumber) {
        return response(400, { 
            error: 'Missing required fields',
            required: ['name', 'apiId', 'apiHash', 'phoneNumber']
        }, origin);
    }
    
    // Check bot limit
    const userBots = storage.getUserBots(userId);
    if (userBots.length >= CONFIG.MAX_USER_BOTS) {
        return response(403, { 
            error: 'Bot limit reached',
            maxBots: CONFIG.MAX_USER_BOTS,
            current: userBots.length
        }, origin);
    }
    
    const botId = generateId('bot_');
    const botData = {
        id: botId,
        name,
        apiId,
        apiHash: apiHash.substring(0, 8) + '***', // Mask API hash
        phoneNumber,
        description,
        owner: userId,
        status: 'created',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        stats: {
            messagesSent: 0,
            messagesReceived: 0,
            autoTextJobs: 0,
            connectedChats: 0
        },
        settings: {
            autoStart: false,
            autoReconnect: true,
            logLevel: 'info'
        }
    };
    
    storage.addUserBot(userId, botData);
    
    // Create session for the bot
    storage.setUserSession(`${userId}_${botId}`, {
        botId,
        apiId,
        phoneNumber,
        status: 'pending_verification',
        createdAt: Date.now()
    });
    
    console.log(`✅ User bot created: ${botId} for ${userId}`);
    
    return response(200, {
        success: true,
        botId,
        message: 'User bot created successfully',
        bot: botData,
        verificationRequired: true
    }, origin);
}

async function listUserBots(userId, origin) {
    const bots = storage.getUserBots(userId);
    
    // Mask sensitive data for listing
    const safeBots = bots.map(bot => ({
        id: bot.id,
        name: bot.name,
        description: bot.description,
        status: bot.status,
        createdAt: bot.createdAt,
        updatedAt: bot.updatedAt,
        stats: bot.stats,
        settings: bot.settings
    }));
    
    return response(200, {
        success: true,
        bots: safeBots,
        total: safeBots.length,
        stats: {
            running: safeBots.filter(b => b.status === 'connected').length,
            disconnected: safeBots.filter(b => b.status === 'disconnected').length,
            pending: safeBots.filter(b => b.status === 'pending_verification').length
        }
    }, origin);
}

async function getUserBot(botId, userId, origin) {
    const bot = storage.getUserBot(userId, botId);
    
    if (!bot) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    // Get bot session
    const session = storage.getUserSession(`${userId}_${botId}`);
    
    return response(200, {
        success: true,
        bot: {
            ...bot,
            session: session || null
        }
    }, origin);
}

async function updateUserBot(botId, updates, userId, origin) {
    const bot = storage.getUserBot(userId, botId);
    
    if (!bot) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    // Don't allow updating sensitive fields directly
    const allowedUpdates = ['name', 'description', 'settings', 'status'];
    const safeUpdates = {};
    
    for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
            safeUpdates[key] = updates[key];
        }
    }
    
    const updatedBot = storage.updateUserBot(userId, botId, safeUpdates);
    
    return response(200, {
        success: true,
        message: 'Bot updated successfully',
        bot: updatedBot
    }, origin);
}

async function deleteUserBot(botId, userId, origin) {
    const success = storage.deleteUserBot(userId, botId);
    
    if (!success) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    return response(200, {
        success: true,
        message: 'Bot deleted successfully',
        botId
    }, origin);
}

// ============================================
// AUTO TEXT OPERATIONS
// ============================================
async function createAutoText(data, userId, origin) {
    const { botId, targets, message, interval = 60, repeat = 1, startNow = false } = data;
    
    if (!botId || !targets || !message) {
        return response(400, { 
            error: 'Missing required fields',
            required: ['botId', 'targets', 'message']
        }, origin);
    }
    
    // Validate bot exists
    const bot = storage.getUserBot(userId, botId);
    if (!bot) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    // Validate targets
    const targetArray = Array.isArray(targets) ? targets : [targets];
    if (targetArray.length > CONFIG.AUTO_TEXT_MAX_TARGETS) {
        return response(400, { 
            error: 'Too many targets',
            maxTargets: CONFIG.AUTO_TEXT_MAX_TARGETS
        }, origin);
    }
    
    const jobId = generateId('job_');
    const jobData = {
        id: jobId,
        botId,
        targets: targetArray,
        message,
        interval: Math.max(10, interval), // Minimum 10 seconds
        repeat: Math.max(1, repeat),
        currentRepeat: 0,
        status: startNow ? 'running' : 'paused',
        owner: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nextRun: startNow ? new Date(Date.now() + 1000).toISOString() : null,
        stats: {
            totalSent: 0,
            successful: 0,
            failed: 0,
            lastExecution: null
        },
        settings: {
            parseMode: 'HTML',
            disableWebPagePreview: false,
            disableNotification: false
        }
    };
    
    storage.addAutoTextJob(userId, jobData);
    
    // Update bot stats
    storage.updateUserBot(userId, botId, {
        stats: {
            ...bot.stats,
            autoTextJobs: (bot.stats.autoTextJobs || 0) + 1
        }
    });
    
    // Start job if requested
    if (startNow) {
        scheduler.startJob(userId, jobId);
    }
    
    console.log(`✅ Auto-text job created: ${jobId} for bot ${botId}`);
    
    return response(200, {
        success: true,
        jobId,
        message: 'Auto-text job created successfully',
        job: jobData
    }, origin);
}

async function listAutoTexts(userId, origin) {
    const jobs = storage.getAutoTextJobs(userId);
    
    // Get bot names for display
    const bots = storage.getUserBots(userId);
    const botMap = new Map(bots.map(bot => [bot.id, bot.name]));
    
    const jobsWithBotNames = jobs.map(job => ({
        ...job,
        botName: botMap.get(job.botId) || 'Unknown Bot'
    }));
    
    return response(200, {
        success: true,
        jobs: jobsWithBotNames,
        total: jobs.length,
        stats: {
            running: jobs.filter(j => j.status === 'running').length,
            paused: jobs.filter(j => j.status === 'paused').length,
            completed: jobs.filter(j => j.status === 'completed').length,
            error: jobs.filter(j => j.status === 'error' || j.status === 'failed').length
        }
    }, origin);
}

async function getAutoText(jobId, userId, origin) {
    const job = storage.getAutoTextJob(userId, jobId);
    
    if (!job) {
        return response(404, { error: 'Job not found' }, origin);
    }
    
    return response(200, {
        success: true,
        job
    }, origin);
}

async function startAutoText(jobId, userId, origin) {
    const job = storage.getAutoTextJob(userId, jobId);
    
    if (!job) {
        return response(404, { error: 'Job not found' }, origin);
    }
    
    if (job.status === 'running') {
        return response(400, { error: 'Job is already running' }, origin);
    }
    
    const success = scheduler.startJob(userId, jobId);
    
    if (!success) {
        return response(500, { error: 'Failed to start job' }, origin);
    }
    
    return response(200, {
        success: true,
        message: 'Job started successfully',
        jobId,
        status: 'running'
    }, origin);
}

async function stopAutoText(jobId, userId, origin) {
    const success = scheduler.stopJob(userId, jobId);
    
    if (!success) {
        return response(404, { error: 'Job not found or not running' }, origin);
    }
    
    return response(200, {
        success: true,
        message: 'Job stopped successfully',
        jobId,
        status: 'stopped'
    }, origin);
}

async function pauseAutoText(jobId, userId, origin) {
    const success = scheduler.pauseJob(userId, jobId);
    
    if (!success) {
        return response(404, { error: 'Job not found' }, origin);
    }
    
    return response(200, {
        success: true,
        message: 'Job paused successfully',
        jobId,
        status: 'paused'
    }, origin);
}

async function resumeAutoText(jobId, userId, origin) {
    const success = scheduler.resumeJob(userId, jobId);
    
    if (!success) {
        return response(404, { error: 'Job not found or not paused' }, origin);
    }
    
    return response(200, {
        success: true,
        message: 'Job resumed successfully',
        jobId,
        status: 'running'
    }, origin);
}

async function updateAutoText(jobId, updates, userId, origin) {
    const job = storage.getAutoTextJob(userId, jobId);
    
    if (!job) {
        return response(404, { error: 'Job not found' }, origin);
    }
    
    // Don't allow updating critical fields
    const allowedUpdates = ['message', 'interval', 'repeat', 'settings', 'targets'];
    const safeUpdates = {};
    
    for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
            safeUpdates[key] = updates[key];
        }
    }
    
    // Validate targets if updating
    if (safeUpdates.targets) {
        const targetArray = Array.isArray(safeUpdates.targets) ? safeUpdates.targets : [safeUpdates.targets];
        if (targetArray.length > CONFIG.AUTO_TEXT_MAX_TARGETS) {
            return response(400, { 
                error: 'Too many targets',
                maxTargets: CONFIG.AUTO_TEXT_MAX_TARGETS
            }, origin);
        }
        safeUpdates.targets = targetArray;
    }
    
    // Update interval minimum
    if (safeUpdates.interval) {
        safeUpdates.interval = Math.max(10, safeUpdates.interval);
    }
    
    const updatedJob = storage.updateAutoTextJob(userId, jobId, safeUpdates);
    
    return response(200, {
        success: true,
        message: 'Job updated successfully',
        job: updatedJob
    }, origin);
}

async function deleteAutoText(jobId, userId, origin) {
    const job = storage.getAutoTextJob(userId, jobId);
    
    if (!job) {
        return response(404, { error: 'Job not found' }, origin);
    }
    
    // Stop job if running
    if (job.status === 'running') {
        scheduler.stopJob(userId, jobId);
    }
    
    const success = storage.deleteAutoTextJob(userId, jobId);
    
    if (!success) {
        return response(500, { error: 'Failed to delete job' }, origin);
    }
    
    // Update bot stats
    const bot = storage.getUserBot(userId, job.botId);
    if (bot) {
        storage.updateUserBot(userId, job.botId, {
            stats: {
                ...bot.stats,
                autoTextJobs: Math.max(0, (bot.stats.autoTextJobs || 0) - 1)
            }
        });
    }
    
    return response(200, {
        success: true,
        message: 'Job deleted successfully',
        jobId
    }, origin);
}

// ============================================
// MESSAGE HISTORY OPERATIONS
// ============================================
async function getMessageHistory(data, userId, origin) {
    const { limit = 50, botId = null, type = null, status = null } = data;
    
    let history = storage.getMessageHistory(userId, 1000, botId); // Get more for filtering
    
    // Apply filters
    if (type) {
        history = history.filter(msg => msg.type === type);
    }
    
    if (status) {
        history = history.filter(msg => msg.status === status);
    }
    
    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply limit
    history = history.slice(0, limit);
    
    // Get bot names for display
    const bots = storage.getUserBots(userId);
    const botMap = new Map(bots.map(bot => [bot.id, bot.name]));
    
    const historyWithBotNames = history.map(msg => ({
        ...msg,
        botName: botMap.get(msg.botId) || 'Unknown Bot'
    }));
    
    return response(200, {
        success: true,
        messages: historyWithBotNames,
        total: history.length,
        stats: {
            sent: history.filter(m => m.status === 'sent').length,
            failed: history.filter(m => m.status === 'failed').length,
            pending: history.filter(m => m.status === 'pending').length
        }
    }, origin);
}

async function clearMessageHistory(userId, origin) {
    storage.messageHistory.set(userId, []);
    
    return response(200, {
        success: true,
        message: 'Message history cleared',
        clearedAt: new Date().toISOString()
    }, origin);
}

// ============================================
// CONNECTED CHATS OPERATIONS
// ============================================
async function getConnectedChats(userId, origin) {
    const chats = storage.getConnectedChats(userId);
    
    return response(200, {
        success: true,
        chats,
        total: chats.length,
        stats: {
            groups: chats.filter(c => c.type === 'group').length,
            channels: chats.filter(c => c.type === 'channel').length,
            users: chats.filter(c => c.type === 'user').length
        }
    }, origin);
}

async function addConnectedChat(data, userId, origin) {
    const { id, title, type, members = 0, lastActivity } = data;
    
    if (!id || !title || !type) {
        return response(400, { 
            error: 'Missing required fields',
            required: ['id', 'title', 'type']
        }, origin);
    }
    
    const chatData = {
        id,
        title,
        type,
        members,
        lastActivity: lastActivity || new Date().toISOString(),
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    storage.addConnectedChat(userId, chatData);
    
    return response(200, {
        success: true,
        message: 'Chat added to connected list',
        chat: chatData
    }, origin);
}

async function removeConnectedChat(data, userId, origin) {
    const { chatId } = data;
    
    if (!chatId) {
        return response(400, { error: 'Chat ID required' }, origin);
    }
    
    const chats = storage.getConnectedChats(userId);
    const filtered = chats.filter(chat => chat.id !== chatId);
    
    storage.connectedChats.set(userId, filtered);
    
    return response(200, {
        success: true,
        message: 'Chat removed from connected list',
        chatId,
        remaining: filtered.length
    }, origin);
}

// ============================================
// STATISTICS OPERATIONS
// ============================================
async function getUserStats(userId, origin) {
    const bots = storage.getUserBots(userId);
    const jobs = storage.getAutoTextJobs(userId);
    const chats = storage.getConnectedChats(userId);
    const history = storage.getMessageHistory(userId, 10000);
    
    // Calculate statistics
    const stats = {
        bots: {
            total: bots.length,
            connected: bots.filter(b => b.status === 'connected').length,
            disconnected: bots.filter(b => b.status === 'disconnected').length,
            pending: bots.filter(b => b.status === 'pending_verification').length
        },
        jobs: {
            total: jobs.length,
            running: jobs.filter(j => j.status === 'running').length,
            paused: jobs.filter(j => j.status === 'paused').length,
            completed: jobs.filter(j => j.status === 'completed').length
        },
        messages: {
            total: history.length,
            sent: history.filter(m => m.status === 'sent').length,
            failed: history.filter(m => m.status === 'failed').length,
            today: history.filter(m => {
                const msgDate = new Date(m.timestamp);
                const today = new Date();
                return msgDate.toDateString() === today.toDateString();
            }).length
        },
        chats: {
            total: chats.length,
            groups: chats.filter(c => c.type === 'group').length,
            channels: chats.filter(c => c.type === 'channel').length,
            users: chats.filter(c => c.type === 'user').length
        },
        performance: {
            messagesPerHour: calculateRate(history.filter(m => m.status === 'sent').length, 24),
            successRate: history.length > 0 ? 
                (history.filter(m => m.status === 'sent').length / history.length * 100).toFixed(2) : 0
        }
    };
    
    // Recent activity
    const recentActivity = history
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);
    
    return response(200, {
        success: true,
        stats,
        recentActivity,
        lastUpdated: new Date().toISOString()
    }, origin);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function calculateRate(count, hours = 24) {
    if (count === 0) return 0;
    return (count / hours).toFixed(2);
}

// ============================================
// INITIALIZATION
// ============================================
console.log('✅ UserBot Manager initialized');
