/**
 * TeleBot Pro v2.0.0 - Terminal Manager
 * Handles secure terminal operations and command execution
 * FIXED VERSION - dengan error handling dan stability improvements
 */

class TerminalManager {
    constructor() {
        this.commandHistory = [];
        this.historyIndex = -1;
        this.currentCommand = '';
        this.isExecuting = false;
        this.apiBase = '/.netlify/functions';
        this.terminalOutput = null;
        this.commandInput = null;
        this.fallbackInterval = null;
        this.mutationObserver = null;
        
        // Bind event handlers
        this.boundKeydownHandler = this.handleGlobalKeydown.bind(this);
        this.boundInputKeydown = this.handleInputKeydown.bind(this);
        this.boundHashChange = this.handleHashChange.bind(this);
        
        // Security settings
        this.security = {
            enabled: true,
            logCommands: true,
            maxHistory: 1000,
            allowedPatterns: [
                /^ls(\s+.*)?$/,
                /^pwd$/,
                /^whoami$/,
                /^date(\s+.*)?$/,
                /^uptime(\s+.*)?$/,
                /^uname(\s+.*)?$/,
                /^hostname$/,
                /^ps(\s+.*)?$/,
                /^git(\s+.*)?$/,
                /^node(\s+.*)?$/,
                /^npm(\s+.*)?$/,
                /^python(\s+.*)?$/,
                /^curl(\s+.*)?$/,
                /^ping(\s+.*)?$/,
                /^free(\s+.*)?$/,
                /^df(\s+.*)?$/,
                /^cat(\s+.*\.(json|md|txt|log))$/,
                /^tail(\s+.*\.(log|txt))$/,
                /^head(\s+.*\.(js|json|md|txt))$/,
                /^wc(\s+.*\.(js|json|md|txt))$/,
                /^grep(\s+.*\.(log|txt))$/,
                /^find(\s+.*\.(js|json|md))$/,
                /^du(\s+.*)?$/,
                /^echo(\s+.*)?$/,
                /^clear$/,
                /^help$/,
                /^status$/,
                /^bots$/,
                /^userbots$/
            ],
            blockedPatterns: [
                /rm\s+(-rf|\/|\.\.)/,
                /dd\s+if=/,
                /mkfs/,
                /fdisk/,
                /chmod\s+[0-7]{3,4}\s+/,
                /chown\s+root/,
                /wget\s+(http|https):\/\//,
                /curl\s+-o\s+/,
                /nc\s+/,
                /telnet\s+/,
                /ssh\s+/,
                /scp\s+/,
                />\s+\/dev\/(sda|nvme|md)/,
                /cat\s+>\s+\/etc\//,
                /echo\s+.*>\s+\/etc\//,
                /(\$\(|`).*(\$\(|`)/,
                /;\s*$/,
                /\|\s*$/,
                /&\s*$/,
                /&&/,
                /\|\|/,
                /sudo\s+/
            ]
        };
        
        // Initialize
        this.safeInit();
    }
    
    // Safe initialization dengan error handling
    safeInit() {
        try {
            console.log('💻 Terminal Manager initializing...');
            this.loadCommandHistory();
            this.setupAutoComplete();
            
            // Setup event listeners setelah DOM siap
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.setupEventListeners();
                    this.initializeTerminal();
                });
            } else {
                this.setupEventListeners();
                this.initializeTerminal();
            }
            
