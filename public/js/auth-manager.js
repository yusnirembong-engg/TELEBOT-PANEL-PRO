/**
 * TeleBot Pro v2.0.0 - Auth Manager
 * Handles authentication, JWT tokens, and session management
 */

class AuthManager {
    constructor() {
        this.token = null;
        this.user = null;
        this.expiresAt = null;
        this.apiBase = '/.netlify/functions';
        
        // Load token from localStorage
        this.loadToken();
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('🔐 Auth Manager initialized');
        this.setupAutoRefresh();
    }
    
    // Load token from localStorage
    loadToken() {
        try {
            const savedToken = localStorage.getItem('telebot_token');
            const savedUser = localStorage.getItem('telebot_user');
            const savedExpiry = localStorage.getItem('telebot_expires');
            
            if (savedToken && savedUser && savedExpiry) {
                const expiryTime = parseInt(savedExpiry);
                
                // Check if token is still valid
                if (expiryTime > Date.now()) {
                    this.token = savedToken;
                    this.user = JSON.parse(savedUser);
                    this.expiresAt = expiryTime;
                    console.log('✅ Token loaded from storage');
                } else {
                    console.log('⚠️ Token expired, clearing...');
                    this.clearToken();
                }
            }
        } catch (error) {
            console.error('Failed to load token:', error);
            this.clearToken();
        }
    }
    
    // Save token to localStorage
    saveToken() {
        try {
            if (this.token && this.user && this.expiresAt) {
                localStorage.setItem('telebot_token', this.token);
                localStorage.setItem('telebot_user', JSON.stringify(this.user));
                localStorage.setItem('telebot_expires', this.expiresAt.toString());
            }
        } catch (error) {
            console.error('Failed to save token:', error);
        }
    }
    
    // Clear token
    clearToken() {
        this.token = null;
        this.user = null;
        this.expiresAt = null;
        
        localStorage.removeItem('telebot_token');
        localStorage.removeItem('telebot_user');
        localStorage.removeItem('telebot_expires');
    }
    
    // Setup token auto-refresh
    setupAutoRefresh() {
        // Check token validity every minute
        setInterval(() => {
            this.checkTokenValidity();
        }, 60000);
    }
    
    // Check token validity
    async checkTokenValidity() {
        if (!this.token || !this.expiresAt) return;
        
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        // Refresh if token expires in less than 5 minutes
        if (this.expiresAt - now < fiveMinutes) {
            console.log('🔄 Token expiring soon, attempting refresh...');
            await this.refreshToken();
        }
    }
    
    // Login
    async login(username, password, clientIP = null) {
        try {
            console.log(`🔐 Attempting login for user: ${username}`);
            
            const response = await fetch(`${this.apiBase}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'login',
                    username: username,
                    password: password,
                    ip: clientIP
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Store token and user info
                this.token = data.token;
                this.user = data.user;
                this.expiresAt = new Date(data.session.expiresAt).getTime();
                
                // Save to localStorage
                this.saveToken();
                
                console.log('✅ Login successful');
                
                // Emit event
                this.emitEvent('login', {
                    user: this.user,
                    expiresAt: this.expiresAt
                });
                
                return {
                    success: true,
                    user: this.user,
                    session: data.session
                };
            } else {
                console.error('Login failed:', data.error);
                return {
                    success: false,
                    error: data.error || 'Login failed'
                };
            }
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: 'Network error: ' + error.message
            };
        }
    }
    
    // Verify token
    async verifyToken() {
        if (!this.token) {
            return { valid: false, error: 'No token' };
        }
        
        try {
            const response = await fetch(`${this.apiBase}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'verify',
                    token: this.token
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.valid) {
                return {
                    valid: true,
                    user: data.user,
                    session: data.session
                };
            } else {
                // Token invalid, clear it
                this.clearToken();
                return {
                    valid: false,
                    error: data.error || 'Token invalid'
                };
            }
        } catch (error) {
            console.error('Token verification error:', error);
            return {
                valid: false,
                error: 'Network error'
            };
        }
    }
    
    // Refresh token
    async refreshToken() {
        if (!this.token) return { success: false, error: 'No token' };
        
        try {
            const response = await fetch(`${this.apiBase}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'refresh',
                    token: this.token
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                this.token = data.token;
                this.expiresAt = Date.now() + data.expiresIn;
                this.saveToken();
                
                console.log('🔄 Token refreshed');
                
                return {
                    success: true,
                    token: data.token
                };
            } else {
                return {
                    success: false,
                    error: data.error || 'Refresh failed'
                };
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Logout
    async logout() {
        if (this.token) {
            try {
                // Notify server
                await fetch(`${this.apiBase}/auth`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        action: 'logout',
                        token: this.token
                    })
                }).catch(() => {
                    // Ignore errors during logout
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        
        // Clear local data
        this.clearToken();
        
        // Emit event
        this.emitEvent('logout');
        
        console.log('👋 Logged out');
    }
    
    // Get auth headers for API requests
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    }
    
    // Check if user is authenticated
    isAuthenticated() {
        if (!this.token || !this.expiresAt) return false;
        
        // Check if token is still valid
        const now = Date.now();
        return this.expiresAt > now;
    }
    
    // Get current user
    getUser() {
        return this.user;
    }
    
    // Get session info
    getSessionInfo() {
        if (!this.isAuthenticated()) return null;
        
        const now = Date.now();
        const timeLeft = this.expiresAt - now;
        
        return {
            token: this.token,
            user: this.user,
            expiresAt: this.expiresAt,
            timeLeft: timeLeft,
            timeLeftFormatted: this.formatTimeLeft(timeLeft)
        };
    }
    
    // Format time left
    formatTimeLeft(ms) {
        if (ms <= 0) return 'Expired';
        
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
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
    
    // Check IP whitelist
    async checkIP() {
        try {
            const response = await fetch(`${this.apiBase}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'check-ip'
                })
            });
            
            const data = await response.json();
            
            return {
                success: true,
                ip: data.ip,
                allowed: data.allowed,
                whitelist: data.whitelist
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Get admin info (for debugging)
    async getAdminInfo() {
        try {
            const response = await fetch(`${this.apiBase}/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'admin-info'
                })
            });
            
            const data = await response.json();
            
            return {
                success: true,
                data: data
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
window.authManager = new AuthManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
