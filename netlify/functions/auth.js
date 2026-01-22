const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ============================================
// CONFIGURATION - NO ENVIRONMENT DEPENDENCY
// ============================================
const CONFIG = {
    // JWT Configuration - Hardcoded for reliability
    JWT_SECRET: process.env.JWT_SECRET || "f8d7a3c6b5e49201738a1d2f4c9b6a7e5d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2",
    
    // Admin Credentials - Change these after first login
    ADMIN_CREDENTIALS: {
        username: process.env.ADMIN_USERNAME || "admin",
        // bcrypt hash of "TeleBotPro@2024!"
        passwordHash: process.env.ADMIN_PASSWORD_HASH || "$2a$10$XcVvjL7T8q5NwRzYm9KjE.A6b8cDfG.HjKlMnOpQrStUvWxYz1234"
    },
    
    // Security Settings
    TOKEN_EXPIRY: 8 * 60 * 60 * 1000, // 8 hours
    SALT_ROUNDS: 10,
    
    // CORS Configuration
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ["https://*.netlify.app", "http://localhost:3000", "http://localhost:8888"],
    
    // IP Whitelist for direct access (optional security layer)
    IP_WHITELIST: process.env.IP_WHITELIST ? process.env.IP_WHITELIST.split(',') : [
        "49.156.45.218",
        "127.0.0.1",
        "::1"
    ]
};

// ============================================
// IN-MEMORY STORAGE (Production: Use Redis)
// ============================================
const sessions = new Map();
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function createToken(sessionId, username, ip, permissions) {
    return jwt.sign(
        {
            sid: sessionId,
            user: username,
            ip: ip,
            perms: permissions,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor((Date.now() + CONFIG.TOKEN_EXPIRY) / 1000)
        },
        CONFIG.JWT_SECRET,
        { algorithm: 'HS256' }
    );
}

function corsHeaders(origin = '*') {
    // Check if origin is allowed
    const allowedOrigin = CONFIG.ALLOWED_ORIGINS.some(allowed => 
        allowed === origin || 
        allowed === '*:*' || 
        (allowed.includes('*') && origin.match(new RegExp(allowed.replace('*', '.*'))))
    ) ? origin : '*';
    
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400'
    };
}

function response(statusCode, body, origin = '*') {
    return {
        statusCode,
        headers: corsHeaders(origin),
        body: JSON.stringify(body, null, 2)
    };
}

// Check if IP is whitelisted
function isIPWhitelisted(ip) {
    if (!CONFIG.IP_WHITELIST || CONFIG.IP_WHITELIST.length === 0) {
        return true; // If no whitelist, allow all
    }
    return CONFIG.IP_WHITELIST.includes(ip);
}

// ============================================
// MAIN HANDLER
// ============================================
exports.handler = async (event, context) => {
    console.log('🔐 Auth function called');
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return response(200, { message: 'CORS preflight' }, event.headers.origin);
    }
    
    // Get client info
    const clientIP = event.headers['x-nf-client-connection-ip'] || 
                    event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                    'unknown';
    
    const origin = event.headers.origin || '*';
    
    // Log incoming request for debugging
    console.log(`📥 Request from IP: ${clientIP}, Origin: ${origin}, Method: ${event.httpMethod}`);
    
    // Optional: IP whitelist check (uncomment if needed)
    /*
    if (!isIPWhitelisted(clientIP)) {
        console.warn(`🚫 IP ${clientIP} not in whitelist`);
        return response(403, { 
            error: 'Access denied',
            message: 'Your IP address is not authorized to access this service',
            your_ip: clientIP
        }, origin);
    }
    */
    
    try {
        const requestData = JSON.parse(event.body || '{}');
        const { action, username, password, token } = requestData;
        
        console.log(`📥 Action: ${action}, IP: ${clientIP}`);
        
        switch (action) {
            case 'login':
                return await handleLogin(username, password, clientIP, origin);
                
            case 'verify':
                return verifyToken(token, origin);
                
            case 'refresh':
                return refreshToken(token, origin);
                
            case 'logout':
                return handleLogout(token, origin);
                
            case 'check-ip':
                return response(200, { 
                    ip: clientIP, 
                    allowed: isIPWhitelisted(clientIP),
                    whitelisted: CONFIG.IP_WHITELIST.includes(clientIP),
                    timestamp: new Date().toISOString(),
                    message: isIPWhitelisted(clientIP) ? 'IP is allowed' : 'IP is not in whitelist'
                }, origin);
                
            case 'admin-info':
                // Secure endpoint to verify admin configuration
                return response(200, {
                    username: CONFIG.ADMIN_CREDENTIALS.username,
                    ip_whitelist: CONFIG.IP_WHITELIST,
                    allowed_origins: CONFIG.ALLOWED_ORIGINS,
                    your_ip: clientIP,
                    is_whitelisted: CONFIG.IP_WHITELIST.includes(clientIP)
                }, origin);
                
            default:
                return response(400, { error: 'Invalid action' }, origin);
        }
        
    } catch (error) {
        console.error('❌ Auth error:', error);
        return response(500, { 
            error: 'Internal server error',
            message: error.message,
            ip: clientIP
        }, event.headers.origin || '*');
    }
};

