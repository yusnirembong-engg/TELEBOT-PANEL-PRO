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
        
        // Initialize all managers
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
    
    // Initialize all managers
    initializeManagers() {
        // Ensure all managers are loaded
        if (!window.authManager) {
            console.error('Auth manager not found');
            return;
        }
        
        if (!window.botManager) {
            console.error('Bot manager not found');
            return;
        }
        
        if (!window.telegramManager) {
            console.error('Telegram manager not found');
            return;
        }
        
        if (!window.terminalManager) {
            console.error('Terminal manager not found');
            return;
        }
        
        if (!window.userBotManager) {
            console.error('UserBot manager not found');
            return;
        }
        
        if (!window.uiComponents) {
            console.error('UI components not found');
            return;
        }
        
        // Initialize UI components
        window.uiComponents.initializeAll();
        
        console.log('✅ All managers initialized');
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
        
        // Toggle password visibility
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }
        
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                window.uiComponents?.toggleSidebar();
            });
        }
        
        // Mobile sidebar toggle
        const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
        if (sidebarToggleMobile) {
            sidebarToggleMobile.addEventListener('click', () => {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('active');
                }
            });
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                window.uiComponents?.toggleTheme();
                this.updateThemeIcon();
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshAll();
            });
        }
        
        // Notifications button
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => {
                this.toggleNotificationsPanel();
            });
        }
        
        // Close notifications
        const closeNotifications = document.getElementById('closeNotifications');
        if (closeNotifications) {
            closeNotifications.addEventListener('click', () => {
                this.hideNotificationsPanel();
            });
        }
        
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.switchSection(section);
            });
        });
        
        // Quick actions
        document.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('[data-action]');
            if (actionBtn) {
                const action = actionBtn.getAttribute('data-action');
                this.handleQuickAction(action);
            }
        });
        
        // Beforeunload - cleanup
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Online/offline events
        window.addEventListener('online', () => {
            this.handleOnline();
        });
        
        window.addEventListener('offline', () => {
            this.handleOffline();
        });
        
        console.log('✅ Event listeners setup complete');
    }
    
    // Setup session timer
    setupSessionTimer() {
        // Update session timer every second
        this.sessionTimer = setInterval(() => {
            this.updateSessionTimer();
        }, 1000);
    }
    
    // Setup periodic updates
    setupPeriodicUpdates() {
        // Update system stats every 30 seconds
        const statsInterval = setInterval(() => {
            this.updateSystemStats();
        }, 30000);
        this.updateIntervals.push(statsInterval);
        
        // Update bot status every minute
        const botStatusInterval = setInterval(() => {
            this.updateBotStatus();
        }, 60000);
        this.updateIntervals.push(botStatusInterval);
        
        // Check token validity every 5 minutes
        const tokenCheckInterval = setInterval(() => {
            this.checkTokenValidity();
        }, 300000);
        this.updateIntervals.push(tokenCheckInterval);
        
        console.log(`✅ ${this.updateIntervals.length} periodic updates setup`);
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
            // Get client IP
            let clientIP = null;
            try {
                const ipResponse = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipResponse.json();
                clientIP = ipData.ip;
            } catch (error) {
                console.warn('Failed to get IP:', error);
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
                window.uiComponents?.addNotification(
                    'Login Successful',
                    `User ${username} logged in from ${clientIP || 'unknown IP'}`,
                    'success',
                    { username, ip: clientIP }
                );
                
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
    
    // Handle logout
    async handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.showToast('Logging out...', 'info');
            
            await window.authManager.logout();
            
            // Hide main panel, show login screen
            this.showLoginScreen();
            
            // Reset form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) loginForm.reset();
            
            this.showToast('Logged out successfully', 'success');
        }
    }
    
    // Toggle password visibility
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.getElementById('togglePassword')?.querySelector('i');
        
        if (passwordInput && toggleIcon) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                toggleIcon.className = 'fas fa-eye';
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
        
        // Focus on first interactive element
        setTimeout(() => {
            const firstInteractive = document.querySelector('.nav-link.active, .section-header button');
            if (firstInteractive) {
                firstInteractive.focus();
            }
        }, 100);
    }
    
    // Show login screen
    showLoginScreen() {
        const loginScreen = document.getElementById('loginScreen');
        const mainPanel = document.getElementById('mainPanel');
        
        if (loginScreen) loginScreen.style.display = 'block';
        if (mainPanel) mainPanel.style.display = 'none';
        
        // Clear any intervals
        this.cleanupIntervals();
        
        // Reset UI state
        this.currentSection = 'dashboard';
        
        // Update navigation
        this.updateNavigation();
    }
    
    // Switch section
    switchSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected section
        const sectionElement = document.getElementById(sectionId + 'Section');
        if (sectionElement) {
            sectionElement.classList.add('active');
        } else {
            // Try dynamic content
            const dynamicContent = document.getElementById('dynamicContent');
            if (dynamicContent) {
                // Load section content dynamically
                this.loadSectionContent(sectionId, dynamicContent);
            }
        }
        
        // Update active nav link
        const navLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
        if (navLink) {
            navLink.classList.add('active');
        }
        
        // Update breadcrumb
        this.updateBreadcrumb(sectionId);
        
        // Update current section
        this.currentSection = sectionId;
        
        // Emit section change event
        this.emitEvent('section-change', sectionId);
        
        // Special handling for specific sections
        switch (sectionId) {
            case 'terminal':
                this.initializeTerminal();
                break;
            case 'bot-control':
                this.initializeBotControl();
                break;
            case 'telegram':
                this.initializeTelegram();
                break;
        }
        
        console.log(`🔀 Switched to section: ${sectionId}`);
    }
    
    // Load section content dynamically
    loadSectionContent(sectionId, container) {
        // Show loading state
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <h3>Loading ${sectionId.replace('-', ' ')}...</h3>
            </div>
        `;
        
        // Simulate loading delay
        setTimeout(() => {
            // This would typically load content from server or module
            container.innerHTML = `
                <div class="section-header">
                    <h1>${this.capitalize(sectionId.replace('-', ' '))}</h1>
                </div>
                <div class="section-block">
                    <h3>Coming Soon</h3>
                    <p>This section is under development and will be available soon.</p>
                </div>
            `;
        }, 500);
    }
    
    // Update breadcrumb
    updateBreadcrumb(sectionId) {
        const sectionNames = {
            'dashboard': 'Dashboard',
            'terminal': 'Terminal',
            'bot-control': 'Bot Control',
            'telegram': 'Telegram',
            'auto-text': 'Auto Text',
            'scheduler': 'Scheduler',
            'config': 'Configuration',
            'users': 'Users & Groups',
            'logs': 'System Logs',
            'monitoring': 'Monitoring',
            'backup': 'Backup',
            'chat-manager': 'Chat Manager',
            'broadcast': 'Broadcast',
            'analytics': 'Analytics'
        };
        
        const breadcrumb = document.getElementById('breadcrumb');
        if (breadcrumb) {
            breadcrumb.innerHTML = `
                <span><i class="fas fa-home"></i> ${sectionNames[sectionId] || 'Unknown'}</span>
            `;
        }
    }
    
    // Update navigation
    updateNavigation() {
        // Update badge counts
        this.updateNavigationBadges();
    }
    
    // Update navigation badges
    updateNavigationBadges() {
        // Bot count badge
        if (window.botManager) {
            const bots = window.botManager.getAllBots();
            const runningBots = bots.filter(b => b.status === 'running').length;
            const botBadge = document.getElementById('botStatusBadge');
            if (botBadge) {
                botBadge.textContent = runningBots;
                botBadge.style.display = runningBots > 0 ? 'flex' : 'none';
            }
        }
        
        // User bot badge
        if (window.telegramManager) {
            const sessions = window.telegramManager.getAllSessions();
            const connectedSessions = sessions.filter(s => s.status === 'connected').length;
            const userbotBadge = document.getElementById('userbotStatusBadge');
            if (userbotBadge) {
                userbotBadge.textContent = connectedSessions;
                userbotBadge.style.display = connectedSessions > 0 ? 'flex' : 'none';
            }
        }
        
        // Auto text badge
        if (window.userBotManager) {
            const jobs = Array.from(window.userBotManager.autoTextJobs?.values() || []);
            const runningJobs = jobs.filter(j => j.status === 'running').length;
            const autoTextBadge = document.getElementById('autoTextStatusBadge');
            if (autoTextBadge) {
                autoTextBadge.textContent = runningJobs;
                autoTextBadge.style.display = runningJobs > 0 ? 'flex' : 'none';
            }
        }
    }
    
    // Update session timer
    updateSessionTimer() {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            return;
        }
        
        const sessionInfo = window.authManager.getSessionInfo();
        if (!sessionInfo || !sessionInfo.timeLeftFormatted) {
            return;
        }
        
        const timerElement = document.getElementById('sessionTimer');
        if (timerElement) {
            timerElement.textContent = sessionInfo.timeLeftFormatted;
            
            // Add warning class if less than 5 minutes
            if (sessionInfo.timeLeft < 5 * 60 * 1000) {
                timerElement.classList.add('warning');
            } else {
                timerElement.classList.remove('warning');
            }
        }
    }
    
    // Update user info
    updateUserInfo() {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            return;
        }
        
        const user = window.authManager.getUser();
        const userElement = document.getElementById('currentUser');
        
        if (userElement && user) {
            userElement.textContent = user.username;
        }
    }
    
    // Update system stats
    async updateSystemStats() {
        try {
            // Update CPU usage (simulated)
            const cpuUsage = document.getElementById('cpuUsage');
            if (cpuUsage) {
                const usage = 20 + Math.random() * 40; // Simulated 20-60%
                cpuUsage.textContent = `${usage.toFixed(1)}%`;
                
                const cpuChange = document.getElementById('cpuChange');
                if (cpuChange) {
                    cpuChange.className = 'stats-change ' + (usage > 50 ? 'negative' : 'positive');
                    cpuChange.innerHTML = usage > 50 ? 
                        '<i class="fas fa-arrow-up"></i> High' : 
                        '<i class="fas fa-arrow-down"></i> Low';
                }
            }
            
            // Update memory usage (simulated)
            const memoryUsage = document.getElementById('memoryUsage');
            if (memoryUsage) {
                const usage = 40 + Math.random() * 30; // Simulated 40-70%
                memoryUsage.textContent = `${usage.toFixed(1)}%`;
                
                const memoryChange = document.getElementById('memoryChange');
                if (memoryChange) {
                    memoryChange.className = 'stats-change ' + (usage > 60 ? 'negative' : 'positive');
                    memoryChange.innerHTML = usage > 60 ? 
                        '<i class="fas fa-arrow-up"></i> High' : 
                        '<i class="fas fa-arrow-down"></i> OK';
                }
            }
            
            // Update bot counts
            if (window.botManager) {
                const bots = window.botManager.getAllBots();
                const totalBots = document.getElementById('totalBots');
                const botStatus = document.getElementById('botStatus');
                
                if (totalBots) {
                    totalBots.textContent = bots.length;
                }
                
                if (botStatus) {
                    const running = bots.filter(b => b.status === 'running').length;
                    botStatus.textContent = `${running} running`;
                }
                
                // Update header counts
                const headerBotsCount = document.getElementById('headerBotsCount');
                const headerMessagesCount = document.getElementById('headerMessagesCount');
                
                if (headerBotsCount) {
                    headerBotsCount.textContent = bots.length;
                }
                
                if (headerMessagesCount) {
                    const totalMessages = bots.reduce((sum, bot) => sum + (bot.stats?.messagesSent || 0), 0);
                    headerMessagesCount.textContent = totalMessages;
                }
            }
            
            // Update performance memory
            const performanceMemory = document.getElementById('performanceMemory');
            if (performanceMemory) {
                const memory = (performance.memory?.usedJSHeapSize || 0) / 1048576; // Convert to MB
                performanceMemory.textContent = `${memory.toFixed(1)}MB`;
            }
            
            // Update system status indicator
            this.updateSystemStatus();
            
        } catch (error) {
            console.error('Failed to update system stats:', error);
        }
    }
    
    // Update bot status
    async updateBotStatus() {
        if (!window.botManager) return;
        
        try {
            // Refresh bot list
            await window.botManager.listBots();
            
            // Update UI
            this.updateNavigationBadges();
            
            // Update bot control section if active
            if (this.currentSection === 'bot-control') {
                // This would trigger a refresh of the bot control UI
            }
            
        } catch (error) {
            console.error('Failed to update bot status:', error);
        }
    }
    
    // Update system status
    updateSystemStatus() {
        const indicator = document.getElementById('systemStatusIndicator');
        const statusText = document.getElementById('systemStatusText');
        
        if (!indicator || !statusText) return;
        
        // Check if authenticated
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            indicator.className = 'status-indicator';
            indicator.style.background = 'var(--color-warning)';
            statusText.textContent = 'Not authenticated';
            return;
        }
        
        // Check API status
        const allHealthy = Object.values(this.apiStatus).every(status => status === 'healthy');
        const anyUnhealthy = Object.values(this.apiStatus).some(status => status === 'unhealthy');
        
        if (allHealthy) {
            indicator.className = 'status-indicator';
            indicator.style.background = 'var(--color-success)';
            statusText.textContent = 'All systems operational';
        } else if (anyUnhealthy) {
            indicator.className = 'status-indicator';
            indicator.style.background = 'var(--color-danger)';
            statusText.textContent = 'Some systems degraded';
        } else {
            indicator.className = 'status-indicator';
            indicator.style.background = 'var(--color-warning)';
            statusText.textContent = 'Checking status...';
        }
    }
    
    // Check API status
    async checkAPIStatus() {
        const endpoints = [
            { name: 'auth', url: '/.netlify/functions/auth' },
            { name: 'botControl', url: '/.netlify/functions/bot-control' },
            { name: 'telegram', url: '/.netlify/functions/telegram-api' },
            { name: 'terminal', url: '/.netlify/functions/terminal' }
        ];
        
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'check' })
                });
                
                this.apiStatus[endpoint.name] = response.ok ? 'healthy' : 'unhealthy';
            } catch (error) {
                this.apiStatus[endpoint.name] = 'unhealthy';
            }
        }
        
        this.updateSystemStatus();
    }
    
    // Check token validity
    async checkTokenValidity() {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            return;
        }
        
        try {
            const result = await window.authManager.verifyToken();
            if (!result.valid) {
                this.showToast('Session expired. Please login again.', 'warning');
                await this.handleLogout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
        }
    }
    
    // Handle quick action
    handleQuickAction(action) {
        console.log(`⚡ Quick action: ${action}`);
        
        switch (action) {
            case 'create-bot':
                this.showCreateBotModal();
                break;
                
            case 'monitor-cpu':
                this.switchSection('monitoring');
                break;
                
            case 'monitor-memory':
                this.switchSection('monitoring');
                break;
                
            case 'system-info':
                this.showSystemInfo();
                break;
                
            case 'start-all-bots':
                this.startAllBots();
                break;
                
            case 'restart-services':
                this.restartServices();
                break;
                
            case 'stop-all-bots':
                this.stopAllBots();
                break;
                
            case 'view-logs':
                this.switchSection('logs');
                break;
                
            case 'create-userbot':
                this.switchSection('telegram');
                break;
                
            case 'open-terminal':
                this.switchSection('terminal');
                break;
                
            case 'quick-start':
                this.showQuickStartGuide();
                break;
                
            case 'clear-activity':
                this.clearActivity();
                break;
                
            default:
                console.warn(`Unknown quick action: ${action}`);
        }
    }
    
    // Show create bot modal
    showCreateBotModal() {
        this.showToast('Create bot feature coming soon!', 'info');
        // Implementation would go here
    }
    
    // Show system info
    showSystemInfo() {
        const info = {
            'App Version': 'TeleBot Pro v2.0.0',
            'Browser': navigator.userAgent,
            'Screen': `${window.screen.width} x ${window.screen.height}`,
            'Viewport': `${window.innerWidth} x ${window.innerHeight}`,
            'Online': navigator.onLine ? 'Yes' : 'No',
            'Cookies': navigator.cookieEnabled ? 'Enabled' : 'Disabled',
            'Local Storage': localStorage ? 'Available' : 'Not Available',
            'Session Storage': sessionStorage ? 'Available' : 'Not Available',
            'Memory': performance.memory ? 
                `${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)}MB / ${(performance.memory.totalJSHeapSize / 1048576).toFixed(1)}MB` : 
                'Not Available'
        };
        
        let infoHTML = '<div class="system-info">';
        for (const [key, value] of Object.entries(info)) {
            infoHTML += `
                <div class="info-row">
                    <span class="info-key">${key}:</span>
                    <span class="info-value">${value}</span>
                </div>
            `;
        }
        infoHTML += '</div>';
        
        window.uiComponents?.showModal('systemInfo', {
            title: 'System Information',
            content: infoHTML,
            size: 'medium'
        });
    }
    
    // Start all bots
    async startAllBots() {
        if (!window.botManager) return;
        
        if (confirm('Start all bots?')) {
            this.showToast('Starting all bots...', 'info');
            
            try {
                const results = await window.botManager.startAllBots();
                const successful = results.filter(r => r.success).length;
                
                this.showToast(`Started ${successful} bot(s)`, 'success');
                
                // Add notification
                window.uiComponents?.addNotification(
                    'Bots Started',
                    `Started ${successful} bot(s)`,
                    'success'
                );
                
            } catch (error) {
                this.showToast(`Failed to start bots: ${error.message}`, 'error');
            }
        }
    }
    
    // Stop all bots
    async stopAllBots() {
        if (!window.botManager) return;
        
        if (confirm('Stop all bots?')) {
            this.showToast('Stopping all bots...', 'info');
            
            try {
                const results = await window.botManager.stopAllBots();
                const successful = results.filter(r => r.success).length;
                
                this.showToast(`Stopped ${successful} bot(s)`, 'success');
                
                // Add notification
                window.uiComponents?.addNotification(
                    'Bots Stopped',
                    `Stopped ${successful} bot(s)`,
                    'warning'
                );
                
            } catch (error) {
                this.showToast(`Failed to stop bots: ${error.message}`, 'error');
            }
        }
    }
    
    // Restart services
    restartServices() {
        this.showToast('Restarting services...', 'info');
        
        // Simulate service restart
        setTimeout(() => {
            this.showToast('Services restarted successfully', 'success');
            
            // Add notification
            window.uiComponents?.addNotification(
                'Services Restarted',
                'All services have been restarted',
                'info'
            );
            
            // Refresh data
            this.refreshAll();
        }, 2000);
    }
    
    // Show quick start guide
    showQuickStartGuide() {
        const guideHTML = `
            <div class="quick-start-guide">
                <div class="guide-step">
                    <h4><i class="fas fa-robot"></i> Step 1: Create a Telegram Bot</h4>
                    <p>Go to @BotFather on Telegram and create a new bot. Save the bot token.</p>
                </div>
                
                <div class="guide-step">
                    <h4><i class="fab fa-telegram"></i> Step 2: Connect Your Account</h4>
                    <p>Go to the Telegram section and connect your personal Telegram account.</p>
                </div>
                
                <div class="guide-step">
                    <h4><i class="fas fa-tasks"></i> Step 3: Schedule Auto-Text</h4>
                    <p>Use the Auto Text section to schedule messages to multiple chats.</p>
                </div>
                
                <div class="guide-step">
                    <h4><i class="fas fa-terminal"></i> Step 4: Use the Terminal</h4>
                    <p>Access the secure terminal for system monitoring and management.</p>
                </div>
                
                <div class="guide-actions">
                    <button class="btn btn-primary" onclick="app.switchSection('bot-control')">
                        <i class="fas fa-robot"></i> Create Bot
                    </button>
                    <button class="btn btn-success" onclick="app.switchSection('telegram')">
                        <i class="fab fa-telegram"></i> Connect Account
                    </button>
                    <button class="btn btn-info" onclick="app.switchSection('auto-text')">
                        <i class="fas fa-tasks"></i> Auto Text
                    </button>
                </div>
            </div>
        `;
        
        window.uiComponents?.showModal('quickStart', {
            title: 'Quick Start Guide',
            content: guideHTML,
            size: 'large'
        });
    }
    
    // Clear activity
    clearActivity() {
        const activityList = document.getElementById('activityList');
        if (activityList) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">Activity cleared</div>
                        <div class="activity-time">Just now</div>
                    </div>
                </div>
            `;
            
            this.showToast('Activity cleared', 'success');
        }
    }
    
    // Initialize terminal
    initializeTerminal() {
        // Set terminal elements
        const output = document.getElementById('terminalOutput');
        const input = document.getElementById('commandInput');
        
        if (output && input && window.terminalManager) {
            window.terminalManager.setTerminalElements(output, input);
            
            // Setup terminal event listeners
            const executeBtn = document.getElementById('executeCommand');
            const clearBtn = document.getElementById('clearTerminal');
            const copyBtn = document.getElementById('copyTerminal');
            const downloadBtn = document.getElementById('downloadTerminal');
            const fullscreenBtn = document.getElementById('terminalFullscreen');
            const historyBtn = document.getElementById('terminalHistory');
            const helpBtn = document.getElementById('terminalHelp');
            
            if (executeBtn) {
                executeBtn.addEventListener('click', () => {
                    window.terminalManager.executeCommand();
                });
            }
            
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    window.terminalManager.clearTerminal();
                });
            }
            
            if (copyBtn) {
                copyBtn.addEventListener('click', () => {
                    window.terminalManager.copyOutput();
                });
            }
            
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    window.terminalManager.downloadOutput();
                });
            }
            
            if (fullscreenBtn) {
                fullscreenBtn.addEventListener('click', () => {
                    window.terminalManager.toggleFullscreen();
                });
            }
            
            if (historyBtn) {
                historyBtn.addEventListener('click', () => {
                    window.terminalManager.showHistory();
                });
            }
            
            if (helpBtn) {
                helpBtn.addEventListener('click', () => {
                    window.terminalManager.showHelp();
                });
            }
            
            // Example commands
            document.querySelectorAll('.example-command').forEach(button => {
                button.addEventListener('click', (e) => {
                    const command = e.currentTarget.getAttribute('data-command');
                    if (input) {
                        input.value = command;
                        input.focus();
                    }
                });
            });
            
            // Focus input
            setTimeout(() => {
                window.terminalManager.focusInput();
            }, 100);
        }
    }
    
    // Initialize bot control
    initializeBotControl() {
        // This would initialize the bot control interface
        // For now, just log
        console.log('Initializing bot control interface');
    }
    
    // Initialize telegram
    initializeTelegram() {
        // This would initialize the telegram interface
        // For now, just log
        console.log('Initializing telegram interface');
    }
    
    // Toggle notifications panel
    toggleNotificationsPanel() {
        const panel = document.getElementById('notificationsPanel');
        if (panel) {
            panel.classList.toggle('active');
        }
    }
    
    // Hide notifications panel
    hideNotificationsPanel() {
        const panel = document.getElementById('notificationsPanel');
        if (panel) {
            panel.classList.remove('active');
        }
    }
    
    // Update theme icon
    updateThemeIcon() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;
        
        const icon = themeToggle.querySelector('i');
        if (!icon) return;
        
        const currentTheme = window.uiComponents?.getCurrentTheme() || 'light';
        icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    // Refresh all
    refreshAll() {
        this.showToast('Refreshing all data...', 'info');
        
        // Refresh bot status
        this.updateBotStatus();
        
        // Refresh system stats
        this.updateSystemStats();
        
        // Check API status
        this.checkAPIStatus();
        
        // Refresh current section
        this.refreshCurrentSection();
        
        this.showToast('Refresh complete', 'success');
    }
    
    // Refresh current section
    refreshCurrentSection() {
        switch (this.currentSection) {
            case 'dashboard':
                // Already handled by updateSystemStats
                break;
            case 'terminal':
                // Terminal doesn't need refresh
                break;
            case 'bot-control':
                // Refresh bot list
                if (window.botManager) {
                    window.botManager.listBots();
                }
                break;
            case 'telegram':
                // Refresh sessions
                if (window.telegramManager) {
                    // This would refresh telegram sessions
                }
                break;
        }
    }
    
    // Handle online
    handleOnline() {
        this.showToast('Connection restored', 'success');
        
        // Refresh all data
        this.refreshAll();
        
        // Add notification
        window.uiComponents?.addNotification(
            'Connection Restored',
            'Network connection has been restored',
            'success'
        );
    }
    
    // Handle offline
    handleOffline() {
        this.showToast('Connection lost', 'warning');
        
        // Add notification
        window.uiComponents?.addNotification(
            'Connection Lost',
            'Network connection has been lost',
            'warning'
        );
    }
    
    // Cleanup intervals
    cleanupIntervals() {
        // Clear session timer
        if (this.sessionTimer) {
            clearInterval(this.sessionTimer);
            this.sessionTimer = null;
        }
        
        // Clear all update intervals
        this.updateIntervals.forEach(interval => {
            clearInterval(interval);
        });
        this.updateIntervals = [];
    }
    
    // Cleanup
    cleanup() {
        console.log('🧹 Cleaning up application...');
        
        // Cleanup intervals
        this.cleanupIntervals();
        
        // Cleanup managers if they have cleanup methods
        if (window.botManager && typeof window.botManager.cleanup === 'function') {
            window.botManager.cleanup();
        }
        
        if (window.telegramManager && typeof window.telegramManager.cleanup === 'function') {
            window.telegramManager.cleanup();
        }
        
        if (window.terminalManager && typeof window.terminalManager.cleanup === 'function') {
            window.terminalManager.cleanup();
        }
        
        console.log('✅ Cleanup complete');
    }
    
    // Show toast (wrapper)
    showToast(message, type = 'info') {
        window.uiComponents?.showToast(message, type);
    }
    
    // Capitalize string
    capitalize(str) {
        return str.replace(/\b\w/g, char => char.toUpperCase());
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
}

// Create global instance
window.app = new TeleBotApp();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeleBotApp;
}