            console.log('✅ Terminal Manager initialized successfully');
        } catch (error) {
            console.error('❌ Terminal Manager initialization failed:', error);
            // Coba init ulang setelah delay
            setTimeout(() => {
                console.log('🔄 Retrying Terminal Manager initialization...');
                try {
                    this.setupEventListeners();
                    this.initializeTerminal();
                } catch (retryError) {
                    console.error('❌ Retry failed:', retryError);
                }
            }, 1000);
        }
    }
    
    // Initialize terminal elements
    initializeTerminal() {
        // Cari elemen terminal secara dinamis
        this.findTerminalElements();
        
        // Jika tidak ditemukan, coba lagi nanti
        if (!this.terminalOutput || !this.commandInput) {
            console.warn('⚠️ Terminal elements not found, retrying...');
            setTimeout(() => this.findTerminalElements(), 500);
        }
        
        // Tampilkan welcome message jika output tersedia
        if (this.terminalOutput && this.terminalOutput.children.length === 0) {
            this.showWelcomeMessage();
        }
    }
    
    // Find terminal elements dengan multiple selectors
    findTerminalElements() {
        // Cari output terminal
        if (!this.terminalOutput) {
            this.terminalOutput = document.getElementById('terminalOutput') || 
                                 document.querySelector('.terminal-output') ||
                                 document.querySelector('[data-terminal-output]');
        }
        
        // Cari input terminal
        if (!this.commandInput) {
            this.commandInput = document.getElementById('commandInput') || 
                               document.querySelector('.terminal-input') ||
                               document.querySelector('[data-command-input]') ||
                               document.querySelector('input[type="text"][placeholder*="command"]');
        }
        
        // Setup input listener jika ditemukan
        if (this.commandInput) {
            this.setupInputListener();
        }
    }
    
    // Setup input listener
    setupInputListener() {
        if (this.commandInput && !this.commandInput.hasListener) {
            this.commandInput.addEventListener('keydown', this.boundInputKeydown);
            this.commandInput.hasListener = true;
        }
    }
    
    // Handle input keydown
    handleInputKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.executeCommand();
        }
    }
    
    // Load command history from localStorage
    loadCommandHistory() {
        try {
            const savedHistory = localStorage.getItem('terminal_history');
            if (savedHistory) {
                this.commandHistory = JSON.parse(savedHistory);
                console.log(`📜 Loaded ${this.commandHistory.length} commands from history`);
            }
        } catch (error) {
            console.error('Failed to load command history:', error);
        }
    }
    
    // Save command history to localStorage
    saveCommandHistory() {
        try {
            // Keep only recent history
            if (this.commandHistory.length > this.security.maxHistory) {
                this.commandHistory = this.commandHistory.slice(-this.security.maxHistory);
            }
            
            localStorage.setItem('terminal_history', JSON.stringify(this.commandHistory));
        } catch (error) {
            console.error('Failed to save command history:', error);
        }
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', this.boundKeydownHandler);
        
        // Hash change listener untuk section detection
        window.addEventListener('hashchange', this.boundHashChange);
        
        // Listen for terminal section activation
        this.setupSectionChangeHandler();
        
        // Visibility change listener
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isTerminalActive()) {
                this.focusInput();
            }
        });
    }
    
    // Handle global keydown
    handleGlobalKeydown(e) {
        // Ctrl + L to clear terminal
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            this.clearTerminal();
            return;
        }
        
        // Ctrl + C to cancel command
        if (e.ctrlKey && e.key === 'c' && this.isExecuting) {
            e.preventDefault();
            this.cancelCommand();
            return;
        }
        
        // Tab for auto-completion (only if input is focused)
        if (e.key === 'Tab' && this.commandInput && document.activeElement === this.commandInput) {
            e.preventDefault();
            this.handleTabComplete();
            return;
        }
        
        // Up/Down arrow for history (only if input is focused)
        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && 
            this.commandInput && 
            document.activeElement === this.commandInput) {
            this.handleHistoryNavigation(e.key);
        }
    }
    
    // Handle hash change
    handleHashChange() {
        if (this.isTerminalActive()) {
            setTimeout(() => this.focusInput(), 100);
        }
    }
    
    // Setup section change handler
    setupSectionChangeHandler() {
        // Coba gunakan event system jika tersedia
        if (window.app && typeof window.app.on === 'function') {
            try {
                window.app.on('section-change', (section) => {
                    if (section === 'terminal') {
                        // Delay sedikit untuk memastikan DOM siap
                        setTimeout(() => {
                            this.focusInput();
                        }, 100);
                    }
                });
                console.log('✅ Using app event system for section changes');
            } catch (error) {
                console.warn('⚠️ Failed to setup section-change listener:', error);
                this.setupFallbackObserver();
            }
        } else {
            // Fallback jika event system tidak tersedia
            console.log('ℹ️ Using fallback observer for section changes');
            this.setupFallbackObserver();
        }
    }
    
    // Setup fallback observer
    setupFallbackObserver() {
        // Check segera
        setTimeout(() => {
            if (this.isTerminalActive()) {
                this.focusInput();
            }
        }, 300);
        
        // Setup periodic check (fallback)
        this.fallbackInterval = setInterval(() => {
            if (this.isTerminalActive()) {
                this.focusInput();
                // Jika sudah fokus, kurangi interval checking
                if (document.activeElement === this.commandInput) {
                    clearInterval(this.fallbackInterval);
                    this.fallbackInterval = null;
                }
            }
        }, 1000);
        
        // Setup mutation observer
        this.setupMutationObserver();
    }
    
    // Check if terminal section is active
    isTerminalActive() {
        // Cara 1: Cek elemen dengan ID terminalSection
        const terminalSection = document.getElementById('terminalSection');
        if (terminalSection && terminalSection.classList.contains('active')) {
            return true;
        }
        
        // Cara 2: Cek URL hash
        if (window.location.hash === '#terminal' || 
            window.location.hash.includes('terminal')) {
            return true;
        }
        
        // Cara 3: Cek class pada body
        if (document.body.classList.contains('terminal-active') ||
            document.body.classList.contains('terminal-section')) {
            return true;
        }
        
        // Cara 4: Cek elemen dengan data attribute
        const terminalEl = document.querySelector('[data-section="terminal"]');
        if (terminalEl && terminalEl.classList.contains('active')) {
            return true;
        }
        
        // Cara 5: Cek visibility element
        const terminalContainer = document.querySelector('.terminal-container');
        if (terminalContainer && 
            terminalContainer.style.display !== 'none' &&
            terminalContainer.style.visibility !== 'hidden') {
            return true;
        }
        
        return false;
    }
    
    // Setup mutation observer
    setupMutationObserver() {
        try {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' || mutation.type === 'childList') {
                        if (this.isTerminalActive()) {
                            this.focusInput();
                        }
                        break;
                    }
                }
            });
            
            // Observasi elemen yang mungkin berubah
            const observeTargets = [
                document.getElementById('terminalSection'),
                document.getElementById('dynamicContent'),
                document.querySelector('.main-content'),
                document.querySelector('.content-area'),
                document.body
            ].filter(el => el); // Hapus null
            
            observeTargets.forEach(target => {
                observer.observe(target, { 
                    attributes: true, 
                    attributeFilter: ['class', 'style'],
                    childList: true, 
                    subtree: true 
                });
            });
            
            this.mutationObserver = observer;
        } catch (error) {
            console.warn('⚠️ MutationObserver setup failed:', error);
        }
    }
    
    // Setup auto-complete
    setupAutoComplete() {
        this.autoCompleteCommands = [
            'ls', 'ls -la', 'ls -lh',
            'pwd', 'whoami', 'date',
            'uptime', 'uname -a', 'hostname',
            'ps aux', 'ps aux | head -20',
            'git status', 'git log --oneline -10',
            'node --version', 'npm --version',
            'python --version', 'curl -s https://api.ipify.org',
            'ping -c 1 8.8.8.8', 'free -h', 'df -h',
            'cat package.json', 'cat README.md',
            'tail -n 50', 'head -n 10',
            'wc -l', 'grep -i "error"',
            'echo', 'clear', 'help',
            'status', 'bots', 'userbots'
        ];
    }
    
    // Set terminal DOM elements (legacy support)
    setTerminalElements(outputElement, inputElement) {
        this.terminalOutput = outputElement;
        this.commandInput = inputElement;
        
        if (this.commandInput) {
            this.setupInputListener();
        }
        
        // Tampilkan welcome message
        if (this.terminalOutput && this.terminalOutput.children.length === 0) {
            this.showWelcomeMessage();
        }
    }
    
    // Show welcome message
    showWelcomeMessage() {
        const welcomeMessage = this.getWelcomeMessage();
        this.addOutput(welcomeMessage, 'info');
        this.addOutput('Type "help" for available commands', 'info');
    }
    
    // Execute a command
    async executeCommand(command = null) {
        const cmd = command || (this.commandInput ? this.commandInput.value.trim() : '');
        
        if (!cmd) {
            return;
        }
        
        if (this.isExecuting) {
            this.addOutput('Another command is already executing', 'warning');
            return;
        }
        
        // Clear input
        if (this.commandInput) {
            this.commandInput.value = '';
        }
        
        // Add command to output
        this.addOutput(`$ ${cmd}`, 'command');
        
        // Security check
        const securityCheck = this.checkCommandSecurity(cmd);
        if (!securityCheck.allowed) {
            this.addOutput(`Error: ${securityCheck.reason}`, 'error');
            this.addOutput(`Type 'help' to see allowed commands`, 'info');
            return;
        }
        
        // Special commands
        if (cmd === 'clear') {
            this.clearTerminal();
            return;
        }
        
        if (cmd === 'help') {
            this.showHelp();
            return;
        }
        
        if (cmd === 'history') {
            this.showHistory();
            return;
        }
        
        if (cmd === 'status') {
            this.showSystemStatus();
            return;
        }
        
        if (cmd === 'bots') {
            this.showBotsStatus();
            return;
        }
        
        if (cmd === 'userbots') {
            this.showUserBotsStatus();
            return;
        }
        
        // Execute server command
        this.isExecuting = true;
        this.updateStatus('Executing command...');
        
        try {
            // Add to history
            this.addToHistory(cmd);
            
            // Send to server
            const result = await this.sendCommandToServer(cmd);
            
            if (result.success) {
                this.addOutput(result.output, 'output');
                
                // Log successful command
                if (this.security.logCommands) {
                    this.logCommand(cmd, true);
                }
            } else {
                this.addOutput(`Error: ${result.error}`, 'error');
                
                // Log failed command
                if (this.security.logCommands) {
                    this.logCommand(cmd, false, result.error);
                }
            }
        } catch (error) {
            this.addOutput(`Network error: ${error.message}`, 'error');
            console.error('Command execution error:', error);
        } finally {
            this.isExecuting = false;
            this.updateStatus('Ready');
            this.scrollToBottom();
        }
    }
    
    // Send command to server
    async sendCommandToServer(command) {
        // Check authentication
        if (!window.authManager || !window.authManager.isAuthenticated?.()) {
            return {
                success: false,
                error: 'Authentication required'
            };
        }
        
        try {
            const headers = window.authManager.getAuthHeaders?.() || {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            };
            
            const response = await fetch(`${this.apiBase}/terminal`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    command: command,
                    timestamp: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                return {
                    success: true,
                    output: data.output,
                    executionTime: data.executionTime
                };
            } else {
                return {
                    success: false,
                    error: data.error || 'Command execution failed'
                };
            }
        } catch (error) {
            console.error('Command fetch error:', error);
            return {
                success: false,
                error: 'Network error: ' + error.message
            };
        }
    }
    
    // Check command security
    checkCommandSecurity(command) {
        // Trim and normalize command
        const cmd = command.trim().toLowerCase();
        
        // Check for blocked patterns
        for (const pattern of this.security.blockedPatterns) {
            if (pattern.test(cmd)) {
                return {
                    allowed: false,
                    reason: 'Command contains dangerous patterns'
                };
            }
        }
        
        // Check for allowed patterns
        for (const pattern of this.security.allowedPatterns) {
            if (pattern.test(cmd)) {
                return {
                    allowed: true,
                    reason: 'Command matches allowed pattern'
                };
            }
        }
        
        // Check exact matches for simple commands
        const simpleCommands = ['clear', 'help', 'history', 'status', 'bots', 'userbots'];
        if (simpleCommands.includes(cmd)) {
            return {
                allowed: true,
                reason: 'Command is in allowed list'
            };
        }
        
        return {
            allowed: false,
            reason: 'Command not in allowed list'
        };
    }
    
    // Add command to history
    addToHistory(command) {
        // Don't add duplicates in a row
        if (this.commandHistory[this.commandHistory.length - 1] !== command) {
            this.commandHistory.push(command);
            this.saveCommandHistory();
        }
        this.historyIndex = this.commandHistory.length;
    }
    
    // Handle history navigation
    handleHistoryNavigation(key) {
        if (!this.commandInput || this.commandHistory.length === 0) {
            return;
        }
        
        if (key === 'ArrowUp') {
            // Move up in history
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.commandInput.value = this.commandHistory[this.historyIndex];
            }
        } else if (key === 'ArrowDown') {
            // Move down in history
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.commandInput.value = this.commandHistory[this.historyIndex];
            } else if (this.historyIndex === this.commandHistory.length - 1) {
                // Clear input when reaching present
                this.historyIndex = this.commandHistory.length;
                this.commandInput.value = '';
            }
        }
        
        // Move cursor to end
        this.focusInput();
        this.commandInput.setSelectionRange(
            this.commandInput.value.length,
            this.commandInput.value.length
        );
    }
    
    // Handle tab auto-completion
    handleTabComplete() {
        if (!this.commandInput) return;
        
        const input = this.commandInput.value.trim();
        if (!input) return;
        
        // Find matching commands
        const matches = this.autoCompleteCommands.filter(cmd => 
            cmd.startsWith(input)
        );
        
        if (matches.length === 1) {
            // Single match, complete it
            this.commandInput.value = matches[0] + ' ';
        } else if (matches.length > 1) {
            // Multiple matches, show options
            this.addOutput('Possible completions:', 'info');
            matches.forEach(match => {
                this.addOutput(`  ${match}`, 'info');
            });
            this.addOutput('', 'info');
        }
        
        this.scrollToBottom();
    }
    
    // Add output to terminal
    addOutput(text, type = 'output') {
        if (!this.terminalOutput) {
            console.warn('⚠️ Terminal output element not found');
            return;
        }
        
        try {
            const line = document.createElement('div');
            line.className = `terminal-line terminal-${type}`;
            
            // Format berdasarkan tipe
            switch (type) {
                case 'command':
                    line.innerHTML = `<span class="prompt">$</span> <span class="command">${this.escapeHtml(text)}</span>`;
                    break;
                case 'output':
                    line.textContent = text;
                    break;
                case 'error':
                    line.innerHTML = `<span class="error">${this.escapeHtml(text)}</span>`;
                    break;
                case 'info':
                    line.innerHTML = `<span class="info">${this.escapeHtml(text)}</span>`;
                    break;
                case 'success':
                    line.innerHTML = `<span class="success">${this.escapeHtml(text)}</span>`;
                    break;
                case 'warning':
                    line.innerHTML = `<span class="warning">${this.escapeHtml(text)}</span>`;
                    break;
                default:
                    line.textContent = text;
            }
            
            this.terminalOutput.appendChild(line);
            this.scrollToBottom();
        } catch (error) {
            console.error('Failed to add output:', error);
        }
    }
    
    // Clear terminal
    clearTerminal() {
        if (this.terminalOutput) {
            this.terminalOutput.innerHTML = '';
            this.addOutput('Terminal cleared', 'info');
            this.addOutput('Type "help" for available commands', 'info');
        }
    }
    
    // Show help
    showHelp() {
        this.addOutput('===========================================', 'info');
        this.addOutput('🔐 SECURE TERMINAL - ALLOWED COMMANDS', 'info');
        this.addOutput('===========================================', 'info');
        this.addOutput('', 'info');
        this.addOutput('📊 SYSTEM INFORMATION:', 'info');
        this.addOutput('  pwd                    - Show current directory', 'info');
        this.addOutput('  whoami                 - Show current user', 'info');
        this.addOutput('  date                   - Show current date/time', 'info');
        this.addOutput('  uptime                 - Show system uptime', 'info');
        this.addOutput('  uname -a              - Show system information', 'info');
        this.addOutput('  hostname              - Show hostname', 'info');
        this.addOutput('', 'info');
        this.addOutput('📁 FILE OPERATIONS:', 'info');
        this.addOutput('  ls                    - List files', 'info');
        this.addOutput('  ls -la                - List all files with details', 'info');
        this.addOutput('  ls -lh                - List with human-readable sizes', 'info');
        this.addOutput('  cat package.json      - View package.json', 'info');
        this.addOutput('  cat README.md        - View README', 'info');
        this.addOutput('', 'info');
        this.addOutput('🖥️ PROCESS MANAGEMENT:', 'info');
        this.addOutput('  ps aux | head -20     - Show top 20 processes', 'info');
        this.addOutput('  ps aux | grep bot     - Find bot processes', 'info');
        this.addOutput('', 'info');
        this.addOutput('📦 VERSION CHECKS:', 'info');
        this.addOutput('  node --version        - Check Node.js version', 'info');
        this.addOutput('  npm --version         - Check npm version', 'info');
        this.addOutput('  python --version      - Check Python version', 'info');
        this.addOutput('', 'info');
        this.addOutput('🌐 NETWORK:', 'info');
        this.addOutput('  curl -s https://api.ipify.org - Get public IP', 'info');
        this.addOutput('  ping -c 1 8.8.8.8    - Ping test', 'info');
        this.addOutput('', 'info');
        this.addOutput('💾 SYSTEM RESOURCES:', 'info');
        this.addOutput('  free -h              - Memory usage', 'info');
        this.addOutput('  df -h                - Disk usage', 'info');
        this.addOutput('', 'info');
        this.addOutput('🔍 SEARCH & UTILITIES:', 'info');
        this.addOutput('  tail -n 50 file.log  - View last 50 lines', 'info');
        this.addOutput('  head -n 10 file.js   - View first 10 lines', 'info');
        this.addOutput('  wc -l file.js        - Count lines', 'info');
        this.addOutput('  grep -i "error" *.log - Search logs', 'info');
        this.addOutput('', 'info');
        this.addOutput('⚙️ OTHER:', 'info');
        this.addOutput('  echo "text"          - Echo text', 'info');
        this.addOutput('  date +"%Y-%m-%d"     - Custom date format', 'info');
        this.addOutput('  clear                - Clear terminal', 'info');
        this.addOutput('  help                 - Show this help', 'info');
        this.addOutput('  status               - System status', 'info');
        this.addOutput('  bots                 - List bots', 'info');
        this.addOutput('  userbots             - List user bots', 'info');
        this.addOutput('', 'info');
        this.addOutput('===========================================', 'info');
        this.addOutput('⚠️ SECURITY NOTES:', 'info');
        this.addOutput('• All commands are executed in a secure sandbox', 'info');
        this.addOutput('• Sensitive information is automatically redacted', 'info');
        this.addOutput('• Dangerous commands are blocked', 'info');
        this.addOutput('• Command history is logged for audit', 'info');
        this.addOutput('===========================================', 'info');
    }
    
    // Show command history
    showHistory() {
        if (this.commandHistory.length === 0) {
            this.addOutput('No command history', 'info');
            return;
        }
        
        this.addOutput('Command History:', 'info');
        this.commandHistory.forEach((cmd, index) => {
            this.addOutput(`  ${index + 1}. ${cmd}`, 'info');
        });
    }
    
    // Show system status
    showSystemStatus() {
        const now = new Date();
        const uptime = performance.now();
        
        this.addOutput('System Status:', 'info');
        this.addOutput(`  Time: ${now.toLocaleString()}`, 'info');
        this.addOutput(`  Uptime: ${this.formatUptime(uptime)}`, 'info');
        this.addOutput(`  User Agent: ${navigator.userAgent.substring(0, 50)}...`, 'info');
        this.addOutput(`  Online: ${navigator.onLine ? 'Yes' : 'No'}`, 'info');
        this.addOutput(`  Memory: ${this.formatMemory(navigator.deviceMemory || 'Unknown')}`, 'info');
        this.addOutput(`  Cores: ${navigator.hardwareConcurrency || 'Unknown'}`, 'info');
        
        // Check authentication
        if (window.authManager) {
            const isAuth = window.authManager.isAuthenticated?.() || false;
            this.addOutput(`  Authenticated: ${isAuth ? 'Yes' : 'No'}`, 'info');
            
            if (isAuth) {
                const session = window.authManager.getSessionInfo?.();
                this.addOutput(`  Session expires in: ${session?.timeLeftFormatted || 'Unknown'}`, 'info');
            }
        }
    }
    
    // Show bots status
    async showBotsStatus() {
        if (!window.botManager) {
            this.addOutput('Bot manager not available', 'error');
            return;
        }
        
        this.addOutput('Bot Status:', 'info');
        
        try {
            const bots = window.botManager.getAllBots?.() || [];
            
            if (bots.length === 0) {
                this.addOutput('  No bots configured', 'info');
                return;
            }
            
            bots.forEach(bot => {
                const statusIcon = bot.status === 'running' ? '🟢' : 
                                 bot.status === 'stopped' ? '🔴' : '🟡';
                this.addOutput(`  ${statusIcon} ${bot.name || bot.id}`, 'info');
                this.addOutput(`      Status: ${bot.status}`, 'info');
                this.addOutput(`      Messages: ${bot.stats?.messagesSent || 0}`, 'info');
                if (window.botManager.getBotUptime) {
                    this.addOutput(`      Uptime: ${window.botManager.getBotUptime(bot.id)}`, 'info');
                }
            });
        } catch (error) {
            this.addOutput(`Error: ${error.message}`, 'error');
        }
    }
    
    // Show user bots status
    async showUserBotsStatus() {
        if (!window.userBotManager) {
            this.addOutput('User Bot manager not available', 'error');
            return;
        }
        
        this.addOutput('User Bot Status:', 'info');
        this.addOutput('  Feature coming soon...', 'info');
    }
    
    // Update terminal status
    updateStatus(status) {
        try {
            const statusElement = document.getElementById('terminalStatus') || 
                                 document.querySelector('.terminal-status');
            if (statusElement) {
                statusElement.textContent = status;
            }
        } catch (error) {
            console.warn('Failed to update status:', error);
        }
    }
    
    // Cancel current command
    cancelCommand() {
        if (this.isExecuting) {
            this.addOutput('^C', 'info');
            this.addOutput('Command cancelled', 'warning');
            this.isExecuting = false;
            this.updateStatus('Ready');
        }
    }
    
    // Focus input field
    focusInput() {
        if (this.commandInput) {
            try {
                this.commandInput.focus();
                this.commandInput.setSelectionRange(
                    this.commandInput.value.length,
                    this.commandInput.value.length
                );
            } catch (error) {
                console.warn('Failed to focus input:', error);
            }
        }
    }
    
    // Scroll terminal to bottom
    scrollToBottom() {
        if (this.terminalOutput) {
            try {
                this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
            } catch (error) {
                console.warn('Failed to scroll to bottom:', error);
            }
        }
    }
    
    // Escape HTML for safe output
    escapeHtml(text) {
        try {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        } catch (error) {
            return String(text).replace(/[&<>"']/g, char => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[char]);
        }
    }
    
    // Format uptime
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    // Format memory
    formatMemory(memory) {
        if (memory === 'Unknown' || memory === undefined) return 'Unknown';
        return `${memory} GB`;
    }
    
    // Log command for audit
    logCommand(command, success, error = null) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                command: command,
                success: success,
                error: error,
                user: window.authManager?.getUser?.()?.username || 
                      localStorage.getItem('username') || 
                      'unknown',
                ip: 'client'
            };
            
            // Save to localStorage
            const auditLog = JSON.parse(localStorage.getItem('terminal_audit_log') || '[]');
            auditLog.push(logEntry);
            
            // Keep only last 1000 entries
            if (auditLog.length > 1000) {
                auditLog.shift();
            }
            
            localStorage.setItem('terminal_audit_log', JSON.stringify(auditLog));
        } catch (error) {
            console.error('Failed to save audit log:', error);
        }
    }
    
    // Get audit log
    getAuditLog(limit = 50) {
        try {
            const auditLog = JSON.parse(localStorage.getItem('terminal_audit_log') || '[]');
            return auditLog.slice(-limit);
        } catch (error) {
            console.error('Failed to load audit log:', error);
            return [];
        }
    }
    
    // Clear audit log
    clearAuditLog() {
        try {
            localStorage.removeItem('terminal_audit_log');
            console.log('🗑️ Audit log cleared');
            return true;
        } catch (error) {
            console.error('Failed to clear audit log:', error);
            return false;
        }
    }
    
    // Export command history
    exportHistory() {
        const exportData = {
            version: '2.0.0',
            exportedAt: new Date().toISOString(),
            history: this.commandHistory,
            stats: {
                totalCommands: this.commandHistory.length,
                lastCommand: this.commandHistory[this.commandHistory.length - 1] || null
            }
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    // Import command history
    importHistory(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!data.version || !Array.isArray(data.history)) {
                throw new Error('Invalid import data format');
            }
            
            // Add imported commands to history
            let importedCount = 0;
            data.history.forEach(cmd => {
                if (!this.commandHistory.includes(cmd)) {
                    this.commandHistory.push(cmd);
                    importedCount++;
                }
            });
            
            this.saveCommandHistory();
            
            return {
                success: true,
                imported: importedCount,
                total: this.commandHistory.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // Download terminal output
    downloadOutput() {
        if (!this.terminalOutput) return;
        
        try {
            const content = this.terminalOutput.textContent;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            a.href = url;
            a.download = `terminal-output-${new Date().toISOString().slice(0, 10)}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.addOutput('Output downloaded', 'success');
        } catch (error) {
            this.addOutput('Failed to download: ' + error.message, 'error');
        }
    }
    
    // Copy terminal output to clipboard
    async copyOutput() {
        if (!this.terminalOutput) return;
        
        try {
            const content = this.terminalOutput.textContent;
            await navigator.clipboard.writeText(content);
            this.addOutput('Output copied to clipboard', 'success');
        } catch (err) {
            this.addOutput('Failed to copy: ' + err.message, 'error');
        }
    }
    
    // Toggle fullscreen
    toggleFullscreen() {
        const terminalContainer = this.terminalOutput?.closest('.terminal-container') ||
                                 document.querySelector('.terminal-container');
        
        if (!terminalContainer) {
            this.addOutput('Terminal container not found', 'error');
            return;
        }
        
        try {
            if (!document.fullscreenElement) {
                terminalContainer.requestFullscreen();
                this.addOutput('Entered fullscreen mode', 'info');
            } else {
                document.exitFullscreen();
                this.addOutput('Exited fullscreen mode', 'info');
            }
        } catch (err) {
            this.addOutput('Fullscreen error: ' + err.message, 'error');
        }
    }
    
    // Get command suggestions
    getCommandSuggestions(partial) {
        if (!partial) return [];
        
        return this.autoCompleteCommands.filter(cmd => 
            cmd.toLowerCase().includes(partial.toLowerCase())
        );
    }
    
    // Get command statistics
    getCommandStats() {
        const stats = {
            total: this.commandHistory.length,
            unique: new Set(this.commandHistory).size,
            byType: {}
        };
        
        // Count commands by type
        this.commandHistory.forEach(cmd => {
            const firstWord = cmd.split(' ')[0];
            stats.byType[firstWord] = (stats.byType[firstWord] || 0) + 1;
        });
        
        // Most used commands
        stats.mostUsed = Object.entries(stats.byType)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        return stats;
    }
    
    // Clear command history
    clearHistory() {
        this.commandHistory = [];
        this.historyIndex = -1;
        this.saveCommandHistory();
        this.addOutput('Command history cleared', 'info');
    }
    
    // Event system untuk terminal events
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
    
    // Initialize example commands
    initExampleCommands() {
        const exampleCommands = [
            { command: 'ls -la', description: 'List all files with details' },
            { command: 'ps aux | head -20', description: 'Show top 20 processes' },
            { command: 'node --version', description: 'Check Node.js version' },
            { command: 'curl -s https://api.ipify.org', description: 'Get public IP' },
            { command: 'free -h', description: 'Check memory usage' },
            { command: 'df -h', description: 'Check disk usage' }
        ];
        
        return exampleCommands;
    }
    
    // Get terminal welcome message
    getWelcomeMessage() {
        return `
╔══════════════════════════════════════════════════════════╗
║                   TeleBot Pro Terminal                   ║
║                    Version 2.0.0                         ║
╚══════════════════════════════════════════════════════════╝

Welcome to the secure terminal interface.

🔐 SECURITY FEATURES:
• Sandboxed command execution
• Restricted command set
• Command logging and audit
• Real-time monitoring

📋 QUICK START:
• Type 'help' to see available commands
• Use ↑/↓ arrows for command history
• Press Tab for auto-completion
• Type 'status' for system information

⚡ TIPS:
• Commands are executed on the server
• Output is sanitized for security
• Session is automatically maintained
• Activity is logged for audit purposes

Type a command and press Enter to begin.
        `.trim();
    }
    
    // Cleanup method
    cleanup() {
        // Hentikan interval fallback
        if (this.fallbackInterval) {
            clearInterval(this.fallbackInterval);
            this.fallbackInterval = null;
        }
        
        // Hentikan mutation observer
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
        }
        
        // Hapus event listeners
        document.removeEventListener('keydown', this.boundKeydownHandler);
        window.removeEventListener('hashchange', this.boundHashChange);
        
        // Hapus input listener
        if (this.commandInput && this.commandInput.hasListener) {
            this.commandInput.removeEventListener('keydown', this.boundInputKeydown);
            this.commandInput.hasListener = false;
        }
        
        console.log('🧹 Terminal Manager cleaned up');
    }
    
    // Debug info
    debugInfo() {
        return {
            isInitialized: !!this.terminalOutput && !!this.commandInput,
            elements: {
                terminalOutput: !!this.terminalOutput,
                commandInput: !!this.commandInput
            },
            settings: {
                securityEnabled: this.security.enabled,
                maxHistory: this.security.maxHistory,
                allowedCommands: this.security.allowedPatterns.length
            },
            state: {
                isExecuting: this.isExecuting,
                historyLength: this.commandHistory.length,
                historyIndex: this.historyIndex,
                fallbackInterval: !!this.fallbackInterval,
                mutationObserver: !!this.mutationObserver
            },
            dependencies: {
                authManager: !!window.authManager,
                botManager: !!window.botManager,
                userBotManager: !!window.userBotManager,
                app: !!window.app
            }
        };
    }
    
    // Test terminal functionality
    testTerminal() {
        console.log('🧪 Testing terminal functionality...');
        
        const tests = [
            {
                name: 'Elements',
                test: () => !!this.terminalOutput && !!this.commandInput,
                message: 'Terminal elements found'
            },
            {
                name: 'History',
                test: () => Array.isArray(this.commandHistory),
                message: 'Command history loaded'
            },
            {
                name: 'Security',
                test: () => this.security.enabled && this.security.allowedPatterns.length > 0,
                message: 'Security enabled'
            },
            {
                name: 'AutoComplete',
                test: () => this.autoCompleteCommands && this.autoCompleteCommands.length > 0,
                message: 'Auto-complete commands loaded'
            }
        ];
        
        const results = tests.map(test => {
            const passed = test.test();
            console.log(`${passed ? '✅' : '❌'} ${test.name}: ${test.message}`);
            return { name: test.name, passed };
        });
        
        const allPassed = results.every(r => r.passed);
        console.log(allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed');
        
        return results;
    }
}

// Static method untuk create instance dengan error handling
TerminalManager.createInstance = function() {
    try {
        if (window.terminalManager) {
            console.log('ℹ️ TerminalManager instance already exists');
            return window.terminalManager;
        }
        
        const instance = new TerminalManager();
        window.terminalManager = instance;
        
        // Tambahkan cleanup pada page unload
        window.addEventListener('beforeunload', () => {
            if (instance.cleanup) {
                instance.cleanup();
            }
        });
        
        console.log('✅ TerminalManager instance created successfully');
        return instance;
    } catch (error) {
        console.error('❌ Failed to create TerminalManager:', error);
        return null;
    }
};

// Auto-initialize jika window sudah tersedia
if (typeof window !== 'undefined') {
    // Tunggu sampai DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (!window.terminalManager) {
                    TerminalManager.createInstance();
                }
            }, 100);
        });
    } else {
        setTimeout(() => {
            if (!window.terminalManager) {
                TerminalManager.createInstance();
            }
        }, 100);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TerminalManager;
}

// Versi pendek untuk backward compatibility
window.Terminal = TerminalManager;