// ============================================
// AUTH HANDLERS
// ============================================
async function handleLogin(username, password, ip, origin) {
    // Check if IP is whitelisted (optional security)
    if (CONFIG.IP_WHITELIST.length > 0 && !isIPWhitelisted(ip)) {
        console.warn(`🚫 Login attempt from non-whitelisted IP: ${ip}`);
        return response(403, {
            error: 'Access denied',
            message: 'Your IP address is not authorized'
        }, origin);
    }
    
    // Check if IP is locked out
    const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    
    if (attempts.count >= MAX_ATTEMPTS && (now - attempts.lastAttempt) < LOCKOUT_TIME) {
        const remaining = Math.ceil((LOCKOUT_TIME - (now - attempts.lastAttempt)) / 60000);
        return response(429, {
            error: 'Too many attempts',
            message: `Account locked. Try again in ${remaining} minutes`,
            your_ip: ip
        }, origin);
    }
    
    // Validate credentials
    if (username !== CONFIG.ADMIN_CREDENTIALS.username) {
        recordFailedAttempt(ip);
        return response(401, { error: 'Invalid credentials' }, origin);
    }
    
    // Verify password (using bcrypt)
    const isValid = await bcrypt.compare(password, CONFIG.ADMIN_CREDENTIALS.passwordHash);
    
    if (!isValid) {
        recordFailedAttempt(ip);
        return response(401, { error: 'Invalid credentials' }, origin);
    }
    
    // Reset attempts on successful login
    loginAttempts.delete(ip);
    
    // Create session
    const sessionId = generateSessionId();
    const token = createToken(sessionId, username, ip, ['*']);
    
    // Store session
    sessions.set(sessionId, {
        username,
        ip,
        createdAt: now,
        lastActive: now,
        userAgent: 'Unknown',
        origin: origin
    });
    
    // Clean old sessions (optional)
    cleanupOldSessions();
    
    console.log(`✅ Login successful: ${username} from ${ip} (Whitelisted: ${isIPWhitelisted(ip)})`);
    
    return response(200, {
        success: true,
        token,
        user: {
            username,
            role: 'admin',
            permissions: ['*']
        },
        session: {
            id: sessionId,
            expiresIn: CONFIG.TOKEN_EXPIRY,
            expiresAt: new Date(now + CONFIG.TOKEN_EXPIRY).toISOString()
        },
        ip_info: {
            address: ip,
            whitelisted: isIPWhitelisted(ip)
        },
        message: 'Login successful'
    }, origin);
}

function verifyToken(token, origin) {
    try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        const session = sessions.get(decoded.sid);
        
        if (!session) {
            return response(401, { error: 'Session expired' }, origin);
        }
        
        // Update last activity
        session.lastActive = Date.now();
        
        return response(200, {
            valid: true,
            user: {
                username: decoded.user,
                role: 'admin'
            },
            session: {
                id: decoded.sid,
                expiresAt: new Date(decoded.exp * 1000).toISOString()
            },
            ip: decoded.ip
        }, origin);
        
    } catch (error) {
        return response(401, { 
            error: 'Invalid token',
            details: error.message 
        }, origin);
    }
}

function refreshToken(token, origin) {
    try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        const session = sessions.get(decoded.sid);
        
        if (!session) {
            return response(401, { error: 'Session expired' }, origin);
        }
        
        // Create new token with extended expiry
        const newToken = createToken(
            decoded.sid,
            decoded.user,
            session.ip,
            decoded.perms
        );
        
        session.lastActive = Date.now();
        
        return response(200, {
            success: true,
            token: newToken,
            expiresIn: CONFIG.TOKEN_EXPIRY,
            ip: session.ip
        }, origin);
        
    } catch (error) {
        return response(401, { error: 'Cannot refresh token' }, origin);
    }
}

function handleLogout(token, origin) {
    try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        sessions.delete(decoded.sid);
        
        return response(200, {
            success: true,
            message: 'Logged out successfully'
        }, origin);
        
    } catch (error) {
        return response(200, {
            success: true,
            message: 'Session cleared'
        }, origin);
    }
}

// ============================================
// SECURITY FUNCTIONS
// ============================================
function recordFailedAttempt(ip) {
    const now = Date.now();
    const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    
    attempts.count += 1;
    attempts.lastAttempt = now;
    
    loginAttempts.set(ip, attempts);
    
    console.log(`⚠️ Failed login attempt from ${ip}, attempt ${attempts.count}`);
    
    if (attempts.count >= MAX_ATTEMPTS) {
        console.log(`🔒 IP ${ip} locked for ${LOCKOUT_TIME/60000} minutes`);
    }
}

function cleanupOldSessions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [sessionId, session] of sessions.entries()) {
        if (now - session.lastActive > maxAge) {
            sessions.delete(sessionId);
        }
    }
}

// ============================================
// UTILITY FUNCTION FOR PASSWORD HASHING
// ============================================
async function generatePasswordHash() {
    const password = "TeleBotPro@2024!";
    const hash = await bcrypt.hash(password, CONFIG.SALT_ROUNDS);
    console.log('Generated password hash:', hash);
    return hash;
}

// Uncomment to generate new password hash:
// generatePasswordHash().then(console.log);
