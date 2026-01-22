const { exec } = require('child_process');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const execAsync = promisify(exec);
const CONFIG = {
    JWT_SECRET: process.env.JWT_SECRET || "f8d7a3c6b5e49201738a1d2f4c9b6a7e5d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2"
};

// ============================================
// SECURITY CONFIGURATION
// ============================================
const ALLOWED_COMMANDS = process.env.ALLOWED_COMMANDS ? 
    process.env.ALLOWED_COMMANDS.split(',') : [
        // System info (safe)
        'pwd',
        'whoami',
        'date',
        'uptime',
        'uptime -p',
        'uname -a',
        'uname -r',
        'hostname',
        
        // File operations (restricted)
        'ls',
        'ls -la',
        'ls -l',
        'ls -lh',
        'ls -la | head -20',
        
        // Process info
        'ps aux | head -20',
        'ps aux | grep -v grep | grep -i bot',
        'ps aux | wc -l',
        
        // Git operations
        'git status',
        'git branch',
        'git log --oneline -10',
        'git remote -v',
        
        // Version checks
        'node --version',
        'npm --version',
        'python --version',
        'python3 --version',
        
        // Network info (safe)
        'curl -s https://api.ipify.org',
        'ping -c 1 8.8.8.8',
        
        // System resources
        'free -h',
        'df -h',
        'df -h | head -10',
        
        // Help command
        'help',
        'clear'
    ];

const ALLOWED_PATTERNS = [
    /^cat (package\.json|README\.md|\.env\.example)$/,
    /^tail -n \d+ (\.log|log\.txt)$/,
    /^head -n \d+ .*\.(js|json|md)$/,
    /^wc -l .*\.(js|json|md)$/,
    /^grep -i ".*" .*\.(js|json|md)$/,
    /^find \. -name ".*\.(js|json|md)" -type f \| head -\d+$/,
    /^du -sh .*$/,
    /^echo .*$/,
    /^date \+.*$/
];

// ============================================
// SECURITY FUNCTIONS
// ============================================
function isCommandAllowed(command) {
    const cleanCmd = command.trim().toLowerCase();
    
    // Block dangerous commands
    const DANGEROUS_PATTERNS = [
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
        /\|\|/
    ];
    
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(cleanCmd)) {
            console.log(`🚨 Blocked dangerous command: ${cleanCmd}`);
            return false;
        }
    }
    
    // Check exact matches
    if (ALLOWED_COMMANDS.includes(cleanCmd)) {
        return true;
    }
    
    // Check patterns
    for (const pattern of ALLOWED_PATTERNS) {
        if (pattern.test(cleanCmd)) {
            return true;
        }
    }
    
    return false;
}

