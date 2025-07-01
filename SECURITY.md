# 🔒 Security Guide for Needle in the Haystack Test

## 🚨 **CRITICAL: API Key Security**

This application handles sensitive API keys. Follow these security practices to protect your credentials:

## 🛡️ **Setup Security Checklist**

### ✅ **Before You Start:**

1. **Never commit API keys to Git**
   - API keys should ONLY be in `.env` files
   - `.env` files are automatically ignored by Git

2. **Use the environment template**
   - Copy `server/env.example` to `server/.env`
   - Add your actual API keys to the `.env` file

3. **Get your API keys from official sources:**
   - **OpenAI**: https://platform.openai.com/api-keys
   - **Google AI**: https://aistudio.google.com/app/apikey  
   - **Anthropic**: https://console.anthropic.com/account/keys

## 🔧 **Secure Setup Instructions**

### 1. **Environment Setup:**
```bash
# 1. Copy the environment template
cp server/env.example server/.env

# 2. Edit the .env file with your API keys
# NEVER share this file or commit it to Git!
```

### 2. **API Key Best Practices:**
- ✅ Keep API keys in `.env` files only
- ✅ Use different keys for development/production
- ✅ Set usage limits on your API keys
- ✅ Monitor your API key usage regularly
- ❌ Never hardcode keys in source code
- ❌ Never share keys in chat/email
- ❌ Never commit `.env` files to Git

### 3. **Application Security Features:**
- 🔐 **API keys encrypted** in memory
- 🔐 **Session-based storage** (wiped on restart)
- 🔐 **No key logging** (removed debug output)
- 🔐 **Input validation** on file uploads
- 🔐 **File size limits** (10MB default)

## 🌐 **Deployment Security**

### For Local Development:
- ✅ Use `http://localhost` (current setup)
- ✅ Keys stored in local `.env` file
- ✅ No external access by default

### For Production Deployment:
- 🔒 **Use HTTPS only** (get free SSL from Let's Encrypt)
- 🔒 **Environment variables** (not files) for API keys
- 🔒 **Content Security Policy** headers
- 🔒 **Rate limiting** per user/IP
- 🔒 **Input sanitization** and validation
- 🔒 **Session management** with secure cookies

## 🚨 **If You Accidentally Expose API Keys:**

### Immediate Actions:
1. **Revoke the exposed keys immediately**
   - OpenAI: Delete key in platform.openai.com
   - Google: Disable key in Google Cloud Console
   - Anthropic: Delete key in console.anthropic.com

2. **Generate new keys**
3. **Update your `.env` file**
4. **Check your billing** for unexpected usage

### Git History Cleanup:
```bash
# If you accidentally committed keys, clean Git history:
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch server/.env' \
--prune-empty --tag-name-filter cat -- --all

# Force push to clean remote history (DANGER!)
git push origin --force --all
```

## 🔍 **Security Checklist Before Sharing Code:**

- [ ] No `.env` files committed
- [ ] No `api_keys.json` files committed  
- [ ] No hardcoded API keys in source code
- [ ] No sensitive data in commit history
- [ ] `.gitignore` includes all sensitive files
- [ ] `env.example` provided for setup
- [ ] This `SECURITY.md` file included

## 📞 **Security Support**

- Report security issues by creating a GitHub issue
- Tag issues with `security` label
- Do NOT include actual API keys in issue reports

## ⚖️ **Responsible Use**

- Monitor your API usage and costs
- Respect API rate limits and terms of service
- Don't use for illegal or harmful purposes
- Keep your dependencies updated

---

**Remember: API keys are like passwords - treat them with the same level of security!** 🔐 