/**
 * TeleBot Pro v2.0.0 - Main Application
 * Entry point for the application
 */

console.log('🚀 TeleBot Pro App Loading...');

// Track initialization state
window.appInitialized = false;

// Wait for all resources to load
window.addEventListener('load', function() {
    console.log('📱 TeleBot Pro App Ready');
    
    // Check if elements exist
    console.log('🔍 Checking required elements...');
    console.log('📝 Login form:', document.getElementById('loginForm') ? 'Found' : 'Not found');
    console.log('🖥️ Main panel:', document.getElementById('mainPanel') ? 'Found' : 'Not found');
    console.log('📊 Dashboard section:', document.getElementById('dashboardSection') ? 'Found' : 'Not found');
    
    // Initialize IP detection
    detectIP();
    
    // Setup basic event listeners
    setupBasicListeners();
});

// IP Detection function
async function detectIP() {
    try {
        console.log('🌐 Detecting IP address...');
        const ipDisplay = document.getElementById('ipDisplay');
        const ipStatus = document.getElementById('ipStatus');
        
        if (ipDisplay) {
            ipDisplay.textContent = 'Detecting...';
        }
        
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        
        console.log('🌐 IP detected:', data.ip);
        if (ipDisplay) {
            ipDisplay.textContent = data.ip;
        }
        if (ipStatus) {
            ipStatus.textContent = 'Detected';
            ipStatus.className = 'status-badge success';
        }
    } catch (error) {
        console.error('❌ IP Detection Error:', error);
        const ipDisplay = document.getElementById('ipDisplay');
        const ipStatus = document.getElementById('ipStatus');
        
        if (ipDisplay) {
            ipDisplay.textContent = 'Failed to detect';
        }
        if (ipStatus) {
            ipStatus.textContent = 'Error';
            ipStatus.className = 'status-badge error';
        }
    }
}

// Setup basic event listeners
function setupBasicListeners() {
    console.log('🔧 Setting up basic event listeners...');
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        console.log('✅ Login form found');
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('🔐 Login form submitted');
            
            const username = document.getElementById('username')?.value;
            const password = document.getElementById('password')?.value;
            const loginBtn = document.getElementById('loginBtn');
            const errorDiv = document.getElementById('loginError');
            
            console.log('👤 Username:', username ? 'provided' : 'missing');
            console.log('🔑 Password:', password ? 'provided' : 'missing');
            
            if (!username || !password) {
                console.warn('⚠️ Missing username or password');
                if (errorDiv) {
                    errorDiv.style.display = 'block';
                    document.getElementById('errorMessage').textContent = 
                        'Please enter username and password';
                }
                return;
            }
            
            // Show loading
            if (loginBtn) {
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                loginBtn.disabled = true;
            }
            
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
            
            // Try to login using auth manager if available
            if (window.authManager && typeof window.authManager.login === 'function') {
                console.log('🔐 Using authManager for login');
                try {
                    // Get IP
                    let clientIP = null;
                    try {
                        const ipResponse = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipResponse.json();
                        clientIP = ipData.ip;
                        console.log('🌐 Client IP:', clientIP);
                    } catch (ipError) {
                        console.warn('Failed to get IP:', ipError);
                    }
                    
                    const result = await window.authManager.login(username, password, clientIP);
                    console.log('🔐 Login result:', result);
                    
                    if (result.success) {
                        handleSuccessfulLogin(result, username, clientIP);
                    } else {
                        handleLoginError(result.error, loginBtn, errorDiv);
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    handleLoginError('Network error. Please check your connection.', loginBtn, errorDiv);
                }
            } else {
                // Fallback if auth manager not available
                console.warn('⚠️ Auth manager not available, using fallback');
                
                // Use simple authentication for demo
                if (username === 'admin' && password === 'TeleBotPro@2024!') {
                    handleSuccessfulLogin({
                        success: true,
                        user: { username: 'admin', role: 'administrator' }
                    }, username, null);
                } else {
                    handleLoginError('Invalid credentials. Use admin/TeleBotPro@2024!', loginBtn, errorDiv);
                }
            }
        });
    } else {
        console.warn('⚠️ Login form not found');
    }
    
    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        console.log('✅ Password toggle found');
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');
            
            if (passwordInput && icon) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                    console.log('👁️ Password shown');
                } else {
                    passwordInput.type = 'password';
                    icon.className = 'fas fa-eye';
                    console.log('👁️ Password hidden');
                }
            }
        });
    }
    
    // Auto login button
    const autoLoginBtn = document.getElementById('autoLoginBtn');
    if (autoLoginBtn) {
        console.log('✅ Auto login button found');
        autoLoginBtn.addEventListener('click', function() {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            
            if (usernameInput) usernameInput.value = 'admin';
            if (passwordInput) passwordInput.value = 'TeleBotPro@2024!';
            console.log('🔑 Auto login credentials filled');
        });
    }
    
    // Refresh IP button
    const refreshIPBtn = document.getElementById('checkIPBtn');
    if (refreshIPBtn) {
        console.log('✅ Refresh IP button found');
        refreshIPBtn.addEventListener('click', detectIP);
    }
    
    console.log('✅ Basic event listeners setup complete');
}

