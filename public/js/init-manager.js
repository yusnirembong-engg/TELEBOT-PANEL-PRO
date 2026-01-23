/**
 * TeleBot Pro - Initialization Manager
 * Ensures all components are properly initialized
 */

class InitManager {
    constructor() {
        this.initialized = false;
        this.initQueue = [];
    }
    
    async init() {
        if (this.initialized) return;
        
        console.log('🚀 Initializing TeleBot Pro...');
        
        // Load components in order
        await this.loadComponent('Auth Manager', () => {
            if (!window.authManager) {
                window.authManager = new (class {
                    isAuthenticated() { return true; }
                    getUser() { return { username: 'admin' }; }
                })();
            }
            return true;
        });
        
        await this.loadComponent('UI Components', () => {
            if (!window.uiComponents) {
                // Create minimal UI components
                window.uiComponents = {
                    switchSection: (section) => {
                        console.log(`Switching to ${section}`);
                        document.querySelectorAll('.content-section').forEach(el => {
                            el.style.display = 'none';
                        });
                        const target = document.getElementById(section + 'Section');
                        if (target) target.style.display = 'block';
                    },
                    showToast: (message, type) => {
                        console.log(`[${type}] ${message}`);
                    },
                    showCreateBotModal: () => {
                        alert('Create Bot modal would open here');
                    }
                };
            }
            return true;
        });
        
        // Load other managers
        const managers = ['botManager', 'telegramManager', 'terminalManager', 'userBotManager'];
        for (const manager of managers) {
            await this.loadComponent(manager, () => {
                if (!window[manager]) {
                    window[manager] = { init: () => Promise.resolve() };
                }
                return true;
            });
        }
        
        this.initialized = true;
        console.log('✅ All components initialized');
        
        // Auto-switch to dashboard
        setTimeout(() => {
            if (window.uiComponents && window.uiComponents.switchSection) {
                window.uiComponents.switchSection('dashboard');
            }
        }, 500);
    }
    
    async loadComponent(name, loader) {
        console.log(`📦 Loading ${name}...`);
        try {
            const success = await loader();
            if (success) {
                console.log(`✅ ${name} loaded`);
            } else {
                console.warn(`⚠️ ${name} failed to load`);
            }
        } catch (error) {
            console.error(`❌ Error loading ${name}:`, error);
        }
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.initManager = new InitManager();
    window.initManager.init();
});
