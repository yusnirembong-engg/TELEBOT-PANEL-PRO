const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram/tl');
const cron = require('node-cron');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    JWT_SECRET: process.env.JWT_SECRET || "f8d7a3c6b5e49201738a1d2f4c9b6a7e5d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2"
};

// ============================================
// USER SESSIONS STORAGE
// ============================================
const userSessions = new Map();
const messageQueue = new Map();
const scheduledMessages = new Map();

// ============================================
// TELEGRAM CLIENT MANAGER
// ============================================
class TelegramUserBot {
    constructor(sessionId, apiId, apiHash, phoneNumber) {
        this.sessionId = sessionId;
        this.apiId = parseInt(apiId);
        this.apiHash = apiHash;
        this.phoneNumber = phoneNumber;
        this.client = null;
        this.status = 'disconnected';
        this.user = null;
        this.dialogs = [];
        this.createdAt = Date.now();
        this.stats = {
            messagesSent: 0,
            messagesReceived: 0,
            groupsJoined: 0,
            lastActivity: null
        };
    }

    async connect(phoneCode = '') {
        try {
            const stringSession = new StringSession('');
            
            this.client = new TelegramClient(stringSession, this.apiId, this.apiHash, {
                connectionRetries: 5,
                useWSS: true,
                timeout: 30000
            });

            await this.client.start({
                phoneNumber: async () => this.phoneNumber,
                phoneCode: async () => phoneCode,
                password: async () => '',
                onError: (err) => {
                    console.error(`[${this.sessionId}] Error:`, err);
                    this.status = 'error';
                }
            });

            this.status = 'connected';
            this.user = await this.client.getMe();
            
            // Start listening for messages
            this.setupMessageHandler();
            
            // Load dialogs
            await this.loadDialogs();
            
            console.log(`✅ User bot connected: ${this.user.username || this.user.phone}`);
            
            return {
                success: true,
                sessionId: this.sessionId,
                user: {
                    id: this.user.id,
                    username: this.user.username,
                    phone: this.user.phone,
                    firstName: this.user.firstName,
                    lastName: this.user.lastName
                },
                status: this.status
            };
            
        } catch (error) {
            console.error(`❌ Connection failed:`, error);
            this.status = 'error';
            
            return {
                success: false,
                error: error.message,
                requiresCode: error.errorMessage === 'SESSION_PASSWORD_NEEDED',
                requiresPhoneCode: error.errorMessage?.includes('phone')
            };
        }
    }

    async setupMessageHandler() {
        this.client.addEventHandler(async (event) => {
            try {
                const message = event.message;
                if (message && message.message) {
                    this.stats.messagesReceived++;
                    this.stats.lastActivity = Date.now();
                    
                    console.log(`📩 [${this.sessionId}] Received: ${message.message.substring(0, 50)}...`);
                    
                    // Auto-reply or processing can be added here
                }
            } catch (error) {
                console.error('Message handler error:', error);
            }
        }, new Api.UpdateNewMessage({}));
    }

    async loadDialogs() {
        try {
            const result = await this.client.getDialogs({ limit: 50 });
            this.dialogs = result.map(dialog => ({
                id: dialog.entity.id,
                title: dialog.title,
                type: dialog.isUser ? 'user' : 
                       dialog.isChannel ? 'channel' : 
                       dialog.isGroup ? 'group' : 'unknown',
                unreadCount: dialog.unreadCount,
                lastMessage: dialog.message?.message?.substring(0, 100) || '',
                date: dialog.date
            }));
            
            return this.dialogs;
        } catch (error) {
            console.error('Failed to load dialogs:', error);
            return [];
        }
    }

