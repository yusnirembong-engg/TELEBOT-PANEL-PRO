// netlify/functions/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || "telebot-pro-secret-key-2024-development",
    
    // Admin Credentials - SIMPLE for now
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || "admin",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin123",
    
    // Security Settings
    TOKEN_EXPIRY: 8 * 60 * 60 * 1000, // 8 hours
};

// ============================================
// IN-MEMORY STORAGE
// ============================================
const sessions = new Map();

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

function createToken(sessionId, username) {
    const payload = {
        sid: sessionId,
        user: username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor((Date.now() + CONFIG.TOKEN_EXPIRY) / 1000)
    };
    
    console.log('Creating token with payload:', payload);
    
    try {
        const token = jwt.sign(payload, CONFIG.JWT_SECRET, { algorithm: 'HS256' });
        console.log('Token created successfully');
        return token;
    } catch (error) {
        console.error('Error creating token:', error);
        throw error;
    }
}

function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
    };
}

function createResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: corsHeaders(),
        body: typeof body === 'string' ? body : JSON.stringify(body)
    };
}

// ============================================
// MAIN HANDLER - FIXED VERSION
// ============================================
exports.handler = async (event, context) => {
    console.log('🔐 Auth function called - START');
    console.log('HTTP Method:', event.httpMethod);
    console.log('Path:', event.path);
    
    // Log environment info (not secrets)
    console.log('Environment:', {
        JWT_SECRET_SET: !!process.env.JWT_SECRET,
        ADMIN_USERNAME_SET: !!process.env.ADMIN_USERNAME,
        NODE_ENV: process.env.NODE_ENV || 'not set'
    });
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        console.log('🔄 Handling CORS preflight request');
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: ''
        };
    }
    
    // Only allow POST for main endpoints
    if (event.httpMethod !== 'POST') {
        console.log(`❌ Method not allowed: ${event.httpMethod}`);
        return createResponse(405, {
            success: false,
            error: 'Method not allowed',
            message: 'Only POST requests are accepted for this endpoint',
            received: event.httpMethod,
            expected: 'POST'
        });
    }
    
    try {
        // Parse request body
        let requestData;
        
        if (!event.body || event.body.trim() === '') {
            console.log('❌ Empty request body');
            return createResponse(400, {
                success: false,
                error: 'Empty request body',
                message: 'Request body is required'
            });
        }
        
        try {
            requestData = JSON.parse(event.body);
            console.log('📥 Parsed request data:', { 
                action: requestData.action,
                username: requestData.username ? '***' : 'none'
            });
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError.message);
            return createResponse(400, {
                success: false,
                error: 'Invalid JSON',
                message: 'Request body must be valid JSON',
                received: event.body.substring(0, 100) + '...'
            });
        }
        
        const { action, username, password, token } = requestData;
        
        // Validate required action
        if (!action) {
            console.log('❌ Missing action parameter');
            return createResponse(400, {
                success: false,
                error: 'Missing action parameter',
                message: 'Please specify an action parameter',
                supported_actions: ['login', 'verify', 'test', 'health']
            });
        }
        
        // Route to appropriate handler
        switch (action.toLowerCase()) {
            case 'login':
                console.log(`🔑 Processing login for user: ${username || 'none'}`);
                return await handleLogin(username, password);
                
            case 'verify':
                console.log('🔍 Processing token verification');
                return verifyToken(token);
                
            case 'test':
                console.log('🧪 Processing test request');
                return createResponse(200, {
                    success: true,
                    message: 'Auth function is working correctly!',
                    timestamp: new Date().toISOString(),
                    environment: process.env.NODE_ENV || 'development',
                    config: {
                        admin_username: CONFIG.ADMIN_USERNAME,
                        token_expiry: CONFIG.TOKEN_EXPIRY,
                        jwt_secret_set: !!process.env.JWT_SECRET
                    }
                });
                
            case 'health':
                console.log('🏥 Processing health check');
                return createResponse(200, {
                    status: 'healthy',
                    service: 'TeleBot Pro Authentication Service',
                    version: '2.0.0',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    sessions_active: sessions.size
                });
                
            default:
                console.log(`❌ Unknown action: ${action}`);
                return createResponse(400, {
                    success: false,
                    error: 'Invalid action',
                    message: `Unknown action: ${action}`,
                    supported_actions: ['login', 'verify', 'test', 'health']
                });
        }
        
    } catch (error) {
        console.error('❌ Unhandled error in auth function:', error);
        console.error('Error stack:', error.stack);
        
        return createResponse(500, {
            success: false,
            error: 'Internal server error',
            message: 'An unexpected error occurred',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Contact administrator',
            timestamp: new Date().toISOString()
        });
    } finally {
        console.log('🔐 Auth function called - END');
    }
};

