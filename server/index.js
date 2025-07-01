const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const CryptoJS = require('crypto-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');

// Try loading .env from multiple locations
const envPaths = [
  path.join(__dirname, '.env'),           // server/.env
  path.join(__dirname, '..', '.env'),     // root/.env
  '.env'                                  // current directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = require('dotenv').config({ path: envPath });
    if (!result.error) {
      console.log(`✅ Loaded .env from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.log('⚠️  No .env file found in any of the expected locations');
}

const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());

// In-memory storage for encrypted API keys (in production, use a proper database)
const userApiKeys = new Map();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-change-this';

// Environment variable API keys (primary option) - clean any whitespace/newlines
const ENV_API_KEYS = {
  openai: process.env.OPENAI_API_KEY?.trim().replace(/\s+/g, ''),
  google: process.env.GOOGLE_API_KEY?.trim().replace(/\s+/g, ''),
  anthropic: process.env.ANTHROPIC_API_KEY?.trim().replace(/\s+/g, '')
};

// Load API keys from file on startup (for user-provided keys persistence)
function loadApiKeys() {
  // Check which environment variables are available
  console.log('🔍 ENVIRONMENT DEBUG:');
  console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `Found (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : 'Not found');
  console.log('  GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? `Found (${process.env.GOOGLE_API_KEY.substring(0, 10)}...)` : 'Not found');
  console.log('  ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? `Found (${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...)` : 'Not found');
  
  const envKeysAvailable = Object.entries(ENV_API_KEYS)
    .filter(([key, value]) => value)
    .map(([key]) => key);
  
  if (envKeysAvailable.length > 0) {
    console.log(`🌍 Environment API keys found for: ${envKeysAvailable.join(', ')}`);
  } else {
    console.log(`⚠️  No environment API keys found.`);
  }
  
  console.log(`🔑 API Key system ready - env vars first, then user input through UI`);
}

// Load keys on startup
loadApiKeys();

// Encryption/Decryption functions
function encryptApiKey(apiKey) {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
}

function decryptApiKey(encryptedKey) {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// AI Model Classes
class AIModelManager {
  constructor() {
    this.models = {
      openai: null,
      gemini: null,
      claude: null
    };
  }

  setApiKey(provider, apiKey, userId) {
    const encryptedKey = encryptApiKey(apiKey);
    
    if (!userApiKeys.has(userId)) {
      userApiKeys.set(userId, {});
    }
    
    userApiKeys.get(userId)[provider] = encryptedKey;
    
    // Initialize the model client
    this.initializeModel(provider, apiKey);
  }

  initializeModel(provider, apiKey) {
    try {
      switch (provider) {
        case 'openai':
          this.models.openai = new OpenAI({ apiKey });
          break;
        case 'google':
          this.models.gemini = new GoogleGenerativeAI(apiKey);
          break;
        case 'anthropic':
          this.models.claude = new Anthropic({ apiKey });
          break;
      }
    } catch (error) {
      console.error(`Error initializing ${provider}:`, error);
    }
  }

  getApiKey(provider, userId) {
    console.log(`🔍 Looking for API key - Provider: ${provider}, User: ${userId}`);
    
    // First, check environment variables (priority)
    if (ENV_API_KEYS[provider]) {
      console.log(`✅ Using environment API key for ${provider}`);
      return ENV_API_KEYS[provider];
    }
    
    // Fallback to user-provided keys
    console.log(`🔍 No env var, checking user keys. Available users:`, Array.from(userApiKeys.keys()));
    const userKeys = userApiKeys.get(userId);
    console.log(`🔍 User keys for ${userId}:`, userKeys ? Object.keys(userKeys) : 'none');
    
    if (userKeys && userKeys[provider]) {
      console.log(`✅ Found user-provided API key for ${provider}`);
      return decryptApiKey(userKeys[provider]);
    }
    
    console.log(`❌ No API key found for ${provider} - please add through Settings or environment variables`);
    return null;
  }

  async generateResponse(modelId, messages, userId) {
    // Default configuration for backward compatibility
    return this.generateResponseWithConfig(modelId, messages, userId, {});
  }

  async generateResponseWithConfig(modelId, messages, userId, config = {}) {
    const defaultConfig = {
      temperature: 0.7,
      maxTokens: 1000
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    // Map model IDs to their providers and API key fields
    const modelMapping = {
      // OpenAI Models
      'o3': { provider: 'openai', apiKeyField: 'openai', model: 'o3', apiType: 'responses' },
      'o1': { provider: 'openai', apiKeyField: 'openai', model: 'o1', apiType: 'responses' },
      'gpt-4.1': { provider: 'openai', apiKeyField: 'openai', model: 'gpt-4.1', apiType: 'responses' },
      'gpt-4.1-nano': { provider: 'openai', apiKeyField: 'openai', model: 'gpt-4.1-nano', apiType: 'responses' },
      'gpt-4': { provider: 'openai', apiKeyField: 'openai', model: 'gpt-4', apiType: 'chat' },
      'gpt-4-turbo': { provider: 'openai', apiKeyField: 'openai', model: 'gpt-4-turbo-preview', apiType: 'chat' },
      'gpt-4o-mini': { provider: 'openai', apiKeyField: 'openai', model: 'gpt-4o-mini', apiType: 'chat' },
      'gpt-3.5-turbo': { provider: 'openai', apiKeyField: 'openai', model: 'gpt-3.5-turbo', apiType: 'chat' },
      
      // Google Models
      'gemini-2.5-pro': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.5-pro' },
      'gemini-2.5-flash': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.5-flash' },
      'gemini-2.5-flash-preview-04-17': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.5-flash-preview-04-17' },
      'gemini-2.5-flash-lite-preview-06-17': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.5-flash-lite-preview-06-17' },
      'gemini-2.0-flash': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.0-flash' },
      'gemini-2.0-flash-lite': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.0-flash-lite' },
      'gemini-1.5-pro': { provider: 'google', apiKeyField: 'google', model: 'gemini-1.5-pro' },
      'gemini-1.5-flash': { provider: 'google', apiKeyField: 'google', model: 'gemini-1.5-flash' },
      'gemini-2.5-pro-preview-05-06': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.5-pro-preview-05-06' },
      
      // Anthropic Models
      'claude-opus-4': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-opus-20240229' },
      'claude-sonnet-4': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      'claude-3-7-sonnet': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      'claude-3-5-sonnet-v2': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      'claude-3-opus': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-opus-20240229' },
      'claude-3-sonnet': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      'claude-3-haiku': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-5-haiku-20241022' },
      'claude-instant': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-5-haiku-20241022' }
    };

    const modelConfig = modelMapping[modelId];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    const apiKey = this.getApiKey(modelConfig.apiKeyField, userId);
    if (!apiKey) {
      throw new Error(`No API key found for ${modelConfig.provider}`);
    }

    // Re-initialize model with user's API key
    this.initializeModel(modelConfig.provider, apiKey);

    try {
      switch (modelConfig.provider) {
        case 'openai':
          return await this.generateOpenAIResponse(messages, modelConfig.model, modelConfig.apiType, finalConfig);
        case 'google':
          return await this.generateGeminiResponse(messages, modelConfig.model, finalConfig);
        case 'anthropic':
          return await this.generateClaudeResponse(messages, modelConfig.model, finalConfig);
        default:
          throw new Error(`Unknown provider: ${modelConfig.provider}`);
      }
    } catch (error) {
      console.error(`Error generating response from ${modelId}:`, error);
      // If it's a parameter error for OpenAI, provide a helpful message
      if (error.message && error.message.includes("Unsupported parameter")) {
        throw new Error(`Model ${modelId} does not support some parameters. This is expected for newer models.`);
      }
      throw error;
    }
  }

  async generateOpenAIResponse(messages, model = "gpt-3.5-turbo", apiType = "chat", config = {}) {
    if (apiType === 'responses') {
      // Use the new responses API for newer models
      console.log(`🔥 Using OpenAI Responses API for model: ${model}`);
      
      // Convert messages to input format for responses API
      const input = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : msg.role,
        content: msg.content
      }));
      
      // Determine if model supports reasoning and temperature
      const hasReasoning = ['o3', 'o1'].includes(model);
      const supportsTemperature = !['o3', 'o1', 'gpt-4.1', 'gpt-4.1-nano'].includes(model);
      
      const requestBody = {
        model: model,
        input: input,
        text: {
          format: {
            type: "text"
          }
        },
        max_output_tokens: config.maxTokens || 2048,
        top_p: 1,
        store: true
      };
      
      // Only add temperature for models that support it
      if (supportsTemperature) {
        requestBody.temperature = config.temperature || 0.7;
      }
      
      // Add reasoning for models that support it
      if (hasReasoning) {
        requestBody.reasoning = {
          effort: "medium",
          summary: "auto"
        };
      }
      
      console.log(`📤 Sending request body:`, JSON.stringify(requestBody, null, 2));
      
      try {
        const response = await this.models.openai.responses.create(requestBody);
        
        console.log(`📥 Received response:`, JSON.stringify(response, null, 2));
        
        // Extract text content from response - handle different response formats
        if (response && response.output_text) {
          console.log(`✅ Found output_text: ${response.output_text.length} characters`);
          return response.output_text;
        } else if (response && response.text && response.text.content) {
          console.log(`✅ Found text.content: ${response.text.content.length} characters`);
          return response.text.content;
        } else if (response && response.output && response.output[0] && response.output[0].content && response.output[0].content[0] && response.output[0].content[0].text) {
          console.log(`✅ Found output[0].content[0].text: ${response.output[0].content[0].text.length} characters`);
          return response.output[0].content[0].text;
        } else if (response && response.choices && response.choices[0]) {
          if (response.choices[0].text) {
            console.log(`✅ Found choices[0].text: ${response.choices[0].text.length} characters`);
            return response.choices[0].text;
          } else if (response.choices[0].message && response.choices[0].message.content) {
            console.log(`✅ Found choices[0].message.content: ${response.choices[0].message.content.length} characters`);
            return response.choices[0].message.content;
          }
        } else if (response && response.output && response.output.text) {
          console.log(`✅ Found output.text: ${response.output.text.length} characters`);
          return response.output.text;
        } else if (response && response.content) {
          console.log(`✅ Found direct content: ${response.content.length} characters`);
          return response.content;
        }
        
        console.error(`❌ Unexpected response format. Available keys:`, Object.keys(response));
        console.error(`❌ Full response structure for debugging:`, JSON.stringify(response, null, 2));
        throw new Error('Unexpected response format from OpenAI Responses API');
        
      } catch (error) {
        console.error(`❌ OpenAI Responses API error:`, error);
        if (error.response) {
          console.error(`❌ Error response data:`, error.response.data);
        }
        throw error;
      }
      
    } else {
      // Use traditional chat completions API
      console.log(`💬 Using OpenAI Chat Completions API for model: ${model}`);
      
      // Create a system message to set the context for needle tests
      const systemMessage = {
        role: 'system',
        content: 'You are an AI assistant that provides direct, accurate answers to questions based on provided context.'
      };
      
      // Format messages for OpenAI
      const formattedMessages = [systemMessage];
      
      // Add conversation history
      messages.forEach(msg => {
        formattedMessages.push({
          role: msg.role === 'ai' ? 'assistant' : msg.role,
          content: msg.content
        });
      });
      
      const response = await this.models.openai.chat.completions.create({
        model: model,
        messages: formattedMessages,
        max_tokens: config.maxTokens || 1000,
        temperature: config.temperature || 0.7
      });
      
      return response.choices[0].message.content;
    }
  }

  async generateGeminiResponse(messages, modelName = "gemini-2.0-flash", config = {}) {
    console.log(`🔍 Gemini Debug - Model: ${modelName}, Messages:`, messages);
    
    const model = this.models.gemini.getGenerativeModel({ model: modelName });
    
    // Filter out empty messages and ensure we have valid content
    const validMessages = messages.filter(msg => msg.content && msg.content.trim().length > 0);
    
    console.log(`🔍 Gemini Debug - Valid messages count: ${validMessages.length}`);
    
    if (validMessages.length === 0) {
      throw new Error('No valid messages to process');
    }
    
    // Find the initial prompt to maintain conversation memory
    const initialPrompt = validMessages.find(msg => msg.provider === 'user')?.content || 'General discussion';
    
    // Build a conversational prompt that includes the full context
    let conversationContext = `You are having a natural conversation with other AIs about: "${initialPrompt}"\n\nRespond naturally by: building on previous points, sharing your own perspective, agreeing or respectfully disagreeing, making observations, or offering new angles. Mix up your response style - sometimes make statements, sometimes share insights, sometimes pose questions, but don't end every response with a question. Keep the conversation flowing naturally like friends discussing a topic. Be authentic and avoid assistant-like phrases.\n\nConversation so far:\n\n`;
    
    validMessages.forEach((msg, index) => {
      const speaker = msg.provider === 'user' ? 'Human' : `AI (${msg.provider})`;
      conversationContext += `${speaker}: ${msg.content}\n\n`;
    });
    
    conversationContext += "Now respond naturally - maybe build on what was said, share your perspective, make an observation, or take the discussion in a new direction. Don't feel obligated to ask a question:";
    
    console.log(`🔍 Gemini Debug - Conversation context:`, conversationContext);
    
    try {
      // Use a simple prompt approach for Gemini
      const result = await model.generateContent(conversationContext);
      const response = await result.response;
      const responseText = response.text();
      
      console.log(`✅ Gemini Debug - Response length: ${responseText?.length}`);
      
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }
      
      return responseText;
      
    } catch (error) {
      console.error(`❌ Error generating response from Gemini:`, error);
      throw error;
    }
  }

  async generateClaudeResponse(messages, model = "claude-3-sonnet-20240229", config = {}) {
    console.log('[Claude Generate RF] Model parameter received:', model);
    
    // Log special capabilities for newer models
    if (model.includes('opus-4') || model.includes('sonnet-4')) {
      console.log('🚀 Using Claude 4 model with hybrid near-instant/extended thinking capabilities');
    } else if (model.includes('3-7-sonnet')) {
      console.log('🧠 Using Claude 3.7 Sonnet with extended thinking capabilities');
    } else if (model.includes('v2-20241022')) {
      console.log('💻 Using Claude 3.5 Sonnet v2 with computer use capabilities');
    }

    // Find the initial prompt to maintain conversation memory
    const initialPrompt = messages.find(msg => msg.provider === 'user')?.content || 'General discussion';
    
    // Create a system message for Claude
    const systemMessage = `You are having a natural conversation with other AIs about: "${initialPrompt}"\n\nAct like a curious, thoughtful participant who builds on what others say. Share your own perspectives, challenge ideas respectfully, ask follow-up questions that dig deeper, and keep the conversation flowing. Avoid saying "I'm here to help" or "feel free to ask" - instead, directly engage with the ideas presented. Be conversational, not an assistant.`;
    
    // Process messages to ensure alternating roles for Claude API
    const processedMessages = [];
    if (messages.length > 0) {
      // Filter out placeholder messages first
      const filteredMessages = messages.filter(msg => 
        msg.content && !msg.content.includes("(Previous turn provided no text output)")
      );
      
      console.log('[Claude Debug] Filtered messages:', filteredMessages.length, 'from original:', messages.length);
      
      if (filteredMessages.length > 0) {
        // Add the first message directly
        processedMessages.push({
          role: filteredMessages[0].role === 'ai' ? 'assistant' : filteredMessages[0].role,
          content: filteredMessages[0].content
        });

        for (let i = 1; i < filteredMessages.length; i++) {
          const currentMessage = filteredMessages[i];
          const lastProcessedMessage = processedMessages[processedMessages.length - 1];
          
          const currentRole = currentMessage.role === 'ai' ? 'assistant' : currentMessage.role;
          
          if (currentRole === 'assistant' && lastProcessedMessage.role === 'assistant') {
            // Merge consecutive assistant messages
            lastProcessedMessage.content += `\n\n${currentMessage.content}`; 
          } else if (currentRole === 'user' && lastProcessedMessage.role === 'user') {
            // Merge consecutive user messages
            lastProcessedMessage.content += `\n\n${currentMessage.content}`;
          } else {
            processedMessages.push({
              role: currentRole,
              content: currentMessage.content
            });
          }
        }
      }
    }
    
    // If we have no valid messages after filtering, add a user prompt
    if (processedMessages.length === 0) {
      console.log('[Claude Debug] No valid messages after processing, adding default user message');
      processedMessages.push({
        role: 'user',
        content: initialPrompt || 'Hello'
      });
    }
    
    // Ensure we always end with a user message if the last message is from assistant
    if (processedMessages.length > 0 && processedMessages[processedMessages.length - 1].role === 'assistant') {
      console.log('[Claude Debug] Last message is assistant, adding continuation prompt');
      processedMessages.push({
        role: 'user',
        content: 'Please continue the conversation.'
      });
    }
    
    // Format messages for Claude using the processed list
    const formattedMessages = processedMessages; // Already in the correct format

    console.log('[Claude Request Debug] System Message:', systemMessage);
    console.log('[Claude Request Debug] Formatted Messages:', JSON.stringify(formattedMessages, null, 2));
    console.log('[Claude Debug] Message count:', formattedMessages.length);
    console.log('[Claude Debug] Message roles:', formattedMessages.map(m => m.role).join(' -> '));

    // Existing debug logs for the client instance
    console.log('[Claude Debug] this.models.claude:', this.models.claude);
    if (this.models.claude) {
      console.log('[Claude Debug] typeof this.models.claude.messages:', typeof this.models.claude.messages);
      console.log('[Claude Debug] this.models.claude.messages:', this.models.claude.messages);
      console.log('[Claude Debug] Object.keys(this.models.claude):', Object.keys(this.models.claude));
    }

    try {
      console.log('[Claude API Call] Making request with model:', model);
      const response = await this.models.claude.messages.create({
        model: model,
        max_tokens: config.maxTokens || 1024,
        system: systemMessage,
        messages: formattedMessages,
        temperature: config.temperature || 0.7
      });
      
      console.log('[Claude Response Debug] Full API Response:', JSON.stringify(response, null, 2)); // Log the full response

      // It's good practice to check if content exists and is not empty
      if (response && response.content && response.content.length > 0) {
        // Handle different content types
        const textContent = response.content.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          console.log('[Claude Success] Generated response length:', textContent.text.length);
          return textContent.text;
        }
        
        // If no text content found, log what we got
        console.error('[Claude Error] No text content found in response. Content types:', response.content.map(c => c.type));
      }
      
      console.error('[Claude Error] Unexpected response structure or empty content:', JSON.stringify(response, null, 2));
      throw new Error('Anthropic response content was empty or not in the expected text format.');
      
    } catch (error) {
      console.error('[Claude API Error] Full error details:', error);
      if (error.response) {
        console.error('[Claude API Error] Response data:', error.response.data);
        console.error('[Claude API Error] Response status:', error.response.status);
      }
      throw error;
    }
  }
}

const aiManager = new AIModelManager();

// Conversation management
class ConversationManager {
  constructor() {
    this.conversations = new Map();
  }

  createConversation(userId, participants) {
    const conversationId = uuidv4();
    this.conversations.set(conversationId, {
      id: conversationId,
      userId,
      participants, // Array of AI models
      messages: [],
      initialGoal: null, // Will be set when first user message is added
      currentTurn: 0,
      isActive: false,
      emptyResponseCount: 0 // Track consecutive empty responses
    });
    return conversationId;
  }

  addMessage(conversationId, modelId, content) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      const message = {
        id: uuidv4(),
        provider: modelId, // Now using modelId instead of provider
        content: content || '', // Ensure content is never undefined
        timestamp: new Date().toISOString(),
        role: modelId === 'user' ? 'user' : 'ai' // Correctly set role based on provider/modelId
      };
      
      // Set initial goal if this is the first user message
      if (modelId === 'user' && !conversation.initialGoal) {
        conversation.initialGoal = content;
        console.log(`🎯 Set conversation goal: "${content}"`);
      }
      
      console.log(`[ADD_MESSAGE_PRE] Conversation ${conversationId} - Messages count: ${conversation.messages.length}`);
      conversation.messages.push(message);
      console.log(`[ADD_MESSAGE_POST] Conversation ${conversationId} - Added: "${content?.substring(0,30)}...". New messages count: ${conversation.messages.length}. Last message: ${conversation.messages[conversation.messages.length-1]?.content?.substring(0,30)}...`);
      return message;
    }
    return null;
  }

  getConversation(conversationId) {
    return this.conversations.get(conversationId);
  }

  getConversationHistory(conversationId, limit = 10) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      const history = conversation.messages.slice(-limit);
      console.log(`📖 Getting conversation history: ${history.length} messages`);
      console.log(`🎯 Conversation goal: "${conversation.initialGoal}"`);
      history.forEach((msg, i) => {
        console.log(`  ${i}: ${msg.provider} - "${msg.content?.substring(0, 50)}..." (${msg.content?.length} chars)`);
      });
      return history;
    }
    return [];
  }

  stopConversation(conversationId) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.isActive = false;
      console.log(`🛑 Conversation ${conversationId} stopped`);
      return true;
    }
    return false;
  }
}

