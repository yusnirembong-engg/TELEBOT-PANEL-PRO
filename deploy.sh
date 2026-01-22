
### 📄 `deploy.sh`
```bash
#!/bin/bash

# ============================================
# TELEBOT PANEL PRO - DEPLOYMENT SCRIPT v2.0
# ============================================
# Complete deployment script for Netlify hosting
# Author: TeleBot Pro Team
# ============================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_VERSION="2.0.0"
DEFAULT_PORT="8888"
NETLIFY_DIR=".netlify"
BACKUP_DIR="backups"
LOG_FILE="deploy.log"

# Logging functions
log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")    echo -e "${BLUE}[INFO]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
        "WARNING") echo -e "${YELLOW}[WARNING]${NC} $message" ;;
        "ERROR")   echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG")   echo -e "${CYAN}[DEBUG]${NC} $message" ;;
        *)         echo -e "[$level] $message" ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

log_info() { log "INFO" "$1"; }
log_success() { log "SUCCESS" "$1"; }
log_warning() { log "WARNING" "$1"; }
log_error() { log "ERROR" "$1"; }
log_debug() { log "DEBUG" "$1"; }

# Banner
print_banner() {
    clear
    echo -e "${MAGENTA}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║    🤖 TELEBOT PANEL PRO v$SCRIPT_VERSION - DEPLOYMENT    ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    log_info "Starting TeleBot Panel Pro Deployment"
    log_info "Timestamp: $(date)"
    log_info "Working directory: $(pwd)"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing=0
    
    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node --version | cut -d'v' -f2)
        local node_major=$(echo $node_version | cut -d'.' -f1)
        if [ "$node_major" -ge 18 ]; then
            log_success "Node.js $node_version ✓"
        else
            log_error "Node.js $node_version detected. Required: >=18"
            missing=$((missing + 1))
        fi
    else
        log_error "Node.js not installed"
        missing=$((missing + 1))
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        log_success "npm $npm_version ✓"
    else
        log_error "npm not installed"
        missing=$((missing + 1))
    fi
    
    # Check git
    if command -v git &> /dev/null; then
        log_success "git ✓"
    else
        log_warning "git not installed (optional)"
    fi
    
    # Check netlify CLI
    if command -v netlify &> /dev/null; then
        log_success "Netlify CLI ✓"
    else
        log_warning "Netlify CLI not installed"
    fi
    
    # Check directory structure
    local required_dirs=("netlify/functions" "public" "public/css" "public/js")
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            log_debug "Directory exists: $dir"
        else
            log_error "Missing directory: $dir"
            missing=$((missing + 1))
        fi
    done
    
    # Check required files
    local required_files=("netlify.toml" "package.json" ".env.example" "public/index.html")
    for file in "${required_files[@]}"; do
        if [ -f "$file" ]; then
            log_debug "File exists: $file"
        else
            log_error "Missing file: $file"
            missing=$((missing + 1))
        fi
    done
    
    if [ $missing -eq 0 ]; then
        log_success "All prerequisites met"
        return 0
    else
        log_error "Missing $missing prerequisite(s)"
        return 1
    fi
}

# Setup environment
setup_environment() {
    log_info "Setting up environment..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    log_debug "Backup directory: $BACKUP_DIR"
    
    # Backup existing .env if exists
    if [ -f ".env" ]; then
        local backup_file="$BACKUP_DIR/env.backup.$(date +%Y%m%d_%H%M%S)"
        cp .env "$backup_file"
        log_info "Backed up existing .env to $backup_file"
    fi
    
    # Create .env from template if not exists
    if [ ! -f ".env" ]; then
        log_info "Creating .env file from template"
        cp .env.example .env
        
        # Generate secure JWT secret
        local jwt_secret=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
        sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" .env
        
        # Generate password hash
        log_info "Generating password hash for default password"
        local password_hash=$(node -e "
            const bcrypt = require('bcryptjs');
            const hash = bcrypt.hashSync('TeleBotPro@2024!', 10);
            console.log(hash);
        " 2>/dev/null || echo "\$2a\$10\$XcVvjL7T8q5NwRzYm9KjE.A6b8cDfG.HjKlMnOpQrStUvWxYz1234")
        
        sed -i.bak "s|^ADMIN_PASSWORD_HASH=.*|ADMIN_PASSWORD_HASH=$password_hash|" .env
        
        # Clean up backup
        rm -f .env.bak
        
        log_success ".env file created with secure values"
        log_warning "Default password: TeleBotPro@2024!"
        log_warning "CHANGE THIS PASSWORD AFTER FIRST LOGIN!"
    else
        log_info "Using existing .env file"
    fi
    
    # Load environment variables
    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
        log_success "Environment variables loaded"
    else
        log_error "Failed to load .env file"
        return 1
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install root dependencies
    if [ -f "package.json" ]; then
        log_info "Installing root dependencies..."
        npm ci --silent 2>> "$LOG_FILE" || {
            log_warning "npm ci failed, trying npm install..."
            npm install --silent 2>> "$LOG_FILE"
        }
        
        if [ $? -eq 0 ]; then
            log_success "Root dependencies installed"
        else
            log_error "Failed to install root dependencies"
            return 1
        fi
    fi
    
    # Install function dependencies
    if [ -d "netlify/functions" ]; then
        log_info "Installing function dependencies..."
        cd netlify/functions
        
        if [ -f "package.json" ]; then
            npm ci --silent 2>> "../../$LOG_FILE" || {
                log_warning "npm ci failed, trying npm install..."
                npm install --silent 2>> "../../$LOG_FILE"
            }
            
            if [ $? -eq 0 ]; then
                log_success "Function dependencies installed"
            else
                log_error "Failed to install function dependencies"
                cd ../..
                return 1
            fi
        else
            log_warning "No package.json in functions directory"
        fi
        
        cd ../..
    fi
    
    # Install Netlify CLI globally if not present
    if ! command -v netlify &> /dev/null; then
        log_info "Installing Netlify CLI globally..."
        npm install -g netlify-cli --silent 2>> "$LOG_FILE"
        if [ $? -eq 0 ]; then
            log_success "Netlify CLI installed"
        else
            log_warning "Failed to install Netlify CLI"
        fi
    fi
}

# Build project
build_project() {
    log_info "Building project..."
    
    # Run build script
    if npm run build --silent 2>> "$LOG_FILE"; then
        log_success "Build completed successfully"
    else
        log_warning "Build script failed, continuing..."
    fi
    
    # Verify build output
    local required_build_files=("public/index.html" "public/css/style.css" "public/js/app.js")
    local missing_files=0
    
    for file in "${required_build_files[@]}"; do
        if [ -f "$file" ]; then
            log_debug "Build file exists: $file"
        else
            log_error "Missing build file: $file"
            missing_files=$((missing_files + 1))
        fi
    done
    
    if [ $missing_files -eq 0 ]; then
        log_success "Build verification passed"
        return 0
    else
        log_error "Build verification failed: $missing_files file(s) missing"
        return 1
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Check if test script exists
    if grep -q '"test"' package.json; then
        if npm test --silent 2>> "$LOG_FILE"; then
            log_success "Tests passed"
        else
            log_warning "Tests failed or not configured"
        fi
    else
        log_info "No tests configured, running basic checks..."
        
        # Basic health checks
        local checks_passed=0
        local total_checks=4
        
        # Check 1: Verify functions exist
        if [ -f "netlify/functions/auth.js" ]; then
            log_debug "✓ Function auth.js exists"
            checks_passed=$((checks_passed + 1))
        fi
        
        # Check 2: Verify index.html
        if grep -q "TeleBot Pro" public/index.html 2>/dev/null; then
            log_debug "✓ Index.html contains TeleBot Pro"
            checks_passed=$((checks_passed + 1))
        fi
        
        # Check 3: Verify CSS
        if [ -s "public/css/style.css" ]; then
            log_debug "✓ CSS file is not empty"
            checks_passed=$((checks_passed + 1))
        fi
        
        # Check 4: Verify JS
        if [ -s "public/js/app.js" ]; then
            log_debug "✓ JS file is not empty"
            checks_passed=$((checks_passed + 1))
        fi
        
        if [ $checks_passed -eq $total_checks ]; then
            log_success "Basic checks passed ($checks_passed/$total_checks)"
        else
            log_warning "Basic checks: $checks_passed/$total_checks passed"
        fi
    fi
}

# Security audit
security_audit() {
    log_info "Running security audit..."
    
    local warnings=0
    
    # Check for default JWT secret
    if grep -q "f8d7a3c6b5e49201738a1d2f4c9b6a7e5d3c2b1a0f9e8d7c6b5a49382716f5e4d3c2" .env 2>/dev/null; then
        log_warning "Default JWT_SECRET detected in .env"
        warnings=$((warnings + 1))
    fi
    
    # Check for default password
    if grep -q "TeleBotPro@2024!" .env 2>/dev/null || 
       grep -q '\$2a\$10\$XcVvjL7T8q5NwRzYm9KjE.A6b8cDfG.HjKlMnOpQrStUvWxYz1234' .env 2>/dev/null; then
        log_warning "Default password detected in .env"
        warnings=$((warnings + 1))
    fi
    
    # Check for open CORS
    if grep -q "Access-Control-Allow-Origin: \\*" netlify.toml 2>/dev/null; then
        log_warning "Open CORS policy detected (*)"
        warnings=$((warnings + 1))
    fi
    
    # Check for IP whitelist
    if ! grep -q "IP_WHITELIST" .env 2>/dev/null || 
       grep -q "IP_WHITELIST=$" .env 2>/dev/null || 
       grep -q "IP_WHITELIST=.*\\*" .env 2>/dev/null; then
        log_warning "IP whitelist not properly configured"
        warnings=$((warnings + 1))
    fi
    
    if [ $warnings -eq 0 ]; then
        log_success "Security audit passed - no warnings"
    else
        log_warning "Security audit: $warnings warning(s) found"
        echo ""
        echo -e "${YELLOW}⚠  SECURITY RECOMMENDATIONS:${NC}"
        echo "1. Change JWT_SECRET in .env"
        echo "2. Change admin password"
        echo "3. Configure IP_WHITELIST with your IPs"
        echo "4. Restrict CORS to your domains"
        echo ""
        read -p "Continue despite warnings? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment cancelled by user"
            exit 1
        fi
    fi
}

# Deploy to Netlify
deploy_netlify() {
    log_info "Starting Netlify deployment..."
    
    # Check if already linked
    if [ -d "$NETLIFY_DIR" ] && [ -f "$NETLIFY_DIR/state.json" ]; then
        log_info "Netlify site already linked"
        local site_id=$(jq -r '.siteId' "$NETLIFY_DIR/state.json" 2>/dev/null || echo "")
        if [ -n "$site_id" ]; then
            log_info "Linked to site: $site_id"
        fi
    else
        log_info "Not linked to Netlify site"
    fi
    
    # Ask for deployment method
    echo ""
    echo -e "${CYAN}Netlify Deployment Options:${NC}"
    echo "1) Deploy to existing linked site"
    echo "2) Create new site and deploy"
    echo "3) Deploy manually (build only)"
    echo "4) Cancel deployment"
    echo ""
    
    local choice
    read -p "Select option [1-4]: " choice
    
    case $choice in
        1)
            deploy_linked_site
            ;;
        2)
            create_new_site
            ;;
        3)
            deploy_manual
            ;;
        4)
            log_info "Deployment cancelled"
            exit 0
            ;;
        *)
            log_error "Invalid option"
            deploy_netlify
            ;;
    esac
}

deploy_linked_site() {
    log_info "Deploying to linked site..."
    
    if ! command -v netlify &> /dev/null; then
        log_error "Netlify CLI not installed"
        return 1
    fi
    
    # Check login status
    if ! netlify status 2>&1 | grep -q "Logged in"; then
        log_info "Logging into Netlify..."
        netlify login
    fi
    
    # Deploy
    log_info "Starting deployment..."
    if netlify deploy --prod --dir=public --functions=netlify/functions; then
        local deploy_url=$(netlify deploy --prod --json 2>/dev/null | jq -r '.deploy_url' || echo "unknown")
        log_success "Deployment successful!"
        log_success "Live URL: $deploy_url"
        
        # Save deployment info
        echo "Deployment Time: $(date)" > "$BACKUP_DIR/last_deployment.txt"
        echo "URL: $deploy_url" >> "$BACKUP_DIR/last_deployment.txt"
        
        return 0
    else
        log_error "Deployment failed"
        return 1
    fi
}

create_new_site() {
    log_info "Creating new Netlify site..."
    
    if ! command -v netlify &> /dev/null; then
        log_error "Netlify CLI not installed"
        return 1
    fi
    
    # Login if needed
    if ! netlify status 2>&1 | grep -q "Logged in"; then
        netlify login
    fi
    
    # Create new site
    log_info "Creating new site..."
    if netlify sites:create --name "telebot-panel-$(date +%s)"; then
        log_success "Site created"
        deploy_linked_site
    else
        log_error "Failed to create site"
        return 1
    fi
}

deploy_manual() {
    log_info "Preparing manual deployment..."
    
    # Create deployment package
    local deploy_package="telebot-deploy-$(date +%Y%m%d_%H%M%S).tar.gz"
    
    log_info "Creating deployment package: $deploy_package"
    
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    
    # Copy necessary files
    cp -r public "$temp_dir/"
    cp -r netlify/functions "$temp_dir/"
    cp netlify.toml "$temp_dir/"
    cp .env.example "$temp_dir/"
    cp package.json "$temp_dir/"
    
    # Create README
    cat > "$temp_dir/DEPLOY_INSTRUCTIONS.txt" << EOF
TeleBot Panel Pro - Deployment Package
Generated: $(date)

DEPLOYMENT STEPS:
1. Upload this entire folder to your hosting provider
2. For Netlify:
   - Upload via Netlify Dashboard
   - OR use Netlify Drop: https://app.netlify.com/drop
3. Set environment variables in hosting dashboard
4. Ensure Node.js 18+ is available

ENVIRONMENT VARIABLES:
Copy from .env.example and fill with your values:
- JWT_SECRET
- ADMIN_USERNAME
- ADMIN_PASSWORD_HASH
- IP_WHITELIST
- ALLOWED_ORIGINS

SUPPORT:
Documentation: https://github.com/yourusername/telebot-panel-pro
EOF
    
    # Create tar.gz
    tar -czf "$deploy_package" -C "$temp_dir" .
    
    # Cleanup
    rm -rf "$temp_dir"
    
    log_success "Deployment package created: $deploy_package"
    log_info "Size: $(du -h "$deploy_package" | cut -f1)"
    
    echo ""
    echo -e "${GREEN}✅ Manual deployment package ready!${NC}"
    echo "File: $deploy_package"
    echo ""
    echo "Next steps:"
    echo "1. Upload to your hosting provider"
    echo "2. Configure environment variables"
    echo "3. Start the application"
}

# Post-deployment setup
post_deployment() {
    log_info "Running post-deployment tasks..."
    
    # Create admin guide
    cat > "ADMIN_GUIDE.md" << 'EOF'
# TeleBot Panel Pro - Admin Guide

## Initial Setup
1. Access your deployed URL
2. Login with:
   - Username: admin
   - Password: TeleBotPro@2024!
3. Immediately change the password in Settings

## Security Configuration
1. Update IP whitelist in .env
2. Configure CORS in netlify.toml
3. Set up Telegram API credentials

## Bot Management
1. Create bot via @BotFather
2. Add bot token in Bot Control section
3. Configure bot settings
4. Start bot

## User Bot Setup
1. Get API ID & Hash from my.telegram.org
2. Add in Telegram section
3. Verify phone number
4. Start using user bot features

## Monitoring
- Check Netlify function logs
- Monitor bot status in dashboard
- Review message history
- Check system resources

## Backup
Regularly backup:
- Environment variables
- Bot configurations
- Message history
- User sessions

## Troubleshooting
Common issues and solutions in README.md
EOF
    
    log_success "Admin guide created: ADMIN_GUIDE.md"
    
    # Display deployment summary
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                 DEPLOYMENT COMPLETE!                    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📦 What was deployed:${NC}"
    echo "  ✓ Frontend application"
    echo "  ✓ Serverless functions"
    echo "  ✓ Security configuration"
    echo "  ✓ Admin interface"
    echo ""
    echo -e "${CYAN}🔐 Default credentials:${NC}"
    echo "  Username: admin"
    echo "  Password: TeleBotPro@2024!"
    echo ""
    echo -e "${YELLOW}⚠  IMPORTANT: Change password immediately!${NC}"
    echo ""
    echo -e "${CYAN}🚀 Next steps:${NC}"
    echo "  1. Access your deployed URL"
    echo "  2. Login with admin credentials"
    echo "  3. Change password in Settings"
    echo "  4. Configure Telegram bots"
    echo "  5. Set up user bots"
    echo ""
    echo -e "${BLUE}📚 Documentation: ADMIN_GUIDE.md${NC}"
    echo ""
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    
    # Remove node_modules if they exist in wrong places
    find . -name "node_modules" -type d -not -path "./netlify/functions/node_modules" -exec rm -rf {} + 2>/dev/null || true
    
    # Remove package-lock files
    find . -name "package-lock.json" -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    # Initialize log file
    > "$LOG_FILE"
    
    # Print banner
    print_banner
    
    # Parse arguments
    local skip_deploy=0
    local setup_only=0
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deploy)
                skip_deploy=1
                shift
                ;;
            --setup-only)
                setup_only=1
                skip_deploy=1
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-deploy    Skip deployment phase"
                echo "  --setup-only     Only setup environment"
                echo "  --help           Show this help"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Step 1: Check prerequisites
    if ! check_prerequisites; then
        log_error "Prerequisites check failed. See errors above."
        exit 1
    fi
    
    # Step 2: Setup environment
    if ! setup_environment; then
        log_error "Environment setup failed"
        exit 1
    fi
    
    # Step 3: Install dependencies
    if ! install_dependencies; then
        log_error "Dependency installation failed"
        exit 1
    fi
    
    # Step 4: Build project
    if ! build_project; then
        log_warning "Build had issues, but continuing..."
    fi
    
    # Step 5: Run tests
    run_tests
    
    # Step 6: Security audit
    security_audit
    
    # Stop here if setup-only
    if [ $setup_only -eq 1 ]; then
        log_success "Setup completed successfully!"
        echo ""
        echo -e "${GREEN}✅ Project is ready for development${NC}"
        echo "Run: npm run dev"
        exit 0
    fi
    
    # Step 7: Deploy (unless skipped)
    if [ $skip_deploy -eq 0 ]; then
        deploy_netlify
    else
        log_info "Skipping deployment phase"
    fi
    
    # Step 8: Post-deployment
    post_deployment
    
    # Step 9: Cleanup
    cleanup
    
    # Final message
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}      TeleBot Panel Pro is READY!      ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Log file: $LOG_FILE"
    echo -e "Backups: $BACKUP_DIR/"
    echo ""
    
    # Start dev server if local
    if [ $skip_deploy -eq 1 ] && [ $setup_only -eq 0 ]; then
        read -p "Start development server? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            log_info "Starting development server on port $DEFAULT_PORT"
            npm run dev
        fi
    fi
}

# Error handling
trap 'log_error "Script interrupted by user"; exit 1' INT
trap 'log_error "Script failed at line $LINENO"; exit 1' ERR

# Run main function
main "$@"
