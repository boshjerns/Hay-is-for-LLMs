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
require('dotenv').config();

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
const API_KEYS_FILE = path.join(__dirname, 'api_keys.json');

// Load API keys from file on startup
function loadApiKeys() {
  try {
    if (fs.existsSync(API_KEYS_FILE)) {
      const data = fs.readFileSync(API_KEYS_FILE, 'utf8');
      const savedKeys = JSON.parse(data);
      for (const [userId, keys] of Object.entries(savedKeys)) {
        userApiKeys.set(userId, keys);
      }
      console.log(`📂 Loaded API keys for ${Object.keys(savedKeys).length} users`);
    }
  } catch (error) {
    console.error('Error loading API keys:', error);
  }
}

// Save API keys to file
function saveApiKeys() {
  try {
    const keysObject = Object.fromEntries(userApiKeys);
    fs.writeFileSync(API_KEYS_FILE, JSON.stringify(keysObject, null, 2));
    console.log(`💾 Saved API keys to file`);
  } catch (error) {
    console.error('Error saving API keys:', error);
  }
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
    
    // Save to file for persistence
    saveApiKeys();
    
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
    console.log(`🔍 Available users:`, Array.from(userApiKeys.keys()));
    
    const userKeys = userApiKeys.get(userId);
    console.log(`🔍 User keys for ${userId}:`, userKeys ? Object.keys(userKeys) : 'none');
    
    if (userKeys && userKeys[provider]) {
      console.log(`✅ Found API key for ${provider}`);
      return decryptApiKey(userKeys[provider]);
    }
    console.log(`❌ No API key found for ${provider}`);
    return null;
  }

  async generateResponse(modelId, messages, userId) {
    // Map model IDs to their providers and API key fields
    const modelMapping = {
      'gpt-4': { provider: 'openai', apiKeyField: 'openai', model: 'gpt-4' },
      'gpt-4-turbo': { provider: 'openai', apiKeyField: 'openai', model: 'gpt-4-turbo-preview' },
      'gpt-3.5-turbo': { provider: 'openai', apiKeyField: 'openai', model: 'gpt-3.5-turbo' },
      'gemini-2.0-flash': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.0-flash' },
      'gemini-2.0-flash-lite': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.0-flash-lite' },
      'gemini-2.5-flash-preview-05-20': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.5-flash-preview-05-20' },
      'gemini-2.5-pro-preview-05-06': { provider: 'google', apiKeyField: 'google', model: 'gemini-2.5-pro-preview-05-06' },
      'claude-3-opus': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-opus-20240229' },
      'claude-3-sonnet': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
      'claude-3-haiku': { provider: 'anthropic', apiKeyField: 'anthropic', model: 'claude-3-5-haiku-20241022' }
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
          return await this.generateOpenAIResponse(messages, modelConfig.model);
        case 'google':
          return await this.generateGeminiResponse(messages, modelConfig.model);
        case 'anthropic':
          return await this.generateClaudeResponse(messages, modelConfig.model);
        default:
          throw new Error(`Unknown provider: ${modelConfig.provider}`);
      }
    } catch (error) {
      console.error(`Error generating response from ${modelId}:`, error);
      throw error;
    }
  }

  async generateOpenAIResponse(messages, model = "gpt-3.5-turbo") {
    // Create a system message to set the context
    const systemMessage = {
      role: 'system',
      content: 'You are participating in a multi-AI conversation. Respond naturally with appropriate length - keep it short (1-2 sentences) for simple responses, medium (2-4 sentences) for explanations, or longer (4-6 sentences) if the topic requires depth. Always stay conversational and respond directly to what was just said.'
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
      max_tokens: 300, // Increased to allow for longer responses when needed
      temperature: 0.7
    });
    
    return response.choices[0].message.content;
  }

  async generateGeminiResponse(messages, modelName = "gemini-2.0-flash") {
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
    let conversationContext = `You are participating in a multi-AI conversation about: "${initialPrompt}"\n\nRespond naturally with appropriate length - short (1-2 sentences) for simple responses, medium (2-4 sentences) for explanations, or longer (4-6 sentences) if the topic requires depth.\n\nConversation so far:\n\n`;
    
    validMessages.forEach((msg, index) => {
      const speaker = msg.provider === 'user' ? 'Human' : `AI (${msg.provider})`;
      conversationContext += `${speaker}: ${msg.content}\n\n`;
    });
    
    conversationContext += "Now respond naturally to what was just said, keeping the original topic in mind:";
    
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

  async generateClaudeResponse(messages, model = "claude-3-sonnet-20240229") {
    console.log('[Claude Generate RF] Model parameter received:', model);

    // Find the initial prompt to maintain conversation memory
    const initialPrompt = messages.find(msg => msg.provider === 'user')?.content || 'General discussion';
    
    // Create a system message for Claude
    const systemMessage = `You are participating in a multi-AI conversation about: "${initialPrompt}"\n\nRespond naturally with appropriate length - short (1-2 sentences) for simple responses, medium (2-4 sentences) for explanations, or longer (4-6 sentences) if the topic requires depth. Always stay conversational and respond directly to what was just said while keeping the original topic in mind.`;
    
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
        max_tokens: 1024, // Increased from 300
        system: systemMessage,
        messages: formattedMessages,
        temperature: 0.7
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Create a persistent user session ID
  let userSessionId = socket.handshake.query.sessionId;
  if (!userSessionId) {
    userSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  socket.userSessionId = userSessionId;
  
  console.log(`👤 User session: ${userSessionId}`);

  socket.on('setApiKey', ({ provider, apiKey }) => {
    try {
      console.log(`🔑 Setting API key for ${provider}, Session: ${userSessionId}`);
      aiManager.setApiKey(provider, apiKey, userSessionId);
      console.log(`✅ API key set successfully for ${provider}`);
      socket.emit('apiKeySet', { provider, success: true, sessionId: userSessionId });
    } catch (error) {
      console.log(`❌ Failed to set API key for ${provider}:`, error.message);
      socket.emit('apiKeySet', { provider, success: false, error: error.message });
    }
  });

  socket.on('startConversation', ({ participants, initialPrompt }) => {
    try {
      const conversationId = conversationManager.createConversation(userSessionId, participants);
      socket.join(conversationId);
      socket.currentConversationId = conversationId; // Store conversation ID on socket
      
      // Start the conversation chain
      startConversationChain(conversationId, initialPrompt, socket);
      
      socket.emit('conversationStarted', { conversationId });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('stopConversation', ({ conversationId }) => {
    try {
      console.log(`🛑 Stop conversation requested for: ${conversationId}`);
      const conversation = conversationManager.getConversation(conversationId);
      if (conversation) {
        conversation.isActive = false;
        console.log(`✅ Conversation ${conversationId} stopped by user`);
        socket.emit('conversationEnded', { conversationId, reason: 'Stopped by user' });
      }
    } catch (error) {
      console.error('Error stopping conversation:', error);
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Stop any active conversations when user disconnects
    if (socket.currentConversationId) {
      const conversation = conversationManager.getConversation(socket.currentConversationId);
      if (conversation) {
        conversation.isActive = false;
        console.log(`🛑 Conversation ${socket.currentConversationId} stopped due to disconnect`);
      }
    }
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

  const currentModelId = conversation.participants[conversation.currentTurn % conversation.participants.length];
  
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