const conversationManager = new ConversationManager();

// Needle Test Manager
class NeedleTestManager {
  constructor(aiManager) {
    this.aiManager = aiManager;
    this.activeTests = new Map();
  }

  async runNeedleTest(userId, haystack, needle, exactMatch, models, socket) {
    const testId = uuidv4();
    this.activeTests.set(testId, {
      userId,
      haystack,
      needle,
      exactMatch,
      models,
      results: new Map(),
      startTime: Date.now()
    });

    console.log(`🔍 Starting needle test ${testId} with ${models.length} models`);
    
    // Create prompt for needle test - just ask the question naturally
    const prompt = `${needle}

Context document:
${haystack}`;

    // Run tests for all models in parallel
    const testPromises = models.map(async (modelConfig) => {
      const startTime = Date.now();
      
      try {
        console.log(`🎯 Testing model ${modelConfig.modelId} with temp=${modelConfig.temperature}, maxTokens=${modelConfig.maxTokens}`);
        
        socket.emit('aiThinking', { provider: modelConfig.modelId });
        
        // Create a simple message format for the needle test
        const messages = [{
          provider: 'user',
          content: prompt,
          role: 'user'
        }];

        // Pass model configuration to the AI manager
        const response = await this.aiManager.generateResponseWithConfig(
          modelConfig.modelId, 
          messages, 
          userId,
          {
            temperature: modelConfig.temperature || 0.7,
            maxTokens: modelConfig.maxTokens || 1000
          }
        );
        
        const responseTime = Date.now() - startTime;
        
        // Check if exact match text appears in the response (case-insensitive)
        const foundNeedle = this.checkExactMatch(response, exactMatch);
        
        const result = {
          modelId: modelConfig.modelId,
          response,
          foundNeedle,
          responseTime,
          timestamp: new Date().toISOString()
        };

        socket.emit('needleTestResult', result);
        
        const test = this.activeTests.get(testId);
        if (test) {
          test.results.set(modelConfig.modelId, result);
        }
        
      } catch (error) {
        console.error(`Error testing model ${modelConfig.modelId}:`, error);
        socket.emit('needleTestError', { 
          modelId: modelConfig.modelId, 
          error: error.message 
        });
      }
    });

    // Wait for all tests to complete
    await Promise.all(testPromises);
    
    socket.emit('allTestsComplete', { testId });
    
        // Clean up
    this.activeTests.delete(testId);
  }

