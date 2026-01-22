/**
 * TeleBot Pro v2.0.0 - Terminal Manager
 * Handles secure terminal operations and command execution
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
        this.init();
    }
    
    init() {
        console.log('💻 Terminal Manager initialized');
        this.loadCommandHistory();
        this.setupEventListeners();
        this.setupAutoComplete();
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
        document.addEventListener('keydown', (e) => {
            // Ctrl + L to clear terminal
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.clearTerminal();
            }
            
            // Ctrl + C to cancel command
            if (e.ctrlKey && e.key === 'c' && this.isExecuting) {
                e.preventDefault();
                this.cancelCommand();
            }
            
            // Tab for auto-completion
            if (e.key === 'Tab' && document.activeElement === this.commandInput) {
                e.preventDefault();
                this.handleTabComplete();
            }
            
            // Up/Down arrow for history
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                this.handleHistoryNavigation(e.key);
            }
        });
        
        // Listen for terminal section activation
        if (window.app) {
            window.app.on('section-change', (section) => {
                if (section === 'terminal') {
                    this.focusInput();
                }
            });
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
    
    // Set terminal DOM elements
    setTerminalElements(outputElement, inputElement) {
        this.terminalOutput = outputElement;
        this.commandInput = inputElement;
        
        if (this.commandInput) {
            this.commandInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.executeCommand();
                }
            });
        }
    }
    
    // Execute a command
    async executeCommand(command = null) {
        const cmd = command || this.commandInput?.value.trim();
        
        if (!cmd || this.isExecuting) {
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
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            return {
                success: false,
                error: 'Authentication required'
            };
        }
        
        try {
            const response = await fetch(`${this.apiBase}/terminal`, {
                method: 'POST',
                headers: window.authManager.getAuthHeaders(),
                body: JSON.stringify({
                    command: command
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
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
        this.commandInput.focus();
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
        if (!this.terminalOutput) return;
        
        const line = document.createElement('div');
        line.className = `terminal-line terminal-${type}`;
        
        // Format based on type
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
            default:
                line.textContent = text;
        }
        
        this.terminalOutput.appendChild(line);
        this.scrollToBottom();
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
            const isAuth = window.authManager.isAuthenticated();
            this.addOutput(`  Authenticated: ${isAuth ? 'Yes' : 'No'}`, 'info');
            
            if (isAuth) {
                const session = window.authManager.getSessionInfo();
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
            const bots = window.botManager.getAllBots();
            
            if (bots.length === 0) {
                this.addOutput('  No bots configured', 'info');
                return;
            }
            
            bots.forEach(bot => {
                const statusIcon = bot.status === 'running' ? '🟢' : 
                                 bot.status === 'stopped' ? '🔴' : '🟡';
                this.addOutput(`  ${statusIcon} ${bot.name} (${bot.id})`, 'info');
                this.addOutput(`      Status: ${bot.status}`, 'info');
                this.addOutput(`      Messages: ${bot.stats.messagesSent || 0}`, 'info');
                this.addOutput(`      Uptime: ${window.botManager.getBotUptime(bot.id)}`, 'info');
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
        const statusElement = document.getElementById('terminalStatus');
        if (statusElement) {
            statusElement.textContent = status;
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
            this.commandInput.focus();
        }
    }
    
    // Scroll terminal to bottom
    scrollToBottom() {
        if (this.terminalOutput) {
            this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;
        }
    }
    
    // Escape HTML for safe output
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Format uptime
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    // Format memory
    formatMemory(memory) {
        if (memory === 'Unknown') return memory;
        return `${memory} GB`;
    }
    
    // Log command for audit
    logCommand(command, success, error = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            command: command,
            success: success,
            error: error,
            user: window.authManager?.getUser()?.username || 'unknown',
            ip: 'client'
        };
        
        // Save to localStorage
        try {
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
        localStorage.removeItem('terminal_audit_log');
        console.log('🗑️ Audit log cleared');
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
            data.history.forEach(cmd => {
                if (!this.commandHistory.includes(cmd)) {
                    this.commandHistory.push(cmd);
                }
            });
            
            this.saveCommandHistory();
            
            return {
                success: true,
                imported: data.history.length,
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
    }
    
    // Copy terminal output to clipboard
    copyOutput() {
        if (!this.terminalOutput) return;
        
        const content = this.terminalOutput.textContent;
        navigator.clipboard.writeText(content).then(() => {
            this.addOutput('Output copied to clipboard', 'success');
        }).catch(err => {
            this.addOutput('Failed to copy: ' + err, 'error');
        });
    }
    
    // Toggle fullscreen
    toggleFullscreen() {
        const terminalContainer = this.terminalOutput?.closest('.terminal-container');
        if (!terminalContainer) return;
        
        if (!document.fullscreenElement) {
            terminalContainer.requestFullscreen().catch(err => {
                console.error('Failed to enter fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
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
    
    // Event system for terminal events
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
}

// Create global instance
window.terminalManager = new TerminalManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TerminalManager;
}
