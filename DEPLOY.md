# TeleBot Panel Pro - Panduan Deploy Lengkap

## 📋 Persyaratan
1. Akun Netlify (gratis)
2. Akun Telegram (untuk @BotFather)
3. Koneksi internet

## 🚀 Deploy di Netlify (Cepat)

### Metode 1: Deploy dari GitHub
1. Fork repository ini ke GitHub Anda
2. Login ke [Netlify](https://app.netlify.com)
3. Klik "New site from Git"
4. Pilih provider GitHub dan pilih repository
5. Konfigurasi:
   - Build command: `echo "Build complete"`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
6. Klik "Deploy site"

### Metode 2: Deploy via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login ke Netlify
netlify login

# Clone repository
git clone https://github.com/yourusername/telebot-panel-pro.git
cd telebot-panel-pro

# Deploy
npm run deploy