  checkExactMatch(response, exactMatch) {
    if (!response || !exactMatch) {
      console.log(`🔍 Exact Match Debug: Missing input - response: ${!!response}, exactMatch: ${!!exactMatch}`);
      return false;
    }

    // Trim whitespace and ensure we have content
    const cleanResponse = response.trim();
    const cleanExactMatch = exactMatch.trim();
    
    if (!cleanResponse || !cleanExactMatch) {
      console.log(`🔍 Exact Match Debug: Empty after trimming - response: "${cleanResponse}", exactMatch: "${cleanExactMatch}"`);
      return false;
    }

    console.log(`🔍 Exact Match Debug: Looking for "${cleanExactMatch}" in response of ${cleanResponse.length} characters`);

    // Try multiple matching strategies
    const responseLower = cleanResponse.toLowerCase();
    const exactMatchLower = cleanExactMatch.toLowerCase();

    // Strategy 1: Exact substring match (case-insensitive)
    const hasSubstring = responseLower.includes(exactMatchLower);
    
    // Strategy 2: Word boundary match (for more precise matching)
    // This prevents partial word matches like "15609" matching "915609a"
    const wordBoundaryRegex = new RegExp(`\\b${exactMatchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const hasWordBoundary = wordBoundaryRegex.test(responseLower);
    
    // Strategy 3: Exact case-sensitive match
    const hasExactCase = cleanResponse.includes(cleanExactMatch);

    console.log(`🔍 Exact Match Results:`);
    console.log(`  - Substring match: ${hasSubstring}`);
    console.log(`  - Word boundary match: ${hasWordBoundary}`);
    console.log(`  - Exact case match: ${hasExactCase}`);
    
    // Use word boundary match as it's more precise than substring but not as strict as exact case
    const finalResult = hasWordBoundary;
    console.log(`  - Final result: ${finalResult}`);
    
    if (finalResult) {
      // Show where it was found
      const matchIndex = responseLower.indexOf(exactMatchLower);
      const contextStart = Math.max(0, matchIndex - 50);
      const contextEnd = Math.min(responseLower.length, matchIndex + exactMatchLower.length + 50);
      const context = cleanResponse.substring(contextStart, contextEnd);
      console.log(`  - Found at position ${matchIndex}: "...${context}..."`);
    }
    
    return finalResult;
  }
}

const needleTestManager = new NeedleTestManager(aiManager);

// Socket.IO connection handling
io.on('connection', (socket) => {
  const sessionId = socket.handshake.query.sessionId || uuidv4();
  console.log(`New client connected: ${socket.id} with session: ${sessionId}`);

  // API Key Management
  socket.on('setApiKey', ({ provider, apiKey }) => {
    console.log(`Setting API key for ${provider} (session: ${sessionId})`);
    aiManager.setApiKey(provider, apiKey, sessionId);
    socket.emit('apiKeySet', { provider, success: true, sessionId });
  });

  // Needle Test Handler
  socket.on('runNeedleTest', async ({ haystack, needle, exactMatch, models }) => {
    console.log(`🔍 Needle test requested with ${models.length} models`);
    
    try {
      await needleTestManager.runNeedleTest(sessionId, haystack, needle, exactMatch, models, socket);
    } catch (error) {
      console.error('Error running needle test:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Test Content Generation Handler
  socket.on('generateTestContent', async ({ model, wordCount, difficulty, topic }) => {
    console.log(`🤖 Test generation requested - Model: ${model}, Words: ${wordCount}, Difficulty: ${difficulty}, Topic: ${topic}`);
    
    try {
      const difficultyMap = {
        'elementary': 'elementary school level (ages 6-11)',
        'high-school': 'high school level (ages 14-18)', 
        'undergraduate': 'undergraduate college level',
        'intermediate': 'intermediate professional level',
        'advanced': 'advanced professional/graduate level',
        'expert': 'expert/specialist level',
        'phd': 'PhD/research level with technical depth'
      };

      const difficultyDescription = difficultyMap[difficulty] || 'intermediate level';
      
      const prompt = `Create a comprehensive needle-in-a-haystack test with the following specifications:

**Requirements:**
- Generate approximately ${wordCount} words of content
- Content should be at ${difficultyDescription}
- Topic focus: ${topic}
- Include one specific, findable fact that can be tested

**IMPORTANT: Format your response as a single-line JSON object with no embedded newlines or line breaks in the text values:**

{"haystack": "The main document content (${wordCount} words approximately) - all text must be on one continuous line", "needle": "A specific question that tests for a detail in the haystack", "exactMatch": "The exact text/phrase that should appear in correct responses"}

**Guidelines:**
- The haystack should be informative, coherent content about ${topic}
- Embed one specific fact, number, date, or detail that can be precisely tested
- The needle should ask for that specific embedded information
- The exactMatch should be the precise text string that indicates the correct answer
- Make the exactMatch specific enough to avoid false positives (e.g., specific numbers, proper nouns, technical terms)
- CRITICAL: Keep all text in the JSON on single lines without any embedded newlines or line breaks

Create engaging, realistic content that provides a meaningful test of the AI's ability to find specific information within a larger context.`;

      // Create a simple message format for generation
      const messages = [{
        provider: 'user',
        content: prompt,
        role: 'user'
      }];

      console.log(`🚀 Generating test content with ${model}...`);
      console.log(`📝 Prompt being sent:`, prompt.substring(0, 200) + '...');
      
      const response = await aiManager.generateResponse(model, messages, sessionId);
      
      console.log(`📝 Raw response from ${model}:`, response);
      console.log(`📊 Response length: ${response?.length} characters`);
      
      // Try to extract JSON from the response
      let jsonMatch = response.match(/\{[\s\S]*\}/);
      console.log(`🔍 JSON extraction attempt:`, jsonMatch ? 'Found JSON block' : 'No JSON found');
      
      if (!jsonMatch) {
        console.error(`❌ No JSON found in response. Raw response: ${response}`);
        throw new Error('No JSON found in response');
      }
      
      console.log(`📋 Extracted JSON string:`, jsonMatch[0]);
      
      let testData;
      try {
        // Clean up the JSON string to handle newlines and control characters
        let cleanedJson = jsonMatch[0];
        
        // Replace problematic newlines within quoted strings with escaped newlines
        cleanedJson = cleanedJson.replace(/("haystack":\s*"[^"]*)"[\r\n]+([^"]*")/g, '$1\\n$2');
        cleanedJson = cleanedJson.replace(/("needle":\s*"[^"]*)"[\r\n]+([^"]*")/g, '$1\\n$2');
        cleanedJson = cleanedJson.replace(/("exactMatch":\s*"[^"]*)"[\r\n]+([^"]*")/g, '$1\\n$2');
        
