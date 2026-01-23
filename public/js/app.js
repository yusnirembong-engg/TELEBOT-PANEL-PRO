/**
 * TeleBot Pro v2.0.0 - Main Application
 * Entry point for the application
 */

console.log('🚀 TeleBot Pro App Loading...');

// Wait for all resources to load
window.addEventListener('load', function() {
    console.log('📱 TeleBot Pro App Ready');
    
    // Initialize IP detection
    detectIP();
    
    // Setup basic event listeners
    setupBasicListeners();
});

// IP Detection function
async function detectIP() {
    try {
        const ipDisplay = document.getElementById('ipDisplay');
        const ipStatus = document.getElementById('ipStatus');
        
        if (ipDisplay) {
            ipDisplay.textContent = 'Detecting...';
        }
        
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        
        if (ipDisplay) {
            ipDisplay.textContent = data.ip;
        }
        if (ipStatus) {
            ipStatus.textContent = 'Detected';
            ipStatus.className = 'status-badge success';
        }
    } catch (error) {
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
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username')?.value;
            const password = document.getElementById('password')?.value;
            const loginBtn = document.getElementById('loginBtn');
            const errorDiv = document.getElementById('loginError');
            
            if (!username || !password) {
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
                try {
                    // Get IP
                    let clientIP = null;
                    try {
                        const ipResponse = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipResponse.json();
                        clientIP = ipData.ip;
                    } catch (ipError) {
                        console.warn('Failed to get IP:', ipError);
                    }
                    
                    const result = await window.authManager.login(username, password, clientIP);
                    
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
                console.warn('Auth manager not available, using fallback');
                
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
    }
    
    // Toggle password visibility
    const togglePassword = document.getElementById('togglePassword');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            const icon = this.querySelector('i');
            
            if (passwordInput && icon) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    passwordInput.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            }
        });
    }
    
    // Auto login button
    const autoLoginBtn = document.getElementById('autoLoginBtn');
    if (autoLoginBtn) {
        autoLoginBtn.addEventListener('click', function() {
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            
            if (usernameInput) usernameInput.value = 'admin';
            if (passwordInput) passwordInput.value = 'TeleBotPro@2024!';
        });
    }
    
    // Refresh IP button
    const refreshIPBtn = document.getElementById('checkIPBtn');
    if (refreshIPBtn) {
        refreshIPBtn.addEventListener('click', detectIP);
    }
}

// Handle successful login - VERSI TERUPDATE
function handleSuccessfulLogin(result, username, clientIP) {
    // Show success
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-check"></i> Login Successful!';
    }
    
    // Hide login screen, show main panel
    const loginScreen = document.getElementById('loginScreen');
    const mainPanel = document.getElementById('mainPanel');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainPanel) mainPanel.style.display = 'flex';
    
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
    
    // Initialize UI Components
    if (window.uiComponents && typeof window.uiComponents.init === 'function') {
        window.uiComponents.init();
        console.log('✅ UI Components initialized');
    }
    
    // Initialize Bot Manager
    if (window.botManager && typeof window.botManager.init === 'function') {
        window.botManager.init();
        console.log('✅ Bot Manager initialized');
    }
    
    // Initialize Telegram Manager
    if (window.telegramManager && typeof window.telegramManager.init === 'function') {
        window.telegramManager.init();
        console.log('✅ Telegram Manager initialized');
    }
    
    // Initialize Terminal Manager
    if (window.terminalManager && typeof window.terminalManager.init === 'function') {
        window.terminalManager.init();
        console.log('✅ Terminal Manager initialized');
    }
    
    // Initialize UserBot Manager
    if (window.userBotManager && typeof window.userBotManager.init === 'function') {
        window.userBotManager.init();
        console.log('✅ UserBot Manager initialized');
    }
    
    // Update user info
    const userElement = document.getElementById('currentUser');
    if (userElement) {
        userElement.textContent = username || 'admin';
    }
    
    // Force switch to dashboard
    setTimeout(() => {
        if (window.uiComponents && typeof window.uiComponents.switchSection === 'function') {
            window.uiComponents.switchSection('dashboard');
        } else {
            switchSection('dashboard');
        }
    }, 500);
}

