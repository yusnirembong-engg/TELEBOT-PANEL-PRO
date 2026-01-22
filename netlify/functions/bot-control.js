const jwt = require('jsonwebtoken');
const { Telegraf } = require('telegraf');
const crypto = require('crypto');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    JWT_SECRET: process.env.JWT_SECRET || "f8d7a3c6b5e49201738a1d2f4c9b6a7e5d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2",
    MAX_BOTS_PER_USER: parseInt(process.env.MAX_BOTS_PER_USER) || 10
};

// ============================================
// BOT STORAGE (In-memory)
// ============================================
const activeBots = new Map();
const botSessions = new Map();

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
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return null;
    }
}

function generateBotId(username) {
    return `bot_${username}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ============================================
// TELEGRAM BOT MANAGER
// ============================================
class BotManager {
    constructor(botId, token, owner) {
        this.botId = botId;
        this.token = token;
        this.owner = owner;
        this.status = 'stopped';
        this.startedAt = null;
        this.stats = {
            messagesSent: 0,
            commandsReceived: 0,
            errors: 0
        };
        
        // Create Telegraf instance
        this.bot = new Telegraf(token);
        
        // Setup basic commands
        this.setupCommands();
        
        // Error handling
        this.bot.catch((err, ctx) => {
            console.error(`[Bot ${botId}] Error:`, err);
            this.stats.errors++;
        });
    }
    
    setupCommands() {
        // Start command
        this.bot.start((ctx) => {
            ctx.reply(`🤖 Hello! I'm ${this.botId}\n📊 Status: ${this.status}\n👤 Owner: ${this.owner}`);
        });
        
        // Status command
        this.bot.command('status', (ctx) => {
            ctx.reply(`📊 Bot Status:\n• Status: ${this.status}\n• Messages: ${this.stats.messagesSent}\n• Uptime: ${this.getUptime()}`);
        });
        
        // Help command
        this.bot.command('help', (ctx) => {
            ctx.reply(`📚 Available Commands:\n/start - Start bot\n/status - Check status\n/help - Show help\n/admin - Admin commands`);
        });
        
        // Admin command (only for owner)
        this.bot.command('admin', (ctx) => {
            if (ctx.from.username === this.owner) {
                ctx.reply(`👑 Admin Panel:\n• Bot ID: ${this.botId}\n• Messages: ${this.stats.messagesSent}\n• Errors: ${this.stats.errors}`);
            } else {
                ctx.reply('⚠️ Access denied!');
            }
        });
    }
    
    async start() {
        if (this.status === 'running') {
            return { success: false, message: 'Bot already running' };
        }
        
        try {
            await this.bot.launch();
            this.status = 'running';
            this.startedAt = Date.now();
            
            console.log(`✅ Bot ${this.botId} started successfully`);
            
            return { 
                success: true, 
                message: 'Bot started',
                botId: this.botId,
                status: this.status,
                startedAt: new Date(this.startedAt).toISOString()
            };
        } catch (error) {
            console.error(`❌ Failed to start bot ${this.botId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    async stop() {
        if (this.status !== 'running') {
            return { success: false, message: 'Bot not running' };
        }
        
        try {
            await this.bot.stop();
            this.status = 'stopped';
            
            console.log(`🛑 Bot ${this.botId} stopped`);
            
            return { 
                success: true, 
                message: 'Bot stopped',
                botId: this.botId,
                status: this.status,
                uptime: this.getUptime()
            };
        } catch (error) {
            console.error(`❌ Failed to stop bot ${this.botId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    async restart() {
        const stopResult = await this.stop();
        if (!stopResult.success) {
            return stopResult;
        }
        
        // Wait 2 seconds before restart
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return await this.start();
    }
    
    async sendMessage(chatId, message, options = {}) {
        try {
            await this.bot.telegram.sendMessage(chatId, message, options);
            this.stats.messagesSent++;
            
            return { 
                success: true, 
                message: 'Message sent',
                botId: this.botId,
                chatId,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`❌ Failed to send message:`, error);
            return { success: false, error: error.message };
        }
    }
    
    getUptime() {
        if (!this.startedAt) return '0s';
        const seconds = Math.floor((Date.now() - this.startedAt) / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    }
    
    getStats() {
        return {
            botId: this.botId,
            owner: this.owner,
            status: this.status,
            startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
            uptime: this.getUptime(),
            stats: this.stats
        };
    }
}

// ============================================
// API HANDLERS
// ============================================
exports.handler = async (event, context) => {
    console.log('🤖 Bot Control function called');
    
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
        const { action, botId, ...data } = requestData;
        
        console.log(`📥 Action: ${action}, User: ${user.user}`);
        
        switch (action) {
            case 'create':
                return await createBot(data, user, origin);
                
            case 'start':
                return await startBot(botId, user, origin);
                
            case 'stop':
                return await stopBot(botId, user, origin);
                
            case 'restart':
                return await restartBot(botId, user, origin);
                
            case 'status':
                return await getBotStatus(botId, user, origin);
                
            case 'list':
                return await listBots(user, origin);
                
            case 'send':
                return await sendMessage(botId, data, user, origin);
                
            case 'stats':
                return await getBotStats(botId, user, origin);
                
            case 'delete':
                return await deleteBot(botId, user, origin);
                
            default:
                return response(400, { error: 'Invalid action' }, origin);
        }
        
    } catch (error) {
        console.error('❌ Bot control error:', error);
        return response(500, { 
            error: 'Internal server error',
            message: error.message 
        }, origin);
    }
};

// ============================================
// BOT OPERATIONS
// ============================================
async function createBot(data, user, origin) {
    const { token, name, description = '' } = data;
    
    if (!token || !name) {
        return response(400, { 
            error: 'Missing required fields',
            required: ['token', 'name']
        }, origin);
    }
    
    // Check bot limit
    const userBots = Array.from(activeBots.values())
        .filter(bot => bot.owner === user.user);
    
    if (userBots.length >= CONFIG.MAX_BOTS_PER_USER) {
        return response(403, { 
            error: 'Bot limit reached',
            maxBots: CONFIG.MAX_BOTS_PER_USER
        }, origin);
    }
    
    const botId = generateBotId(user.user);
    
    try {
        // Test token validity
        const testBot = new Telegraf(token);
        const botInfo = await testBot.telegram.getMe();
        
        // Create bot manager
        const botManager = new BotManager(botId, token, user.user);
        
        // Store bot
        activeBots.set(botId, botManager);
        botSessions.set(botId, {
            botId,
            name,
            description,
            owner: user.user,
            token: token.substring(0, 8) + '***', // Mask token
            createdAt: Date.now(),
            botInfo: {
                id: botInfo.id,
                username: botInfo.username,
                firstName: botInfo.first_name,
                isBot: botInfo.is_bot
            }
        });
        
        console.log(`✅ Bot created: ${botId} for ${user.user}`);
        
        return response(200, {
            success: true,
            message: 'Bot created successfully',
            botId,
            botInfo: {
                name,
                username: botInfo.username,
                id: botInfo.id
            },
            session: botSessions.get(botId)
        }, origin);
        
    } catch (error) {
        console.error('❌ Bot creation failed:', error);
        return response(400, { 
            error: 'Invalid bot token',
            message: error.message 
        }, origin);
    }
}

async function startBot(botId, user, origin) {
    const botManager = activeBots.get(botId);
    
    if (!botManager) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    if (botManager.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    const result = await botManager.start();
    
    if (result.success) {
        return response(200, result, origin);
    } else {
        return response(500, result, origin);
    }
}

async function stopBot(botId, user, origin) {
    const botManager = activeBots.get(botId);
    
    if (!botManager) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    if (botManager.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    const result = await botManager.stop();
    
    if (result.success) {
        return response(200, result, origin);
    } else {
        return response(500, result, origin);
    }
}

async function restartBot(botId, user, origin) {
    const botManager = activeBots.get(botId);
    
    if (!botManager) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    if (botManager.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    const result = await botManager.restart();
    
    if (result.success) {
        return response(200, result, origin);
    } else {
        return response(500, result, origin);
    }
}

async function getBotStatus(botId, user, origin) {
    const botManager = activeBots.get(botId);
    
    if (!botManager) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    if (botManager.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    return response(200, {
        success: true,
        ...botManager.getStats()
    }, origin);
}

async function listBots(user, origin) {
    const userBots = Array.from(activeBots.values())
        .filter(bot => bot.owner === user.user)
        .map(bot => bot.getStats());
    
    const botSessionsList = Array.from(botSessions.values())
        .filter(session => session.owner === user.user);
    
    return response(200, {
        success: true,
        count: userBots.length,
        bots: userBots,
        sessions: botSessionsList
    }, origin);
}

async function sendMessage(botId, data, user, origin) {
    const { chatId, message, parseMode = 'HTML', ...options } = data;
    
    if (!chatId || !message) {
        return response(400, { 
            error: 'Missing required fields',
            required: ['chatId', 'message']
        }, origin);
    }
    
    const botManager = activeBots.get(botId);
    
    if (!botManager) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    if (botManager.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    if (botManager.status !== 'running') {
        return response(400, { error: 'Bot is not running' }, origin);
    }
    
    const result = await botManager.sendMessage(chatId, message, {
        parse_mode: parseMode,
        ...options
    });
    
    if (result.success) {
        return response(200, result, origin);
    } else {
        return response(500, result, origin);
    }
}

async function getBotStats(botId, user, origin) {
    const botManager = activeBots.get(botId);
    
    if (!botManager) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    if (botManager.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    return response(200, {
        success: true,
        stats: botManager.stats,
        performance: {
            uptime: botManager.getUptime(),
            messagesPerHour: calculateRate(botManager.stats.messagesSent, botManager.startedAt)
        }
    }, origin);
}

async function deleteBot(botId, user, origin) {
    const botManager = activeBots.get(botId);
    
    if (!botManager) {
        return response(404, { error: 'Bot not found' }, origin);
    }
    
    if (botManager.owner !== user.user) {
        return response(403, { error: 'Access denied' }, origin);
    }
    
    // Stop bot if running
    if (botManager.status === 'running') {
        await botManager.stop();
    }
    
    // Remove from storage
    activeBots.delete(botId);
    botSessions.delete(botId);
    
    return response(200, {
        success: true,
        message: 'Bot deleted successfully',
        botId
    }, origin);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function calculateRate(count, startTime) {
    if (!startTime || count === 0) return 0;
    
    const hours = (Date.now() - startTime) / (1000 * 60 * 60);
    return hours > 0 ? (count / hours).toFixed(2) : count;
}

// ============================================
// CLEANUP OLD BOTS (Optional)
// ============================================
setInterval(() => {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [botId, session] of botSessions.entries()) {
        if (now - session.createdAt > maxAge) {
            const botManager = activeBots.get(botId);
            if (botManager) {
                botManager.stop();
            }
            activeBots.delete(botId);
            botSessions.delete(botId);
            console.log(`🧹 Cleaned up old bot: ${botId}`);
        }
    }
}, 60 * 60 * 1000); // Run every hour