    async sendMessage(chatId, message, options = {}) {
        try {
            await this.client.sendMessage(chatId, {
                message: message,
                ...options
            });
            
            this.stats.messagesSent++;
            this.stats.lastActivity = Date.now();
            
            return {
                success: true,
                messageId: Date.now().toString(),
                chatId,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Send message failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getChatInfo(chatId) {
        try {
            const chat = await this.client.getEntity(chatId);
            
            return {
                success: true,
                chat: {
                    id: chat.id,
                    title: chat.title || `${chat.firstName || ''} ${chat.lastName || ''}`.trim(),
                    type: chat.className,
                    username: chat.username,
                    participantsCount: chat.participantsCount || 0,
                    photo: chat.photo ? 'Has photo' : 'No photo'
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
        }
        this.status = 'disconnected';
        return { success: true, message: 'Disconnected' };
    }

    getStatus() {
        return {
            sessionId: this.sessionId,
            status: this.status,
            user: this.user,
            stats: this.stats,
            dialogsCount: this.dialogs.length,
            uptime: Date.now() - this.createdAt
        };
    }
}

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

function generateSessionId() {
    return `user_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ============================================
// API HANDLER
// ============================================
exports.handler = async (event, context) => {
    console.log('📱 Telegram API function called');
    
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
    
    try {
        const requestData = JSON.parse(event.body || '{}');
        const { action, sessionId, ...data } = requestData;
        
        console.log(`📥 Action: ${action}, User: ${user.user}`);
        
        switch (action) {
            case 'connect':
                return await connectUserBot(data, user, origin);
                
            case 'verify':
                return await verifyConnection(sessionId, data, user, origin);
                
            case 'send':
                return await sendUserMessage(sessionId, data, user, origin);
                
            case 'schedule':
                return await scheduleMessage(sessionId, data, user, origin);
                
            case 'dialogs':
                return await getUserDialogs(sessionId, user, origin);
                
            case 'status':
                return await getSessionStatus(sessionId, user, origin);
                
            case 'disconnect':
                return await disconnectSession(sessionId, user, origin);
                
            case 'chats':
                return await getUserChats(sessionId, user, origin);
                
            case 'auto-text':
                return await setupAutoText(sessionId, data, user, origin);
                
            default:
                return response(400, { error: 'Invalid action' }, origin);
        }
        
    } catch (error) {
        console.error('❌ Telegram API error:', error);
        return response(500, { 
            error: 'Internal server error',
            message: error.message 
        }, origin);
    }
};

// ============================================
// API OPERATIONS
// ============================================
async function connectUserBot(data, user, origin) {
    const { apiId, apiHash, phoneNumber } = data;
    
    if (!apiId || !apiHash || !phoneNumber) {
        return response(400, { 
            error: 'Missing required fields',
            required: ['apiId', 'apiHash', 'phoneNumber']
        }, origin);
    }
    
    const sessionId = generateSessionId();
    const userBot = new TelegramUserBot(sessionId, apiId, apiHash, phoneNumber);
    
    // Store session
    userSessions.set(sessionId, {
        bot: userBot,
        owner: user.user,
        createdAt: Date.now(),
        apiId,
        apiHash: apiHash.substring(0, 8) + '***', // Mask hash
        phoneNumber
    });
    
    // Try to connect (will ask for verification code)
    const result = await userBot.connect();
    
    if (result.success) {
        return response(200, {
            success: true,
            sessionId,
            message: 'Connected to Telegram',
            user: result.user,
            requiresVerification: false
        }, origin);
    } else {
        return response(200, {
            success: false,
            sessionId,
            requiresVerification: true,
            message: 'Please enter verification code sent to your phone',
            error: result.error
        }, origin);
    }
}

async function verifyConnection(sessionId, data, user, origin) {
    const session = userSessions.get(sessionId);
    
    if (!session) {
        return response(404, { error: 'Session not found' }, origin);
    }
    
    if (session.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    const { verificationCode } = data;
    
    if (!verificationCode) {
        return response(400, { error: 'Verification code required' }, origin);
    }
    
    const result = await session.bot.connect(verificationCode);
    
    if (result.success) {
        return response(200, {
            success: true,
            sessionId,
            message: 'Verified and connected successfully',
            user: result.user
        }, origin);
    } else {
        return response(400, {
            success: false,
            error: result.error
        }, origin);
    }
}

async function sendUserMessage(sessionId, data, user, origin) {
    const session = userSessions.get(sessionId);
    
    if (!session) {
        return response(404, { error: 'Session not found' }, origin);
    }
    
    if (session.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    const { chatId, message, scheduleTime } = data;
    
    if (!chatId || !message) {
        return response(400, { 
            error: 'Missing required fields',
            required: ['chatId', 'message']
        }, origin);
    }
    
    // Schedule message if time provided
    if (scheduleTime) {
        const scheduleDate = new Date(scheduleTime);
        const now = new Date();
        
        if (scheduleDate <= now) {
            return response(400, { error: 'Schedule time must be in the future' }, origin);
        }
        
        const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const delay = scheduleDate.getTime() - now.getTime();
        
        scheduledMessages.set(jobId, {
            sessionId,
            chatId,
            message,
            scheduledFor: scheduleDate.toISOString(),
            owner: user.user
        });
        
        setTimeout(async () => {
            try {
                await session.bot.sendMessage(chatId, message);
                console.log(`✅ Scheduled message sent: ${jobId}`);
                scheduledMessages.delete(jobId);
            } catch (error) {
                console.error(`❌ Failed to send scheduled message:`, error);
            }
        }, delay);
        
        return response(200, {
            success: true,
            jobId,
            message: 'Message scheduled',
            scheduledFor: scheduleDate.toISOString(),
            inSeconds: Math.floor(delay / 1000)
        }, origin);
    }
    
    // Send immediately
    const result = await session.bot.sendMessage(chatId, message);
    
    if (result.success) {
        return response(200, result, origin);
    } else {
        return response(500, result, origin);
    }
}

async function scheduleMessage(sessionId, data, user, origin) {
    const { chatIds, message, interval, repeat, startImmediately } = data;
    
    if (!chatIds || !message) {
        return response(400, { 
            error: 'Missing required fields',
            required: ['chatIds', 'message']
        }, origin);
    }
    
    const jobId = `auto_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const chatIdArray = Array.isArray(chatIds) ? chatIds : [chatIds];
    
    const autoTextJob = {
        jobId,
        sessionId,
        chatIds: chatIdArray,
        message,
        interval: interval || 60,
        repeat: repeat || 1,
        status: startImmediately ? 'running' : 'paused',
        sentCount: 0,
        owner: user.user,
        createdAt: new Date().toISOString(),
        nextRun: startImmediately ? new Date(Date.now() + 1000).toISOString() : null
    };
    
    // Store job
    messageQueue.set(jobId, autoTextJob);
    
    // Start cron job if immediately
    if (startImmediately) {
        startAutoTextJob(jobId);
    }
    
    return response(200, {
        success: true,
        jobId,
        message: 'Auto-text job created',
        details: autoTextJob
    }, origin);
}

async function getUserDialogs(sessionId, user, origin) {
    const session = userSessions.get(sessionId);
    
    if (!session) {
        return response(404, { error: 'Session not found' }, origin);
    }
    
    if (session.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    const dialogs = await session.bot.loadDialogs();
    
    return response(200, {
        success: true,
        dialogs,
        count: dialogs.length
    }, origin);
}

async function getSessionStatus(sessionId, user, origin) {
    const session = userSessions.get(sessionId);
    
    if (!session) {
        return response(404, { error: 'Session not found' }, origin);
    }
    
    if (session.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    const status = session.bot.getStatus();
    
    return response(200, {
        success: true,
        ...status,
        sessionInfo: {
            apiId: session.apiId,
            phoneNumber: session.phoneNumber,
            connectedSince: new Date(session.createdAt).toISOString()
        }
    }, origin);
}

async function disconnectSession(sessionId, user, origin) {
    const session = userSessions.get(sessionId);
    
    if (!session) {
        return response(404, { error: 'Session not found' }, origin);
    }
    
    if (session.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    const result = await session.bot.disconnect();
    userSessions.delete(sessionId);
    
    return response(200, {
        success: true,
        message: 'Session disconnected',
        sessionId
    }, origin);
}

async function getUserChats(sessionId, user, origin) {
    const session = userSessions.get(sessionId);
    
    if (!session) {
        return response(404, { error: 'Session not found' }, origin);
    }
    
    if (session.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    try {
        const dialogs = await session.bot.loadDialogs();
        const chats = dialogs.filter(d => d.type !== 'user');
        
        return response(200, {
            success: true,
            chats,
            stats: {
                groups: chats.filter(c => c.type === 'group').length,
                channels: chats.filter(c => c.type === 'channel').length,
                total: chats.length
            }
        }, origin);
    } catch (error) {
        return response(500, { error: error.message }, origin);
    }
}

async function setupAutoText(sessionId, data, user, origin) {
    const { targets, message, interval, repeat, startNow } = data;
    
    if (!targets || !message) {
        return response(400, { error: 'Targets and message required' }, origin);
    }
    
    const jobId = `autotext_${Date.now()}`;
    const targetArray = Array.isArray(targets) ? targets : [targets];
    
    // Store auto-text configuration
    const autoTextConfig = {
        jobId,
        sessionId,
        targets: targetArray,
        message,
        interval: interval || 300, // 5 minutes default
        repeat: repeat || 10,
        currentRepeat: 0,
        status: startNow ? 'running' : 'paused',
        owner: user.user,
        createdAt: Date.now(),
        nextRun: startNow ? Date.now() + (interval || 300) * 1000 : null
    };
    
    messageQueue.set(jobId, autoTextConfig);
    
    // Start if requested
    if (startNow) {
        startAutoTextCycle(jobId);
    }
    
    return response(200, {
        success: true,
        jobId,
        message: 'Auto-text configured',
        config: autoTextConfig
    }, origin);
}

// ============================================
// AUTO-TEXT SCHEDULER
// ============================================
function startAutoTextJob(jobId) {
    const job = messageQueue.get(jobId);
    if (!job) return;
    
    let currentIndex = 0;
    let sentCount = 0;
    
    const intervalId = setInterval(async () => {
        if (sentCount >= job.repeat) {
            clearInterval(intervalId);
            job.status = 'completed';
            console.log(`✅ Auto-text job completed: ${jobId}`);
            return;
        }
        
        const session = userSessions.get(job.sessionId);
        if (!session) {
            clearInterval(intervalId);
            job.status = 'error';
            return;
        }
        
        const chatId = job.chatIds[currentIndex % job.chatIds.length];
        
        try {
            await session.bot.sendMessage(chatId, job.message);
            sentCount++;
            job.sentCount = sentCount;
            job.lastSent = new Date().toISOString();
            job.nextRun = new Date(Date.now() + job.interval * 1000).toISOString();
            
            console.log(`📤 Auto-text sent: ${jobId} to ${chatId}`);
            
            currentIndex++;
        } catch (error) {
            console.error(`❌ Auto-text failed:`, error);
        }
    }, job.interval * 1000);
    
    job.intervalId = intervalId;
}

function startAutoTextCycle(jobId) {
    const config = messageQueue.get(jobId);
    if (!config) return;
    
    const executeMessage = async () => {
        if (config.currentRepeat >= config.repeat) {
            config.status = 'completed';
            console.log(`✅ Auto-text completed: ${jobId}`);
            return;
        }
        
        const session = userSessions.get(config.sessionId);
        if (!session) {
            config.status = 'error';
            return;
        }
        
        try {
            for (const target of config.targets) {
                await session.bot.sendMessage(target, config.message);
                console.log(`📤 [${jobId}] Sent to ${target}`);
            }
            
            config.currentRepeat++;
            config.lastRun = new Date().toISOString();
            config.nextRun = new Date(Date.now() + config.interval * 1000).toISOString();
            
            // Schedule next run
            setTimeout(executeMessage, config.interval * 1000);
            
        } catch (error) {
            console.error(`❌ Auto-text error:`, error);
            config.status = 'error';
        }
    };
    
    executeMessage();
}

// ============================================
// CLEANUP OLD SESSIONS
// ============================================
setInterval(() => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [sessionId, session] of userSessions.entries()) {
        if (now - session.createdAt > maxAge) {
            if (session.bot) {
                session.bot.disconnect();
            }
            userSessions.delete(sessionId);
            console.log(`🧹 Cleaned up old session: ${sessionId}`);
        }
    }
}, 60 * 60 * 1000); // Run every hour