// Handle login error
function handleLoginError(errorMessage, loginBtn, errorDiv) {
    // Show error
    if (errorDiv) {
        document.getElementById('errorMessage').textContent = errorMessage;
        errorDiv.style.display = 'block';
    }
    
    if (loginBtn) {
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        loginBtn.disabled = false;
    }
}

// Setup session timer
function setupSessionTimer() {
    let seconds = 0;
    const timerElement = document.getElementById('sessionTimer');
    
    if (!timerElement) return;
    
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
    
    // Hide initial loading
    setTimeout(() => {
        const loading = document.getElementById('initialLoading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 300);
        }
    }, 1000);
    
    // Setup additional event listeners
    setupAdditionalListeners();
    
    console.log('✅ Event listeners setup complete');
});

// Setup additional event listeners
function setupAdditionalListeners() {
    // Quick start button
    const quickStartBtn = document.getElementById('quickStartBtn');
    if (quickStartBtn) {
        quickStartBtn.addEventListener('click', function() {
            if (window.uiComponents) {
                window.uiComponents.showCreateBotModal();
            } else {
                showToast('Please log in first to create a bot', 'info');
            }
        });
    }
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            toggleTheme();
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            refreshAll();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            handleLogout();
        });
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function() {
            if (window.uiComponents) {
                window.uiComponents.showSettings();
            }
        });
    }
    
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            
            if (window.uiComponents) {
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
        sidebarToggle.addEventListener('click', function() {
            toggleSidebar();
        });
    }
    
    if (sidebarToggleMobile) {
        sidebarToggleMobile.addEventListener('click', function() {
            toggleSidebar();
        });
    }
}

// Fallback section switching
function switchSection(sectionId) {
    console.log(`Switching to section: ${sectionId}`);
    
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const sectionElement = document.getElementById(sectionId + 'Section');
    if (sectionElement) {
        sectionElement.classList.add('active');
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
}

// Update breadcrumb (fallback)
function updateBreadcrumb(sectionId) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;
    
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
}

// Initialize section (fallback)
function initializeSection(sectionId) {
    switch(sectionId) {
        case 'terminal':
            initializeTerminalSection();
            break;
        case 'bot-control':
            initializeBotControlSection();
            break;
        case 'telegram':
            initializeTelegramSection();
            break;
    }
}

// Initialize terminal section (fallback)
function initializeTerminalSection() {
    // Setup terminal if terminal manager exists
    if (window.terminalManager) {
        const terminalOutput = document.getElementById('terminalOutput');
        const commandInput = document.getElementById('commandInput');
        
        if (terminalOutput && commandInput) {
            window.terminalManager.setTerminalElements(terminalOutput, commandInput);
            
            // Focus input
            setTimeout(() => {
                commandInput.focus();
            }, 100);
        }
    }
}

// Initialize bot control section (fallback)
function initializeBotControlSection() {
    // Load bots if bot manager exists
    if (window.botManager && window.botManager.getAllBots) {
        const bots = window.botManager.getAllBots();
        updateBotStats(bots);
    }
}

// Initialize telegram section (fallback)
function initializeTelegramSection() {
    // Show telegram interface if userbot manager exists
    if (window.userBotManager && window.userBotManager.showUserBotInterface) {
        window.userBotManager.showUserBotInterface();
    }
}

