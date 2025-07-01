// Security utilities for Needle in the Haystack Test
const crypto = require('crypto');

// Rate limiting storage (in-memory for simplicity)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute

/**
 * Input validation utilities
 */
class InputValidator {
  static validateText(text, maxLength = 100000) {
    if (typeof text !== 'string') {
      throw new Error('Input must be a string');
    }
    
    if (text.length > maxLength) {
      throw new Error(`Input too long. Maximum ${maxLength} characters allowed`);
    }
    
    // Basic XSS prevention
    const sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    return sanitized.trim();
  }
  
  static validateApiKey(key, provider) {
    if (typeof key !== 'string' || !key.trim()) {
      throw new Error('API key must be a non-empty string');
    }
    
    // Validate API key format
    switch (provider) {
      case 'openai':
        if (!key.startsWith('sk-')) {
          throw new Error('Invalid OpenAI API key format');
        }
        break;
      case 'google':
        if (!key.startsWith('AIza')) {
          throw new Error('Invalid Google API key format');
        }
        break;
      case 'anthropic':
        if (!key.startsWith('sk-ant-')) {
          throw new Error('Invalid Anthropic API key format');
        }
        break;
      default:
        throw new Error('Unknown API provider');
    }
    
    return key.trim();
  }
  
  static validateNumber(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      throw new Error(`Invalid number: must be between ${min} and ${max}`);
    }
    return num;
  }
  
  static validateModelId(modelId) {
    const allowedModels = [
      'gpt-4', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-3.5-turbo',
      'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-2.0-flash-lite',
      'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro',
      'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-instant'
    ];
    
    if (!allowedModels.includes(modelId)) {
      throw new Error(`Invalid model ID: ${modelId}`);
    }
    
    return modelId;
  }
}

/**
 * Rate limiting functionality
 */
class RateLimiter {
  static checkRateLimit(userId, limit = MAX_REQUESTS_PER_WINDOW) {
    const now = Date.now();
    const userKey = `rate_${userId}`;
    
    if (!rateLimitStore.has(userKey)) {
      rateLimitStore.set(userKey, []);
    }
    
    const userRequests = rateLimitStore.get(userKey);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (validRequests.length >= limit) {
      throw new Error(`Rate limit exceeded. Maximum ${limit} requests per minute`);
    }
    
    // Add current request
    validRequests.push(now);
    rateLimitStore.set(userKey, validRequests);
    
    return true;
  }
  
  static getRemainingRequests(userId, limit = MAX_REQUESTS_PER_WINDOW) {
    const userKey = `rate_${userId}`;
    const now = Date.now();
    
    if (!rateLimitStore.has(userKey)) {
      return limit;
    }
    
    const userRequests = rateLimitStore.get(userKey);
    const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    return Math.max(0, limit - validRequests.length);
  }
}

/**
 * Security utilities
 */
class SecurityUtils {
  static generateSecureSessionId() {
    return `session_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }
  
  static sanitizeForLogging(data) {
    if (typeof data === 'string') {
      // Mask potential API keys in logs
      return data.replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-***MASKED***')
                 .replace(/AIza[a-zA-Z0-9]{35}/g, 'AIza***MASKED***')
                 .replace(/sk-ant-[a-zA-Z0-9-]{95}/g, 'sk-ant-***MASKED***');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
          sanitized[key] = '***MASKED***';
        }
      });
      return sanitized;
    }
    
    return data;
  }
  
  static validateFileUpload(file) {
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('File type not allowed');
    }
    
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum 10MB allowed');
    }
    
    return true;
  }
}

module.exports = {
  InputValidator,
  RateLimiter,
  SecurityUtils
}; 