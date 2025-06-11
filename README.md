# 🤖 Conversation LLMulator

<div align="center">

![Conversation LLMulator Banner](https://via.placeholder.com/800x200/0f1419/58a6ff?text=Conversation+LLMulator)

*Watch AI models have dynamic conversations with each other in real-time*

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-43853d.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.0+-010101.svg)](https://socket.io/)

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [API Support](#-supported-ai-models)

</div>

## 🎯 Overview

Conversation LLMulator is a revolutionary real-time application that orchestrates conversations between multiple AI language models. Watch as different AI personalities from OpenAI, Google, and Anthropic engage in dynamic, natural conversations on any topic you choose.

Unlike traditional chatbots that respond in assistant mode, our models are prompted to engage authentically as conversation participants, creating fascinating exchanges of ideas, perspectives, and insights.

## ✨ Features

### 🎭 **Multi-AI Conversations**
- **16 AI Models** from leading providers (OpenAI, Google, Anthropic)
- **Turn-based conversations** with intelligent model rotation
- **Natural dialogue prompts** that encourage authentic interaction
- **Real-time streaming** conversations via WebSocket

### 🎨 **Beautiful Interface**
- **Glassmorphic design** with modern UI/UX
- **JetBrains Mono** font for that authentic coder aesthetic
- **Responsive layout** that works on all devices
- **Real-time message indicators** and typing states

### 🔒 **Flexible API Management**
- **Environment variable support** for production deployments
- **UI-based API key input** for easy testing
- **Encrypted key storage** with AES encryption
- **Hybrid fallback system** (env vars → user input)

### 🛡️ **Enterprise-Ready Security**
- **Rate limiting** protection
- **CORS configuration** for secure cross-origin requests
- **Helmet.js security** headers
- **API key encryption** for sensitive data protection

## 🎮 Demo

<!-- Add screenshots or GIFs here -->
![Conversation Interface](https://via.placeholder.com/600x400/1a1a1a/58a6ff?text=Conversation+Interface)

*Real-time conversation between GPT-4, Claude, and Gemini discussing philosophy*

## 🚀 Installation

### Prerequisites
- **Node.js** v18 or higher
- **npm** or **yarn**
- API keys from one or more providers:
  - [OpenAI API Key](https://platform.openai.com/api-keys)
  - [Google AI Studio Key](https://makersuite.google.com/app/apikey)
  - [Anthropic API Key](https://console.anthropic.com/)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/conversation-llmulator.git
   cd conversation-llmulator
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server && npm install
   
   # Install client dependencies
   cd ../client && npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file in server directory
   cd ../server
   cp .env.example .env
   ```

4. **Configure your API keys**
   ```env
   # server/.env
   PORT=5000
   ENCRYPTION_KEY=your-secret-encryption-key-change-this-in-production
   
   # Add your API keys (optional - can also be added via UI)
   OPENAI_API_KEY=sk-...
   GOOGLE_API_KEY=AIza...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

5. **Start the application**
   ```bash
   # Terminal 1: Start backend server
   cd server && npm start
   
   # Terminal 2: Start frontend client
   cd client && npm start
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🎯 Usage

### Starting a Conversation

1. **Launch the app** at `http://localhost:3000`
2. **Add API keys** (if not using environment variables):
   - Click the Settings gear icon
   - Enter your API keys for desired providers
3. **Select AI models** for the conversation
4. **Enter a topic** or question to start the discussion
5. **Watch the magic happen** as AIs engage in real-time dialogue

### Conversation Controls

- **Stop/Start** conversations at any time
- **Model selection** from 16 available AI models
- **Topic guidance** to steer conversation direction
- **Real-time monitoring** of conversation flow

## 🤖 Supported AI Models

### OpenAI Models
- **GPT-4** - Most capable model
- **GPT-4 Turbo** - Fast and efficient
- **GPT-4o Mini** - Lightweight variant
- **GPT-3.5 Turbo** - Classic conversational AI

### Google Models
- **Gemini 2.5 Pro** - Latest flagship model
- **Gemini 2.0 Flash** - Fast response times
- **Gemini 2.0 Flash Lite** - Lightweight version
- **Gemini 1.5 Pro** - Advanced reasoning
- **Gemini 1.5 Flash** - Quick responses
- **Gemini 1.0 Pro** - Stable baseline
- **Preview Models** - Early access variants

### Anthropic Models
- **Claude 3 Opus** - Most powerful model
- **Claude 3 Sonnet** - Balanced performance
- **Claude 3 Haiku** - Fast and efficient
- **Claude Instant** - Quick responses

## 🏗️ Technical Architecture

### Backend Stack
- **Node.js** + **Express** for REST API
- **Socket.IO** for real-time WebSocket communication
- **Multiple AI SDKs** (OpenAI, Google AI, Anthropic)
- **CryptoJS** for API key encryption
- **Helmet.js** + **CORS** for security

### Frontend Stack
- **React 18** with modern hooks
- **Material-UI** for component library
- **Socket.IO Client** for real-time updates
- **Glassmorphic CSS** for modern styling

### Key Features
- **Conversation Management** - Intelligent turn-taking between models
- **API Key Hybrid System** - Environment variables with UI fallback
- **Error Handling** - Graceful degradation and retry logic
- **Rate Limiting** - Built-in protection against API abuse

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 5000) | No |
| `ENCRYPTION_KEY` | Key for encrypting user API keys | Yes |
| `OPENAI_API_KEY` | OpenAI API key | No* |
| `GOOGLE_API_KEY` | Google AI Studio API key | No* |
| `ANTHROPIC_API_KEY` | Anthropic API key | No* |

*At least one API key is required (can be provided via UI)

### Conversation Settings

- **Max Messages**: 30 per conversation
- **Response Timeout**: 30 seconds per model
- **Turn Delay**: 2 seconds between responses
- **Max Tokens**: 300-1024 depending on model

## 🐛 Troubleshooting

### Common Issues

**Port already in use (EADDRINUSE)**
```bash
# Kill existing Node processes
pkill -f node
# Or on Windows
taskkill /f /im node.exe
```

**API key not detected**
- Ensure `.env` file is in the `server` directory
- Check for extra spaces or line breaks in API keys
- Try adding keys via the UI as fallback

**Models not responding**
- Verify API keys are valid and have sufficient credits
- Check console logs for specific error messages
- Ensure internet connection for API calls

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow existing code style and patterns
- Add tests for new features
- Update documentation for API changes
- Ensure all AI models are properly supported

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT models and API
- **Google** for Gemini models and AI Studio
- **Anthropic** for Claude models and API
- **React** and **Material-UI** communities
- **Socket.IO** for real-time communication

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/conversation-llmulator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/conversation-llmulator/discussions)
- **Email**: your-email@example.com

---

<div align="center">

**Made with ❤️ for the AI community**

*Bridging conversations between artificial minds*

</div> 