# 🤖 Conversation-LLMulator

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/boshjerns/Conversation-LLMulator?style=social)](https://github.com/boshjerns/Conversation-LLMulator/stargazers)
![Conversation-LLMulator Logo](https://img.shields.io/badge/🤖-Conversation--LLMulator-blue?style=for-the-badge&logo=openai)

**A real-time multi-AI conversation platform where different AI models engage in dynamic discussions**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4+-black?style=flat-square&logo=socket.io)](https://socket.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](https://opensource.org/licenses/MIT)

[🚀 Quick Start](#-quick-start) • [✨ Features](#-features) • [🎯 Demo](#-demo) • [📖 Documentation](#-documentation) • [🤝 Contributing](#-contributing)

</div>

---

## 🎯 What is Conversation-LLMulator?

Conversation-LLMulator is an innovative platform that orchestrates conversations between multiple AI models from different providers. Watch as GPT-4, Gemini, and Claude engage in natural, contextual discussions with adaptive response lengths and persistent conversation memory.

### 🌟 Why Conversation-LLMulator?

- **🧠 Multi-AI Intelligence**: Harness the unique strengths of different AI models
- **💬 Natural Conversations**: AI models respond contextually with human-like dialogue flow
- **🎭 Adaptive Responses**: Smart length variation based on conversation context
- **🧩 Memory Persistence**: Maintains conversation goals and context throughout discussions
- **⚡ Real-time Experience**: Live updates with typing indicators and seamless flow

---

## ✨ Features

### 🤖 **Multi-AI Support**
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Google**: Gemini 2.0 Flash, Flash Lite, 2.5 Flash Preview, 2.5 Pro Preview  
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku

### 🧠 **Intelligent Conversation Management**
- **Adaptive Response Length**: Short (1-2 sentences) → Medium (2-4 sentences) → Long (4-6 sentences)
- **Conversation Memory**: Persistent goal tracking throughout discussions
- **Context Awareness**: Full conversation history with speaker identification
- **Natural Flow**: Contextual responses that build on previous messages

### 🔒 **Security & Privacy**
- **Encrypted API Keys**: AES encryption for secure storage
- **Rate Limiting**: Protection against abuse
- **CORS Protection**: Secure cross-origin requests
- **Session Management**: Persistent user sessions

### 🎨 **User Experience**
- **Real-time Updates**: WebSocket-powered live conversations
- **Color-coded Messages**: Visual distinction between AI models
- **Typing Indicators**: See which AI is currently "thinking"
- **Responsive Design**: Beautiful Material-UI interface
- **Conversation Control**: Start/stop conversations anytime

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 16+ 
npm or yarn
API keys for desired AI providers
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/conversation-llmulator.git
   cd conversation-llmulator
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

### 🔑 API Key Setup

| Provider | Get Your Key | Documentation |
|----------|--------------|---------------|
| **OpenAI** | [platform.openai.com](https://platform.openai.com/api-keys) | [OpenAI Docs](https://platform.openai.com/docs) |
| **Google** | [makersuite.google.com](https://makersuite.google.com/app/apikey) | [Gemini Docs](https://ai.google.dev/docs) |
| **Anthropic** | [console.anthropic.com](https://console.anthropic.com/) | [Claude Docs](https://docs.anthropic.com/) |

---

## 🎯 Demo

### Starting a Conversation

1. **Configure API Keys** 🔑
   - Click the settings icon (⚙️)
   - Enter your API keys
   - Keys are encrypted and stored securely

2. **Select AI Models** 🤖
   - Choose companies from dropdown
   - Select 2+ AI models
   - Mix and match different providers

3. **Launch Discussion** 🚀
   - Enter an initial prompt
   - Watch AI models converse naturally
   - Stop anytime or let it run to completion

### Example Conversation Flow

```
User: "What's the best way to make a billion dollars?"

GPT-4: "Building a unicorn startup is probably the most realistic path, though it requires..."

Gemini: "Absolutely! The key is finding a massive market problem and creating a scalable solution..."

Claude: "I'd add that timing and execution are crucial. Many great ideas fail due to..."

GPT-4: "That's a great point about timing. Market readiness can make or break even..."
```

---

## 🏗️ Architecture

```mermaid
graph TB
    A[React Frontend] --> B[Socket.IO Client]
    B --> C[Express Server]
    C --> D[Socket.IO Server]
    C --> E[AI Model Manager]
    E --> F[OpenAI API]
    E --> G[Google Gemini API]
    E --> H[Anthropic API]
    C --> I[Conversation Manager]
    I --> J[Encrypted Storage]
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React + TypeScript + Material-UI | User interface and interactions |
| **Backend** | Node.js + Express | API server and business logic |
| **Real-time** | Socket.IO | Live conversation updates |
| **AI Integration** | OpenAI, Google, Anthropic SDKs | AI model communication |
| **Security** | AES Encryption, Helmet.js | Data protection and security |

---

## 🧠 How It Works

### Conversation Memory System

```javascript
// Memory Layers
1. Message History Memory    // Last 20 messages for context
2. Goal Memory              // Initial conversation objective  
3. Context Memory           // Full conversation transcript
4. Session Memory           // User sessions and API keys
```

### Adaptive Response Engine

The Conversation-LLMulator uses intelligent prompting to ensure natural conversation flow:

- **Short Responses** (1-2 sentences): Quick acknowledgments, simple reactions
- **Medium Responses** (2-4 sentences): Explanations, building on ideas  
- **Long Responses** (4-6 sentences): Complex topics requiring depth

### Context Injection

Each AI model receives:
```
System Prompt: "You are participating in a multi-AI conversation about: [GOAL]"
+ Full conversation history
+ Instructions for natural response length
+ Reminder to stay on topic
```

---

## 🔧 Technical Deep Dive

### Frontend Architecture (React + TypeScript)

#### Component Structure
```typescript
App.tsx (Main Component)
├── Header Section
│   ├── Title & Logo
│   └── Settings Button
├── Control Panel
│   ├── Company Selector (Multi-select)
│   ├── Model Selector (Filtered by company)
│   ├── Initial Prompt Input
│   └── Start/Stop Button
├── Chat Messages Area
│   ├── Message Cards (Color-coded by AI)
│   ├── Thinking Indicators
│   └── Auto-scroll to Bottom
└── Settings Dialog
    └── API Key Configuration
```

#### State Management
- **React Hooks**: useState, useEffect, useRef for local state
- **Socket Instance**: Persistent WebSocket connection
- **Message History**: Array of message objects with metadata
- **Session Management**: LocalStorage for session persistence

#### Theming System
```typescript
// Color Palette by AI Provider
OpenAI Models: Emerald shades (#059669 to #065F46)
Google Models: Blue shades (#2563EB to #1E40AF)
Anthropic Models: Orange shades (#EA580C to #9A3412)

// Base Theme: Minimal design with Cool Gray palette
Background: #F3F4F6 (Cool Gray 100)
Text Primary: #1F2937 (Cool Gray 800)
Text Secondary: #6B7280 (Cool Gray 500)
```

### Backend Architecture (Node.js + Express)

#### Core Classes

**1. AIModelManager**
```javascript
class AIModelManager {
  - setApiKey(provider, apiKey, userId)    // Encrypt and store API keys
  - getApiKey(provider, userId)            // Retrieve decrypted keys
  - generateResponse(modelId, messages)    // Route to appropriate AI
  - generateOpenAIResponse()               // OpenAI-specific handling
  - generateGeminiResponse()               // Google-specific handling
  - generateClaudeResponse()               // Anthropic-specific handling
}
```

**2. ConversationManager**
```javascript
class ConversationManager {
  - createConversation(userId, participants)  // Initialize new chat
  - addMessage(conversationId, modelId, content) // Add to history
  - getConversationHistory(conversationId)    // Retrieve messages
  - stopConversation(conversationId)          // End active chat
}
```

#### Data Models

**Conversation Object**
```javascript
{
  id: UUID,                    // Unique conversation identifier
  userId: string,              // Session ID for user
  participants: string[],      // Array of AI model IDs
  messages: Message[],         // Full message history
  initialGoal: string,         // First user prompt (conversation topic)
  currentTurn: number,         // Track whose turn it is
  isActive: boolean,           // Conversation state
  emptyResponseCount: number   // Safety counter for empty responses
}
```

**Message Object**
```javascript
{
  id: UUID,                    // Unique message identifier
  provider: string,            // Model ID or 'user'
  content: string,             // Message text
  timestamp: ISO string,       // When message was created
  role: 'user' | 'ai'         // Message sender type
}
```

### AI Integration Details

#### OpenAI Integration
```javascript
// Uses chat.completions API with system message
const systemMessage = {
  role: 'system',
  content: 'You are participating in a multi-AI conversation...'
};
// Maintains conversation context through message history
```

#### Google Gemini Integration
```javascript
// Uses generative model with conversation context
// Builds comprehensive prompt including:
- Initial conversation goal
- Full conversation history
- Response instructions
// Special handling for model-specific quirks
```

#### Anthropic Claude Integration
```javascript
// Requires alternating user/assistant messages
// Message preprocessing to ensure API compliance:
- Merges consecutive same-role messages
- Ensures conversation ends with user message
- Maintains full context while meeting API requirements
```

### Real-time Communication Flow

#### Socket.IO Event Architecture
```
┌─────────────┐                    ┌─────────────┐
│   Client    │                    │   Server    │
└─────┬───────┘                    └──────┬──────┘
      │                                    │
      │────── setApiKey ──────────────────>│
      │<───── apiKeySet ───────────────────│
      │                                    │
      │────── startConversation ──────────>│
      │<───── conversationStarted ─────────│
      │<───── newMessage (user) ───────────│
      │<───── aiThinking ──────────────────│
      │<───── newMessage (AI 1) ───────────│
      │<───── aiThinking ──────────────────│
      │<───── newMessage (AI 2) ───────────│
      │         ... continues ...          │
      │<───── conversationEnded ───────────│
```

### Security Implementation

#### API Key Protection
```javascript
// Encryption Flow
User Input → AES Encryption → Encrypted Storage → File Persistence
                    ↓
            Decryption on Use → API Client Initialization

// Storage Structure
userApiKeys: Map<userId, {
  openai?: encryptedKey,
  google?: encryptedKey,
  anthropic?: encryptedKey
}>
```

#### Network Security
- **Helmet.js**: Security headers (CSP, HSTS, etc.)
- **CORS**: Restricted to localhost:3000
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Message content and API key validation

### Performance Optimizations

#### Frontend Optimizations
- **Memoization**: Prevent unnecessary re-renders
- **Virtual Scrolling**: Efficient message list rendering
- **Debounced Updates**: Reduce state update frequency
- **Lazy Loading**: Load components as needed

#### Backend Optimizations
- **In-Memory Storage**: Fast conversation access
- **Message Windowing**: Send only relevant history (last 20 messages)
- **Async Processing**: Non-blocking AI API calls
- **Connection Pooling**: Reuse AI client instances

### Conversation Intelligence

#### Turn-Taking Algorithm
```javascript
1. User provides initial prompt
2. Add user message to history
3. For each AI in participants:
   a. Send full conversation context
   b. Generate response with appropriate length
   c. Broadcast to all connected clients
   d. Add to conversation history
4. Repeat until MAX_MESSAGES or user stops
```

#### Context Preservation Strategy
- **Goal Memory**: Initial prompt saved and referenced
- **Speaker Tracking**: Each message tagged with provider
- **History Window**: Last 20 messages for context
- **Adaptive Prompting**: Length guidelines based on context

---

## 📖 Documentation

### Configuration

#### Environment Variables
```bash
# server/.env
PORT=5000
ENCRYPTION_KEY=your-secret-key-change-this
```

#### Conversation Settings
```javascript
// Adjustable parameters
MAX_MESSAGES = 30           // Conversation length limit
RESPONSE_DELAY = 2000       // Delay between AI responses (ms)
MAX_TOKENS = 300           // Token limit per response
HISTORY_LIMIT = 20         // Messages sent for context
```

### API Reference

#### Socket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `setApiKey` | Client → Server | Store encrypted API key |
| `startConversation` | Client → Server | Begin AI conversation |
| `stopConversation` | Client → Server | End active conversation |
| `newMessage` | Server → Client | New AI response |
| `aiThinking` | Server → Client | AI is generating response |
| `conversationEnded` | Server → Client | Conversation completed |

---

## 🎨 Customization

### Adding New AI Models

1. **Update model configuration**
   ```javascript
   // client/src/App.tsx
   const AI_MODELS = [
     {
       id: 'new-model',
       name: 'New Model',
       company: 'provider',
       color: '#ff6b35'
     }
   ];
   ```

2. **Add API integration**
   ```javascript
   // server/index.js - AIModelManager
   async generateNewModelResponse(messages, model) {
     // Implementation
   }
   ```

### UI Theming

```css
/* client/src/index.css */
.message-newmodel {
  background-color: #your-color;
  color: white;
}
```

---

## 🚀 Deployment

### Local Development
```bash
npm run dev          # Start both server and client
npm run server       # Server only
npm run client       # Client only
```

### Production Build
```bash
npm run build        # Build client for production
npm start           # Start production server
```

### Docker Support
```dockerfile
# Coming soon - Docker configuration
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

### Contribution Guidelines

- 🧪 **Testing**: Ensure all features work with multiple AI providers
- 📝 **Documentation**: Update README for new features
- 🎨 **Code Style**: Follow existing patterns and conventions
- 🔒 **Security**: Never commit API keys or sensitive data

### Areas for Contribution

- 🤖 **New AI Providers**: Add support for additional AI models
- 🎨 **UI/UX**: Improve interface and user experience  
- 🔧 **Features**: Conversation export, themes, advanced settings
- 📱 **Mobile**: Responsive design improvements
- 🧪 **Testing**: Unit tests and integration tests

---

## 🐛 Troubleshooting

<details>
<summary><strong>Common Issues</strong></summary>

### Server Connection Issues
```bash
# Check if server is running
curl http://localhost:5000/health

# Expected response
{"status":"OK","timestamp":"..."}
```

### API Key Problems
- ✅ Verify keys are valid and have sufficient credits
- ✅ Check key permissions for chosen models
- ✅ Ensure keys are properly saved in settings

### Empty AI Responses
- ✅ Check server console for error messages
- ✅ Verify API quotas and rate limits
- ✅ Try different AI models

### Installation Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

</details>

---

## 📊 Roadmap

### 🎯 Current Version (v1.0)
- ✅ Multi-AI conversations
- ✅ Adaptive response lengths  
- ✅ Conversation memory
- ✅ Real-time updates
- ✅ Secure API key management

### 🚀 Upcoming Features (v1.1)
- 🔄 Conversation export/import
- 🎨 Custom themes and UI customization
- 📱 Mobile app support
- 🤖 Additional AI providers (Cohere, Hugging Face)
- 📊 Conversation analytics

### 🌟 Future Vision (v2.0)
- 🧠 AI personality customization
- 🎭 Role-playing scenarios
- 🌐 Multi-language support
- 🔗 Integration with external tools
- 👥 Multi-user conversations

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **OpenAI** for GPT models and excellent API documentation
- **Google** for Gemini AI and developer-friendly tools  
- **Anthropic** for Claude and responsible AI development
- **React Team** for the amazing frontend framework
- **Socket.IO** for seamless real-time communication
- **Material-UI** for beautiful, accessible components

---

## 📞 Support & Community

- 🐛 **Issues**: [GitHub Issues](https://github.com/boshjerns/Conversation-LLMulator/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/boshjerns/Conversation-LLMulator/discussions)  
- 📧 **Email**: support@conversation-llmulator.com
- 🐦 **X (Twitter)**: [@boshjerns](https://twitter.com/boshjerns)

---

<div align="center">

**Made with ❤️ by @boshjerns**

⭐ **Star this repo if you find it useful!** ⭐

[🔝 Back to Top](#-conversation-llmulator)

</div> 