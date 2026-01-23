/**
 * TeleBot Pro v2.0.0 - UserBot Manager
 * Handles user interface for Telegram user bot management
 * FIXED VERSION - No conflicts or errors
 */

class UserBotManager {
    constructor() {
        this.currentSection = null;
        this.currentSession = null;
        this.autoTextJobs = new Map();
        this.apiBase = '/.netlify/functions';
        this.updateInterval = null;
        
        // Initialize
        this.init();
    }
    
    init() {
        console.log('👤 UserBot Manager initialized');
        this.loadAutoTextJobs();
        this.setupEventListeners();
        this.startPeriodicUpdates();
    }
    
    // Start periodic updates for session status
    startPeriodicUpdates() {
        // Clear existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Update stats every 30 seconds
        this.updateInterval = setInterval(() => {
            if (this.currentSection === 'telegram') {
                this.updateSessionStatuses();
            }
        }, 30000);
        
        console.log('🔄 Started periodic session updates');
    }
    
    // Load auto-text jobs from localStorage
    loadAutoTextJobs() {
        try {
            const savedJobs = localStorage.getItem('userbot_autotext_jobs');
            if (savedJobs) {
                const jobs = JSON.parse(savedJobs);
                jobs.forEach(job => {
                    this.autoTextJobs.set(job.id, job);
                });
                console.log(`✅ Loaded ${this.autoTextJobs.size} auto-text jobs`);
            }
        } catch (error) {
            console.error('Failed to load auto-text jobs:', error);
        }
    }
    
