/**
 * TeleBot Pro v2.0.0 - Main Application
 * Main entry point and application controller
 */

class TeleBotApp {
    constructor() {
        this.currentSection = 'dashboard';
        this.isInitialized = false;
        this.sessionTimer = null;
        this.updateIntervals = [];
        this.apiStatus = {
            auth: 'unknown',
            botControl: 'unknown',
            telegram: 'unknown',
            terminal: 'unknown'
        };
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('🚀 TeleBot Pro v2.0.0 Initializing...');
        
        // Initialize all managers dengan fallback
        this.initializeManagers();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup session timer
        this.setupSessionTimer();
        
        // Setup periodic updates
        this.setupPeriodicUpdates();
        
        // Check API status
        this.checkAPIStatus();
        
        this.isInitialized = true;
        console.log('✅ TeleBot Pro v2.0.0 Initialized');
        
        // Emit initialized event
        this.emitEvent('initialized');
    }
    
    // Initialize all managers dengan fallback yang aman - FIXED VERSION
    initializeManagers() {
        console.log('🔄 Initializing managers...');
        
        // Create global namespace if it doesn't exist
        if (!window.managers) {
            window.managers = {};
        }
        
        // Auth Manager
        if (!window.authManager) {
            console.warn('⚠️ Auth manager not found - creating fallback');
            window.authManager = this.createFallbackAuthManager();
            window.managers.auth = window.authManager;
        } else {
            console.log('✅ Auth manager loaded');
            window.managers.auth = window.authManager;
        }
        
        // Bot Manager
        if (!window.botManager) {
            console.warn('⚠️ Bot manager not found - creating fallback');
            window.botManager = this.createFallbackBotManager();
            window.managers.bot = window.botManager;
        } else {
            console.log('✅ Bot manager loaded');
            window.managers.bot = window.botManager;
        }
        
        // Telegram Manager
        if (!window.telegramManager) {
            console.warn('⚠️ Telegram manager not found - creating fallback');
            window.telegramManager = this.createFallbackTelegramManager();
            window.managers.telegram = window.telegramManager;
        } else {
            console.log('✅ Telegram manager loaded');
            window.managers.telegram = window.telegramManager;
        }
        
        // Terminal Manager
        if (!window.terminalManager) {
            console.warn('⚠️ Terminal manager not found - creating fallback');
            window.terminalManager = this.createFallbackTerminalManager();
            window.managers.terminal = window.terminalManager;
        } else {
            console.log('✅ Terminal manager loaded');
            window.managers.terminal = window.terminalManager;
        }
        
        // UserBot Manager
        if (!window.userBotManager) {
            console.warn('⚠️ UserBot manager not found - creating fallback');
            window.userBotManager = this.createFallbackUserBotManager();
            window.managers.userBot = window.userBotManager;
        } else {
            console.log('✅ UserBot manager loaded');
            window.managers.userBot = window.userBotManager;
        }
        
        // UI Components - FIXED: Gunakan console.warn bukan console.error
        console.log('🔍 Checking for UI components...');
        
        let uiComponentsFound = null;
        
        // Cari UI components di beberapa kemungkinan lokasi
        if (window.uiComponents) {
            uiComponentsFound = window.uiComponents;
            console.log('✅ Found UI components as window.uiComponents');
        } else if (window.UIComponents) {
            uiComponentsFound = window.UIComponents;
            console.log('✅ Found UI components as window.UIComponents');
        } else if (window.uiManager) {
            uiComponentsFound = window.uiManager;
            console.log('✅ Found UI components as window.uiManager');
        } else if (window.components && window.components.ui) {
            uiComponentsFound = window.components.ui;
            console.log('✅ Found UI components as window.components.ui');
        }
        
        if (uiComponentsFound) {
            window.uiComponents = uiComponentsFound;
            window.managers.ui = uiComponentsFound;
            console.log('✅ UI components loaded from existing source');
        } else {
            console.warn('⚠️ UI components not found - creating fallback');
            window.uiComponents = this.createFallbackUIComponents();
            window.managers.ui = window.uiComponents;
        }
        
        // Initialize UI components jika ada
        if (window.uiComponents) {
            console.log('🔧 Initializing UI components...');
            
            // Coba berbagai metode initialize
            const initMethods = ['initializeAll', 'init', 'initialize', 'setup'];
            let initialized = false;
            
            for (const method of initMethods) {
                if (typeof window.uiComponents[method] === 'function') {
                    try {
                        console.log(`🔧 Trying ${method}()...`);
                        window.uiComponents[method]();
                        console.log(`✅ UI components initialized via ${method}()`);
                        initialized = true;
                        break;
                    } catch (error) {
                        console.warn(`⚠️ ${method}() failed:`, error.message);
                    }
                }
            }
            
            if (!initialized) {
                console.warn('⚠️ No valid initialization method found, creating basic UI');
                this.setupBasicUI();
            }
        } else {
            console.error('❌ UI components is undefined after creation');
            this.setupBasicUI();
        }
        
        console.log('✅ All managers initialized (some with fallbacks)');
        console.log('📊 Loaded managers:', Object.keys(window.managers));
        
        // Emit event bahwa managers telah diinisialisasi
        this.emitEvent('managers-initialized', window.managers);
    }
    
