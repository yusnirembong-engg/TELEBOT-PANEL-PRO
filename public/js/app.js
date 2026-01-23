/**
 * TeleBot Pro v2.0.0 - Main Application
 * Entry point for the application
 */

// Simple app initialization
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
                        // Show success
                        if (loginBtn) {
                            loginBtn.innerHTML = '<i class="fas fa-check"></i> Login Successful!';
                        }
                        
                        // Hide login screen, show main panel
                        const loginScreen = document.getElementById('loginScreen');
                        const mainPanel = document.getElementById('mainPanel');
                        
                        if (loginScreen) loginScreen.style.display = 'none';
                        if (mainPanel) mainPanel.style.display = 'flex';
                        
                        // Show welcome message
                        setTimeout(() => {
                            if (loginBtn) {
                                loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                                loginBtn.disabled = false;
                            }
                        }, 2000);
                        
                    } else {
                        // Show error
                        if (errorDiv) {
                            document.getElementById('errorMessage').textContent = result.error;
                            errorDiv.style.display = 'block';
                        }
                        
                        if (loginBtn) {
                            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                            loginBtn.disabled = false;
                        }
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    
                    if (errorDiv) {
                        document.getElementById('errorMessage').textContent = 
                            'Network error. Please check your connection.';
                        errorDiv.style.display = 'block';
                    }
                    
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                        loginBtn.disabled = false;
                    }
                }
            } else {
                // Fallback if auth manager not available
                console.warn('Auth manager not available, using fallback');
                
                // Simulate network delay
                setTimeout(() => {
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
                        loginBtn.disabled = false;
                    }
                    
                    if (errorDiv) {
                        document.getElementById('errorMessage').textContent = 
                            'Authentication service not available. Please check server.';
                        errorDiv.style.display = 'block';
                    }
                }, 1500);
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

// Fallback app object if ui-components.js fails
if (!window.app) {
    window.app = {
        init: function() {
            console.log('App initialized (fallback)');
        },
        switchSection: function(sectionId) {
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
        }
    };
}

// Make sure managers exist (fallback)
if (!window.botManager) {
    window.botManager = {
        getAllBots: () => [],
        listBots: () => Promise.resolve({ success: false })
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
        showUserBotInterface: () => {},
        showAutoTextInterface: () => {}
    };
}
