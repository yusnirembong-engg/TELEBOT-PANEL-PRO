/**
 * TeleBot Pro v2.0.0 - UI Components
 * Handle UI components, modals, toasts, and notifications
 */

class UIComponents {
    constructor() {
        this.modals = new Map();
        this.toasts = [];
        this.notifications = [];
        this.sidebarCollapsed = false;
        this.currentTheme = 'dark';
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('🎨 UI Components initializing...');
        this.loadTheme();
        
        // Wait for DOM to be ready
        setTimeout(() => {
            this.createContainers();
            this.setupEventListeners();
            this.initializeDashboard();
            
            // Check if we're already logged in
            if (window.authManager && window.authManager.isAuthenticated()) {
                console.log('✅ User already logged in, initializing UI');
                this.initializeAfterLogin();
            }
            
            console.log('✅ UI Components initialized');
        }, 100);
    }
    
    // TAMBAHKAN fungsi ini
    initializeAfterLogin() {
        // Update user info
        const user = window.authManager?.getUser();
        const userElement = document.getElementById('currentUser');
        if (userElement && user) {
            userElement.textContent = user.username || 'Admin';
        }
        
        // Switch to dashboard
        this.switchSection('dashboard');
        
        // Update stats
        this.updateDashboardStats();
        
        // Show welcome
        this.showToast('Welcome back!', 'success');
    }
    
    initializeDashboard() {
        console.log('📊 Initializing dashboard...');
        
        // Setup dashboard event listeners
        this.setupDashboardEventListeners();
        
        // Load initial data
        this.loadDashboardData();
    }
    
    setupDashboardEventListeners() {
        // Dashboard buttons
        const quickStartBtn = document.getElementById('quickStartBtn');
        if (quickStartBtn) {
            quickStartBtn.addEventListener('click', () => {
                this.showCreateBotModal();
            });
        }
        
        const refreshDashboard = document.getElementById('refreshDashboard');
        if (refreshDashboard) {
            refreshDashboard.addEventListener('click', () => {
                this.updateDashboardStats();
                this.showToast('Dashboard refreshed', 'info');
            });
        }
        
        // Clear activity
        const clearActivity = document.getElementById('clearActivity');
        if (clearActivity) {
            clearActivity.addEventListener('click', () => {
                this.clearActivityLog();
            });
        }
    }
    
    async loadDashboardData() {
        try {
            // Load bots count
            if (window.botManager) {
                const bots = window.botManager.getAllBots();
                this.updateDashboardStats();
            }
            
            // Load system info
            this.updateSystemInfo();
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }
    
    updateSystemInfo() {
        // Update CPU usage (simulated)
        const cpuElement = document.getElementById('cpuUsage');
        if (cpuElement) {
            const cpuUsage = Math.floor(Math.random() * 30) + 10;
            cpuElement.textContent = `${cpuUsage}%`;
        }
        
        // Update memory usage (simulated)
        const memoryElement = document.getElementById('memoryUsage');
        if (memoryElement) {
            const memoryUsage = Math.floor(Math.random() * 50) + 30;
            memoryElement.textContent = `${memoryUsage}%`;
        }
        
        // Update uptime
        const uptimeElement = document.getElementById('uptimeDays');
        if (uptimeElement) {
            uptimeElement.textContent = '1';
        }
    }
    
    clearActivityLog() {
        const activityList = document.getElementById('activityList');
        if (activityList) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas fa-info-circle"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">Activity log cleared</div>
                        <div class="activity-time">Just now</div>
                    </div>
                </div>
            `;
            this.showToast('Activity log cleared', 'info');
        }
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', this.currentTheme);
    }
    
    createContainers() {
        // Toast container
        if (!document.getElementById('toastContainer')) {
            const container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container toast-container-top-right';
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
        }
        
        // Modal container
        if (!document.getElementById('modalContainer')) {
            const container = document.createElement('div');
            container.id = 'modalContainer';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: none;
            `;
            document.body.appendChild(container);
        }
    }
    
    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Sidebar toggle
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        document.getElementById('sidebarToggleMobile')?.addEventListener('click', () => {
            this.toggleSidebar();
        });
        
        // Notifications
        document.getElementById('notificationsBtn')?.addEventListener('click', () => {
            this.toggleNotifications();
        });
        
