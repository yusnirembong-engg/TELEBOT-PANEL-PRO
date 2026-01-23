const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ============================================
// CONFIGURATION - SIMPLIFIED VERSION
// ============================================
const CONFIG = {
    // JWT Configuration
    JWT_SECRET: process.env.JWT_SECRET || "telebot-pro-secret-key-2024-default-for-development",
    
    // Admin Credentials - SIMPLIFIED: Use direct password
    ADMIN_USERNAME: process.env.ADMIN_USERNAME || "admin",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "TeleBotPro@2024!",
    
    // Security Settings
    TOKEN_EXPIRY: 8 * 60 * 60 * 1000, // 8 hours
    SALT_ROUNDS: 10,
    
    // CORS Configuration
    ALLOWED_ORIGINS: ['*'] // Allow all for now
};

// ============================================
// IN-MEMORY STORAGE
// ============================================
const sessions = new Map();

// ============================================
// HELPER FUNCTIONS - SIMPLIFIED
// ============================================
function generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

function createToken(sessionId, username) {
    return jwt.sign(
        {
            sid: sessionId,
            user: username,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor((Date.now() + CONFIG.TOKEN_EXPIRY) / 1000)
        },
        CONFIG.JWT_SECRET,
        { algorithm: 'HS256' }
    );
}

function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
}

function response(statusCode, body) {
    return {
        statusCode,
        headers: corsHeaders(),
        body: JSON.stringify(body)
    };
}

// ============================================
// MAIN HANDLER - FIXED FOR NETLIFY
// ============================================
exports.handler = async (event, context) => {
    console.log('🔐 Auth function called');
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        console.log('🔄 Handling CORS preflight');
        return {
            statusCode: 200,
            headers: corsHeaders(),
            body: ''
        };
    }
    
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return response(405, { 
            error: 'Method not allowed',
            message: 'Only POST requests are accepted'
        });
    }
    
    try {
        // Parse request body
        let requestData;
        if (!event.body) {
            return response(400, { 
                error: 'Empty body',
                message: 'Request body is required'
            });
        }
        
        try {
            requestData = JSON.parse(event.body);
        } catch (error) {
            console.error('❌ JSON parse error:', error.message);
            return response(400, { 
                error: 'Invalid JSON',
                message: 'Request body must be valid JSON'
            });
        }
        
        const { action, username, password, token } = requestData;
        
        console.log(`📥 Action: ${action || 'none'}, Username: ${username || 'none'}`);
        
        // Validate required action
        if (!action) {
            return response(400, { 
                error: 'Missing action',
                message: 'Please specify an action'
            });
        }
        
        switch (action.toLowerCase()) {
            case 'login':
                if (!username || !password) {
                    return response(400, { 
                        error: 'Missing credentials',
                        message: 'Username and password are required'
                    });
                }
                return await handleLogin(username, password);
                
            case 'verify':
                if (!token) {
                    return response(400, { 
                        error: 'Missing token',
                        message: 'Token is required'
                    });
                }
                return verifyToken(token);
                
            case 'health':
                return response(200, {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    service: 'TeleBot Pro Auth',
                    version: '2.0.0'
                });
                
            case 'test':
                return response(200, {
                    success: true,
                    message: 'Auth function is working',
                    config: {
                        admin_username: CONFIG.ADMIN_USERNAME,
                        token_expiry: CONFIG.TOKEN_EXPIRY
                    }
                });
                
            default:
                return response(400, { 
                    error: 'Invalid action',
                    message: `Unknown action: ${action}`,
                    supported_actions: ['login', 'verify', 'health', 'test']
                });
        }
        
    } catch (error) {
        console.error('❌ Auth function error:', error);
        return response(500, { 
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// ============================================
// LOGIN HANDLER - SIMPLIFIED
// ============================================
async function handleLogin(username, password) {
    console.log(`🔑 Login attempt - User: ${username}`);
    
    try {
        // Simple credential check
        const isUsernameValid = username === CONFIG.ADMIN_USERNAME;
        const isPasswordValid = password === CONFIG.ADMIN_PASSWORD;
        
        console.log(`Username check: ${isUsernameValid ? '✅' : '❌'}`);
        console.log(`Password check: ${isPasswordValid ? '✅' : '❌'}`);
        
        if (!isUsernameValid || !isPasswordValid) {
            return response(401, { 
                success: false,
                error: 'Invalid credentials',
                message: 'Username or password is incorrect',
                hint: 'Use: admin / TeleBotPro@2024!'
            });
        }
        
        // Create session
        const sessionId = generateSessionId();
        const token = createToken(sessionId, username);
        
        // Store session (simplified)
        sessions.set(sessionId, {
            username,
            createdAt: Date.now(),
            lastActive: Date.now()
        });
        
        console.log(`✅ Login successful: ${username}`);
        
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
                expiresAt: new Date(Date.now() + CONFIG.TOKEN_EXPIRY).toISOString()
            },
            message: 'Login successful'
        });
        
    } catch (error) {
        console.error('❌ Login error:', error);
        return response(500, {
            error: 'Internal server error',
            message: 'Error processing login'
        });
    }
}

// ============================================
// TOKEN VERIFICATION
// ============================================
function verifyToken(token) {
    try {
        console.log(`🔍 Verifying token...`);
        const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
        const session = sessions.get(decoded.sid);
        
        if (!session) {
            return response(401, { 
                valid: false,
                error: 'Session expired',
                message: 'Please login again'
            });
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
            }
        });
        
    } catch (error) {
        console.error('❌ Token verification error:', error.message);
        return response(401, { 
            valid: false,
            error: 'Invalid token',
            message: error.message
        });
    }
}

// ============================================
// CREATE PASSWORD HASH (for initial setup)
// ============================================
async function createPasswordHash() {
    try {
        const hash = await bcrypt.hash(CONFIG.ADMIN_PASSWORD, CONFIG.SALT_ROUNDS);
        console.log('🔑 Generated password hash:', hash);
        console.log('📋 Add this to your environment variables:');
        console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
        return hash;
    } catch (error) {
        console.error('❌ Failed to create password hash:', error);
        return null;
    }
}

// ============================================
// INITIALIZATION (optional)
// ============================================
if (require.main === module) {
    console.log('🔧 Running auth function initialization...');
    createPasswordHash().then(hash => {
        if (hash) {
            console.log('✅ Hash created successfully');
        }
    });
}

// Export for testing
module.exports = {
    CONFIG,
    handleLogin,
    verifyToken,
    createPasswordHash
};