    // Save auto-text jobs to localStorage
    saveAutoTextJobs() {
        try {
            const jobs = Array.from(this.autoTextJobs.values());
            localStorage.setItem('userbot_autotext_jobs', JSON.stringify(jobs));
        } catch (error) {
            console.error('Failed to save auto-text jobs:', error);
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Listen for section changes
        if (window.app) {
            window.app.on('section-change', (section) => {
                this.currentSection = section;
                if (section === 'telegram') {
                    this.showUserBotInterface();
                }
                if (section === 'auto-text') {
                    this.showAutoTextInterface();
                }
            });
        }
    }
    
    // Show user bot interface
    async showUserBotInterface() {
        const contentElement = document.getElementById('telegramContent');
        if (!contentElement) return;
        
        // Show loading state
        contentElement.innerHTML = this.getLoadingHTML();
        
        try {
            // Check if Telegram Manager is available
            if (!window.telegramManager) {
                throw new Error('Telegram manager not available');
            }
            
            // Get current sessions
            const sessions = window.telegramManager.getAllSessions();
            
            // Render interface
            contentElement.innerHTML = this.getUserBotInterfaceHTML(sessions);
            
            // Setup event handlers
            this.setupUserBotEventHandlers();
            
            // Update session statuses
            await this.updateSessionStatuses();
            
        } catch (error) {
            contentElement.innerHTML = this.getErrorHTML(error.message);
        }
    }
    
    // Show auto-text interface
    async showAutoTextInterface() {
        const contentElement = document.getElementById('dynamicContent');
        if (!contentElement) return;
        
        // Show loading state
        contentElement.innerHTML = this.getLoadingHTML('Auto Text Interface');
        
        try {
            // Check if managers are available
            if (!window.telegramManager || !window.userBotManager) {
                throw new Error('Required managers not available');
            }
            
            // Get sessions and jobs
            const sessions = window.telegramManager.getAllSessions();
            const jobs = Array.from(this.autoTextJobs.values());
            
            // Render interface
            contentElement.innerHTML = this.getAutoTextInterfaceHTML(sessions, jobs);
            
            // Setup event handlers
            this.setupAutoTextEventHandlers();
            
        } catch (error) {
            contentElement.innerHTML = this.getErrorHTML(error.message);
        }
    }
    
    // Get user bot interface HTML
    getUserBotInterfaceHTML(sessions) {
        return `
            <div class="userbot-interface">
                <!-- Header -->
                <div class="section-header">
                    <h2><i class="fab fa-telegram"></i> Telegram User Bot Management</h2>
                    <div class="section-actions">
                        <button class="btn btn-success" id="createUserBotBtn">
                            <i class="fas fa-plus"></i> New User Bot
                        </button>
                        <button class="btn btn-primary" id="refreshSessionsBtn">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                
                <!-- Stats -->
                <div class="stats-bar">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-plug"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="connectedSessionsCount">${sessions.filter(s => s.status === 'connected').length}</div>
                            <div class="stat-label">Connected</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-paper-plane"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="totalMessagesCount">${sessions.reduce((sum, s) => sum + (s.stats?.messagesSent || 0), 0)}</div>
                            <div class="stat-label">Messages Sent</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-comments"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="totalDialogsCount">${sessions.reduce((sum, s) => sum + (s.stats?.dialogsLoaded || 0), 0)}</div>
                            <div class="stat-label">Dialogs</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="activeSessionsCount">${sessions.length}</div>
                            <div class="stat-label">Total Sessions</div>
                        </div>
                    </div>
                </div>
                
                <!-- Sessions List -->
                <div class="section-block">
                    <div class="block-header">
                        <h3><i class="fas fa-list"></i> Active Sessions</h3>
                        <div class="block-actions">
                            <div class="search-box">
                                <input type="text" id="sessionSearch" placeholder="Search sessions..." class="search-input">
                                <i class="fas fa-search"></i>
                            </div>
                            <select id="sessionFilter" class="form-select form-select-sm">
                                <option value="all">All Sessions</option>
                                <option value="connected">Connected</option>
                                <option value="disconnected">Disconnected</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="sessions-list" id="sessionsList">
                        ${sessions.length > 0 ? 
                            sessions.map(session => this.getSessionCardHTML(session)).join('') :
                            '<div class="empty-state">' +
                            '    <i class="fab fa-telegram"></i>' +
                            '    <h3>No User Bots Connected</h3>' +
                            '    <p>Connect your first Telegram account to get started</p>' +
                            '    <button class="btn btn-primary" id="connectFirstUserBot">' +
                            '        <i class="fas fa-plus"></i> Connect Your First Account' +
                            '    </button>' +
                            '</div>'
                        }
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="section-block">
                    <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                    <div class="quick-actions">
                        <button class="btn-action btn-success" data-action="connect-all">
                            <i class="fas fa-plug"></i> Connect All
                        </button>
                        <button class="btn-action btn-danger" data-action="disconnect-all">
                            <i class="fas fa-power-off"></i> Disconnect All
                        </button>
                        <button class="btn-action btn-info" data-action="refresh-all">
                            <i class="fas fa-sync-alt"></i> Refresh All
                        </button>
                        <button class="btn-action btn-primary" data-action="open-auto-text">
                            <i class="fas fa-tasks"></i> Auto Text
                        </button>
                        <button class="btn-action btn-secondary" data-action="open-chat-manager">
                            <i class="fas fa-comments"></i> Chat Manager
                        </button>
                    </div>
                </div>
                
                <!-- Session Details Modal -->
                <div class="modal" id="sessionDetailsModal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fab fa-telegram"></i> Session Details</h3>
                            <button class="modal-close" id="closeSessionDetails">&times;</button>
                        </div>
                        <div class="modal-body" id="sessionDetailsContent">
                            <!-- Details will be loaded here -->
                        </div>
                    </div>
                </div>
                
                <!-- Create Session Modal -->
                <div class="modal" id="createSessionModal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fas fa-plus"></i> Connect New Telegram Account</h3>
                            <button class="modal-close" id="closeCreateSession">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="createSessionForm">
                                <div class="form-group">
                                    <label class="form-label">API ID</label>
                                    <input type="text" id="apiId" class="form-input" 
                                           placeholder="Enter API ID" required>
                                    <small class="form-help">Get from <a href="https://my.telegram.org" target="_blank">my.telegram.org</a></small>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">API Hash</label>
                                    <input type="text" id="apiHash" class="form-input" 
                                           placeholder="Enter API Hash" required>
                                    <small class="form-help">Get from <a href="https://my.telegram.org" target="_blank">my.telegram.org</a></small>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Phone Number</label>
                                    <input type="tel" id="phoneNumber" class="form-input" 
                                           placeholder="+1234567890" required>
                                    <small class="form-help">Include country code (e.g., +1 for US)</small>
                                </div>
                                
                                <div class="form-group">
                                    <div class="form-check">
                                        <input type="checkbox" id="saveSession" checked>
                                        <label for="saveSession">Save session for future use</label>
                                    </div>
                                    <div class="form-check">
                                        <input type="checkbox" id="autoReconnect" checked>
                                        <label for="autoReconnect">Auto-reconnect on disconnect</label>
                                    </div>
                                </div>
                                
                                <div class="alert alert-info">
                                    <i class="fas fa-info-circle"></i>
                                    <small>You will receive a verification code on your Telegram account</small>
                                </div>
                                
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" id="cancelCreateSession">Cancel</button>
                                    <button type="submit" class="btn btn-success">
                                        <i class="fas fa-plug"></i> Connect
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <!-- Verification Modal -->
                <div class="modal" id="verificationModal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fas fa-shield-alt"></i> Verification Required</h3>
                        </div>
                        <div class="modal-body">
                            <div id="verificationContent">
                                <!-- Verification form will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Get session card HTML
    getSessionCardHTML(session) {
        const statusClass = {
            'connected': 'success',
            'disconnected': 'danger',
            'reconnecting': 'warning',
            'verifying': 'info'
        }[session.status] || 'secondary';
        
        const statusIcon = {
            'connected': 'fa-check-circle',
            'disconnected': 'fa-times-circle',
            'reconnecting': 'fa-sync-alt',
            'verifying': 'fa-shield-alt'
        }[session.status] || 'fa-question-circle';
        
        return `
            <div class="session-card card" data-session-id="${session.sessionId}">
                <div class="session-card-header">
                    <div class="session-card-title">
                        <div class="session-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="session-info">
                            <h4>${session.user?.username || session.user?.phone || session.phoneNumber}</h4>
                            <div class="session-meta">
                                <span class="session-id">${session.sessionId.substring(0, 8)}...</span>
                                <span class="session-status status-${statusClass}">
                                    <i class="fas ${statusIcon}"></i> ${session.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="session-actions">
                        <button class="btn-icon btn-sm" data-action="session-details" title="Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        ${session.status === 'connected' ? `
                            <button class="btn-icon btn-sm btn-success" data-action="send-message" title="Send Message">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                            <button class="btn-icon btn-sm btn-warning" data-action="refresh-dialogs" title="Refresh Dialogs">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon btn-sm btn-danger" data-action="disconnect-session" title="Disconnect">
                            <i class="fas fa-power-off"></i>
                        </button>
                    </div>
                </div>
                
                <div class="session-card-body">
                    <div class="session-stats">
                        <div class="stat-item">
                            <i class="fas fa-paper-plane"></i>
                            <span>Messages: <strong>${session.stats?.messagesSent || 0}</strong></span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-comments"></i>
                            <span>Dialogs: <strong>${session.stats?.dialogsLoaded || 0}</strong></span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-clock"></i>
                            <span>Uptime: <strong>${window.telegramManager?.getSessionUptime(session.sessionId) || '0s'}</strong></span>
                        </div>
                    </div>
                    
                    <div class="session-details">
                        <div class="detail-item">
                            <span class="detail-label">Phone:</span>
                            <span class="detail-value">${session.phoneNumber}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Connected:</span>
                            <span class="detail-value">${new Date(session.connectedAt).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Last Active:</span>
                            <span class="detail-value">${new Date(session.lastActivity).toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Get auto-text interface HTML
    getAutoTextInterfaceHTML(sessions, jobs) {
        return `
            <div class="autotext-interface">
                <!-- Header -->
                <div class="section-header">
                    <h2><i class="fas fa-tasks"></i> Auto Text Scheduler</h2>
                    <div class="section-actions">
                        <button class="btn btn-success" id="createAutoTextJobBtn">
                            <i class="fas fa-plus"></i> New Job
                        </button>
                        <button class="btn btn-primary" id="refreshJobsBtn">
                            <i class="fas fa-sync-alt"></i> Refresh
                        </button>
                    </div>
                </div>
                
                <!-- Stats -->
                <div class="stats-bar">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-play-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="runningJobsCount">${jobs.filter(j => j.status === 'running').length}</div>
                            <div class="stat-label">Running</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-pause-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="pausedJobsCount">${jobs.filter(j => j.status === 'paused').length}</div>
                            <div class="stat-label">Paused</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="completedJobsCount">${jobs.filter(j => j.status === 'completed').length}</div>
                            <div class="stat-label">Completed</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-paper-plane"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value" id="totalMessagesSent">${jobs.reduce((sum, j) => sum + (j.stats?.totalSent || 0), 0)}</div>
                            <div class="stat-label">Messages Sent</div>
                        </div>
                    </div>
                </div>
                
                <!-- Jobs List -->
                <div class="section-block">
                    <div class="block-header">
                        <h3><i class="fas fa-list"></i> Auto Text Jobs</h3>
                        <div class="block-actions">
                            <div class="search-box">
                                <input type="text" id="jobSearch" placeholder="Search jobs..." class="search-input">
                                <i class="fas fa-search"></i>
                            </div>
                            <select id="jobFilter" class="form-select form-select-sm">
                                <option value="all">All Jobs</option>
                                <option value="running">Running</option>
                                <option value="paused">Paused</option>
                                <option value="completed">Completed</option>
                                <option value="error">Error</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="jobs-list" id="jobsList">
                        ${jobs.length > 0 ? 
                            jobs.map(job => this.getJobCardHTML(job)).join('') :
                            '<div class="empty-state">' +
                            '    <i class="fas fa-tasks"></i>' +
                            '    <h3>No Auto Text Jobs</h3>' +
                            '    <p>Create your first auto-text job to send scheduled messages</p>' +
                            '    <button class="btn btn-primary" id="createFirstJob">' +
                            '        <i class="fas fa-plus"></i> Create First Job' +
                            '    </button>' +
                            '</div>'
                        }
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="section-block">
                    <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                    <div class="quick-actions">
                        <button class="btn-action btn-success" data-action="start-all-jobs">
                            <i class="fas fa-play"></i> Start All
                        </button>
                        <button class="btn-action btn-warning" data-action="pause-all-jobs">
                            <i class="fas fa-pause"></i> Pause All
                        </button>
                        <button class="btn-action btn-danger" data-action="stop-all-jobs">
                            <i class="fas fa-stop"></i> Stop All
                        </button>
                        <button class="btn-action btn-info" data-action="refresh-all-jobs">
                            <i class="fas fa-sync-alt"></i> Refresh All
                        </button>
                    </div>
                </div>
                
                <!-- Create Job Modal -->
                <div class="modal" id="createJobModal">
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-plus"></i> Create Auto Text Job</h3>
                            <button class="modal-close" id="closeCreateJob">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="createJobForm">
                                <div class="form-group">
                                    <label class="form-label">Job Name</label>
                                    <input type="text" id="jobName" class="form-input" 
                                           placeholder="Enter job name" required>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Select Session</label>
                                    <select id="jobSession" class="form-select" required>
                                        <option value="">Select a session</option>
                                        ${sessions.filter(s => s.status === 'connected').map(session => `
                                            <option value="${session.sessionId}">
                                                ${session.user?.username || session.phoneNumber} (${session.sessionId.substring(0, 8)})
                                            </option>
                                        `).join('')}
                                    </select>
                                    <small class="form-help">Only connected sessions are available</small>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Target Chats</label>
                                    <textarea id="jobTargets" class="form-input" 
                                              placeholder="Enter chat IDs or usernames (one per line)" 
                                              rows="3" required></textarea>
                                    <small class="form-help">One chat per line. Use @username or numeric ID</small>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label">Message</label>
                                    <textarea id="jobMessage" class="form-input" 
                                              placeholder="Enter message to send" 
                                              rows="4" required></textarea>
                                </div>
                                
                                <div class="grid grid-2">
                                    <div class="form-group">
                                        <label class="form-label">Interval (seconds)</label>
                                        <input type="number" id="jobInterval" class="form-input" 
                                               min="10" max="86400" value="60" required>
                                        <small class="form-help">Minimum 10 seconds</small>
                                    </div>
                                    
                                    <div class="form-group">
                                        <label class="form-label">Repeat Count</label>
                                        <input type="number" id="jobRepeat" class="form-input" 
                                               min="1" max="1000" value="10">
                                        <small class="form-help">Leave empty for unlimited</small>
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <div class="form-check">
                                        <input type="checkbox" id="jobStartNow" checked>
                                        <label for="jobStartNow">Start immediately</label>
                                    </div>
                                </div>
                                
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" id="cancelCreateJob">Cancel</button>
                                    <button type="submit" class="btn btn-success">
                                        <i class="fas fa-plus"></i> Create Job
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                
                <!-- Job Details Modal -->
                <div class="modal" id="jobDetailsModal">
                    <div class="modal-content" style="max-width: 700px;">
                        <div class="modal-header">
                            <h3><i class="fas fa-info-circle"></i> Job Details</h3>
                            <button class="modal-close" id="closeJobDetails">&times;</button>
                        </div>
                        <div class="modal-body" id="jobDetailsContent">
                            <!-- Details will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Get job card HTML
    getJobCardHTML(job) {
        const statusClass = {
            'running': 'success',
            'paused': 'warning',
            'completed': 'info',
            'error': 'danger',
            'stopped': 'secondary'
        }[job.status] || 'secondary';
        
        const statusIcon = {
            'running': 'fa-play-circle',
            'paused': 'fa-pause-circle',
            'completed': 'fa-check-circle',
            'error': 'fa-exclamation-circle',
            'stopped': 'fa-stop-circle'
        }[job.status] || 'fa-question-circle';
        
        return `
            <div class="job-card card" data-job-id="${job.id}">
                <div class="job-card-header">
                    <div class="job-card-title">
                        <h4>${job.name}</h4>
                        <div class="job-meta">
                            <span class="job-id">${job.id.substring(0, 8)}...</span>
                            <span class="job-status status-${statusClass}">
                                <i class="fas ${statusIcon}"></i> ${job.status}
                            </span>
                        </div>
                    </div>
                    <div class="job-actions">
                        <button class="btn-icon btn-sm" data-action="job-details" title="Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        ${job.status === 'running' ? `
                            <button class="btn-icon btn-sm btn-warning" data-action="pause-job" title="Pause">
                                <i class="fas fa-pause"></i>
                            </button>
                            <button class="btn-icon btn-sm btn-danger" data-action="stop-job" title="Stop">
                                <i class="fas fa-stop"></i>
                            </button>
                        ` : job.status === 'paused' ? `
                            <button class="btn-icon btn-sm btn-success" data-action="start-job" title="Start">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn-icon btn-sm btn-danger" data-action="stop-job" title="Stop">
                                <i class="fas fa-stop"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon btn-sm btn-danger" data-action="delete-job" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                <div class="job-card-body">
                    <div class="job-stats">
                        <div class="stat-item">
                            <i class="fas fa-paper-plane"></i>
                            <span>Sent: <strong>${job.stats?.totalSent || 0}/${job.repeat || '∞'}</strong></span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-clock"></i>
                            <span>Interval: <strong>${job.interval}s</strong></span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-users"></i>
                            <span>Targets: <strong>${job.targets?.length || 0}</strong></span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-calendar"></i>
                            <span>Next: <strong>${job.nextRun ? new Date(job.nextRun).toLocaleTimeString() : 'N/A'}</strong></span>
                        </div>
                    </div>
                    
                    <div class="job-details">
                        <div class="detail-item">
                            <span class="detail-label">Session:</span>
                            <span class="detail-value">${job.sessionId.substring(0, 8)}...</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Created:</span>
                            <span class="detail-value">${new Date(job.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Last Run:</span>
                            <span class="detail-value">${job.lastRun ? new Date(job.lastRun).toLocaleTimeString() : 'Never'}</span>
                        </div>
                    </div>
                    
                    <div class="job-message">
                        <strong>Message:</strong>
                        <div class="message-preview">${this.truncateText(job.message, 100)}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Setup user bot event handlers
    setupUserBotEventHandlers() {
        // Create session button
        document.getElementById('createUserBotBtn')?.addEventListener('click', () => {
            this.showCreateSessionModal();
        });
        
        // Connect first bot button
        document.getElementById('connectFirstUserBot')?.addEventListener('click', () => {
            this.showCreateSessionModal();
        });
        
        // Refresh sessions button
        document.getElementById('refreshSessionsBtn')?.addEventListener('click', () => {
            this.refreshSessions();
        });
        
        // Session card actions
        document.querySelectorAll('.session-card [data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                const sessionCard = e.currentTarget.closest('.session-card');
                const sessionId = sessionCard?.getAttribute('data-session-id');
                
                if (sessionId) {
                    this.handleSessionAction(action, sessionId);
                }
            });
        });
        
        // Quick actions
        document.querySelectorAll('.quick-actions [data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleQuickAction(action);
            });
        });
        
        // Modal close buttons
        document.getElementById('closeSessionDetails')?.addEventListener('click', () => {
            this.hideModal('sessionDetailsModal');
        });
        
        document.getElementById('closeCreateSession')?.addEventListener('click', () => {
            this.hideModal('createSessionModal');
        });
        
        document.getElementById('cancelCreateSession')?.addEventListener('click', () => {
            this.hideModal('createSessionModal');
        });
        
        // Create session form
        document.getElementById('createSessionForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateSession();
        });
        
        // Search and filter
        const sessionSearch = document.getElementById('sessionSearch');
        const sessionFilter = document.getElementById('sessionFilter');
        
        if (sessionSearch) {
            sessionSearch.addEventListener('input', () => {
                this.filterSessions(sessionSearch.value, sessionFilter?.value);
            });
        }
        
        if (sessionFilter) {
            sessionFilter.addEventListener('change', () => {
                this.filterSessions(sessionSearch?.value, sessionFilter.value);
            });
        }
        
        // Update stats when modal opens/closes
        document.getElementById('sessionDetailsModal')?.addEventListener('modal-close', () => {
            this.updateSessionStatuses();
        });
    }
    
    // Setup auto-text event handlers
    setupAutoTextEventHandlers() {
        // Create job button
        document.getElementById('createAutoTextJobBtn')?.addEventListener('click', () => {
            this.showCreateJobModal();
        });
        
        // Create first job button
        document.getElementById('createFirstJob')?.addEventListener('click', () => {
            this.showCreateJobModal();
        });
        
        // Refresh jobs button
        document.getElementById('refreshJobsBtn')?.addEventListener('click', () => {
            this.refreshJobs();
        });
        
        // Job card actions
        document.querySelectorAll('.job-card [data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                const jobCard = e.currentTarget.closest('.job-card');
                const jobId = jobCard?.getAttribute('data-job-id');
                
                if (jobId) {
                    this.handleJobAction(action, jobId);
                }
            });
        });
        
        // Quick actions
        document.querySelectorAll('.quick-actions [data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleJobQuickAction(action);
            });
        });
        
        // Modal close buttons
        document.getElementById('closeCreateJob')?.addEventListener('click', () => {
            this.hideModal('createJobModal');
        });
        
        document.getElementById('cancelCreateJob')?.addEventListener('click', () => {
            this.hideModal('createJobModal');
        });
        
        document.getElementById('closeJobDetails')?.addEventListener('click', () => {
            this.hideModal('jobDetailsModal');
        });
        
        // Create job form
        document.getElementById('createJobForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateJob();
        });
        
        // Search and filter
        const jobSearch = document.getElementById('jobSearch');
        const jobFilter = document.getElementById('jobFilter');
        
        if (jobSearch) {
            jobSearch.addEventListener('input', () => {
                this.filterJobs(jobSearch.value, jobFilter?.value);
            });
        }
        
        if (jobFilter) {
            jobFilter.addEventListener('change', () => {
                this.filterJobs(jobSearch?.value, jobFilter.value);
            });
        }
    }
    
    // Show create session modal
    showCreateSessionModal() {
        const modal = document.getElementById('createSessionModal');
        if (modal) {
            modal.classList.add('active');
            
            // Reset form
            const form = document.getElementById('createSessionForm');
            if (form) form.reset();
        }
    }
    
    // Show create job modal
    showCreateJobModal() {
        const modal = document.getElementById('createJobModal');
        if (modal) {
            modal.classList.add('active');
            
            // Reset form
            const form = document.getElementById('createJobForm');
            if (form) form.reset();
        }
    }
    
    // Hide modal
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    // Handle create session - FIXED VERSION
    async handleCreateSession() {
        const apiId = document.getElementById('apiId')?.value;
        const apiHash = document.getElementById('apiHash')?.value;
        const phoneNumber = document.getElementById('phoneNumber')?.value;
        const saveSession = document.getElementById('saveSession')?.checked;
        
        if (!apiId || !apiHash || !phoneNumber) {
            this.showToast('Please fill all fields', 'error');
            return;
        }
        
        // Show loading
        this.showToast('Connecting to Telegram...', 'info');
        
        const createBtn = document.querySelector('#createSessionForm button[type="submit"]');
        const originalText = createBtn?.innerHTML;
        
        if (createBtn) {
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            createBtn.disabled = true;
        }
        
        try {
            if (!window.telegramManager) {
                throw new Error('Telegram manager not available');
            }
            
            // Step 1: Coba koneksi (akan meminta kode verifikasi)
            const result = await window.telegramManager.connectUserBot(
                apiId,
                apiHash,
                phoneNumber
            );
            
            if (result.success) {
                if (result.requiresVerification) {
                    // TAMPILKAN MODAL VERIFIKASI
                    this.showVerificationModal(result.sessionId, phoneNumber);
                    this.hideModal('createSessionModal');
                    this.showToast('Verification code sent to your Telegram', 'info');
                } else {
                    // Langsung terkoneksi (jarang terjadi)
                    this.showToast('Connected successfully!', 'success');
                    this.hideModal('createSessionModal');
                    this.refreshSessions();
                }
            } else {
                if (result.requiresReauth) {
                    // Token expired, minta login ulang
                    this.showToast('Session expired. Please log in again.', 'error');
                    setTimeout(() => {
                        window.app?.handleLogout();
                    }, 2000);
                } else {
                    this.showToast(`Connection failed: ${result.error}`, 'error');
                }
            }
        } catch (error) {
            this.showToast(`Error: ${error.message}`, 'error');
            console.error('Create session error:', error);
        } finally {
            if (createBtn) {
                createBtn.innerHTML = originalText;
                createBtn.disabled = false;
            }
        }
    }
    
    // Show verification modal - FIXED VERSION
    showVerificationModal(sessionId, phoneNumber) {
        const modal = document.getElementById('verificationModal');
        const content = document.getElementById('verificationContent');
        
        if (!modal || !content) {
            // Buat modal jika belum ada
            this.createVerificationModal();
            return this.showVerificationModal(sessionId, phoneNumber);
        }
        
        content.innerHTML = `
            <div class="verification-form">
                <div class="verification-header">
                    <div class="verification-icon">
                        <i class="fab fa-telegram"></i>
                    </div>
                    <h3>Telegram Verification Required</h3>
                </div>
                
                <div class="alert alert-info">
                    <i class="fas fa-mobile-alt"></i>
                    <div>
                        <p><strong>Check your Telegram app!</strong></p>
                        <p>A verification code has been sent to:</p>
                        <p class="phone-number">${phoneNumber}</p>
                    </div>
                </div>
                
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <small>
                            <strong>Note:</strong> The code will come from <strong>Telegram</strong> 
                            (not from this dashboard). Open your Telegram app to see the code.
                        </small>
                    </div>
                </div>
                
                <form id="verificationForm">
                    <div class="form-group">
                        <label class="form-label">Enter 5-digit Code</label>
                        <div class="code-input-container">
                            <input type="text" id="verificationCode" class="form-input code-input" 
                                   placeholder="12345" required maxlength="5" 
                                   pattern="\\d{5}" autocomplete="off">
                            <div class="code-hint">Enter exactly 5 digits</div>
                        </div>
                    </div>
                    
                    <div class="verification-help">
                        <details>
                            <summary><i class="fas fa-question-circle"></i> Need help?</summary>
                            <div class="help-content">
                                <ol>
                                    <li>Open your <strong>Telegram app</strong> on your phone</li>
                                    <li>Look for a message from <strong>"Telegram"</strong> (official)</li>
                                    <li>You'll see a 5-digit code like <code>12345</code></li>
                                    <li>Enter that code in the field above</li>
                                    <li>Click <strong>Verify & Connect</strong></li>
                                </ol>
                            </div>
                        </details>
                    </div>
                    
                    <div class="verification-actions">
                        <button type="button" class="btn btn-secondary" id="cancelVerification">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button type="submit" class="btn btn-success" id="verifyBtn">
                            <i class="fas fa-check"></i> Verify & Connect
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        modal.classList.add('active');
        document.getElementById('verificationCode')?.focus();
        
        // Setup event handlers
        const form = document.getElementById('verificationForm');
        const cancelBtn = document.getElementById('cancelVerification');
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleVerification(sessionId);
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideModal('verificationModal');
                this.showCreateSessionModal(); // Kembali ke form awal
            });
        }
        
        // Auto-focus dan input helper
        const codeInput = document.getElementById('verificationCode');
        if (codeInput) {
            codeInput.addEventListener('input', (e) => {
                // Hanya angka
                e.target.value = e.target.value.replace(/\D/g, '');
                
                // Auto-submit jika sudah 5 digit
                if (e.target.value.length === 5) {
                    setTimeout(() => {
                        document.getElementById('verifyBtn')?.click();
                    }, 500);
                }
            });
        }
    }
    
    // Fungsi untuk membuat modal verifikasi jika belum ada
    createVerificationModal() {
        const modalHTML = `
            <div class="modal" id="verificationModal">
                <div class="modal-overlay" onclick="window.userBotManager.hideModal('verificationModal')"></div>
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-shield-alt"></i> Telegram Verification</h3>
                        <button class="modal-close" onclick="window.userBotManager.hideModal('verificationModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div id="verificationContent">
                            <!-- Content will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Tambahkan ke body jika belum ada
        if (!document.getElementById('verificationModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    }
    
    // Handle verification
    async handleVerification(sessionId) {
        const code = document.getElementById('verificationCode')?.value;
        
        if (!code || code.length !== 5) {
            this.showToast('Please enter a valid 5-digit code', 'error');
            return;
        }
        
        this.showToast('Verifying...', 'info');
        
        const verifyBtn = document.getElementById('verifyBtn');
        const originalText = verifyBtn?.innerHTML;
        
        if (verifyBtn) {
            verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            verifyBtn.disabled = true;
        }
        
        try {
            const result = await window.telegramManager.verifyConnection(sessionId, code);
            
            if (result.success) {
                this.showToast('Verified successfully!', 'success');
                this.hideModal('verificationModal');
                this.refreshSessions();
            } else {
                this.showToast(`Verification failed: ${result.error}`, 'error');
                // Reset form
                document.getElementById('verificationCode').value = '';
                document.getElementById('verificationCode').focus();
            }
        } catch (error) {
            this.showToast(`Error: ${error.message}`, 'error');
        } finally {
            if (verifyBtn) {
                verifyBtn.innerHTML = originalText;
                verifyBtn.disabled = false;
            }
        }
    }
    
    // Handle create job
    async handleCreateJob() {
        const name = document.getElementById('jobName')?.value;
        const sessionId = document.getElementById('jobSession')?.value;
        const targets = document.getElementById('jobTargets')?.value;
        const message = document.getElementById('jobMessage')?.value;
        const interval = parseInt(document.getElementById('jobInterval')?.value || '60');
        const repeat = parseInt(document.getElementById('jobRepeat')?.value || '0');
        const startNow = document.getElementById('jobStartNow')?.checked;
        
        // Validate
        if (!name || !sessionId || !targets || !message) {
            this.showToast('Please fill all required fields', 'error');
            return;
        }
        
        if (interval < 10) {
            this.showToast('Interval must be at least 10 seconds', 'error');
            return;
        }
        
        // Parse targets
        const targetArray = targets.split('\n')
            .map(t => t.trim())
            .filter(t => t.length > 0);
        
        if (targetArray.length === 0) {
            this.showToast('Please enter at least one target', 'error');
            return;
        }
        
        // Create job object
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const job = {
            id: jobId,
            name: name,
            sessionId: sessionId,
            targets: targetArray,
            message: message,
            interval: interval,
            repeat: repeat || null, // null means unlimited
            status: startNow ? 'running' : 'paused',
            createdAt: new Date().toISOString(),
            stats: {
                totalSent: 0,
                successful: 0,
                failed: 0,
                lastRun: null
            }
        };
        
        // Save job
        this.autoTextJobs.set(jobId, job);
        this.saveAutoTextJobs();
        
        // If starting now, schedule it
        if (startNow) {
            this.scheduleJob(jobId);
        }
        
        this.showToast('Auto-text job created!', 'success');
        this.hideModal('createJobModal');
        this.refreshJobs();
    }
    
    // Schedule a job
    scheduleJob(jobId) {
        const job = this.autoTextJobs.get(jobId);
        if (!job) return;
        
        // Clear existing interval if any
        if (job.intervalId) {
            clearInterval(job.intervalId);
            job.intervalId = null;
        }
        
        // Schedule the job
        job.intervalId = setInterval(async () => {
            await this.executeJob(jobId);
        }, job.interval * 1000);
        
        job.status = 'running';
        job.nextRun = new Date(Date.now() + job.interval * 1000).toISOString();
        this.autoTextJobs.set(jobId, job);
        this.saveAutoTextJobs();
    }
    
    // Execute a job
    async executeJob(jobId) {
        const job = this.autoTextJobs.get(jobId);
        if (!job || job.status !== 'running') return;
        
        try {
            // Check if session is still connected
            if (!window.telegramManager) {
                job.status = 'error';
                this.autoTextJobs.set(jobId, job);
                this.saveAutoTextJobs();
                return;
            }
            
            const session = window.telegramManager.getSession(job.sessionId);
            if (!session || session.status !== 'connected') {
                job.status = 'error';
                this.autoTextJobs.set(jobId, job);
                this.saveAutoTextJobs();
                return;
            }
            
            // Send to each target
            for (const target of job.targets) {
                try {
                    const result = await window.telegramManager.sendMessage(
                        job.sessionId,
                        target,
                        job.message
                    );
                    
                    if (result?.success) {
                        job.stats.successful++;
                        job.stats.totalSent++;
                    } else {
                        job.stats.failed++;
                        job.stats.totalSent++;
                    }
                } catch (error) {
                    console.error(`Failed to send to ${target}:`, error);
                    job.stats.failed++;
                    job.stats.totalSent++;
                }
            }
            
            // Update job stats
            job.stats.lastRun = new Date().toISOString();
            job.nextRun = new Date(Date.now() + job.interval * 1000).toISOString();
            
            // Check if repeat limit reached
            if (job.repeat && job.stats.totalSent >= job.repeat * job.targets.length) {
                job.status = 'completed';
                if (job.intervalId) {
                    clearInterval(job.intervalId);
                    job.intervalId = null;
                }
            }
            
            this.autoTextJobs.set(jobId, job);
            this.saveAutoTextJobs();
            
            // Update UI if on auto-text page
            if (this.currentSection === 'auto-text') {
                this.refreshJobs();
            }
            
        } catch (error) {
            console.error(`Job execution error: ${error.message}`);
            job.status = 'error';
            if (job.intervalId) {
                clearInterval(job.intervalId);
                job.intervalId = null;
            }
            this.autoTextJobs.set(jobId, job);
            this.saveAutoTextJobs();
            
            // Update UI
            if (this.currentSection === 'auto-text') {
                this.refreshJobs();
            }
        }
    }
    
    // Handle session action
    async handleSessionAction(action, sessionId) {
        if (!window.telegramManager) return;
        
        switch (action) {
            case 'session-details':
                await this.showSessionDetails(sessionId);
                break;
                
            case 'send-message':
                this.showSendMessageModal(sessionId);
                break;
                
            case 'refresh-dialogs':
                await this.refreshSessionDialogs(sessionId);
                break;
                
            case 'disconnect-session':
                await this.disconnectSession(sessionId);
                break;
        }
    }
    
    // Handle job action
    async handleJobAction(action, jobId) {
        const job = this.autoTextJobs.get(jobId);
        if (!job) return;
        
        switch (action) {
            case 'job-details':
                this.showJobDetails(jobId);
                break;
                
            case 'start-job':
                job.status = 'running';
                this.scheduleJob(jobId);
                this.showToast('Job started', 'success');
                this.refreshJobs();
                break;
                
            case 'pause-job':
                job.status = 'paused';
                if (job.intervalId) {
                    clearInterval(job.intervalId);
                    job.intervalId = null;
                }
                this.autoTextJobs.set(jobId, job);
                this.saveAutoTextJobs();
                this.showToast('Job paused', 'warning');
                this.refreshJobs();
                break;
                
            case 'stop-job':
                job.status = 'stopped';
                if (job.intervalId) {
                    clearInterval(job.intervalId);
                    job.intervalId = null;
                }
                this.autoTextJobs.set(jobId, job);
                this.saveAutoTextJobs();
                this.showToast('Job stopped', 'info');
                this.refreshJobs();
                break;
                
            case 'delete-job':
                if (confirm('Are you sure you want to delete this job?')) {
                    if (job.intervalId) {
                        clearInterval(job.intervalId);
                        job.intervalId = null;
                    }
                    this.autoTextJobs.delete(jobId);
                    this.saveAutoTextJobs();
                    this.showToast('Job deleted', 'success');
                    this.refreshJobs();
                }
                break;
        }
    }
    
    // Handle quick action
    async handleQuickAction(action) {
        if (!window.telegramManager) return;
        
        switch (action) {
            case 'connect-all':
                await this.connectAllSessions();
                break;
                
            case 'disconnect-all':
                await this.disconnectAllSessions();
                break;
                
            case 'refresh-all':
                await this.refreshAllSessions();
                break;
                
            case 'open-auto-text':
                window.app?.switchSection('auto-text');
                break;
                
            case 'open-chat-manager':
                this.showToast('Chat manager coming soon!', 'info');
                break;
        }
    }
    
    // Handle job quick action
    async handleJobQuickAction(action) {
        const jobs = Array.from(this.autoTextJobs.values());
        
        switch (action) {
            case 'start-all-jobs':
                let started = 0;
                jobs.filter(j => j.status === 'paused').forEach(job => {
                    job.status = 'running';
                    this.scheduleJob(job.id);
                    started++;
                });
                this.showToast(`Started ${started} job(s)`, 'success');
                this.refreshJobs();
                break;
                
            case 'pause-all-jobs':
                let paused = 0;
                jobs.filter(j => j.status === 'running').forEach(job => {
                    job.status = 'paused';
                    if (job.intervalId) {
                        clearInterval(job.intervalId);
                        job.intervalId = null;
                    }
                    this.autoTextJobs.set(job.id, job);
                    paused++;
                });
                this.saveAutoTextJobs();
                this.showToast(`Paused ${paused} job(s)`, 'warning');
                this.refreshJobs();
                break;
                
            case 'stop-all-jobs':
                jobs.forEach(job => {
                    job.status = 'stopped';
                    if (job.intervalId) {
                        clearInterval(job.intervalId);
                        job.intervalId = null;
                    }
                    this.autoTextJobs.set(job.id, job);
                });
                this.saveAutoTextJobs();
                this.showToast('All jobs stopped', 'info');
                this.refreshJobs();
                break;
                
            case 'refresh-all-jobs':
                this.refreshJobs();
                this.showToast('All jobs refreshed', 'success');
                break;
        }
    }
    
    // Connect all sessions
    async connectAllSessions() {
        if (!window.telegramManager) return;
        
        this.showToast('Connecting all sessions...', 'info');
        
        try {
            const sessions = window.telegramManager.getAllSessions();
            const disconnectedSessions = sessions.filter(s => s.status === 'disconnected');
            
            if (disconnectedSessions.length === 0) {
                this.showToast('All sessions are already connected', 'info');
                return;
            }
            
            for (const session of disconnectedSessions) {
                try {
                    await window.telegramManager.connectSession(session.sessionId);
                } catch (error) {
                    console.error(`Failed to connect session ${session.sessionId}:`, error);
                }
            }
            
            this.showToast(`Attempted to connect ${disconnectedSessions.length} session(s)`, 'success');
            this.refreshSessions();
            
        } catch (error) {
            this.showToast(`Error connecting sessions: ${error.message}`, 'error');
        }
    }
    
    // Disconnect all sessions
    async disconnectAllSessions() {
        if (!window.telegramManager) return;
        
        if (!confirm('Are you sure you want to disconnect all sessions?')) {
            return;
        }
        
        this.showToast('Disconnecting all sessions...', 'info');
        
        try {
            await window.telegramManager.disconnectAllSessions();
            this.showToast('All sessions disconnected', 'success');
            this.refreshSessions();
        } catch (error) {
            this.showToast(`Error disconnecting sessions: ${error.message}`, 'error');
        }
    }
    
    // Refresh all sessions
    async refreshAllSessions() {
        if (!window.telegramManager) return;
        
        this.showToast('Refreshing all sessions...', 'info');
        
        try {
            await this.refreshSessions();
        } catch (error) {
            this.showToast(`Error refreshing sessions: ${error.message}`, 'error');
        }
    }
    
    // Show session details
    async showSessionDetails(sessionId) {
        if (!window.telegramManager) return;
        
        const session = window.telegramManager.getSession(sessionId);
        if (!session) return;
        
        const modal = document.getElementById('sessionDetailsModal');
        const content = document.getElementById('sessionDetailsContent');
        
        if (!modal || !content) return;
        
        // Get detailed status
        const status = await window.telegramManager.getSessionStatus(sessionId);
        
        content.innerHTML = `
            <div class="session-details-view">
                <div class="detail-section">
                    <h4><i class="fas fa-user"></i> User Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Username:</span>
                            <span class="detail-value">${session.user?.username || 'Not set'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Phone:</span>
                            <span class="detail-value">${session.user?.phone || session.phoneNumber}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">User ID:</span>
                            <span class="detail-value">${session.user?.id || 'Unknown'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Name:</span>
                            <span class="detail-value">${session.user?.firstName || ''} ${session.user?.lastName || ''}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-bar"></i> Statistics</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Messages Sent:</span>
                            <span class="detail-value">${session.stats?.messagesSent || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Messages Received:</span>
                            <span class="detail-value">${session.stats?.messagesReceived || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Dialogs Loaded:</span>
                            <span class="detail-value">${session.stats?.dialogsLoaded || 0}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Uptime:</span>
                            <span class="detail-value">${window.telegramManager.getSessionUptime(sessionId)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Session Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Session ID:</span>
                            <span class="detail-value code">${session.sessionId}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">API ID:</span>
                            <span class="detail-value">${session.apiId}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">API Hash:</span>
                            <span class="detail-value code">${session.apiHash}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value status-${session.status}">${session.status}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Connected:</span>
                            <span class="detail-value">${new Date(session.connectedAt).toLocaleString()}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Last Activity:</span>
                            <span class="detail-value">${new Date(session.lastActivity).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                ${status.success ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-server"></i> Server Status</h4>
                        <pre class="code-block">${JSON.stringify(status.data, null, 2)}</pre>
                    </div>
                ` : ''}
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="closeDetails">Close</button>
                    ${session.status === 'connected' ? `
                        <button class="btn btn-primary" id="sendMessageBtn" data-session-id="${sessionId}">
                            <i class="fas fa-paper-plane"></i> Send Message
                        </button>
                    ` : ''}
                    <button class="btn btn-danger" id="disconnectBtn" data-session-id="${sessionId}">
                        <i class="fas fa-power-off"></i> Disconnect
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Setup event handlers
        document.getElementById('closeDetails')?.addEventListener('click', () => {
            this.hideModal('sessionDetailsModal');
        });
        
        document.getElementById('sendMessageBtn')?.addEventListener('click', () => {
            this.hideModal('sessionDetailsModal');
            this.showSendMessageModal(sessionId);
        });
        
        document.getElementById('disconnectBtn')?.addEventListener('click', async () => {
            if (confirm('Are you sure you want to disconnect this session?')) {
                await this.disconnectSession(sessionId);
                this.hideModal('sessionDetailsModal');
            }
        });
    }
    
    // Show send message modal
    showSendMessageModal(sessionId) {
        // Implementation would go here
        this.showToast('Send message feature coming soon!', 'info');
    }
    
    // Show job details
    showJobDetails(jobId) {
        const job = this.autoTextJobs.get(jobId);
        if (!job) return;
        
        const modal = document.getElementById('jobDetailsModal');
        const content = document.getElementById('jobDetailsContent');
        
        if (!modal || !content) return;
        
        content.innerHTML = `
            <div class="job-details-view">
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Job Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Job ID:</span>
                            <span class="detail-value code">${job.id}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Name:</span>
                            <span class="detail-value">${job.name}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value status-${job.status}">${job.status}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Session ID:</span>
                            <span class="detail-value code">${job.sessionId}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Created:</span>
                            <span class="detail-value">${new Date(job.createdAt).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-cog"></i> Configuration</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Interval:</span>
                            <span class="detail-value">${job.interval} seconds</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Repeat:</span>
                            <span class="detail-value">${job.repeat || 'Unlimited'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Targets:</span>
                            <span class="detail-value">${job.targets.length} chat(s)</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Next Run:</span>
                            <span class="detail-value">${job.nextRun ? new Date(job.nextRun).toLocaleString() : 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-bar"></i> Statistics</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Total Sent:</span>
                            <span class="detail-value">${job.stats.totalSent}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Successful:</span>
                            <span class="detail-value">${job.stats.successful}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Failed:</span>
                            <span class="detail-value">${job.stats.failed}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Success Rate:</span>
                            <span class="detail-value">${job.stats.totalSent > 0 ? 
                                ((job.stats.successful / job.stats.totalSent) * 100).toFixed(2) + '%' : '0%'
                            }</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Last Run:</span>
                            <span class="detail-value">${job.stats.lastRun ? new Date(job.stats.lastRun).toLocaleString() : 'Never'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-list"></i> Targets</h4>
                    <div class="targets-list">
                        ${job.targets.map(target => `
                            <div class="target-item">
                                <i class="fas fa-hashtag"></i>
                                <span class="target-value">${target}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-envelope"></i> Message</h4>
                    <div class="message-content">
                        <pre>${job.message}</pre>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="closeJobDetailsBtn">Close</button>
                    ${job.status === 'running' ? `
                        <button class="btn btn-warning" id="pauseJobBtn" data-job-id="${jobId}">
                            <i class="fas fa-pause"></i> Pause
                        </button>
                    ` : job.status === 'paused' ? `
                        <button class="btn btn-success" id="startJobBtn" data-job-id="${jobId}">
                            <i class="fas fa-play"></i> Start
                        </button>
                    ` : ''}
                    <button class="btn btn-danger" id="deleteJobBtn" data-job-id="${jobId}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Setup event handlers
        document.getElementById('closeJobDetailsBtn')?.addEventListener('click', () => {
            this.hideModal('jobDetailsModal');
        });
        
        document.getElementById('pauseJobBtn')?.addEventListener('click', () => {
            this.handleJobAction('pause-job', jobId);
            this.hideModal('jobDetailsModal');
        });
        
        document.getElementById('startJobBtn')?.addEventListener('click', () => {
            this.handleJobAction('start-job', jobId);
            this.hideModal('jobDetailsModal');
        });
        
        document.getElementById('deleteJobBtn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this job?')) {
                this.handleJobAction('delete-job', jobId);
                this.hideModal('jobDetailsModal');
            }
        });
    }
    
    // Refresh sessions
    async refreshSessions() {
        if (!window.telegramManager) return;
        
        try {
            // Update status for all sessions
            const sessions = window.telegramManager.getAllSessions();
            for (const session of sessions) {
                try {
                    await window.telegramManager.getSessionStatus(session.sessionId);
                } catch (error) {
                    console.error(`Failed to update status for session ${session.sessionId}:`, error);
                }
            }
            
            // Update UI
            await this.showUserBotInterface();
            this.showToast('Sessions refreshed', 'success');
        } catch (error) {
            console.error('Failed to refresh sessions:', error);
            this.showToast('Refresh failed', 'error');
        }
    }
    
    // Refresh session dialogs
    async refreshSessionDialogs(sessionId) {
        if (!window.telegramManager) return;
        
        try {
            const result = await window.telegramManager.getUserDialogs(sessionId);
            if (result.success) {
                this.showToast(`Loaded ${result.count} dialogs`, 'success');
                this.updateSessionStatuses();
            } else {
                this.showToast(`Failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    // Disconnect session
    async disconnectSession(sessionId) {
        if (!window.telegramManager) return;
        
        try {
            const result = await window.telegramManager.disconnectSession(sessionId);
            if (result.success) {
                this.showToast('Session disconnected', 'success');
                this.refreshSessions();
            } else {
                this.showToast(`Failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }
    
    // Refresh jobs
    refreshJobs() {
        this.showAutoTextInterface();
    }

    // Update session statuses - FIXED VERSION
    async updateSessionStatuses() {
        if (!window.telegramManager) {
            console.warn('Telegram manager not available');
            return;
        }
        
        try {
            const sessions = window.telegramManager.getAllSessions();
            
            // Update counts in UI - FIXED
            const connectedCount = sessions.filter(s => s.status === 'connected').length;
            const totalMessages = sessions.reduce((sum, s) => sum + (s.stats?.messagesSent || 0), 0);
            const totalDialogs = sessions.reduce((sum, s) => sum + (s.stats?.dialogsLoaded || 0), 0);
            
            // Get DOM elements with correct IDs
            const connectedSessionsEl = document.getElementById('connectedSessionsCount');
            const totalMessagesEl = document.getElementById('totalMessagesCount');
            const totalDialogsEl = document.getElementById('totalDialogsCount');
            const activeSessionsEl = document.getElementById('activeSessionsCount');
            
            // Update the UI elements if they exist
            if (connectedSessionsEl) connectedSessionsEl.textContent = connectedCount;
            if (totalMessagesEl) totalMessagesEl.textContent = totalMessages;
            if (totalDialogsEl) totalDialogsEl.textContent = totalDialogs;
            if (activeSessionsEl) activeSessionsEl.textContent = sessions.length;
            
            // Also update session cards if they exist
            sessions.forEach(session => {
                const sessionCard = document.querySelector(`.session-card[data-session-id="${session.sessionId}"]`);
                if (sessionCard) {
                    // Update status indicator
                    const statusElement = sessionCard.querySelector('.session-status');
                    if (statusElement) {
                        const statusClass = {
                            'connected': 'success',
                            'disconnected': 'danger',
                            'reconnecting': 'warning',
                            'verifying': 'info'
                        }[session.status] || 'secondary';
                        
                        const statusIcon = {
                            'connected': 'fa-check-circle',
                            'disconnected': 'fa-times-circle',
                            'reconnecting': 'fa-sync-alt',
                            'verifying': 'fa-shield-alt'
                        }[session.status] || 'fa-question-circle';
                        
                        statusElement.className = `session-status status-${statusClass}`;
                        statusElement.innerHTML = `<i class="fas ${statusIcon}"></i> ${session.status}`;
                    }
                    
                    // Update stats
                    const messageStat = sessionCard.querySelector('.stat-item:nth-child(1) strong');
                    const dialogStat = sessionCard.querySelector('.stat-item:nth-child(2) strong');
                    const uptimeStat = sessionCard.querySelector('.stat-item:nth-child(3) strong');
                    
                    if (messageStat) messageStat.textContent = session.stats?.messagesSent || 0;
                    if (dialogStat) dialogStat.textContent = session.stats?.dialogsLoaded || 0;
                    if (uptimeStat) {
                        uptimeStat.textContent = window.telegramManager.getSessionUptime(session.sessionId) || '0s';
                    }
                }
            });
            
            console.log(`✅ Updated session stats: ${connectedCount} connected, ${totalMessages} messages, ${totalDialogs} dialogs`);
            
        } catch (error) {
            console.error('Failed to update session statuses:', error);
            this.showToast('Failed to update session statuses', 'error');
        }
    }
    
    // Filter sessions
    filterSessions(searchTerm = '', filter = 'all') {
        const sessionCards = document.querySelectorAll('.session-card');
        const lowerSearch = searchTerm.toLowerCase();
        
        sessionCards.forEach(card => {
            const sessionId = card.getAttribute('data-session-id');
            const session = window.telegramManager?.getSession(sessionId);
            
            if (!session) {
                card.style.display = 'none';
                return;
            }
            
            // Apply search filter
            const matchesSearch = !searchTerm || 
                session.phoneNumber.toLowerCase().includes(lowerSearch) ||
                (session.user?.username && session.user.username.toLowerCase().includes(lowerSearch)) ||
                (session.user?.phone && session.user.phone.toLowerCase().includes(lowerSearch));
            
            // Apply status filter
            const matchesStatus = filter === 'all' || session.status === filter;
            
            card.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
        });
    }
    
    // Filter jobs
    filterJobs(searchTerm = '', filter = 'all') {
        const jobCards = document.querySelectorAll('.job-card');
        const lowerSearch = searchTerm.toLowerCase();
        
        jobCards.forEach(card => {
            const jobId = card.getAttribute('data-job-id');
            const job = this.autoTextJobs.get(jobId);
            
            if (!job) {
                card.style.display = 'none';
                return;
            }
            
            // Apply search filter
            const matchesSearch = !searchTerm || 
                job.name.toLowerCase().includes(lowerSearch) ||
                job.message.toLowerCase().includes(lowerSearch);
            
            // Apply status filter
            const matchesStatus = filter === 'all' || job.status === filter;
            
            card.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
        });
    }
    
    // Show toast notification
    showToast(message, type = 'info') {
        if (window.app && window.app.showToast) {
            window.app.showToast(message, type);
        } else {
            // Fallback console log
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // Create a simple toast if app.toast is not available
            this.createSimpleToast(message, type);
        }
    }
    
    // Create simple toast notification
    createSimpleToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `simple-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
        
        // Close button
        toast.querySelector('.toast-close')?.addEventListener('click', () => {
            toast.remove();
        });
    }
    
    // Get toast icon based on type
    getToastIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'warning': return 'fa-exclamation-triangle';
            case 'info': return 'fa-info-circle';
            default: return 'fa-info-circle';
        }
    }
    
    // Get loading HTML
    getLoadingHTML(title = 'Loading...') {
        return `
            <div class="loading-state">
                <div class="spinner"></div>
                <h3>${title}</h3>
                <p>Please wait while we load the interface...</p>
            </div>
        `;
    }
    
    // Get error HTML
    getErrorHTML(message) {
        return `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Interface</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.userBotManager.showUserBotInterface()">
                    <i class="fas fa-sync-alt"></i> Try Again
                </button>
            </div>
        `;
    }
    
    // Truncate text
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    // Clean up resources
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Clear all job intervals
        this.autoTextJobs.forEach(job => {
            if (job.intervalId) {
                clearInterval(job.intervalId);
                job.intervalId = null;
            }
        });
        
        console.log('🧹 UserBot Manager cleaned up');
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.userBotManager = new UserBotManager();
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        if (window.userBotManager) {
            window.userBotManager.cleanup();
        }
    });
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserBotManager };
}