// Handle successful login - VERSI TERUPDATE
function handleSuccessfulLogin(result, username, clientIP) {
    console.log('🎉 Login successful for user:', username);
    
    // Show success
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-check"></i> Login Successful!';
    }
    
    // Hide login screen, show main panel
    const loginScreen = document.getElementById('loginScreen');
    const mainPanel = document.getElementById('mainPanel');
    
    if (loginScreen) {
        loginScreen.style.display = 'none';
        console.log('📱 Login screen hidden');
    }
    if (mainPanel) {
        mainPanel.style.display = 'flex';
        console.log('🖥️ Main panel shown');
    }
    
    // Emit login success event
    if (window.app && window.app.emit) {
        window.app.emit('login:success', { username, clientIP });
    }
    
    // Initialize ALL managers
    initializeAllManagers();
    
    // Setup session timer
    setupSessionTimer();
    
    // Show success toast
    showToast('Login successful! Welcome to TeleBot Pro', 'success');
    
    // Reset button after delay
    setTimeout(() => {
        if (loginBtn) {
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
            loginBtn.disabled = false;
        }
    }, 2000);
}

// Fungsi untuk menginisialisasi semua managers
function initializeAllManagers() {
    console.log('🚀 Initializing all managers...');
    
    // Setup authentication fallback jika authManager tidak ada
    if (!window.authManager) {
        console.warn('⚠️ Auth manager not found, creating fallback');
        window.authManager = {
            isAuthenticated: () => {
                const token = localStorage.getItem('auth_token');
                const expiry = localStorage.getItem('auth_expiry');
                if (!token || !expiry) return false;
                return Date.now() < parseInt(expiry);
            },
            getAuthHeaders: () => {
                const token = localStorage.getItem('auth_token');
                if (!token) return {};
                return {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };
            },
            getUser: () => {
                const user = localStorage.getItem('auth_user');
                return user ? JSON.parse(user) : null;
            },
            login: async (username, password, clientIP) => {
                console.log(`🔐 Fallback login attempt for ${username} from ${clientIP}`);
                // Simulate API call
                return new Promise((resolve) => {
                    setTimeout(() => {
                        if (username === 'admin' && password === 'TeleBotPro@2024!') {
                            const token = 'demo_token_' + Date.now();
                            const user = { username: 'admin', role: 'administrator' };
                            
                            localStorage.setItem('auth_token', token);
                            localStorage.setItem('auth_expiry', Date.now() + 86400000); // 24 jam
                            localStorage.setItem('auth_user', JSON.stringify(user));
                            
                            console.log('✅ Fallback login successful');
                            resolve({
                                success: true,
                                token: token,
                                user: user
                            });
                        } else {
                            console.log('❌ Fallback login failed: invalid credentials');
                            resolve({
                                success: false,
                                error: 'Invalid credentials'
                            });
                        }
                    }, 1000);
                });
            },
            logout: () => {
                console.log('👋 Logging out from fallback auth');
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_expiry');
                localStorage.removeItem('auth_user');
            }
        };
    }
    
    // Initialize UI Components
    if (window.uiComponents && typeof window.uiComponents.init === 'function') {
        try {
            window.uiComponents.init();
            console.log('✅ UI Components initialized');
        } catch (error) {
            console.error('❌ Failed to initialize UI Components:', error);
        }
    } else {
        console.warn('⚠️ UI Components not available, creating fallback');
        window.uiComponents = window.uiComponents || {
            init: () => console.log('📱 Fallback UI Components initialized'),
            switchSection: (sectionId) => {
                console.log(`📱 Fallback switching to section: ${sectionId}`);
                switchSection(sectionId);
            },
            showToast: (message, type) => {
                console.log(`📱 Fallback toast [${type}]: ${message}`);
                showToast(message, type);
            }
        };
    }
    
    // Initialize Bot Manager
    if (window.botManager && typeof window.botManager.init === 'function') {
        try {
            window.botManager.init();
            console.log('✅ Bot Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Bot Manager:', error);
        }
    } else {
        console.warn('⚠️ Bot Manager not available, creating fallback');
        window.botManager = window.botManager || {
            init: () => console.log('🤖 Fallback Bot Manager initialized'),
            getAllBots: () => {
                console.log('🤖 Getting fallback bots');
                return JSON.parse(localStorage.getItem('telebot_bots') || '[]');
            },
            listBots: () => {
                console.log('🤖 Listing fallback bots');
                return Promise.resolve({ 
                    success: true, 
                    bots: JSON.parse(localStorage.getItem('telebot_bots') || '[]') 
                });
            }
        };
    }
    
    // Initialize Telegram Manager
    if (window.telegramManager && typeof window.telegramManager.init === 'function') {
        try {
            window.telegramManager.init();
            console.log('✅ Telegram Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Telegram Manager:', error);
        }
    } else {
        console.warn('⚠️ Telegram Manager not available, creating fallback');
        window.telegramManager = window.telegramManager || {
            init: () => console.log('📱 Fallback Telegram Manager initialized'),
            getAllSessions: () => [],
            getSessionStatus: () => Promise.resolve({ success: false })
        };
    }
    
    // Initialize Terminal Manager
    if (window.terminalManager && typeof window.terminalManager.init === 'function') {
        try {
            window.terminalManager.init();
            console.log('✅ Terminal Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Terminal Manager:', error);
        }
    } else {
        console.warn('⚠️ Terminal Manager not available, creating fallback');
        window.terminalManager = window.terminalManager || {
            init: () => console.log('💻 Fallback Terminal Manager initialized'),
            setTerminalElements: () => {},
            executeCommand: () => Promise.resolve({ success: false })
        };
    }
    
    // Initialize UserBot Manager
    if (window.userBotManager && typeof window.userBotManager.init === 'function') {
        try {
            window.userBotManager.init();
            console.log('✅ UserBot Manager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize UserBot Manager:', error);
        }
    } else {
        console.warn('⚠️ UserBot Manager not available, creating fallback');
        window.userBotManager = window.userBotManager || {
            init: () => console.log('🤖 Fallback UserBot Manager initialized'),
            showUserBotInterface: () => {
                console.log('📱 Showing fallback userbot interface');
                const content = document.getElementById('telegramContent') || document.getElementById('dynamicContent');
                if (content) {
                    content.innerHTML = `
                        <div class="empty-state">
                            <i class="fab fa-telegram"></i>
                            <h3>Telegram User Bot</h3>
                            <p>This feature requires the UserBot Manager</p>
                            <button class="btn btn-primary" onclick="showToast('Feature coming soon!', 'info')">
                                <i class="fas fa-info-circle"></i> Learn More
                            </button>
                        </div>
                    `;
                }
            },
            showAutoTextInterface: () => {
                console.log('📱 Showing fallback auto text interface');
                const content = document.getElementById('dynamicContent');
                if (content) {
                    content.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-tasks"></i>
                            <h3>Auto Text Scheduler</h3>
                            <p>This feature requires the UserBot Manager</p>
                            <button class="btn btn-primary" onclick="showToast('Feature coming soon!', 'info')">
                                <i class="fas fa-info-circle"></i> Learn More
                            </button>
                        </div>
                    `;
                }
            }
        };
    }
    
    // Update user info
    const userElement = document.getElementById('currentUser');
    if (userElement) {
        const currentUser = window.authManager ? window.authManager.getUser() : { username: 'admin' };
        userElement.textContent = currentUser?.username || 'admin';
        console.log('👤 User info updated:', currentUser?.username || 'admin');
    }
    
    // Mark as initialized
    window.appInitialized = true;
    
    // Force switch to dashboard
    setTimeout(() => {
        console.log('📍 Switching to dashboard...');
        if (window.uiComponents && typeof window.uiComponents.switchSection === 'function') {
            window.uiComponents.switchSection('dashboard');
        } else {
            switchSection('dashboard');
        }
    }, 500);
}

// Handle login error
function handleLoginError(errorMessage, loginBtn, errorDiv) {
    console.error('❌ Login error:', errorMessage);
    
    // Show error
    if (errorDiv) {
        document.getElementById('errorMessage').textContent = errorMessage;
        errorDiv.style.display = 'block';
    }
    
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        loginBtn.disabled = false;
    }
    
    // Emit login error event
    if (window.app && window.app.emit) {
        window.app.emit('login:error', { error: errorMessage });
    }
}

// Setup session timer
function setupSessionTimer() {
    let seconds = 0;
    const timerElement = document.getElementById('sessionTimer');
    
    if (!timerElement) {
        console.warn('⏰ Session timer element not found');
        return;
    }
    
    console.log('⏰ Starting session timer');
    const timer = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        timerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);
    
    // Store timer for cleanup
    window.sessionTimer = timer;
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM Content Loaded');
    
    // Check for saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    console.log('🎨 Theme loaded:', savedTheme);
    
    // Hide initial loading
    setTimeout(() => {
        const loading = document.getElementById('initialLoading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
                console.log('🌀 Initial loading hidden');
            }, 300);
        }
    }, 1000);
    
    // Setup additional event listeners
    setupAdditionalListeners();
    
    console.log('✅ Event listeners setup complete');
});

// Setup additional event listeners
function setupAdditionalListeners() {
    console.log('🔧 Setting up additional event listeners...');
    
    // Quick start button
    const quickStartBtn = document.getElementById('quickStartBtn');
    if (quickStartBtn) {
        console.log('✅ Quick start button found');
        quickStartBtn.addEventListener('click', function() {
            console.log('🚀 Quick start clicked');
            if (window.uiComponents && window.uiComponents.showCreateBotModal) {
                window.uiComponents.showCreateBotModal();
            } else {
                showToast('Please log in first to create a bot', 'info');
            }
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        console.log('✅ Theme toggle found');
        themeToggle.addEventListener('click', function() {
            console.log('🎨 Theme toggle clicked');
            toggleTheme();
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        console.log('✅ Refresh button found');
        refreshBtn.addEventListener('click', function() {
            console.log('🔄 Refresh clicked');
            refreshAll();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        console.log('✅ Logout button found');
        logoutBtn.addEventListener('click', function() {
            console.log('👋 Logout clicked');
            handleLogout();
        });
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        console.log('✅ Settings button found');
        settingsBtn.addEventListener('click', function() {
            console.log('⚙️ Settings clicked');
            if (window.uiComponents && window.uiComponents.showSettings) {
                window.uiComponents.showSettings();
            } else {
                showToast('Settings feature not available', 'info');
            }
        });
    }
    
    // Navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    console.log(`📍 Found ${navLinks.length} navigation links`);
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            console.log(`📍 Navigation to: ${section}`);
            
            if (window.uiComponents && window.uiComponents.switchSection) {
                window.uiComponents.switchSection(section);
            } else {
                // Fallback navigation
                switchSection(section);
            }
        });
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
    
    if (sidebarToggle) {
        console.log('✅ Sidebar toggle (desktop) found');
        sidebarToggle.addEventListener('click', function() {
            console.log('📱 Sidebar toggle clicked');
            toggleSidebar();
        });
    }
    
    if (sidebarToggleMobile) {
        console.log('✅ Sidebar toggle (mobile) found');
        sidebarToggleMobile.addEventListener('click', function() {
            console.log('📱 Mobile sidebar toggle clicked');
            toggleSidebar();
        });
    }
}

// Fallback section switching
function switchSection(sectionId) {
    console.log(`📍 Switching to section: ${sectionId}`);
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const sectionElement = document.getElementById(sectionId + 'Section');
    if (sectionElement) {
        sectionElement.classList.add('active');
        console.log(`✅ Section ${sectionId} activated`);
    } else {
        console.error(`❌ Section element not found: ${sectionId}Section`);
        // Create fallback section
        createFallbackSection(sectionId);
    }
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const navLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }
    
    // Update breadcrumb
    updateBreadcrumb(sectionId);
    
    // Initialize section-specific features
    initializeSection(sectionId);
    
    // Emit section change event
    if (window.app && window.app.emit) {
        window.app.emit('section:changed', { section: sectionId });
    }
}

// Create fallback section if not exists
function createFallbackSection(sectionId) {
    console.log(`🛠️ Creating fallback section for: ${sectionId}`);
    
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    const sectionNames = {
        'dashboard': 'Dashboard',
        'terminal': 'Terminal',
        'bot-control': 'Bot Control',
        'telegram': 'Telegram User Bot',
        'auto-text': 'Auto Text Scheduler'
    };
    
    const section = document.createElement('div');
    section.id = sectionId + 'Section';
    section.className = 'content-section active';
    section.innerHTML = `
        <div class="section-header">
            <h2>${sectionNames[sectionId] || sectionId}</h2>
            <p>This section is temporarily unavailable</p>
        </div>
        <div class="empty-state">
            <i class="fas fa-tools"></i>
            <h3>${sectionNames[sectionId] || sectionId}</h3>
            <p>This feature is under development or not fully loaded.</p>
            <button class="btn btn-primary" onclick="showToast('Feature coming soon!', 'info')">
                <i class="fas fa-info-circle"></i> Learn More
            </button>
        </div>
    `;
    
    mainContent.appendChild(section);
}

// Update breadcrumb (fallback)
function updateBreadcrumb(sectionId) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) {
        console.warn('🍞 Breadcrumb element not found');
        return;
    }
    
    const sectionNames = {
        'dashboard': 'Dashboard',
        'terminal': 'Terminal',
        'bot-control': 'Bot Control',
        'telegram': 'Telegram User Bot',
        'auto-text': 'Auto Text'
    };
    
    breadcrumb.innerHTML = `
        <span><i class="fas fa-home"></i> ${sectionNames[sectionId] || sectionId}</span>
    `;
    console.log(`🍞 Breadcrumb updated: ${sectionNames[sectionId] || sectionId}`);
}

// Initialize section (fallback)
function initializeSection(sectionId) {
    console.log(`🔧 Initializing section: ${sectionId}`);
    
    switch(sectionId) {
        case 'dashboard':
            initializeDashboardSection();
            break;
        case 'terminal':
            initializeTerminalSection();
            break;
        case 'bot-control':
            initializeBotControlSection();
            break;
        case 'telegram':
            initializeTelegramSection();
            break;
        case 'auto-text':
            initializeAutoTextSection();
            break;
    }
}

// Initialize dashboard section
function initializeDashboardSection() {
    console.log('📊 Initializing dashboard section');
    updateDashboardStats();
}

// Initialize terminal section (fallback)
function initializeTerminalSection() {
    console.log('💻 Initializing terminal section');
    
    // Setup terminal if terminal manager exists
    if (window.terminalManager) {
        const terminalOutput = document.getElementById('terminalOutput');
        const commandInput = document.getElementById('commandInput');
        
        if (terminalOutput && commandInput) {
            if (window.terminalManager.setTerminalElements) {
                window.terminalManager.setTerminalElements(terminalOutput, commandInput);
                console.log('✅ Terminal elements configured');
            }
            
            // Focus input
            setTimeout(() => {
                commandInput.focus();
                console.log('🎯 Terminal input focused');
            }, 100);
        } else {
            console.warn('⚠️ Terminal elements not found');
        }
    }
}

// Initialize bot control section (fallback)
function initializeBotControlSection() {
    console.log('🤖 Initializing bot control section');
    
    // Load bots if bot manager exists
    if (window.botManager && window.botManager.getAllBots) {
        try {
            const bots = window.botManager.getAllBots();
            console.log(`🤖 Found ${bots.length} bots`);
            updateBotStats(bots);
            
            // Update bot list display
            updateBotListDisplay(bots);
        } catch (error) {
            console.error('❌ Error loading bots:', error);
        }
    }
}

// Update bot list display
function updateBotListDisplay(bots) {
    const botListContainer = document.getElementById('botListContainer') || 
                            document.querySelector('.bot-list') ||
                            document.getElementById('dynamicContent');
    
    if (botListContainer && bots.length > 0) {
        botListContainer.innerHTML = `
            <div class="bots-grid">
                ${bots.map(bot => `
                    <div class="bot-card ${bot.status}">
                        <div class="bot-header">
                            <h3>${bot.name || 'Unnamed Bot'}</h3>
                            <span class="status-badge ${bot.status}">${bot.status}</span>
                        </div>
                        <div class="bot-details">
                            <p><strong>ID:</strong> ${bot.id || 'N/A'}</p>
                            <p><strong>Type:</strong> ${bot.type || 'Unknown'}</p>
                            <p><strong>Created:</strong> ${new Date(bot.createdAt || Date.now()).toLocaleDateString()}</p>
                        </div>
                        <div class="bot-actions">
                            <button class="btn btn-sm ${bot.status === 'running' ? 'btn-warning' : 'btn-success'}" 
                                    onclick="toggleBotStatus('${bot.id}')">
                                <i class="fas fa-power-off"></i> ${bot.status === 'running' ? 'Stop' : 'Start'}
                            </button>
                            <button class="btn btn-sm btn-info" onclick="showBotDetails('${bot.id}')">
                                <i class="fas fa-info-circle"></i> Details
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Initialize telegram section (fallback)
function initializeTelegramSection() {
    console.log('📱 Initializing telegram section');
    
    // Show telegram interface if userbot manager exists
    if (window.userBotManager && window.userBotManager.showUserBotInterface) {
        window.userBotManager.showUserBotInterface();
    } else {
        // Fallback interface
        const content = document.getElementById('telegramContent') || document.getElementById('dynamicContent');
        if (content) {
            content.innerHTML = `
                <div class="section-header">
                    <h2>Telegram User Bot</h2>
                    <p>Manage your Telegram user sessions</p>
                </div>
                <div class="empty-state">
                    <i class="fab fa-telegram"></i>
                    <h3>Telegram Integration</h3>
                    <p>Connect your Telegram account to send messages automatically.</p>
                    <button class="btn btn-primary" onclick="showToast('Telegram feature coming soon!', 'info')">
                        <i class="fas fa-plug"></i> Connect Telegram
                    </button>
                </div>
            `;
        }
    }
}

// Initialize auto text section (fallback)
function initializeAutoTextSection() {
    console.log('📝 Initializing auto text section');
    
    // Show auto text interface if userbot manager exists
    if (window.userBotManager && window.userBotManager.showAutoTextInterface) {
        window.userBotManager.showAutoTextInterface();
    } else {
        // Fallback interface
        const content = document.getElementById('dynamicContent');
        if (content) {
            content.innerHTML = `
                <div class="section-header">
                    <h2>Auto Text Scheduler</h2>
                    <p>Schedule automatic text messages</p>
                </div>
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <h3>Auto Scheduler</h3>
                    <p>Schedule messages to be sent automatically at specified times.</p>
                    <button class="btn btn-primary" onclick="showToast('Scheduler feature coming soon!', 'info')">
                        <i class="fas fa-plus"></i> Create Schedule
                    </button>
                </div>
            `;
        }
    }
}

// Update bot stats (fallback)
function updateBotStats(bots) {
    console.log(`📊 Updating bot stats for ${bots.length} bots`);
    
    const totalBotsCount = document.getElementById('totalBotsCount');
    const runningBotsCount = document.getElementById('runningBotsCount');
    const stoppedBotsCount = document.getElementById('stoppedBotsCount');
    
    if (totalBotsCount) {
        totalBotsCount.textContent = bots.length;
        console.log(`🤖 Total bots: ${bots.length}`);
    }
    
    const running = bots.filter(b => b.status === 'running').length;
    const stopped = bots.filter(b => b.status === 'stopped').length;
    
    if (runningBotsCount) {
        runningBotsCount.textContent = running;
        console.log(`▶️ Running bots: ${running}`);
    }
    if (stoppedBotsCount) {
        stoppedBotsCount.textContent = stopped;
        console.log(`⏸️ Stopped bots: ${stopped}`);
    }
}

// Toggle theme (fallback)
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    console.log(`🎨 Switching theme from ${currentTheme} to ${newTheme}`);
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        console.log(`🎨 Theme icon updated to: ${icon.className}`);
    }
    
    showToast(`Switched to ${newTheme} theme`, 'info');
    
    // Emit theme change event
    if (window.app && window.app.emit) {
        window.app.emit('theme:changed', { theme: newTheme });
    }
}

// Toggle sidebar (fallback)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        console.log(`📱 Sidebar ${isCollapsed ? 'collapsed' : 'expanded'}`);
        
        // Update toggle icon
        const toggleIcon = document.querySelector('#sidebarToggle i');
        if (toggleIcon) {
            toggleIcon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        }
    }
}

// Refresh all (fallback)
function refreshAll() {
    console.log('🔄 Refreshing all data...');
    showToast('Refreshing all data...', 'info');
    
    // Emit refresh event
    if (window.app && window.app.emit) {
        window.app.emit('app:refresh');
    }
    
    // Refresh IP
    detectIP();
    
    // Refresh bots
    if (window.botManager && window.botManager.listBots) {
        window.botManager.listBots().then(result => {
            if (result.success) {
                updateBotStats(result.bots);
                updateBotListDisplay(result.bots);
            }
        });
    }
    
    // Refresh dashboard stats
    updateDashboardStats();
    
    console.log('✅ Refresh complete');
}

// Update dashboard stats (fallback)
function updateDashboardStats() {
    console.log('📊 Updating dashboard stats');
    
    // Update bot count
    if (window.botManager && window.botManager.getAllBots) {
        try {
            const bots = window.botManager.getAllBots();
            const runningBots = bots.filter(b => b.status === 'running').length;
            
            const totalBotsEl = document.getElementById('totalBots');
            const botStatusEl = document.getElementById('botStatus');
            
            if (totalBotsEl) {
                totalBotsEl.textContent = bots.length;
                console.log(`📊 Total bots on dashboard: ${bots.length}`);
            }
            if (botStatusEl) {
                botStatusEl.textContent = `${runningBots} running`;
                console.log(`📊 Running bots on dashboard: ${runningBots}`);
            }
            
            // Update header
            const headerBotsEl = document.getElementById('headerBotsCount');
            if (headerBotsEl) {
                headerBotsEl.textContent = bots.length;
            }
        } catch (error) {
            console.error('❌ Error updating dashboard stats:', error);
        }
    }
    
    // Update session timer if exists
    if (window.sessionTimer) {
        console.log('⏰ Session timer is running');
    }
}

// Handle logout (fallback)
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('👋 User confirmed logout');
        
        // Emit logout event
        if (window.app && window.app.emit) {
            window.app.emit('app:logout');
        }
        
        // Clear any timers
        if (window.sessionTimer) {
            clearInterval(window.sessionTimer);
            console.log('⏰ Session timer cleared');
        }
        
        // Clear auth data
        if (window.authManager && window.authManager.logout) {
            window.authManager.logout();
        }
        
        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_expiry');
        localStorage.removeItem('auth_user');
        
        // Reset app state
        window.appInitialized = false;
        
        // Show login screen
        const loginScreen = document.getElementById('loginScreen');
        const mainPanel = document.getElementById('mainPanel');
        
        if (loginScreen) {
            loginScreen.style.display = 'block';
            console.log('📱 Login screen shown');
        }
        if (mainPanel) {
            mainPanel.style.display = 'none';
            console.log('🖥️ Main panel hidden');
        }
        
        // Reset form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.reset();
            console.log('📝 Login form reset');
        }
        
        // Reset IP display
        const ipDisplay = document.getElementById('ipDisplay');
        const ipStatus = document.getElementById('ipStatus');
        
        if (ipDisplay) {
            ipDisplay.textContent = 'Detecting...';
        }
        if (ipStatus) {
            ipStatus.textContent = 'Checking...';
            ipStatus.className = 'status-badge pending';
        }
        
        // Redetect IP
        detectIP();
        
        showToast('Logged out successfully', 'info');
        console.log('✅ Logout complete');
    } else {
        console.log('👋 Logout cancelled');
    }
}

// Global helper function
function showToast(message, type = 'info') {
    console.log(`🍞 Toast [${type.toUpperCase()}]: ${message}`);
    
    if (window.uiComponents && window.uiComponents.showToast) {
        window.uiComponents.showToast(message, type);
    } else {
        // Fallback toast implementation
        // Create simple toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : 
                         type === 'error' ? '#ef4444' : 
                         type === 'warning' ? '#f59e0b' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            max-width: 350px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                              type === 'error' ? 'fa-exclamation-circle' : 
                              type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}" 
                   style="font-size: 18px;"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
    }
}

// Helper functions for bot operations
function toggleBotStatus(botId) {
    console.log(`🤖 Toggling bot status for: ${botId}`);
    showToast(`Toggling bot ${botId}...`, 'info');
    
    // Simulate bot toggle
    setTimeout(() => {
        showToast(`Bot ${botId} status updated`, 'success');
        refreshAll();
    }, 1000);
}

function showBotDetails(botId) {
    console.log(`🤖 Showing details for bot: ${botId}`);
    showToast(`Showing details for bot ${botId}`, 'info');
    
    // Create modal for bot details
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px; max-width: 500px; width: 90%;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0;">Bot Details</h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
            </div>
            <p><strong>Bot ID:</strong> ${botId}</p>
            <p><strong>Status:</strong> Active</p>
            <p><strong>Type:</strong> Telegram Bot</p>
            <p><strong>Created:</strong> ${new Date().toLocaleString()}</p>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Inisialisasi app dengan event system
if (!window.app) {
    window.app = {
        // Event system
        _events: {},
        
        on: function(eventName, callback) {
            if (!this._events[eventName]) {
                this._events[eventName] = [];
            }
            this._events[eventName].push(callback);
            console.log(`📡 Event listener added for: ${eventName}`);
            return this;
        },
        
        emit: function(eventName, data) {
            console.log(`📡 Emitting event: ${eventName}`, data);
            if (this._events && this._events[eventName]) {
                this._events[eventName].forEach(callback => {
                    try {
                        callback(data);
                    } catch (error) {
                        console.error(`Error in ${eventName} handler:`, error);
                    }
                });
            }
        },
        
        off: function(eventName, callback) {
            if (this._events && this._events[eventName]) {
                const index = this._events[eventName].indexOf(callback);
                if (index > -1) {
                    this._events[eventName].splice(index, 1);
                }
            }
            return this;
        },
        
        // Metode lainnya yang sudah ada
        init: function() {
            console.log('🚀 App initialized with event system');
            
            // Setup default event listeners
            this.setupDefaultListeners();
            
            // Call original setup
            setupAdditionalListeners();
            
            return this;
        },
        
        setupDefaultListeners: function() {
            // Listen for login success
            this.on('login:success', function(data) {
                console.log('🎉 Login success event received:', data);
            });
            
            // Listen for section changes
            this.on('section:changed', function(data) {
                console.log('📍 Section changed event received:', data.section);
            });
            
            // Listen for theme changes
            this.on('theme:changed', function(data) {
                console.log('🎨 Theme changed event received:', data.theme);
            });
        },
        
        switchSection: switchSection,
        showToast: showToast,
        updateDashboardStats: updateDashboardStats
    };
}

// Initialize the app
window.app.init();

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .status-badge.success {
        background: #10b981;
        color: white;
    }
    
    .status-badge.error {
        background: #ef4444;
        color: white;
    }
    
    .status-badge.pending {
        background: #f59e0b;
        color: white;
    }
    
    .status-badge.running {
        background: #10b981;
        color: white;
    }
    
    .status-badge.stopped {
        background: #6b7280;
        color: white;
    }
    
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #6b7280;
    }
    
    .empty-state i {
        font-size: 48px;
        margin-bottom: 20px;
        color: #9ca3af;
    }
    
    .bot-card {
        background: white;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 16px;
    }
    
    [data-theme="dark"] .bot-card {
        background: #1f2937;
        color: white;
    }
`;
document.head.appendChild(style);

// Enhanced error handling
window.addEventListener('error', function(event) {
    console.error('🚨 Global error:', event.error);
    console.error('📄 Error details:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
    });
    
    // Show user-friendly error
    const message = event.message || 'An error occurred';
    let friendlyMessage = message;
    
    if (message.includes('connectedEl') || message.includes('undefined')) {
        friendlyMessage = 'Interface loading error. Some components may not load properly.';
    } else if (message.includes('TypeError')) {
        friendlyMessage = 'Type error occurred. Please check console for details.';
    } else if (message.includes('NetworkError')) {
        friendlyMessage = 'Network error. Please check your connection.';
    }
    
    showToast(friendlyMessage, 'error');
    
    // Emit error event
    if (window.app && window.app.emit) {
        window.app.emit('app:error', { 
            error: event.error, 
            message: event.message
        });
    }
    
    // Prevent default error dialog
    event.preventDefault();
});

// Promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    
    // Filter out common errors
    if (event.reason) {
        const reason = event.reason.message || event.reason.toString();
        
        if (reason.includes('401') || reason.includes('authentication') || reason.includes('token')) {
            showToast('Session expired. Please log in again.', 'error');
            
            // Auto logout jika token expired
            setTimeout(() => {
                if (window.authManager && window.authManager.logout) {
                    window.authManager.logout();
                }
                const loginScreen = document.getElementById('loginScreen');
                const mainPanel = document.getElementById('mainPanel');
                if (loginScreen) loginScreen.style.display = 'block';
                if (mainPanel) mainPanel.style.display = 'none';
                showToast('You have been logged out due to session expiration', 'warning');
            }, 2000);
        } else if (reason.includes('network') || reason.includes('fetch')) {
            showToast('Network error. Please check your connection.', 'error');
        } else {
            showToast(`Error: ${reason.substring(0, 100)}`, 'error');
        }
    }
    
    // Emit error event
    if (window.app && window.app.emit) {
        window.app.emit('app:promise-error', { 
            reason: event.reason 
        });
    }
});

// Global app status check
setInterval(() => {
    if (window.appInitialized) {
        console.log('✅ App is running normally');
        
        // Check for authentication
        if (window.authManager && !window.authManager.isAuthenticated()) {
            console.warn('⚠️ Authentication expired');
            showToast('Session expired. Please log in again.', 'warning');
        }
    }
}, 30000); // Check every 30 seconds

console.log('🎉 TeleBot Pro App loaded successfully!');
