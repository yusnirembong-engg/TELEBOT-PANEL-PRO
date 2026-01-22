# 🤖 TeleBot Panel Pro v2.0.0

**Advanced Telegram Bot Control Panel with User Bot Management**

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-badge-id/deploy-status)](https://app.netlify.com/sites/telebot-panel-pro/deploys)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/yourusername/telebot-panel-pro/pulls)

## ✨ Features

### 🤖 **Bot Management**
- Multi-bot support with individual control
- Real-time bot status monitoring
- Message statistics and analytics
- Bot configuration management
- Start/Stop/Restart controls

### 👤 **User Bot System**
- Connect personal Telegram accounts
- Schedule messages with cron-like precision
- Auto-text messaging to multiple chats
- Chat management and monitoring
- Session persistence

### ⚡ **Auto-Text & Scheduling**
- Intelligent message scheduling
- Interval-based auto messaging
- Target multiple chats simultaneously
- Pause/Resume/Stop controls
- Message history tracking

### 💻 **Secure Terminal**
- Browser-based terminal access
- Command whitelisting for security
- Real-time command execution
- Output sanitization
- Command history

### 🔐 **Security Features**
- JWT-based authentication
- IP whitelist protection
- Rate limiting and lockout
- CORS configuration
- Password hashing with bcrypt

### 📊 **Monitoring & Analytics**
- Real-time system status
- Bot performance metrics
- Message delivery statistics
- User activity logs
- Resource usage monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Netlify account (for deployment)
- Telegram account (for bot tokens)

### Local Development
```bash
# Clone repository
git clone https://github.com/yourusername/telebot-panel-pro.git
cd telebot-panel-pro

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Generate password hash
npm run generate:hash "YourSecurePassword"

# Start development server
npm run dev
# Open http://localhost:8888