// Update bot stats (fallback)
function updateBotStats(bots) {
    const totalBotsCount = document.getElementById('totalBotsCount');
    const runningBotsCount = document.getElementById('runningBotsCount');
    const stoppedBotsCount = document.getElementById('stoppedBotsCount');
    
    if (totalBotsCount) totalBotsCount.textContent = bots.length;
    
    const running = bots.filter(b => b.status === 'running').length;
    const stopped = bots.filter(b => b.status === 'stopped').length;
    
    if (runningBotsCount) runningBotsCount.textContent = running;
    if (stoppedBotsCount) stoppedBotsCount.textContent = stopped;
}

// Toggle theme (fallback)
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update icon
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    showToast(`Switched to ${newTheme} theme`, 'info');
}

// Toggle sidebar (fallback)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
    }
}

// Refresh all (fallback)
function refreshAll() {
    showToast('Refreshing all data...', 'info');
    
    // Refresh bots
    if (window.botManager && window.botManager.listBots) {
        window.botManager.listBots().then(result => {
            if (result.success) {
                updateBotStats(result.bots);
            }
        });
    }
    
    // Refresh dashboard stats
    updateDashboardStats();
}

// Update dashboard stats (fallback)
function updateDashboardStats() {
    // Update bot count
    if (window.botManager && window.botManager.getAllBots) {
        const bots = window.botManager.getAllBots();
        const runningBots = bots.filter(b => b.status === 'running').length;
        
        const totalBotsEl = document.getElementById('totalBots');
        const botStatusEl = document.getElementById('botStatus');
        
        if (totalBotsEl) totalBotsEl.textContent = bots.length;
        if (botStatusEl) botStatusEl.textContent = `${runningBots} running`;
        
        // Update header
        const headerBotsEl = document.getElementById('headerBotsCount');
        if (headerBotsEl) headerBotsEl.textContent = bots.length;
    }
}

// Handle logout (fallback)
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear any timers
        if (window.sessionTimer) {
            clearInterval(window.sessionTimer);
        }
        
        // Clear auth data
        if (window.authManager && window.authManager.logout) {
            window.authManager.logout();
        }
        
        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_expiry');
        localStorage.removeItem('auth_user');
        
        // Show login screen
        const loginScreen = document.getElementById('loginScreen');
        const mainPanel = document.getElementById('mainPanel');
        
        if (loginScreen) loginScreen.style.display = 'block';
        if (mainPanel) mainPanel.style.display = 'none';
        
        // Reset form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
        
        // Reset IP display
        const ipDisplay = document.getElementById('ipDisplay');
        const ipStatus = document.getElementById('ipStatus');
        
        if (ipDisplay) ipDisplay.textContent = 'Detecting...';
        if (ipStatus) {
            ipStatus.textContent = 'Checking...';
            ipStatus.className = 'status-badge pending';
        }
        
        // Redetect IP
        detectIP();
        
        showToast('Logged out successfully', 'info');
    }
}

// Global helper function
function showToast(message, type = 'info') {
    if (window.uiComponents && window.uiComponents.showToast) {
        window.uiComponents.showToast(message, type);
    } else {
        // Fallback toast implementation
        console.log(`[${type.toUpperCase()}] ${message}`);
        
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

// Fallback app object if ui-components.js fails
if (!window.app) {
    window.app = {
        init: function() {
            console.log('App initialized (fallback)');
            setupAdditionalListeners();
        },
        switchSection: switchSection,
        showToast: showToast,
        updateDashboardStats: updateDashboardStats
    };
}

// Make sure managers exist (fallback)
if (!window.botManager) {
    window.botManager = {
        getAllBots: () => [],
        listBots: () => Promise.resolve({ success: false, bots: [] })
    };
}

if (!window.telegramManager) {
    window.telegramManager = {
        getAllSessions: () => [],
        getSessionStatus: () => Promise.resolve({ success: false })
    };
}

if (!window.terminalManager) {
    window.terminalManager = {
        setTerminalElements: () => {},
        executeCommand: () => Promise.resolve({ success: false })
    };
}

if (!window.userBotManager) {
    window.userBotManager = {
        showUserBotInterface: () => {
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

// Initialize the app
window.app.init();