    // Helper untuk setup UI dasar
    setupBasicUI() {
        console.log('🔧 Setting up basic UI infrastructure...');
        
        try {
            // 1. Pastikan toast container ada
            if (!document.getElementById('toastContainer')) {
                const container = document.createElement('div');
                container.id = 'toastContainer';
                container.className = 'toast-container';
                container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    max-width: 350px;
                `;
                document.body.appendChild(container);
                console.log('✅ Created toast container');
            }
            
            // 2. Pastikan modal container ada
            if (!document.getElementById('modalContainer')) {
                const modalContainer = document.createElement('div');
                modalContainer.id = 'modalContainer';
                modalContainer.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    display: none;
                `;
                document.body.appendChild(modalContainer);
                console.log('✅ Created modal container');
            }
            
            // 3. Setup tema dasar
            if (!localStorage.getItem('theme')) {
                const prefersDark = window.matchMedia && 
                    window.matchMedia('(prefers-color-scheme: dark)').matches;
                localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
            }
            
            // 4. Apply tema
            const theme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', theme);
            
            console.log('✅ Basic UI setup complete');
            
        } catch (error) {
            console.error('❌ Failed to setup basic UI:', error);
        }
    }
    
    // Create fallback auth manager
    createFallbackAuthManager() {
        const fallbackAuth = {
            // Authentication methods
            isAuthenticated: () => {
                // Check localStorage for token
                const token = localStorage.getItem('auth_token');
                const expiry = localStorage.getItem('auth_expiry');
                return token && expiry && new Date(expiry) > new Date();
            },
            
            login: async (username, password, clientIP = null) => {
                console.log('Fallback login attempt:', username);
                
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check for demo credentials
                if (username === 'admin' && password === 'admin123') {
                    // Create fake token
                    const token = 'fallback_token_' + Date.now();
                    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                    
                    // Store in localStorage
                    localStorage.setItem('auth_token', token);
                    localStorage.setItem('auth_expiry', expiry.toISOString());
                    localStorage.setItem('auth_user', JSON.stringify({
                        username: 'admin',
                        role: 'administrator'
                    }));
                    
                    return {
                        success: true,
                        token: token,
                        user: { username: 'admin', role: 'administrator' },
                        sessionId: 'session_' + Date.now()
                    };
                }
                
                return {
                    success: false,
                    error: 'Invalid credentials. Try admin/admin123'
                };
            },
            
            logout: async () => {
                // Clear localStorage
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_expiry');
                localStorage.removeItem('auth_user');
                return { success: true };
            },
            
            getAuthHeaders: () => {
                const token = localStorage.getItem('auth_token');
                return token ? { Authorization: `Bearer ${token}` } : {};
            },
            
            verifyToken: async () => {
                const token = localStorage.getItem('auth_token');
                const expiry = localStorage.getItem('auth_expiry');
                
                if (!token || !expiry) {
                    return { valid: false, reason: 'No token found' };
                }
                
                if (new Date(expiry) <= new Date()) {
                    return { valid: false, reason: 'Token expired' };
                }
                
                return { valid: true, expiresAt: new Date(expiry) };
            },
            
            refreshToken: async () => {
                // In fallback mode, just extend the expiry
                const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
                localStorage.setItem('auth_expiry', expiry.toISOString());
                return { success: true, newExpiry: expiry };
            },
            
            getUser: () => {
                const userStr = localStorage.getItem('auth_user');
                if (userStr) {
                    try {
                        return JSON.parse(userStr);
                    } catch (e) {
                        return null;
                    }
                }
                return null;
            },
            
            getSessionInfo: () => {
                const expiry = localStorage.getItem('auth_expiry');
                if (!expiry) return null;
                
                const expiryDate = new Date(expiry);
                const now = new Date();
                const timeLeft = expiryDate.getTime() - now.getTime();
                
                // Format time left
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                return {
                    expiresAt: expiryDate,
                    timeLeft: timeLeft,
                    timeLeftFormatted: `${hours}h ${minutes}m ${seconds}s`,
                    isValid: timeLeft > 0
                };
            }
        };
        
        return fallbackAuth;
    }
    
    // Create fallback bot manager
    createFallbackBotManager() {
        const fallbackBot = {
            // Bot data
            bots: [
                {
                    id: 'bot_1',
                    name: 'Sample Bot 1',
                    status: 'stopped',
                    token: 'hidden',
                    webhookUrl: '',
                    stats: { messagesSent: 0, users: 0 }
                },
                {
                    id: 'bot_2',
                    name: 'Sample Bot 2',
                    status: 'stopped',
                    token: 'hidden',
                    webhookUrl: '',
                    stats: { messagesSent: 0, users: 0 }
                }
            ],
            
            // Methods
            getAllBots: () => {
                return fallbackBot.bots;
            },
            
            listBots: async () => {
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 500));
                return {
                    success: true,
                    bots: fallbackBot.bots,
                    total: fallbackBot.bots.length
                };
            },
            