        document.getElementById('closeNotifications')?.addEventListener('click', () => {
            this.hideNotifications();
        });
        
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.switchSection(section);
            });
        });
        
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });
        
        // Refresh button
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refreshAll();
        });
        
        // Settings button
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.showSettings();
        });
    }
    
    // Section switching
    switchSection(sectionId) {
        console.log(`Switching to section: ${sectionId}`);
        
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        const sectionElement = document.getElementById(sectionId + 'Section');
        if (sectionElement) {
            sectionElement.classList.add('active');
        } else {
            // Try dynamic content
            this.loadDynamicSection(sectionId);
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
        this.updateBreadcrumb(sectionId);
        
        // Trigger section change event
        this.emitEvent('section-change', sectionId);
        
        // Section-specific initialization
        this.initializeSection(sectionId);
    }
    
    updateBreadcrumb(sectionId) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;
        
        const sectionNames = {
            'dashboard': 'Dashboard',
            'terminal': 'Terminal',
            'bot-control': 'Bot Control',
            'telegram': 'Telegram User Bot',
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
        
        breadcrumb.innerHTML = `
            <span><i class="fas fa-home"></i> ${sectionNames[sectionId] || sectionId}</span>
        `;
    }
    
    initializeSection(sectionId) {
        switch(sectionId) {
            case 'terminal':
                this.initializeTerminal();
                break;
            case 'bot-control':
                this.initializeBotControl();
                break;
            case 'telegram':
                this.initializeTelegram();
                break;
            case 'auto-text':
                this.initializeAutoText();
                break;
        }
    }
    
    initializeTerminal() {
        // Setup terminal if terminal manager exists
        if (window.terminalManager) {
            const terminalOutput = document.getElementById('terminalOutput');
            const commandInput = document.getElementById('commandInput');
            
            if (terminalOutput && commandInput) {
                window.terminalManager.setTerminalElements(terminalOutput, commandInput);
                
                // Setup terminal event listeners
                document.getElementById('executeCommand')?.addEventListener('click', () => {
                    window.terminalManager.executeCommand();
                });
                
                document.getElementById('terminalExecute')?.addEventListener('click', () => {
                    window.terminalManager.executeCommand();
                });
                
                document.getElementById('clearTerminal')?.addEventListener('click', () => {
                    window.terminalManager.clearTerminal();
                });
                
                document.getElementById('copyTerminal')?.addEventListener('click', () => {
                    window.terminalManager.copyOutput();
                });
                
                document.getElementById('downloadTerminal')?.addEventListener('click', () => {
                    window.terminalManager.downloadOutput();
                });
                
                document.getElementById('terminalFullscreen')?.addEventListener('click', () => {
                    window.terminalManager.toggleFullscreen();
                });
                
                document.getElementById('terminalHelp')?.addEventListener('click', () => {
                    window.terminalManager.showHelp();
                });
                
                document.getElementById('terminalHistory')?.addEventListener('click', () => {
                    window.terminalManager.showHistory();
                });
                
                // Example commands
                document.querySelectorAll('.example-command').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const command = e.currentTarget.getAttribute('data-command');
                        if (commandInput) {
                            commandInput.value = command;
                            commandInput.focus();
                        }
                    });
                });
                
                // Focus input
                setTimeout(() => {
                    commandInput.focus();
                }, 100);
            }
        }
    }
    
    initializeBotControl() {
        // Setup bot control if bot manager exists
        if (window.botManager) {
            // Load bots
            this.loadBots();
            
            // Setup event listeners
            document.getElementById('createBotBtn')?.addEventListener('click', () => {
                this.showCreateBotModal();
            });
            
            document.getElementById('refreshBotsBtn')?.addEventListener('click', () => {
                this.loadBots();
            });
            
            document.getElementById('createFirstBot')?.addEventListener('click', () => {
                this.showCreateBotModal();
            });
            
            document.getElementById('backToListBtn')?.addEventListener('click', () => {
                this.showBotList();
            });
            
            // Quick actions
            document.querySelectorAll('.quick-actions [data-action]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const action = e.currentTarget.getAttribute('data-action');
                    this.handleBotAction(action);
                });
            });
            
            // Search and filter
            const searchInput = document.getElementById('botSearch');
            const filterSelect = document.getElementById('botFilter');
            
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    this.filterBots(searchInput.value, filterSelect?.value);
                });
            }
            
            if (filterSelect) {
                filterSelect.addEventListener('change', () => {
                    this.filterBots(searchInput?.value, filterSelect.value);
                });
            }
        }
    }
    
    // PERBAIKAN: initializeTelegram dengan penanganan error yang lebih baik
    initializeTelegram() {
        console.log('📱 Initializing Telegram User Bot section...');
        
        // Tunggu sebentar untuk memastikan manager siap
        setTimeout(() => {
            if (window.userBotManager) {
                console.log('✅ UserBot Manager found, showing interface...');
                try {
                    window.userBotManager.showUserBotInterface();
                    this.showToast('Telegram User Bot interface loaded', 'success');
                } catch (error) {
                    console.error('Error showing user bot interface:', error);
                    this.showFallbackUI('Telegram User Bot', 'Failed to load Telegram User Bot interface: ' + error.message);
                }
            } else {
                console.error('❌ UserBot Manager not available');
                this.showFallbackUI('Telegram User Bot', 'UserBot Manager is not loaded. Please check if the manager is properly initialized.');
            }
        }, 500);
    }
    
    // Helper method untuk menampilkan UI fallback
    showFallbackUI(sectionName, errorMessage) {
        const content = document.getElementById('telegramContent') || document.getElementById('dynamicContent');
        if (content) {
            content.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #f59e0b; margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px; color: #ef4444;">${sectionName} Error</h3>
                    <p style="margin-bottom: 20px; color: #6b7280;">${errorMessage}</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" onclick="location.reload()" style="display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fas fa-sync-alt"></i> Refresh Page
                        </button>
                        <button class="btn btn-secondary" onclick="window.uiComponents.switchSection('dashboard')" style="display: inline-flex; align-items: center; gap: 8px;">
                            <i class="fas fa-arrow-left"></i> Back to Dashboard
                        </button>
                    </div>
                    <div style="margin-top: 30px; padding: 20px; background: #1f2937; border-radius: 8px; text-align: left;">
                        <h4 style="margin-bottom: 10px; color: #d1d5db;">Debug Information:</h4>
                        <pre style="color: #9ca3af; font-size: 12px; overflow-x: auto;">
UserBot Manager: ${window.userBotManager ? 'Available' : 'Not Available'}
Bot Manager: ${window.botManager ? 'Available' : 'Not Available'}
Auth Manager: ${window.authManager ? 'Available' : 'Not Available'}
Console Error: ${errorMessage}
                        </pre>
                    </div>
                </div>
            `;
        } else {
            // Fallback jika element tidak ditemukan
            document.body.innerHTML += `
                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1f2937; padding: 30px; border-radius: 12px; text-align: center; z-index: 10000; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #f59e0b; margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px; color: white;">${sectionName} Error</h3>
                    <p style="margin-bottom: 20px; color: #9ca3af;">${errorMessage}</p>
                    <button onclick="location.reload()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        <i class="fas fa-sync-alt"></i> Refresh Page
                    </button>
                </div>
            `;
        }
        
        // Log error untuk debugging
        console.error(`Error in ${sectionName}:`, errorMessage);
        this.showToast(`Failed to load ${sectionName}: ${errorMessage}`, 'error');
    }
    
    initializeAutoText() {
        console.log('📝 Initializing Auto Text section...');
        
        // Initialize auto-text section dengan penanganan error
        setTimeout(() => {
            if (window.userBotManager) {
                try {
                    window.userBotManager.showAutoTextInterface();
                    this.showToast('Auto Text interface loaded', 'success');
                } catch (error) {
                    console.error('Error showing auto text interface:', error);
                    this.showFallbackUI('Auto Text', 'Failed to load Auto Text interface: ' + error.message);
                }
            } else {
                console.error('Auto Text Manager not available');
                this.showFallbackUI('Auto Text', 'Auto Text Manager is not loaded. Please check if the manager is properly initialized.');
            }
        }, 500);
    }
    
    async loadBots() {
        if (!window.botManager) return;
        
        try {
            const result = await window.botManager.listBots();
            if (result.success) {
                this.renderBots(result.bots);
            } else {
                this.showToast('Failed to load bots: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error loading bots:', error);
            this.showToast('Error loading bots', 'error');
        }
    }
    
    renderBots(bots) {
        const botsList = document.getElementById('botsList');
        if (!botsList) return;
        
        if (bots.length === 0) {
            botsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-robot"></i>
                    <h3>No Bots Yet</h3>
                    <p>Create your first Telegram bot to get started</p>
                    <button class="btn btn-primary" id="createFirstBot">
                        <i class="fas fa-plus"></i> Create Your First Bot
                    </button>
                </div>
            `;
            
            // Re-attach event listener
            document.getElementById('createFirstBot')?.addEventListener('click', () => {
                this.showCreateBotModal();
            });
            
            return;
        }
        
        let html = '';
        bots.forEach(bot => {
            const statusClass = {
                'running': 'success',
                'stopped': 'danger',
                'error': 'warning',
                'created': 'info'
            }[bot.status] || 'secondary';
            
            const statusIcon = {
                'running': 'fa-play-circle',
                'stopped': 'fa-stop-circle',
                'error': 'fa-exclamation-circle',
                'created': 'fa-info-circle'
            }[bot.status] || 'fa-question-circle';
            
            html += `
                <div class="bot-card card" data-bot-id="${bot.id}">
                    <div class="bot-card-header">
                        <div class="bot-card-title">
                            <div class="bot-avatar">
                                <i class="fas fa-robot"></i>
                            </div>
                            <div class="bot-info">
                                <h4>${bot.name}</h4>
                                <div class="bot-meta">
                                    <span class="bot-id">${bot.id.substring(0, 8)}...</span>
                                    <span class="bot-status status-${statusClass}">
                                        <i class="fas ${statusIcon}"></i> ${bot.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="bot-actions">
                            <button class="btn-icon btn-sm" data-action="bot-details" title="Details">
                                <i class="fas fa-info-circle"></i>
                            </button>
                            ${bot.status === 'running' ? `
                                <button class="btn-icon btn-sm btn-warning" data-action="restart-bot" title="Restart">
                                    <i class="fas fa-redo"></i>
                                </button>
                                <button class="btn-icon btn-sm btn-danger" data-action="stop-bot" title="Stop">
                                    <i class="fas fa-stop"></i>
                                </button>
                            ` : `
                                <button class="btn-icon btn-sm btn-success" data-action="start-bot" title="Start">
                                    <i class="fas fa-play"></i>
                                </button>
                            `}
                            <button class="btn-icon btn-sm btn-danger" data-action="delete-bot" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="bot-card-body">
                        <div class="bot-stats">
                            <div class="stat-item">
                                <i class="fas fa-paper-plane"></i>
                                <span>Messages: <strong>${bot.stats?.messagesSent || 0}</strong></span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-users"></i>
                                <span>Users: <strong>${bot.stats?.users || 0}</strong></span>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-clock"></i>
                                <span>Uptime: <strong>${window.botManager?.getBotUptime(bot.id) || '0s'}</strong></span>
                            </div>
                        </div>
                        
                        <div class="bot-details">
                            <div class="detail-item">
                                <span class="detail-label">Token:</span>
                                <span class="detail-value code">${bot.token}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Created:</span>
                                <span class="detail-value">${new Date(bot.createdAt).toLocaleDateString()}</span>
                            </div>
                            ${bot.startedAt ? `
                                <div class="detail-item">
                                    <span class="detail-label">Started:</span>
                                    <span class="detail-value">${new Date(bot.startedAt).toLocaleDateString()}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        botsList.innerHTML = html;
        
        // Attach event listeners to bot cards
        document.querySelectorAll('.bot-card [data-action]').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.stopPropagation();
                const action = e.currentTarget.getAttribute('data-action');
                const botCard = e.currentTarget.closest('.bot-card');
                const botId = botCard?.getAttribute('data-bot-id');
                
                if (botId) {
                    await this.handleBotCardAction(action, botId);
                }
            });
        });
        
        // Make entire bot card clickable for details
        document.querySelectorAll('.bot-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Only trigger if not clicking a button
                if (!e.target.closest('button')) {
                    const botId = card.getAttribute('data-bot-id');
                    this.showBotDetails(botId);
                }
            });
        });
    }
    
    async handleBotCardAction(action, botId) {
        if (!window.botManager) return;
        
        switch(action) {
            case 'start-bot':
                this.showToast(`Starting bot...`, 'info');
                const startResult = await window.botManager.startBot(botId);
                if (startResult.success) {
                    this.showToast('Bot started successfully', 'success');
                    this.loadBots();
                } else {
                    this.showToast(`Failed to start bot: ${startResult.error}`, 'error');
                }
                break;
                
            case 'stop-bot':
                this.showToast(`Stopping bot...`, 'info');
                const stopResult = await window.botManager.stopBot(botId);
                if (stopResult.success) {
                    this.showToast('Bot stopped successfully', 'success');
                    this.loadBots();
                } else {
                    this.showToast(`Failed to stop bot: ${stopResult.error}`, 'error');
                }
                break;
                
            case 'restart-bot':
                this.showToast(`Restarting bot...`, 'info');
                const restartResult = await window.botManager.restartBot(botId);
                if (restartResult.success) {
                    this.showToast('Bot restarted successfully', 'success');
                    this.loadBots();
                } else {
                    this.showToast(`Failed to restart bot: ${restartResult.error}`, 'error');
                }
                break;
                
            case 'delete-bot':
                if (confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
                    this.showToast(`Deleting bot...`, 'info');
                    const deleteResult = await window.botManager.deleteBot(botId);
                    if (deleteResult.success) {
                        this.showToast('Bot deleted successfully', 'success');
                        this.loadBots();
                    } else {
                        this.showToast(`Failed to delete bot: ${deleteResult.error}`, 'error');
                    }
                }
                break;
                
            case 'bot-details':
                this.showBotDetails(botId);
                break;
        }
    }
    
    async showBotDetails(botId) {
        if (!window.botManager) return;
        
        const bot = window.botManager.getBot(botId);
        if (!bot) return;
        
        // Show details section, hide list
        const listSection = document.querySelector('.bots-list')?.closest('.section-block');
        const detailsSection = document.getElementById('botDetailsSection');
        
        if (listSection) listSection.style.display = 'none';
        if (detailsSection) detailsSection.style.display = 'block';
        
        // Load bot details
        const detailsContent = document.getElementById('botDetails');
        if (detailsContent) {
            detailsContent.innerHTML = `
                <div class="bot-details-view">
                    <div class="detail-section">
                        <h3><i class="fas fa-info-circle"></i> Bot Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Name:</span>
                                <span class="detail-value">${bot.name}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">ID:</span>
                                <span class="detail-value code">${bot.id}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value status-${bot.status}">${bot.status}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Token:</span>
                                <span class="detail-value code">${bot.token}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Created:</span>
                                <span class="detail-value">${new Date(bot.createdAt).toLocaleString()}</span>
                            </div>
                            ${bot.startedAt ? `
                                <div class="detail-item">
                                    <span class="detail-label">Started:</span>
                                    <span class="detail-value">${new Date(bot.startedAt).toLocaleString()}</span>
                                </div>
                            ` : ''}
                            ${bot.stoppedAt ? `
                                <div class="detail-item">
                                    <span class="detail-label">Stopped:</span>
                                    <span class="detail-value">${new Date(bot.stoppedAt).toLocaleString()}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3><i class="fas fa-chart-bar"></i> Statistics</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Messages Sent:</span>
                                <span class="detail-value">${bot.stats?.messagesSent || 0}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Commands Received:</span>
                                <span class="detail-value">${bot.stats?.commandsReceived || 0}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Errors:</span>
                                <span class="detail-value">${bot.stats?.errors || 0}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Uptime:</span>
                                <span class="detail-value">${window.botManager.getBotUptime(bot.id)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3><i class="fas fa-cog"></i> Settings</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">Auto Start:</span>
                                <span class="detail-value">${bot.settings?.autoStart ? 'Yes' : 'No'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Auto Restart:</span>
                                <span class="detail-value">${bot.settings?.autoRestart ? 'Yes' : 'No'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Log Messages:</span>
                                <span class="detail-value">${bot.settings?.logMessages ? 'Yes' : 'No'}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${bot.botInfo ? `
                        <div class="detail-section">
                            <h3><i class="fas fa-robot"></i> Bot Information from Telegram</h3>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <span class="detail-label">Username:</span>
                                    <span class="detail-value">@${bot.botInfo.username}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">First Name:</span>
                                    <span class="detail-value">${bot.botInfo.first_name}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">ID:</span>
                                    <span class="detail-value">${bot.botInfo.id}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Can Join Groups:</span>
                                    <span class="detail-value">${bot.botInfo.can_join_groups ? 'Yes' : 'No'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Can Read Messages:</span>
                                    <span class="detail-value">${bot.botInfo.can_read_all_group_messages ? 'Yes' : 'No'}</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">Supports Inline:</span>
                                    <span class="detail-value">${bot.botInfo.supports_inline_queries ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="closeBotDetails">Close</button>
                        ${bot.status === 'running' ? `
                            <button class="btn btn-warning" id="restartBotBtn" data-bot-id="${bot.id}">
                                <i class="fas fa-redo"></i> Restart
                            </button>
                            <button class="btn btn-danger" id="stopBotBtn" data-bot-id="${bot.id}">
                                <i class="fas fa-stop"></i> Stop
                            </button>
                        ` : `
                            <button class="btn btn-success" id="startBotBtn" data-bot-id="${bot.id}">
                                <i class="fas fa-play"></i> Start
                            </button>
                        `}
                        <button class="btn btn-danger" id="deleteBotBtn" data-bot-id="${bot.id}">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listeners to buttons
            document.getElementById('closeBotDetails')?.addEventListener('click', () => {
                this.showBotList();
            });
            
            document.getElementById('startBotBtn')?.addEventListener('click', async () => {
                await this.handleBotCardAction('start-bot', botId);
                this.showBotDetails(botId); // Refresh details
            });
            
            document.getElementById('stopBotBtn')?.addEventListener('click', async () => {
                await this.handleBotCardAction('stop-bot', botId);
                this.showBotDetails(botId); // Refresh details
            });
            
            document.getElementById('restartBotBtn')?.addEventListener('click', async () => {
                await this.handleBotCardAction('restart-bot', botId);
                this.showBotDetails(botId); // Refresh details
            });
            
            document.getElementById('deleteBotBtn')?.addEventListener('click', async () => {
                if (confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
                    await this.handleBotCardAction('delete-bot', botId);
                    this.showBotList();
                }
            });
        }
    }
    
    showBotList() {
        const listSection = document.querySelector('.bots-list')?.closest('.section-block');
        const detailsSection = document.getElementById('botDetailsSection');
        
        if (listSection) listSection.style.display = 'block';
        if (detailsSection) detailsSection.style.display = 'none';
    }
    
    showCreateBotModal() {
        this.showModal('createBot', {
            title: 'Create New Bot',
            size: 'medium',
            content: `
                <form id="createBotForm">
                    <div class="form-group">
                        <label class="form-label">Bot Name</label>
                        <input type="text" id="botName" class="form-input" 
                               placeholder="Enter bot name" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Bot Token</label>
                        <input type="text" id="botToken" class="form-input" 
                               placeholder="Enter bot token (starts with bot)" required>
                        <small class="form-help">
                            Get token from <a href="https://t.me/BotFather" target="_blank">@BotFather</a>
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Description (Optional)</label>
                        <textarea id="botDescription" class="form-input" 
                                  placeholder="Enter bot description" rows="3"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <div class="form-check">
                            <input type="checkbox" id="autoStartBot" checked>
                            <label for="autoStartBot">Start bot automatically after creation</label>
                        </div>
                        <div class="form-check">
                            <input type="checkbox" id="saveBotConfig" checked>
                            <label for="saveBotConfig">Save configuration</label>
                        </div>
                    </div>
                    
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle"></i>
                        <small>The bot will be registered with Telegram and available for use.</small>
                    </div>
                </form>
            `,
            footer: `
                <button type="button" class="btn btn-secondary" data-action="close">Cancel</button>
                <button type="button" class="btn btn-success" id="createBotSubmit">
                    <i class="fas fa-plus"></i> Create Bot
                </button>
            `
        });
        
        // Add submit handler
        document.getElementById('createBotSubmit')?.addEventListener('click', async () => {
            await this.handleCreateBot();
        });
    }
    
    async handleCreateBot() {
        const name = document.getElementById('botName')?.value;
        const token = document.getElementById('botToken')?.value;
        const description = document.getElementById('botDescription')?.value;
        const autoStart = document.getElementById('autoStartBot')?.checked;
        
        if (!name || !token) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }
        
        // Validate token
        if (!token.startsWith('bot')) {
            this.showToast('Token must start with "bot"', 'error');
            return;
        }
        
        this.showToast('Creating bot...', 'info');
        
        if (window.botManager) {
            const result = await window.botManager.createBot(token, name, description);
            
            if (result.success) {
                this.showToast('Bot created successfully!', 'success');
                this.hideModal('createBotModal');
                
                // Auto-start if selected
                if (autoStart && result.botId) {
                    await window.botManager.startBot(result.botId);
                    this.showToast('Bot started successfully', 'success');
                }
                
                // Refresh bot list
                this.loadBots();
            } else {
                this.showToast(`Failed to create bot: ${result.error}`, 'error');
            }
        } else {
            this.showToast('Bot manager not available', 'error');
        }
    }
    
    handleBotAction(action) {
        // Handle bot control quick actions
        switch(action) {
            case 'start-selected':
                this.showToast('Starting selected bots...', 'info');
                // Implementation would go here
                break;
                
            case 'restart-selected':
                this.showToast('Restarting selected bots...', 'info');
                // Implementation would go here
                break;
                
            case 'stop-selected':
                this.showToast('Stopping selected bots...', 'info');
                // Implementation would go here
                break;
                
            case 'send-message':
                this.showToast('Send message feature coming soon!', 'info');
                break;
                
            case 'view-logs':
                this.showToast('View logs feature coming soon!', 'info');
                break;
        }
    }
    
    filterBots(searchTerm = '', filter = 'all') {
        const botCards = document.querySelectorAll('.bot-card');
        const lowerSearch = searchTerm.toLowerCase();
        
        botCards.forEach(card => {
            const botId = card.getAttribute('data-bot-id');
            const bot = window.botManager?.getBot(botId);
            
            if (!bot) {
                card.style.display = 'none';
                return;
            }
            
            // Apply search filter
            const matchesSearch = !searchTerm || 
                bot.name.toLowerCase().includes(lowerSearch) ||
                bot.description?.toLowerCase().includes(lowerSearch) ||
                bot.token.toLowerCase().includes(lowerSearch);
            
            // Apply status filter
            const matchesStatus = filter === 'all' || bot.status === filter;
            
            card.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
        });
    }
    
    loadDynamicSection(sectionId) {
        const dynamicContent = document.getElementById('dynamicContent');
        if (!dynamicContent) return;
        
        // Load content based on section
        switch(sectionId) {
            case 'telegram':
                this.initializeTelegram();
                break;
                
            case 'auto-text':
                this.initializeAutoText();
                break;
                
            default:
                dynamicContent.innerHTML = `
                    <div class="coming-soon">
                        <i class="fas fa-tools"></i>
                        <h3>Coming Soon</h3>
                        <p>The ${sectionId} section is under development.</p>
                    </div>
                `;
        }
    }
    
    // Toast notifications
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }
        
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
            max-width: 350px;
        `;
        
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
            <button onclick="this.parentElement.remove()" 
                    style="background: none; border: none; color: white; cursor: pointer; padding: 4px 8px; margin-left: 10px;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.3s ease forwards';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, duration);
        
        return toast;
    }
    
    // Modal system
    showModal(id, options = {}) {
        const container = document.getElementById('modalContainer');
        if (!container) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = id + 'Modal';
        
        const sizeClass = options.size || 'medium';
        const sizeStyles = {
            'small': 'max-width: 400px;',
            'medium': 'max-width: 600px;',
            'large': 'max-width: 800px;',
            'xlarge': 'max-width: 95%; max-height: 95vh;'
        };
        
        modal.innerHTML = `
            <div class="modal-overlay" onclick="window.uiComponents.hideModal('${id}')"></div>
            <div class="modal-content modal-${sizeClass}" style="${sizeStyles[sizeClass] || ''}">
                <div class="modal-header">
                    <h3>${options.title || 'Modal'}</h3>
                    <button class="modal-close" onclick="window.uiComponents.hideModal('${id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${options.content || ''}
                </div>
                ${options.footer ? `
                <div class="modal-footer">
                    ${options.footer}
                </div>
                ` : ''}
            </div>
        `;
        
        container.innerHTML = '';
        container.appendChild(modal);
        container.style.display = 'block';
        
        // Store modal reference
        this.modals.set(id, modal);
        
        // Add event listeners to footer buttons
        setTimeout(() => {
            modal.querySelectorAll('[data-action]').forEach(button => {
                const action = button.getAttribute('data-action');
                if (action === 'close') {
                    button.addEventListener('click', () => {
                        this.hideModal(id);
                    });
                }
            });
        }, 10);
        
        return modal;
    }
    
    hideModal(id) {
        const container = document.getElementById('modalContainer');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
        this.modals.delete(id);
    }
    
    // Theme management
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        
        const icon = document.querySelector('#themeToggle i');
        if (icon) {
            icon.className = this.currentTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
        
        this.showToast(`Switched to ${this.currentTheme} theme`, 'info');
    }
    
    // Sidebar management
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (sidebar && mainContent) {
            this.sidebarCollapsed = !this.sidebarCollapsed;
            sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
            mainContent.classList.toggle('expanded', this.sidebarCollapsed);
        }
    }
    
    // Notifications
    toggleNotifications() {
        const panel = document.getElementById('notificationsPanel');
        if (panel) {
            panel.classList.toggle('active');
        }
    }
    
    hideNotifications() {
        const panel = document.getElementById('notificationsPanel');
        if (panel) {
            panel.classList.remove('active');
        }
    }
    
    addNotification(title, message, type = 'info') {
        const list = document.getElementById('notificationsList');
        if (!list) return;
        
        const notification = document.createElement('div');
        notification.className = `notification-item notification-${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
                <div class="notification-time">Just now</div>
            </div>
        `;
        
        list.insertBefore(notification, list.firstChild);
        
        // Update badge
        const badge = document.getElementById('notificationCount');
        if (badge) {
            const count = parseInt(badge.textContent) || 0;
            badge.textContent = count + 1;
            badge.style.display = count === 0 ? 'flex' : 'flex';
        }
    }
    
    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'bell';
        }
    }
    
    // Other methods
    refreshAll() {
        this.showToast('Refreshing all data...', 'info');
        
        // Refresh bots
        if (window.botManager) {
            this.loadBots();
        }
        
        // Refresh sessions
        if (window.telegramManager) {
            window.telegramManager.getAllSessions().forEach(session => {
                window.telegramManager.getSessionStatus(session.sessionId);
            });
        }
        
        // Update dashboard stats
        this.updateDashboardStats();
    }
    
    updateDashboardStats() {
        // Update bot count
        if (window.botManager) {
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
        
        // Update Telegram sessions count
        if (window.telegramManager) {
            const sessions = window.telegramManager.getAllSessions();
            const connectedSessions = sessions.filter(s => s.status === 'connected').length;
            
            const userbotBadge = document.getElementById('userbotStatusBadge');
            if (userbotBadge) userbotBadge.textContent = connectedSessions;
        }
        
        // Update auto-text jobs count
        if (window.userBotManager) {
            const jobs = window.userBotManager.autoTextJobs?.size || 0;
            const autoTextBadge = document.getElementById('autoTextStatusBadge');
            if (autoTextBadge) autoTextBadge.textContent = jobs;
        }
    }
    
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear auth
            if (window.authManager) {
                window.authManager.logout();
            }
            
            // Show login screen
            const loginScreen = document.getElementById('loginScreen');
            const mainPanel = document.getElementById('mainPanel');
            
            if (loginScreen) loginScreen.style.display = 'block';
            if (mainPanel) mainPanel.style.display = 'none';
            
            // Reset form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) loginForm.reset();
            
            this.showToast('Logged out successfully', 'info');
        }
    }
    
    showSettings() {
        this.showModal('settings', {
            title: 'Settings',
            size: 'medium',
            content: `
                <div class="settings-form">
                    <div class="form-group">
                        <label class="form-label">Theme</label>
                        <select id="themeSelect" class="form-select">
                            <option value="dark" ${this.currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
                            <option value="light" ${this.currentTheme === 'light' ? 'selected' : ''}>Light</option>
                            <option value="auto">Auto (System)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Notifications</label>
                        <div class="form-check">
                            <input type="checkbox" id="enableNotifications" checked>
                            <label for="enableNotifications">Enable desktop notifications</label>
                        </div>
                        <div class="form-check">
                            <input type="checkbox" id="enableSounds">
                            <label for="enableSounds">Enable notification sounds</label>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Auto Refresh Interval</label>
                        <select id="refreshInterval" class="form-select">
                            <option value="30">30 seconds</option>
                            <option value="60" selected>1 minute</option>
                            <option value="300">5 minutes</option>
                            <option value="600">10 minutes</option>
                            <option value="0">Disabled</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Session Timeout</label>
                        <select id="sessionTimeout" class="form-select">
                            <option value="15">15 minutes</option>
                            <option value="30" selected>30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="1440">24 hours</option>
                            <option value="0">Never</option>
                        </select>
                    </div>
                </div>
            `,
            footer: `
                <button class="btn btn-secondary" data-action="close">Cancel</button>
                <button class="btn btn-primary" id="saveSettings">Save Settings</button>
            `
        });
        
        document.getElementById('saveSettings')?.addEventListener('click', () => {
            this.saveSettings();
            this.hideModal('settings');
        });
    }
    
    saveSettings() {
        const theme = document.getElementById('themeSelect')?.value;
        if (theme && theme !== 'auto') {
            this.currentTheme = theme;
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        }
        
        this.showToast('Settings saved', 'success');
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
        
        // Also dispatch DOM event
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
}

// Create global instance
window.uiComponents = new UIComponents();

// Make sure app can access it
if (window.app && !window.app.uiComponents) {
    window.app.uiComponents = window.uiComponents;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIComponents;
}