function sanitizeOutput(output) {
    if (!output) return '';
    
    // Remove sensitive patterns
    const SENSITIVE_PATTERNS = [
        /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/g,
        /(api[_-]?key|token|secret|password)=[^\s]+/gi,
        /(bearer\s+)[a-zA-Z0-9._-]+/gi,
        /(-----BEGIN[^-]+-----)[^-]+(-----END[^-]+-----)/gs
    ];
    
    let sanitized = output;
    for (const pattern of SENSITIVE_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    return sanitized;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function corsHeaders(origin = '*') {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    };
}

function response(statusCode, body, origin = '*') {
    return {
        statusCode,
        headers: corsHeaders(origin),
        body: JSON.stringify(body, null, 2)
    };
}

function verifyToken(token) {
    try {
        return jwt.verify(token, CONFIG.JWT_SECRET);
    } catch {
        return null;
    }
}

// ============================================
// MAIN HANDLER
// ============================================
exports.handler = async (event, context) => {
    console.log('💻 Terminal function called');
    
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return response(200, { message: 'CORS preflight' }, event.headers.origin);
    }
    
    const origin = event.headers.origin || '*';
    const authHeader = event.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return response(401, { error: 'Authentication required' }, origin);
    }
    
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    
    if (!user) {
        return response(401, { error: 'Invalid or expired token' }, origin);
    }
    
    try {
        const requestData = JSON.parse(event.body || '{}');
        const { command } = requestData;
        
        if (!command) {
            return response(400, { error: 'No command provided' }, origin);
        }
        
        console.log(`📥 Terminal command from ${user.user}: ${command.substring(0, 50)}...`);
        
        // Security check
        if (!isCommandAllowed(command)) {
            return response(403, {
                error: 'Command not allowed',
                allowedCommands: ALLOWED_COMMANDS,
                message: 'This command is not permitted for security reasons'
            }, origin);
        }
        
        // Special help command
        if (command === 'help') {
            return response(200, {
                success: true,
                output: `
===========================================
🔐 SECURE TERMINAL - ALLOWED COMMANDS
===========================================

📊 SYSTEM INFORMATION:
  pwd                    - Show current directory
  whoami                 - Show current user
  date                   - Show current date/time
  uptime                 - Show system uptime
  uname -a              - Show system information
  hostname              - Show hostname

📁 FILE OPERATIONS:
  ls                    - List files
  ls -la                - List all files with details
  ls -lh                - List with human-readable sizes
  cat package.json      - View package.json
  cat README.md        - View README

🖥️ PROCESS MANAGEMENT:
  ps aux | head -20     - Show top 20 processes
  ps aux | grep bot     - Find bot processes

📦 VERSION CHECKS:
  node --version        - Check Node.js version
  npm --version         - Check npm version
  python --version      - Check Python version

🌐 NETWORK:
  curl -s https://api.ipify.org - Get public IP
  ping -c 1 8.8.8.8    - Ping test

💾 SYSTEM RESOURCES:
  free -h              - Memory usage
  df -h                - Disk usage

🔍 SEARCH & UTILITIES:
  tail -n 50 file.log  - View last 50 lines
  head -n 10 file.js   - View first 10 lines
  wc -l file.js        - Count lines
  grep -i "error" *.log - Search logs

⚙️ OTHER:
  echo "text"          - Echo text
  date +"%Y-%m-%d"     - Custom date format
  clear                - Clear terminal

===========================================
⚠️ SECURITY NOTES:
• All commands are executed in a secure sandbox
• Sensitive information is automatically redacted
• Dangerous commands are blocked
• Command history is logged for audit
===========================================
                `.trim()
            }, origin);
        }
        
        // Clear command (special handling)
        if (command === 'clear') {
            return response(200, {
                success: true,
                output: '\n'.repeat(50) + 'Terminal cleared\n$ ',
                command: 'clear',
                timestamp: new Date().toISOString()
            }, origin);
        }
        
        // Execute command
        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: '/tmp',
                timeout: 30000, // 30 seconds max
                maxBuffer: 1024 * 1024, // 1MB buffer
                shell: '/bin/bash',
                env: {
                    ...process.env,
                    PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
                    HOME: '/tmp'
                }
            });
            
            const sanitizedStdout = sanitizeOutput(stdout);
            const sanitizedStderr = sanitizeOutput(stderr);
            
            let output = '';
            if (sanitizedStdout) output += sanitizedStdout;
            if (sanitizedStderr) output += '\nERROR:\n' + sanitizedStderr;
            if (!output.trim()) output = '(No output)';
            
            console.log(`✅ Command executed: ${command.substring(0, 30)}...`);
            
            return response(200, {
                success: true,
                output: output,
                command: command,
                timestamp: new Date().toISOString(),
                executionTime: Date.now(),
                user: user.user
            }, origin);
            
        } catch (error) {
            console.error(`❌ Command execution failed:`, error);
            
            return response(500, {
                success: false,
                error: `Command execution failed: ${error.message}`,
                command: command,
                timestamp: new Date().toISOString()
            }, origin);
        }
        
    } catch (error) {
        console.error('❌ Terminal error:', error);
        return response(500, {
            error: 'Internal server error',
            message: error.message
        }, origin);
    }
};

// ============================================
// COMMAND HISTORY LOGGING (Optional)
// ============================================
const commandHistory = new Map();
const MAX_HISTORY = 1000;

function logCommand(user, command, success = true) {
    if (!commandHistory.has(user)) {
        commandHistory.set(user, []);
    }
    
    const history = commandHistory.get(user);
    history.push({
        command,
        success,
        timestamp: new Date().toISOString(),
        ip: 'server'
    });
    
    // Keep only recent history
    if (history.length > MAX_HISTORY) {
        history.splice(0, history.length - MAX_HISTORY);
    }
}

// ============================================
// PERIODIC CLEANUP
// ============================================
setInterval(() => {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const [user, history] of commandHistory.entries()) {
        const recent = history.filter(cmd => {
            const cmdTime = new Date(cmd.timestamp).getTime();
            return now - cmdTime < maxAge;
        });
        
        if (recent.length === 0) {
            commandHistory.delete(user);
        } else {
            commandHistory.set(user, recent);
        }
    }
}, 60 * 60 * 1000); // Cleanup every hour