        // Handle other problematic characters
        cleanedJson = cleanedJson.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ');
        
        console.log(`🧹 Cleaned JSON string:`, cleanedJson.substring(0, 200) + '...');
        
        testData = JSON.parse(cleanedJson);
        console.log(`✅ JSON parsed successfully:`, {
          haystackLength: testData.haystack?.length,
          needleLength: testData.needle?.length,
          exactMatchLength: testData.exactMatch?.length
        });
      } catch (parseError) {
        console.error(`❌ JSON parsing failed even after cleaning:`, parseError.message);
        console.error(`❌ Cleaned JSON string:`, cleanedJson);
        
        // Try to extract fields manually if JSON parsing fails
        try {
          const haystackMatch = response.match(/"haystack":\s*"([^"]+)"/);
          const needleMatch = response.match(/"needle":\s*"([^"]+)"/);
          const exactMatchMatch = response.match(/"exactMatch":\s*"([^"]+)"/);
          
          if (haystackMatch && needleMatch && exactMatchMatch) {
            testData = {
              haystack: haystackMatch[1],
              needle: needleMatch[1],
              exactMatch: exactMatchMatch[1]
            };
            console.log(`✅ Manual extraction successful`);
          } else {
            throw new Error(`Manual extraction failed: ${parseError.message}`);
          }
        } catch (manualError) {
          throw new Error(`JSON parsing failed: ${parseError.message}`);
        }
      }
      
      // Validate the generated content
      console.log(`🔍 Validating fields:`);
      console.log(`  - haystack: ${!!testData.haystack} (${testData.haystack?.length} chars)`);
      console.log(`  - needle: ${!!testData.needle} (${testData.needle?.length} chars)`);
      console.log(`  - exactMatch: ${!!testData.exactMatch} (${testData.exactMatch?.length} chars)`);
      
      if (!testData.haystack || !testData.needle || !testData.exactMatch) {
        console.error(`❌ Missing required fields in testData:`, testData);
        throw new Error('Generated content missing required fields');
      }
      
      // Ensure word count is reasonable (within 50% of target)
      const actualWordCount = testData.haystack.split(/\s+/).length;
      console.log(`📊 Generated ${actualWordCount} words (target: ${wordCount})`);
      
      const responseData = {
        haystack: testData.haystack,
        needle: testData.needle,
        exactMatch: testData.exactMatch,
        success: true,
        actualWordCount
      };
      
      console.log(`📤 Emitting testContentGenerated with:`, {
        haystackLength: responseData.haystack.length,
        needleLength: responseData.needle.length,
        exactMatchLength: responseData.exactMatch.length,
        success: responseData.success
      });
      
      socket.emit('testContentGenerated', responseData);
      console.log(`✅ Test content generation completed successfully`);
      
    } catch (error) {
      console.error('❌ Error generating test content:', error);
      console.error('❌ Error stack:', error.stack);
      socket.emit('testContentGenerated', {
        success: false,
        error: error.message
      });
    }
  });

  // Keep existing conversation handlers for backwards compatibility
  socket.on('startConversation', async ({ participants, initialPrompt }) => {
    console.log(`Starting conversation with participants: ${participants.join(', ')}`);
    
    // Validate that all participants have API keys
    const missingKeys = [];
    participants.forEach(modelId => {
      const modelConfig = {
        'gpt-4': 'openai',
        'gpt-4-turbo': 'openai',
        'gpt-4o-mini': 'openai',
        'gpt-3.5-turbo': 'openai',
        'gemini-2.5-pro': 'google',
        'gemini-2.0-flash': 'google',
        'gemini-2.0-flash-lite': 'google',
        'gemini-1.5-pro': 'google',
        'gemini-1.5-flash': 'google',
        'gemini-1.0-pro': 'google',
        'gemini-2.5-flash-preview-05-20': 'google',
        'gemini-2.5-pro-preview-05-06': 'google',
        'claude-3-opus': 'anthropic',
        'claude-3-sonnet': 'anthropic',
        'claude-3-haiku': 'anthropic',
        'claude-instant': 'anthropic'
      };
      
      const provider = modelConfig[modelId];
      if (provider && !aiManager.getApiKey(provider, sessionId)) {
        missingKeys.push(provider);
      }
    });

    if (missingKeys.length > 0) {
      socket.emit('error', { 
        message: `Missing API keys for: ${[...new Set(missingKeys)].join(', ')}. Please add them in Settings.` 
      });
      return;
    }

    const conversationId = conversationManager.createConversation(sessionId, participants);
    const conversation = conversationManager.getConversation(conversationId);
    conversation.isActive = true;
    
    socket.emit('conversationStarted', { conversationId });
    
    // Start the conversation with the initial prompt
    startConversationChain(conversationId, initialPrompt, socket);
  });

  socket.on('stopConversation', ({ conversationId }) => {
    console.log(`Stopping conversation: ${conversationId}`);
    const stopped = conversationManager.stopConversation(conversationId);
    if (stopped) {
      socket.emit('conversationEnded', { conversationId, reason: 'User requested stop' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Conversation chain logic
async function startConversationChain(conversationId, initialPrompt, socket) {
  const conversation = conversationManager.getConversation(conversationId);
  if (!conversation) return;

  console.log(`🚀 Starting conversation chain with prompt: "${initialPrompt}"`);

  conversation.isActive = true;
  
  // Add initial prompt as user message
  const initialMessage = {
    id: uuidv4(),
    provider: 'user',
    content: initialPrompt || 'Hello', // Ensure we have some content
    timestamp: new Date().toISOString(),
    role: 'user'
  };
  conversation.messages.push(initialMessage);
  
  console.log(`📤 Sending initial message:`, initialMessage);
  socket.emit('newMessage', initialMessage);

  // Start the chain with the first AI model
  await continueConversationChain(conversationId, socket);
}

async function continueConversationChain(conversationId, socket) {
  const conversation = conversationManager.getConversation(conversationId);
  if (!conversation || !conversation.isActive) return;

  // Find a model that has an API key available
  let attempts = 0;
  let currentModelId = null;
  
  while (attempts < conversation.participants.length) {
    const modelIndex = (conversation.currentTurn + attempts) % conversation.participants.length;
    const testModelId = conversation.participants[modelIndex];
    
    // Check if this model has an API key available
    const modelMapping = {
      'gpt-4': 'openai', 'gpt-4-turbo': 'openai', 'gpt-4o-mini': 'openai', 'gpt-3.5-turbo': 'openai',
      'gemini-2.5-pro': 'google', 'gemini-2.0-flash': 'google', 'gemini-2.0-flash-lite': 'google', 
      'gemini-1.5-pro': 'google', 'gemini-1.5-flash': 'google', 'gemini-1.0-pro': 'google',
      'gemini-2.5-flash-preview-05-20': 'google', 'gemini-2.5-pro-preview-05-06': 'google',
      'claude-3-opus': 'anthropic', 'claude-3-sonnet': 'anthropic', 'claude-3-haiku': 'anthropic', 'claude-instant': 'anthropic'
    };
    
    const provider = modelMapping[testModelId];
    if (provider && aiManager.getApiKey(provider, conversation.userId)) {
      currentModelId = testModelId;
      break;
    }
    
    console.log(`⏭️  Skipping ${testModelId} - no API key for ${provider}`);
    attempts++;
  }
  
  if (!currentModelId) {
    console.log(`🛑 No models with API keys available, ending conversation`);
    conversation.isActive = false;
    socket.emit('conversationEnded', { conversationId, reason: 'No models with API keys available' });
    return;
  }
  
  console.log(`🔄 Conversation Chain - Turn ${conversation.currentTurn}, Model: ${currentModelId}`);
  
  try {
    const history = conversationManager.getConversationHistory(conversationId, 20);
    console.log(`[PRE_GENERATE_RESPONSE] ConvID: ${conversationId}, Turn: ${conversation.currentTurn}, Model: ${currentModelId}`);
    console.log(`[PRE_GENERATE_RESPONSE] Current conversation.messages length: ${conversation.messages.length}`);
    if (conversation.messages.length > 0) {
      console.log(`[PRE_GENERATE_RESPONSE] Last message in conversation.messages: ${conversation.messages[conversation.messages.length -1].provider} - \"${conversation.messages[conversation.messages.length -1].content?.substring(0,50)}...\"`);
    }
    console.log(`[PRE_GENERATE_RESPONSE] History to be sent (length ${history.length}):`, history.map(h => `${h.provider} (${h.role}): ${h.content?.substring(0, 50)}...`));
    console.log(`📚 Conversation History (${history.length} messages):`, history.map(h => `${h.provider} (${h.role}): ${h.content?.substring(0, 50)}...`));
    socket.emit('aiThinking', { provider: currentModelId });
    
    const responseText = await aiManager.generateResponse(
      currentModelId,
      history,
      conversation.userId
    );
    
    console.log(`✅ Generated response from ${currentModelId}: \"${responseText?.substring(0, 100)}...\"`);
    
    if (!responseText || responseText.trim().length === 0) { 
      console.log(`⚠️ Empty or whitespace-only response from ${currentModelId}, adding placeholder.`);
      conversationManager.addMessage(conversationId, currentModelId, "(Previous turn provided no text output)"); // Changed placeholder
      conversation.emptyResponseCount++;
      if (conversation.emptyResponseCount >= 5) {
        console.log(`🛑 Too many empty responses (${conversation.emptyResponseCount}), ending conversation`);
        conversation.isActive = false;
        socket.emit('conversationEnded', { conversationId, reason: 'Too many empty responses' });
        return;
      }
      conversation.currentTurn++;
      setTimeout(() => {
        const currentConversation = conversationManager.getConversation(conversationId);
        if (currentConversation && currentConversation.isActive) {
          continueConversationChain(conversationId, socket);
        }
      }, 1500); // Increased delay to 1.5 seconds
      return;
    }
    
    conversation.emptyResponseCount = 0;
    const message = conversationManager.addMessage(conversationId, currentModelId, responseText);
    socket.emit('newMessage', message);
    
    conversation.currentTurn++;
    setTimeout(() => {
      const currentConversation = conversationManager.getConversation(conversationId);
      if (currentConversation && currentConversation.isActive && currentConversation.messages.length < 30) {
        continueConversationChain(conversationId, socket);
      } else if (currentConversation && currentConversation.isActive) {
        currentConversation.isActive = false;
        socket.emit('conversationEnded', { conversationId, reason: 'Message limit reached' });
      }
    }, 2000);
    
  } catch (error) {
    console.error(`Error in conversation chain with ${currentModelId}:`, error);
    
    if (error.message === 'Anthropic response content was empty or not in the expected text format.') {
      console.log(`⚠️ Anthropic model ${currentModelId} returned empty content, adding placeholder.`);
      conversationManager.addMessage(conversationId, currentModelId, "(Previous turn provided no text output)"); // Changed placeholder
      conversation.emptyResponseCount++;
      if (conversation.emptyResponseCount >= 5) {
        console.log(`🛑 Too many empty/failed responses (${conversation.emptyResponseCount}), ending conversation`);
        conversation.isActive = false;
        socket.emit('conversationEnded', { conversationId, reason: 'Too many empty/failed responses' });
        return;
      }
    } else {
      socket.emit('error', { 
        message: `Error with ${currentModelId}: ${error.message}`,
        provider: currentModelId 
      });
    }
    
    conversation.currentTurn++;
    setTimeout(() => {
      const currentConversation = conversationManager.getConversation(conversationId);
      if (currentConversation && currentConversation.isActive) {
        continueConversationChain(conversationId, socket);
      }
    }, 1500); // Increased delay to 1.5 seconds
  }
}

// API Routes
// Configure multer for PDF file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// PDF processing endpoint
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    console.log(`📄 Processing PDF: ${req.file.originalname} (${req.file.size} bytes)`);

    // Extract text from PDF using pdf-parse
    const pdfData = await pdfParse(req.file.buffer);
    
    const extractedText = pdfData.text;
    const pageCount = pdfData.numpages;
    
    console.log(`✅ PDF processed successfully: ${pageCount} pages, ${extractedText.length} characters`);

    res.json({
      success: true,
      filename: req.file.originalname,
      text: extractedText,
      pageCount: pageCount,
      characterCount: extractedText.length,
      wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length
    });

  } catch (error) {
    console.error('PDF processing error:', error);
    res.status(500).json({
      error: 'Failed to process PDF',
      message: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
const httpServer = server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Closing http server.`);
  httpServer.close(() => {
    console.log('Http server closed.');
    // Close other resources like database connections if any
    process.exit(0);
  });

  // Force close server after 5 seconds if it hasn't closed yet
  setTimeout(() => {
    console.error('Http server did not close in time, forcing exit.');
    process.exit(1);
  }, 5000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => { // Nodemon specific signal for restart
  gracefulShutdown('SIGUSR2');
}); 