// ============================================
// LOGIN HANDLER
// ============================================
async function handleLogin(username, password) {
    try {
        console.log(`🔐 Login attempt details:`, {
            username_provided: username,
            expected_username: CONFIG.ADMIN_USERNAME,
            password_provided: password ? '***' : 'none',
            expected_password: CONFIG.ADMIN_PASSWORD ? '***' : 'none'
        });
        
        // Validate input
        if (!username || !password) {
            console.log('❌ Missing username or password');
            return createResponse(400, {
                success: false,
                error: 'Missing credentials',
                message: 'Both username and password are required'
            });
        }
        
        // Check credentials
        const isUsernameValid = username === CONFIG.ADMIN_USERNAME;
        const isPasswordValid = password === CONFIG.ADMIN_PASSWORD;
        
        console.log(`✅ Credential check results:`, {
            username_valid: isUsernameValid,
            password_valid: isPasswordValid
        });
        
        if (!isUsernameValid || !isPasswordValid) {
            console.log('❌ Invalid credentials');
            return createResponse(401, {
                success: false,
                error: 'Invalid credentials',
                message: 'Username or password is incorrect',
                hint: process.env.NODE_ENV === 'development' 
                    ? `Try: ${CONFIG.ADMIN_USERNAME} / ${CONFIG.ADMIN_PASSWORD}`
                    : 'Please check your credentials'
            });
        }
        
        // Create session
        const sessionId = generateSessionId();
        console.log(`Generated session ID: ${sessionId}`);
        
        // Create JWT token
        let token;
        try {
            token = createToken(sessionId, username);
            console.log(`✅ JWT token created successfully`);
        } catch (tokenError) {
            console.error('❌ Failed to create token:', tokenError);
            return createResponse(500, {
                success: false,
                error: 'Token creation failed',
                message: 'Could not create authentication token'
            });
        }
        
        // Store session in memory
        const sessionData = {
            username,
            createdAt: Date.now(),
            lastActive: Date.now(),
            ip: 'unknown' // You can add IP tracking if needed
        };
        
        sessions.set(sessionId, sessionData);
        console.log(`📝 Session stored. Total sessions: ${sessions.size}`);
        
        // Prepare response data
        const expiresAt = new Date(Date.now() + CONFIG.TOKEN_EXPIRY);
        
        const responseData = {
            success: true,
            token: token,
            user: {
                username: username,
                role: 'admin',
                permissions: ['*']
            },
            session: {
                id: sessionId,
                expiresIn: CONFIG.TOKEN_EXPIRY,
                expiresAt: expiresAt.toISOString(),
                createdAt: new Date().toISOString()
            },
            message: 'Login successful! Welcome back.',
            timestamp: new Date().toISOString()
        };
        
        console.log(`✅ Login successful for user: ${username}`);
        console.log(`📊 Response data:`, {
            token_length: token.length,
            expires_at: expiresAt.toISOString(),
            user_role: 'admin'
        });
        
        return createResponse(200, responseData);
        
    } catch (error) {
        console.error('❌ Error in handleLogin:', error);
        console.error('Stack trace:', error.stack);
        
        return createResponse(500, {
            success: false,
            error: 'Login processing error',
            message: 'An error occurred during login',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// ============================================
// TOKEN VERIFICATION
// ============================================
function verifyToken(token) {
    try {
        console.log(`🔍 Verifying token (length: ${token.length})`);
        
        if (!token || token.trim() === '') {
            console.log('❌ Empty token provided');
            return createResponse(400, {
                valid: false,
                error: 'Empty token',
                message: 'Token is required for verification'
            });
        }
        
        // Verify JWT token
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        console.log(`✅ Token decoded:`, {
            user: decoded.user,
            sid: decoded.sid,
            exp: new Date(decoded.exp * 1000).toISOString()
        });
        
        // Check if session exists in memory
        const session = sessions.get(decoded.sid);
        if (!session) {
            console.log(`❌ Session not found for SID: ${decoded.sid}`);
            return createResponse(401, {
                valid: false,
                error: 'Session expired',
                message: 'Please login again'
            });
        }
        
        // Update last activity
        session.lastActive = Date.now();
        console.log(`🔄 Updated last activity for session: ${decoded.sid}`);
        
        return createResponse(200, {
            valid: true,
            user: {
                username: decoded.user,
                role: 'admin'
            },
            session: {
                id: decoded.sid,
                expiresAt: new Date(decoded.exp * 1000).toISOString(),
                lastActive: new Date(session.lastActive).toISOString()
            },
            message: 'Token is valid'
        });
        
    } catch (error) {
        console.error('❌ Token verification error:', error.message);
        
        let errorMessage = 'Invalid token';
        if (error.name === 'TokenExpiredError') {
            errorMessage = 'Token has expired';
        } else if (error.name === 'JsonWebTokenError') {
            errorMessage = 'Invalid token format';
        }
        
        return createResponse(401, {
            valid: false,
            error: errorMessage,
            message: error.message,
            name: error.name
        });
    }
}

// ============================================
// ADDITIONAL HELPER FOR NETLIFY
// ============================================
// Export for testing
module.exports = {
    handler: exports.handler,
    handleLogin,
    verifyToken,
    CONFIG,
    sessions
};
