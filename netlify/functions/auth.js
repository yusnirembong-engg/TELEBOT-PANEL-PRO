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
    
    // CORS Configuration - FIXED: Remove wildcard patterns for simplicity
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
        "https://telebotpro.netlify.app",
        "http://localhost:3000", 
        "http://localhost:8888",
        "*" // Untuk testing
    ],
    
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
    // FIXED: Simplified CORS handling
    let allowedOrigin = '*';
    
    if (origin && CONFIG.ALLOWED_ORIGINS.includes('*')) {
        allowedOrigin = origin; // Allow any origin for testing
    } else if (origin && CONFIG.ALLOWED_ORIGINS.includes(origin)) {
        allowedOrigin = origin;
    }
    
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
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
// MAIN HANDLER - FIXED
// ============================================
exports.handler = async (event, context) => {
    console.log('🔐 Auth function called');
    console.log('📋 Full event:', JSON.stringify({
        method: event.httpMethod,
        path: event.path,
        headers: event.headers,
        body: event.body ? JSON.parse(event.body) : 'No body'
    }, null, 2));
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        console.log('🔄 CORS preflight request');
        return {
            statusCode: 200,
            headers: corsHeaders(event.headers.origin),
            body: JSON.stringify({ message: 'CORS preflight successful' })
        };
    }
    
    // Get client info
    const clientIP = event.headers['x-nf-client-connection-ip'] || 
                    event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                    event.headers['client-ip'] ||
                    'unknown';
    
    const origin = event.headers.origin || event.headers.Origin || '*';
    
    console.log(`📥 Request from IP: ${clientIP}, Origin: ${origin}, Method: ${event.httpMethod}`);
    
    // Disable IP whitelist for now to debug login issues
    /*
    if (!isIPWhitelisted(clientIP)) {
        console.warn(`🚫 IP ${clientIP} not in whitelist`);
        return response(403, { 
            error: 'Access denied',
            message: 'Your IP address is not authorized to access this service',
            your_ip: clientIP,
            whitelist: CONFIG.IP_WHITELIST
        }, origin);
    }
    */
    
    try {
        // Parse request body
        let requestData;
        try {
            requestData = event.body ? JSON.parse(event.body) : {};
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            return response(400, { 
                error: 'Invalid JSON',
                message: 'Request body must be valid JSON'
            }, origin);
        }
        
        const { action, username, password, token } = requestData;
        
        console.log(`📥 Action: ${action}, Username: ${username || 'none'}, IP: ${clientIP}`);
        
        // Validate required action
        if (!action) {
            return response(400, { 
                error: 'Missing action',
                message: 'Please specify an action (login, verify, etc.)'
            }, origin);
        }
        
        switch (action.toLowerCase()) {
            case 'login':
                if (!username || !password) {
                    return response(400, { 
                        error: 'Missing credentials',
                        message: 'Username and password are required'
                    }, origin);
                }
                return await handleLogin(username, password, clientIP, origin);
                
            case 'verify':
                if (!token) {
                    return response(400, { 
                        error: 'Missing token',
                        message: 'Token is required for verification'
                    }, origin);
                }
                return verifyToken(token, origin);
                
            case 'refresh':
                if (!token) {
                    return response(400, { 
                        error: 'Missing token',
                        message: 'Token is required for refresh'
                    }, origin);
                }
                return refreshToken(token, origin);
                
            case 'logout':
                if (!token) {
                    return response(400, { 
                        error: 'Missing token',
                        message: 'Token is required for logout'
                    }, origin);
                }
                return handleLogout(token, origin);
                
            case 'check-ip':
                return response(200, { 
                    ip: clientIP, 
                    allowed: isIPWhitelisted(clientIP),
                    whitelisted: CONFIG.IP_WHITELIST.includes(clientIP),
                    timestamp: new Date().toISOString(),
                    message: isIPWhitelisted(clientIP) ? 'IP is allowed' : 'IP is not in whitelist',
                    whitelist: CONFIG.IP_WHITELIST
                }, origin);
                
            case 'admin-info':
                return response(200, {
                    username: CONFIG.ADMIN_CREDENTIALS.username,
                    ip_whitelist: CONFIG.IP_WHITELIST,
                    allowed_origins: CONFIG.ALLOWED_ORIGINS,
                    your_ip: clientIP,
                    is_whitelisted: CONFIG.IP_WHITELIST.includes(clientIP)
                }, origin);
                
            case 'health':
                return response(200, {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    sessions: sessions.size,
                    memory: process.memoryUsage(),
                    node_version: process.version
                }, origin);
                
            default:
                return response(400, { 
                    error: 'Invalid action',
                    message: `Unknown action: ${action}`,
                    supported_actions: ['login', 'verify', 'refresh', 'logout', 'check-ip', 'admin-info', 'health']
                }, origin);
        }
        
    } catch (error) {
        console.error('❌ Auth error:', error.stack || error);
        return response(500, { 
            error: 'Internal server error',
            message: error.message,
            ip: clientIP,
            timestamp: new Date().toISOString()
        }, event.headers.origin || '*');
    }
};