            getBot: (id) => {
                return fallbackBot.bots.find(bot => bot.id === id);
            },
            
            createBot: async (name, token) => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const newBot = {
                    id: 'bot_' + Date.now(),
                    name: name,
                    token: token,
                    status: 'stopped',
                    webhookUrl: '',
                    createdAt: new Date().toISOString(),
                    stats: { messagesSent: 0, users: 0 }
                };
                
                fallbackBot.bots.push(newBot);
                
                return {
                    success: true,
                    bot: newBot,
                    message: 'Bot created (fallback mode)'
                };
            },
            
            startBot: async (id) => {
                const bot = fallbackBot.bots.find(b => b.id === id);
                if (bot) {
                    bot.status = 'running';
                    await new Promise(resolve => setTimeout(resolve, 800));
                    return { success: true, message: 'Bot started (fallback mode)' };
                }
                return { success: false, error: 'Bot not found' };
            },
            
            stopBot: async (id) => {
                const bot = fallbackBot.bots.find(b => b.id === id);
                if (bot) {
                    bot.status = 'stopped';
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return { success: true, message: 'Bot stopped (fallback mode)' };
                }
                return { success: false, error: 'Bot not found' };
            },
            
            deleteBot: async (id) => {
                const index = fallbackBot.bots.findIndex(b => b.id === id);
                if (index !== -1) {
                    fallbackBot.bots.splice(index, 1);
                    await new Promise(resolve => setTimeout(resolve, 300));
                    return { success: true, message: 'Bot deleted (fallback mode)' };
                }
                return { success: false, error: 'Bot not found' };
            },
            
            startAllBots: async () => {
                const results = [];
                for (const bot of fallbackBot.bots) {
                    if (bot.status !== 'running') {
                        bot.status = 'running';
                        results.push({ botId: bot.id, success: true });
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
                return results;
            },
            
            stopAllBots: async () => {
                const results = [];
                for (const bot of fallbackBot.bots) {
                    if (bot.status === 'running') {
                        bot.status = 'stopped';
                        results.push({ botId: bot.id, success: true });
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }
                return results;
            },
            
            updateBotStats: async (id, stats) => {
                const bot = fallbackBot.bots.find(b => b.id === id);
                if (bot) {
                    bot.stats = { ...bot.stats, ...stats };
                    return { success: true };
                }
                return { success: false };
            },
            
            cleanup: () => {
                console.log('Fallback bot manager cleanup');
                fallbackBot.bots = [];
            }
        };
        
        return fallbackBot;
    }
    
    // Create fallback telegram manager
    createFallbackTelegramManager() {
        const fallbackTelegram = {
            // Session data
            sessions: [
                {
                    id: 'session_1',
                    name: 'Personal Account',
                    phone: '+1234567890',
                    status: 'disconnected',
                    lastActive: null,
                    userId: 123456789
                }
            ],
            
            // Methods
            getAllSessions: () => {
                return fallbackTelegram.sessions;
            },
            
            getSessionStatus: async (sessionId) => {
                const session = fallbackTelegram.sessions.find(s => s.id === sessionId);
                if (session) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                    return {
                        success: true,
                        session: session,
                        isConnected: session.status === 'connected'
                    };
                }
                return { success: false, error: 'Session not found' };
            },
            
            connectSession: async (sessionId) => {
                const session = fallbackTelegram.sessions.find(s => s.id === sessionId);
                if (session) {
                    session.status = 'connected';
                    session.lastActive = new Date().toISOString();
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    return {
                        success: true,
                        message: 'Session connected (fallback mode)'
                    };
                }
                return { success: false, error: 'Session not found' };
            },
            
            disconnectSession: async (sessionId) => {
                const session = fallbackTelegram.sessions.find(s => s.id === sessionId);
                if (session) {
                    session.status = 'disconnected';
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return {
                        success: true,
                        message: 'Session disconnected (fallback mode)'
                    };
                }
                return { success: false, error: 'Session not found' };
            },
            
            createSession: async (phoneNumber) => {
                const newSession = {
                    id: 'session_' + Date.now(),
                    name: 'Session ' + phoneNumber,
                    phone: phoneNumber,
                    status: 'disconnected',
                    lastActive: null,
                    userId: Math.floor(Math.random() * 1000000000),
                    createdAt: new Date().toISOString()
                };
                
                fallbackTelegram.sessions.push(newSession);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                return {
                    success: true,
                    session: newSession,
                    message: 'Session created (fallback mode)'
                };
            },
            
            deleteSession: async (sessionId) => {
                const index = fallbackTelegram.sessions.findIndex(s => s.id === sessionId);
                if (index !== -1) {
                    fallbackTelegram.sessions.splice(index, 1);
                    await new Promise(resolve => setTimeout(resolve, 300));
                    return { success: true, message: 'Session deleted (fallback mode)' };
                }
                return { success: false, error: 'Session not found' };
            },
            
            getSessionInfo: async (sessionId) => {
                const session = fallbackTelegram.sessions.find(s => s.id === sessionId);
                if (session) {
                    // Simulate getting user info
                    const userInfo = {
                        id: session.userId,
                        firstName: 'Test',
                        lastName: 'User',
                        username: 'test_user',
                        phone: session.phone,
                        isBot: false
                    };
                    
                    return {
                        success: true,
                        user: userInfo,
                        session: session
                    };
                }
                return { success: false, error: 'Session not found' };
            },
            
            cleanup: () => {
                console.log('Fallback telegram manager cleanup');
                fallbackTelegram.sessions = [];
            }
        };
        
        return fallbackTelegram;
    }
    
    // Create fallback terminal manager
    createFallbackTerminalManager() {
        const fallbackTerminal = {
            terminalOutput: null,
            commandInput: null,
            commandHistory: [],
            historyIndex: -1,
            
            setTerminalElements: (output, input) => {
                fallbackTerminal.terminalOutput = output;
                fallbackTerminal.commandInput = input;
                
                // Setup input event listeners
                if (input) {
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            fallbackTerminal.executeCommand();
                        } else if (e.key === 'ArrowUp') {
                            fallbackTerminal.navigateHistory(-1);
                            e.preventDefault();
                        } else if (e.key === 'ArrowDown') {
                            fallbackTerminal.navigateHistory(1);
                            e.preventDefault();
                        }
                    });
                }
                
                // Add welcome message
                if (output) {
                    const welcomeMsg = `
╔═══════════════════════════════════════════════════════╗
║      TeleBot Pro Terminal (Fallback Mode)            ║
║      Type 'help' for available commands              ║
╚═══════════════════════════════════════════════════════╝
`;
                    this.appendToTerminal(welcomeMsg, 'system');
                }
            },
            
            executeCommand: async () => {
                if (!fallbackTerminal.commandInput || !fallbackTerminal.terminalOutput) {
                    console.error('Terminal elements not set');
                    return { success: false };
                }
                
                const command = fallbackTerminal.commandInput.value.trim();
                if (!command) return { success: false };
                
                // Add to history
                fallbackTerminal.commandHistory.unshift(command);
                if (fallbackTerminal.commandHistory.length > 50) {
                    fallbackTerminal.commandHistory.pop();
                }
                fallbackTerminal.historyIndex = -1;
                
                // Show command in terminal
                fallbackTerminal.appendToTerminal(`$ ${command}`, 'command');
                
                // Clear input
                fallbackTerminal.commandInput.value = '';
                
                // Process command
                const result = await fallbackTerminal.processCommand(command);
                
                return { success: true, result: result };
            },
            
            processCommand: async (command) => {
                const cmd = command.toLowerCase().split(' ')[0];
                const args = command.slice(cmd.length).trim();
                
                // Simulate processing delay
                await new Promise(resolve => setTimeout(resolve, 200));
                
                switch (cmd) {
                    case 'help':
                        const helpText = `
Available commands:
• help - Show this help message
• status - Show system status
• bots - List all bots
• sessions - List Telegram sessions
• clear - Clear terminal
• echo [text] - Echo text back
• time - Show current time
• date - Show current date
• ping - Test connection
• ls - List files (simulated)
• pwd - Print working directory
• whoami - Show current user
`;
                        fallbackTerminal.appendToTerminal(helpText, 'output');
                        break;
                        
                    case 'status':
                        const statusText = `
System Status (Fallback Mode):
• Authentication: ${window.authManager.isAuthenticated() ? 'Authenticated' : 'Not authenticated'}
• Bots: ${window.botManager.getAllBots().length} total
• Telegram Sessions: ${window.telegramManager.getAllSessions().length} total
• API Status: Fallback mode active
• Connection: Online
`;
                        fallbackTerminal.appendToTerminal(statusText, 'output');
                        break;
                        
                    case 'bots':
                        const bots = window.botManager.getAllBots();
                        if (bots.length === 0) {
                            fallbackTerminal.appendToTerminal('No bots configured', 'output');
                        } else {
                            let botList = 'Configured Bots:\n';
                            bots.forEach(bot => {
                                botList += `• ${bot.name} (${bot.id}) - ${bot.status}\n`;
                            });
                            fallbackTerminal.appendToTerminal(botList, 'output');
                        }
                        break;
                        
                    case 'sessions':
                        const sessions = window.telegramManager.getAllSessions();
                        if (sessions.length === 0) {
                            fallbackTerminal.appendToTerminal('No Telegram sessions', 'output');
                        } else {
                            let sessionList = 'Telegram Sessions:\n';
                            sessions.forEach(session => {
                                sessionList += `• ${session.name} (${session.phone}) - ${session.status}\n`;
                            });
                            fallbackTerminal.appendToTerminal(sessionList, 'output');
                        }
                        break;
                        
                    case 'clear':
                        if (fallbackTerminal.terminalOutput) {
                            fallbackTerminal.terminalOutput.innerHTML = '';
                        }
                        break;
                        
                    case 'echo':
                        fallbackTerminal.appendToTerminal(args, 'output');
                        break;
                        
                    case 'time':
                        const time = new Date().toLocaleTimeString();
                        fallbackTerminal.appendToTerminal(`Current time: ${time}`, 'output');
                        break;
                        
                    case 'date':
                        const date = new Date().toLocaleDateString();
                        fallbackTerminal.appendToTerminal(`Current date: ${date}`, 'output');
                        break;
                        
                    case 'ping':
                        fallbackTerminal.appendToTerminal('pong', 'output');
                        break;
                        
                    case 'ls':
                        fallbackTerminal.appendToTerminal('README.md\npackage.json\nindex.html\napp.js\nstyles.css', 'output');
                        break;
                        
                    case 'pwd':
                        fallbackTerminal.appendToTerminal('/home/telebot', 'output');
                        break;
                        
                    case 'whoami':
                        const user = window.authManager.getUser();
                        fallbackTerminal.appendToTerminal(
                            user ? `User: ${user.username}` : 'Not logged in', 
                            'output'
                        );
                        break;
                        
                    default:
                        fallbackTerminal.appendToTerminal(
                            `Command not found: ${cmd}. Type 'help' for available commands.`,
                            'error'
                        );
                }
            },
            
            appendToTerminal: (text, type = 'output') => {
                if (!fallbackTerminal.terminalOutput) return;
                
                const line = document.createElement('div');
                line.className = `terminal-line terminal-${type}`;
                line.textContent = text;
                
                fallbackTerminal.terminalOutput.appendChild(line);
                
                // Auto scroll to bottom
                fallbackTerminal.terminalOutput.scrollTop = fallbackTerminal.terminalOutput.scrollHeight;
            },
            
            navigateHistory: (direction) => {
                if (!fallbackTerminal.commandInput) return;
                
                if (direction === -1) { // Up
                    if (fallbackTerminal.historyIndex < fallbackTerminal.commandHistory.length - 1) {
                        fallbackTerminal.historyIndex++;
                        fallbackTerminal.commandInput.value = fallbackTerminal.commandHistory[fallbackTerminal.historyIndex];
                    }
                } else { // Down
                    if (fallbackTerminal.historyIndex > 0) {
                        fallbackTerminal.historyIndex--;
                        fallbackTerminal.commandInput.value = fallbackTerminal.commandHistory[fallbackTerminal.historyIndex];
                    } else if (fallbackTerminal.historyIndex === 0) {
                        fallbackTerminal.historyIndex = -1;
                        fallbackTerminal.commandInput.value = '';
                    }
                }
            },
            
            clearTerminal: () => {
                if (fallbackTerminal.terminalOutput) {
                    fallbackTerminal.terminalOutput.innerHTML = '';
                }
            },
            
            copyOutput: () => {
                if (!fallbackTerminal.terminalOutput) return;
                
                const text = fallbackTerminal.terminalOutput.textContent;
                navigator.clipboard.writeText(text)
                    .then(() => {
                        // Gunakan fallback jika uiComponents tidak ada
                        if (window.uiComponents && typeof window.uiComponents.showToast === 'function') {
                            window.uiComponents.showToast('Terminal output copied to clipboard', 'success');
                        } else {
                            console.log('✅ Terminal output copied to clipboard');
                        }
                    })
                    .catch(err => {
                        console.error('Failed to copy:', err);
                    });
            },
            
            downloadOutput: () => {
                if (!fallbackTerminal.terminalOutput) return;
                
                const text = fallbackTerminal.terminalOutput.textContent;
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `terminal-output-${new Date().toISOString().slice(0, 10)}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                // Gunakan fallback jika uiComponents tidak ada
                if (window.uiComponents && typeof window.uiComponents.showToast === 'function') {
                    window.uiComponents.showToast('Terminal output downloaded', 'success');
                } else {
                    console.log('✅ Terminal output downloaded');
                }
            },
            
            toggleFullscreen: () => {
                const terminalContainer = document.querySelector('.terminal-container');
                if (terminalContainer) {
                    if (!document.fullscreenElement) {
                        terminalContainer.requestFullscreen().catch(err => {
                            console.error('Error attempting to enable fullscreen:', err);
                        });
                    } else {
                        document.exitFullscreen();
                    }
                }
            },
            
            showHistory: () => {
                if (fallbackTerminal.commandHistory.length === 0) {
                    fallbackTerminal.appendToTerminal('No command history', 'output');
                } else {
                    let historyText = 'Command History:\n';
                    fallbackTerminal.commandHistory.slice(0, 20).forEach((cmd, index) => {
                        historyText += `${index + 1}. ${cmd}\n`;
                    });
                    fallbackTerminal.appendToTerminal(historyText, 'output');
                }
            },
            
            showHelp: () => {
                fallbackTerminal.processCommand('help');
            },
            
            focusInput: () => {
                if (fallbackTerminal.commandInput) {
                    fallbackTerminal.commandInput.focus();
                }
            },
            
            cleanup: () => {
                console.log('Fallback terminal manager cleanup');
                fallbackTerminal.terminalOutput = null;
                fallbackTerminal.commandInput = null;
                fallbackTerminal.commandHistory = [];
                fallbackTerminal.historyIndex = -1;
            }
        };
        
        return fallbackTerminal;
    }
    
    // Create fallback userBot manager
    createFallbackUserBotManager() {
        const fallbackUserBot = {
            autoTextJobs: new Map(),
            
            showUserBotInterface: () => {
                console.log('UserBot interface (fallback mode)');
                this.switchSection('telegram');
                this.showToast('UserBot interface loaded in fallback mode', 'info');
            },
            
            showAutoTextInterface: () => {
                console.log('AutoText interface (fallback mode)');
                this.switchSection('auto-text');
                this.showToast('AutoText interface loaded in fallback mode', 'info');
            },
            
            createAutoTextJob: async (config) => {
                const jobId = 'job_' + Date.now();
                const job = {
                    id: jobId,
                    name: config.name || 'AutoText Job',
                    status: 'stopped',
                    config: config,
                    messagesSent: 0,
                    errors: 0,
                    createdAt: new Date().toISOString(),
                    lastRun: null
                };
                
                fallbackUserBot.autoTextJobs.set(jobId, job);
                
                return {
                    success: true,
                    jobId: jobId,
                    message: 'AutoText job created (fallback mode)'
                };
            },
            
            startAutoTextJob: async (jobId) => {
                const job = fallbackUserBot.autoTextJobs.get(jobId);
                if (job) {
                    job.status = 'running';
                    job.lastRun = new Date().toISOString();
                    
                    // Simulate sending messages
                    setTimeout(() => {
                        if (job.status === 'running') {
                            job.messagesSent += 5;
                            console.log(`AutoText job ${jobId} sent 5 messages`);
                        }
                    }, 3000);
                    
                    return {
                        success: true,
                        message: 'AutoText job started (fallback mode)'
                    };
                }
                return { success: false, error: 'Job not found' };
            },
            
            stopAutoTextJob: async (jobId) => {
                const job = fallbackUserBot.autoTextJobs.get(jobId);
                if (job) {
                    job.status = 'stopped';
                    return {
                        success: true,
                        message: 'AutoText job stopped (fallback mode)'
                    };
                }
                return { success: false, error: 'Job not found' };
            },
            
            getAutoTextJobs: () => {
                return Array.from(fallbackUserBot.autoTextJobs.values());
            },
            
            cleanup: () => {
                console.log('Fallback userBot manager cleanup');
                fallbackUserBot.autoTextJobs.clear();
            }
        };
        
        return fallbackUserBot;
    }
    
    // Create fallback UI components - IMPROVED VERSION
    createFallbackUIComponents() {
        const fallbackUI = {
            // Toast system
            toasts: [],
            toastContainer: null,
            
            initializeAll: () => {
                console.log('Initializing fallback UI components');
                
                try {
                    // Create toast container if it doesn't exist
                    if (!document.getElementById('toastContainer')) {
                        const container = document.createElement('div');
                        container.id = 'toastContainer';
                        container.className = 'toast-container';
                        container.style.cssText = `
                            position: fixed;
                            top: 20px;
                            right: 20px;
                            z-index: 9999;
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                            max-width: 350px;
                        `;
                        document.body.appendChild(container);
                        fallbackUI.toastContainer = container;
                        console.log('✅ Created toast container');
                    } else {
                        fallbackUI.toastContainer = document.getElementById('toastContainer');
                    }
                    
                    // Setup tema
                    if (!localStorage.getItem('theme')) {
                        const prefersDark = window.matchMedia && 
                            window.matchMedia('(prefers-color-scheme: dark)').matches;
                        localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
                    }
                    
                    const theme = localStorage.getItem('theme') || 'light';
                    document.documentElement.setAttribute('data-theme', theme);
                    
                    console.log('✅ Fallback UI components initialized');
                    
                } catch (error) {
                    console.error('❌ Error initializing fallback UI components:', error);
                }
            },
            
            showToast: (message, type = 'info') => {
                console.log(`[${type.toUpperCase()}] ${message}`);
                
                // Create toast element
                const toast = document.createElement('div');
                toast.className = `toast toast-${type}`;
                toast.style.cssText = `
                    background: ${type === 'success' ? '#10b981' : 
                                 type === 'error' ? '#ef4444' : 
                                 type === 'warning' ? '#f59e0b' : '#3b82f6'};
                    color: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    animation: slideIn 0.3s ease;
                `;
                
                // Add CSS animation jika belum ada
                if (!document.getElementById('toastStyles')) {
                    const style = document.createElement('style');
                    style.id = 'toastStyles';
                    style.textContent = `
                        @keyframes slideIn {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                        @keyframes slideOut {
                            from { transform: translateX(0); opacity: 1; }
                            to { transform: translateX(100%); opacity: 0; }
                        }
                        .toast-exit {
                            animation: slideOut 0.3s ease forwards;
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                const iconMap = {
                    'success': 'fa-check-circle',
                    'error': 'fa-exclamation-circle',
                    'warning': 'fa-exclamation-triangle',
                    'info': 'fa-info-circle'
                };
                
                toast.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas ${iconMap[type] || 'fa-info-circle'}" style="font-size: 18px;"></i>
                        <span style="flex: 1;">${message}</span>
                    </div>
                    <button onclick="this.parentElement.style.animation='slideOut 0.3s ease forwards'; setTimeout(() => this.parentElement.remove(), 300)" 
                            style="background: none; border: none; color: white; cursor: pointer; padding: 4px 8px; margin-left: 10px;">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                // Add to container
                if (fallbackUI.toastContainer) {
                    fallbackUI.toastContainer.appendChild(toast);
                } else {
                    // Fallback: append to body
                    toast.style.position = 'fixed';
                    toast.style.top = '20px';
                    toast.style.right = '20px';
                    toast.style.zIndex = '9999';
                    document.body.appendChild(toast);
                }
                
                // Auto remove after 5 seconds
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.style.animation = 'slideOut 0.3s ease forwards';
                        setTimeout(() => {
                            if (toast.parentNode) {
                                toast.remove();
                            }
                        }, 300);
                    }
                }, 5000);
                
                return toast;
            },
            
            getToastIcon: (type) => {
                switch (type) {
                    case 'success': return 'check-circle';
                    case 'error': return 'exclamation-circle';
                    case 'warning': return 'exclamation-triangle';
                    case 'info': return 'info-circle';
                    default: return 'info-circle';
                }
            },
            
            toggleSidebar: () => {
                const sidebar = document.querySelector('.sidebar');
                const mainContent = document.querySelector('.main-content');
                if (sidebar && mainContent) {
                    sidebar.classList.toggle('collapsed');
                    mainContent.classList.toggle('expanded');
                }
            },
            
            toggleTheme: () => {
                const currentTheme = fallbackUI.getCurrentTheme();
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                
                // Dispatch theme change event
                document.dispatchEvent(new CustomEvent('theme-change', { detail: newTheme }));
                
                fallbackUI.showToast(`Theme changed to ${newTheme} mode`, 'info');
            },
            
            getCurrentTheme: () => {
                return localStorage.getItem('theme') || 
                       (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            },
            
            addNotification: (title, message, type = 'info', data = null) => {
                console.log(`[NOTIFICATION ${type}] ${title}: ${message}`);
                
                const notificationsPanel = document.getElementById('notificationsPanel');
                if (!notificationsPanel) return;
                
                const notification = document.createElement('div');
                notification.className = `notification notification-${type}`;
                notification.innerHTML = `
                    <div class="notification-header">
                        <span class="notification-title">${title}</span>
                        <span class="notification-time">Just now</span>
                    </div>
                    <div class="notification-body">
                        ${message}
                    </div>
                `;
                
                const notificationsList = notificationsPanel.querySelector('.notifications-list');
                if (notificationsList) {
                    notificationsList.insertBefore(notification, notificationsList.firstChild);
                    
                    // Limit to 10 notifications
                    const allNotifications = notificationsList.querySelectorAll('.notification');
                    if (allNotifications.length > 10) {
                        allNotifications[allNotifications.length - 1].remove();
                    }
                    
                    // Update badge
                    const badge = document.getElementById('notificationBadge');
                    if (badge) {
                        const count = parseInt(badge.textContent) || 0;
                        badge.textContent = count + 1;
                        badge.style.display = 'flex';
                    }
                }
            },
            
            showModal: (id, options) => {
                console.log(`Showing modal: ${id}`, options);
                
                // Create modal container if it doesn't exist
                let modalContainer = document.getElementById('modalContainer');
                if (!modalContainer) {
                    modalContainer = document.createElement('div');
                    modalContainer.id = 'modalContainer';
                    modalContainer.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 10000;
                        display: none;
                    `;
                    document.body.appendChild(modalContainer);
                }
                
                // Create modal
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.id = id + 'Modal';
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                const sizeClass = options.size || 'medium';
                
                modal.innerHTML = `
                    <div class="modal-overlay" onclick="document.getElementById('${id}Modal').remove()" style="
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.5);
                    "></div>
                    <div class="modal-content modal-${sizeClass}" style="
                        background: white;
                        border-radius: 8px;
                        padding: 20px;
                        max-width: ${sizeClass === 'small' ? '400px' : sizeClass === 'large' ? '800px' : '600px'};
                        width: 90%;
                        max-height: 80vh;
                        overflow-y: auto;
                        position: relative;
                        z-index: 10002;
                    ">
                        <div class="modal-header" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            margin-bottom: 15px;
                            border-bottom: 1px solid #eee;
                            padding-bottom: 10px;
                        ">
                            <h3 style="margin: 0;">${options.title || 'Modal'}</h3>
                            <button class="modal-close" onclick="document.getElementById('${id}Modal').remove()" style="
                                background: none;
                                border: none;
                                font-size: 20px;
                                cursor: pointer;
                            ">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            ${options.content || 'No content provided'}
                        </div>
                        ${options.footer ? `
                        <div class="modal-footer" style="
                            margin-top: 20px;
                            border-top: 1px solid #eee;
                            padding-top: 15px;
                            display: flex;
                            justify-content: flex-end;
                            gap: 10px;
                        ">
                            ${options.footer}
                        </div>
                        ` : ''}
                    </div>
                `;
                
                modalContainer.innerHTML = '';
                modalContainer.appendChild(modal);
                modalContainer.style.display = 'block';
                
                return modal;
            }
        };
        
        // Initialize immediately
        setTimeout(() => {
            fallbackUI.initializeAll();
        }, 100);
        
        return fallbackUI;
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }
        
        console.log('✅ Event listeners setup complete');
    }
    
    // Handle login
    async handleLogin() {
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        const loginBtn = document.getElementById('loginBtn');
        const errorElement = document.getElementById('loginError');
        
        if (!username || !password) {
            this.showToast('Please enter username and password', 'error');
            return;
        }
        
        // Show loading state
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
            loginBtn.disabled = true;
        }
        
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        try {
            // Get client IP (optional in fallback mode)
            let clientIP = null;
            if (window.authManager && typeof window.authManager.login === 'function' && 
                window.authManager.login.length >= 3) { // Check if login expects 3 parameters
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    clientIP = ipData.ip;
                } catch (error) {
                    console.warn('Failed to get IP:', error);
                }
            }
            
            // Attempt login
            const result = await window.authManager.login(username, password, clientIP);
            
            if (result.success) {
                // Login successful
                this.showToast('Login successful!', 'success');
                
                // Hide login screen, show main panel
                this.showMainPanel();
                
                // Switch to dashboard
                this.switchSection('dashboard');
                
                // Update UI
                this.updateUserInfo();
                this.updateSystemStats();
                this.updateBotStatus();
                
                // Add login notification
                if (window.uiComponents && typeof window.uiComponents.addNotification === 'function') {
                    window.uiComponents.addNotification(
                        'Login Successful',
                        `User ${username} logged in${clientIP ? ` from ${clientIP}` : ''}`,
                        'success',
                        { username, ip: clientIP }
                    );
                }
                
            } else {
                // Login failed
                if (errorElement) {
                    document.getElementById('errorMessage').textContent = result.error;
                    errorElement.style.display = 'block';
                }
                this.showToast(`Login failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            if (errorElement) {
                document.getElementById('errorMessage').textContent = 'Network error. Please check your connection.';
                errorElement.style.display = 'block';
            }
            this.showToast('Network error. Please check your connection.', 'error');
        } finally {
            // Reset button state
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                loginBtn.disabled = false;
            }
        }
    }
    
    // Show main panel
    showMainPanel() {
        const loginScreen = document.getElementById('loginScreen');
        const mainPanel = document.getElementById('mainPanel');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainPanel) mainPanel.style.display = 'flex';
        
        // Update theme icon
        this.updateThemeIcon();
        
        // Apply theme from localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
        
        // Focus on first interactive element
        setTimeout(() => {
            const firstInteractive = document.querySelector('.nav-link.active, .section-header button');
            if (firstInteractive) {
                firstInteractive.focus();
            }
        }, 100);
    }
    
    // Helper method untuk showToast
    showToast(message, type = 'info') {
        // Gunakan uiComponents jika ada
        if (window.uiComponents && typeof window.uiComponents.showToast === 'function') {
            window.uiComponents.showToast(message, type);
        } else {
            // Fallback: log ke console
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // Helper method untuk emit event
    emitEvent(eventName, data = null) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
    }
    
    // Tambahkan method-method yang dibutuhkan (dummy implementation)
    switchSection(section) {
        this.currentSection = section;
        console.log(`Switched to section: ${section}`);
    }
    
    updateUserInfo() {
        console.log('Updating user info...');
    }
    
    updateSystemStats() {
        console.log('Updating system stats...');
    }
    
    updateBotStatus() {
        console.log('Updating bot status...');
    }
    
    updateThemeIcon() {
        console.log('Updating theme icon...');
    }
    
    setupSessionTimer() {
        console.log('Setting up session timer...');
    }
    
    setupPeriodicUpdates() {
        console.log('Setting up periodic updates...');
    }
    
    checkAPIStatus() {
        console.log('Checking API status...');
    }
}

// Create global instance
window.app = new TeleBotApp();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeleBotApp;
}