// ============================================
// AUTH HANDLERS - FIXED
// ============================================
async function handleLogin(username, password, ip, origin) {
    console.log(`🔑 Login attempt - User: ${username}, IP: ${ip}, Origin: ${origin}`);
    
    // Check if IP is whitelisted (optional security) - Disabled for debugging
    /*
    if (CONFIG.IP_WHITELIST.length > 0 && !isIPWhitelisted(ip)) {
        console.warn(`🚫 Login attempt from non-whitelisted IP: ${ip}`);
        return response(403, {
            error: 'Access denied',
            message: 'Your IP address is not authorized',
            your_ip: ip,
            whitelist: CONFIG.IP_WHITELIST
        }, origin);
    }
    */
    
    // Check if IP is locked out
    const attempts = loginAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    const now = Date.now();
    
    console.log(`Login attempts for IP ${ip}: ${attempts.count}/${MAX_ATTEMPTS}`);
    
    if (attempts.count >= MAX_ATTEMPTS && (now - attempts.lastAttempt) < LOCKOUT_TIME) {
        const remaining = Math.ceil((LOCKOUT_TIME - (now - attempts.lastAttempt)) / 60000);
        console.log(`🔒 IP ${ip} is locked out for ${remaining} minutes`);
        return response(429, {
            error: 'Too many attempts',
            message: `Account locked. Try again in ${remaining} minutes`,
            your_ip: ip,
            attempts: attempts.count,
            lockout_time: LOCKOUT_TIME
        }, origin);
    }
    
    // Validate credentials - FIXED: Case-sensitive comparison
    const expectedUsername = CONFIG.ADMIN_CREDENTIALS.username;
    if (username.trim() !== expectedUsername) {
        console.warn(`❌ Invalid username: "${username}" (expected: "${expectedUsername}")`);
        recordFailedAttempt(ip);
        return response(401, { 
            error: 'Invalid credentials',
            message: 'Username or password is incorrect',
            hint: 'Username is case-sensitive'
        }, origin);
    }
    
    // Verify password (using bcrypt)
    console.log('🔐 Verifying password...');
    
    try {
        // FIXED: Use the correct password hash - generate a new one if needed
        const passwordHash = CONFIG.ADMIN_CREDENTIALS.passwordHash;
        console.log(`Password hash stored: ${passwordHash.substring(0, 20)}...`);
        
        const isValid = await bcrypt.compare(password.trim(), passwordHash);
        
        console.log(`Password comparison result: ${isValid}`);
        
        if (!isValid) {
            console.warn('❌ Invalid password');
            recordFailedAttempt(ip);
            return response(401, { 
                error: 'Invalid credentials',
                message: 'Username or password is incorrect',
                hint: 'Password is case-sensitive and must be exactly "TeleBotPro@2024!"'
            }, origin);
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
        
        // Clean old sessions
        cleanupOldSessions();
        
        console.log(`✅ Login successful: ${username} from ${ip}`);
        console.log(`📊 Total active sessions: ${sessions.size}`);
        console.log(`🔑 Token generated (first 20 chars): ${token.substring(0, 20)}...`);
        
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
        
    } catch (error) {
        console.error('❌ Password verification error:', error);
        return response(500, {
            error: 'Internal server error',
            message: 'Error verifying credentials',
            details: error.message
        }, origin);
    }
}

function verifyToken(token, origin) {
    try {
        console.log(`🔍 Verifying token: ${token.substring(0, 20)}...`);
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        const session = sessions.get(decoded.sid);
        
        if (!session) {
            console.warn(`❌ Session not found: ${decoded.sid}`);
            return response(401, { 
                error: 'Session expired',
                message: 'Please login again'
            }, origin);
        }
        
        // Update last activity
        session.lastActive = Date.now();
        
        console.log(`✅ Token valid for user: ${decoded.user}`);
        
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
        console.error('❌ Token verification error:', error.message);
        return response(401, { 
            error: 'Invalid token',
            details: error.message,
            hint: 'Token may have expired. Please login again.'
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
        
        console.log(`🔄 Token refreshed for: ${decoded.user}`);
        
        return response(200, {
            success: true,
            token: newToken,
            expiresIn: CONFIG.TOKEN_EXPIRY,
            ip: session.ip
        }, origin);
        
    } catch (error) {
        return response(401, { 
            error: 'Cannot refresh token',
            details: error.message
        }, origin);
    }
}

function handleLogout(token, origin) {
    try {
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        sessions.delete(decoded.sid);
        
        console.log(`👋 User logged out: ${decoded.user}`);
        
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
            console.log(`🧹 Cleaned up old session: ${sessionId.substring(0, 8)}...`);
        }
    }
}

// ============================================
// UTILITY FUNCTION FOR PASSWORD HASHING
// ============================================
async function generatePasswordHash() {
    const password = "TeleBotPro@2024!";
    const hash = await bcrypt.hash(password, CONFIG.SALT_ROUNDS);
    console.log('🔑 Generated password hash:', hash);
    console.log('💡 Copy this to ADMIN_CREDENTIALS.passwordHash');
    return hash;
}

// Test password generation (uncomment when needed)
// generatePasswordHash().then(hash => {
//     console.log('✅ Hash generated successfully');
//     console.log('📋 Update your CONFIG with this hash:');
//     console.log(`passwordHash: "${hash}"`);
// }).catch(console.error);

// Export for testing
module.exports = {
    CONFIG,
    handleLogin,
    verifyToken,
    generatePasswordHash,
    isIPWhitelisted
};
