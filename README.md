# 🌾 Hay is for LLMs - Needle in the Haystack Testing System

<div align="center">

![Needle in Haystack](https://via.placeholder.com/800x200/F4E4C1/8B4513?text=🌾+HAY+IS+FOR+LLMS+🔍)

*Test multiple AI models' ability to find specific information within large contexts*

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-43853d.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.0+-010101.svg)](https://socket.io/)

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [API Support](#-supported-ai-models)

</div>

## 🎯 Overview

**Hay is for LLMs** is a revolutionary needle-in-the-haystack testing system featuring a retro farming terminal aesthetic. Test multiple AI language models simultaneously to evaluate their ability to find specific information ("needles") within large text contexts ("haystacks").

Our system provides comprehensive testing across 14 different AI models from leading providers, with real-time results, detailed metrics, and an authentic retro computing experience.

## ✨ Features

### 🌾 **Retro Farming Terminal Interface**
- **Authentic terminal aesthetic** with VT323 and Press Start 2P fonts
- **Pixel-perfect borders** and farming color palette
- **Custom retro buttons** and form elements
- **Needle and haystack visual indicators**

### 🎯 **Multi-Model Testing**
- **14 AI Models** from OpenAI, Google, and Anthropic
- **Simultaneous testing** across all selected models
- **Real-time results** with WebSocket communication
- **Model-specific configuration** with expandable cards

### 📊 **Enhanced Metrics & Accurate Detection**
- **Exact Match Detection** - Define precise text for 100% accurate FOUND/NOT FOUND results
- **Response time** in milliseconds
- **Word count** and **character count**
- **Sentence count** and **reading time** estimates
- **Reliable success/failure indicators** based on exact string matching
- **Copy-to-clipboard** functionality

### ⚙️ **Advanced Controls**
- **Master controls** for temperature and max tokens (apply to all models)
- **Individual model settings** with expandable configuration cards
- **File upload support** for large haystack documents
- **Model selection** with checkboxes for flexible testing

### 🔒 **Secure API Management**
- **Encrypted API key storage** with AES encryption
- **Environment variable support** for production
- **UI-based API key input** for easy testing
- **Hybrid fallback system** (env vars → user input)

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
   git clone https://github.com/boshjerns/Hay-is-for-LLMs.git
   cd Hay-is-for-LLMs
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

### Running a Needle-in-the-Haystack Test

1. **Launch the app** at `http://localhost:3000`
2. **Add API keys** (if not using environment variables):
   - Click the "API KEYS" button
   - Enter your API keys for desired providers
3. **Input your haystack**:
   - Paste large text directly into the haystack field
   - Or upload a text file using the "UPLOAD FILE" button
4. **Define your needle**:
   - Enter the specific information you want models to find
5. **Set exact match criteria**:
   - Enter the exact text that should appear in correct responses
   - This enables accurate FOUND/NOT FOUND detection
6. **Select models** for testing using the checkboxes
7. **Configure settings**:
   - Use Master Controls to apply settings to all models
   - Expand individual cards for model-specific configuration
8. **Run the test** and watch real-time results with accurate detection!

### Master Controls

- **Master Temperature**: Apply temperature setting to all selected models
- **Master Max Tokens**: Apply token limit to all selected models
- **Individual Settings**: Expand model cards for per-model customization

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
- **Custom retro CSS** with farming terminal aesthetic
- **Socket.IO Client** for real-time updates
- **VT323 & Press Start 2P** fonts for authentic retro feel

### Key Features
- **Real-time Testing** - WebSocket-based communication
- **API Key Security** - Encrypted storage with hybrid fallback
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

### Test Settings

- **Response Timeout**: 30 seconds per model
- **Max Tokens**: 100-4000 (configurable per model)
- **Temperature**: 0.0-2.0 (configurable per model)
- **File Upload**: Supports .txt, .md, .json, .csv files

## 🐛 Troubleshooting

### Common Issues

**Port already in use (EADDRINUSE)**
```bash
# Kill existing Node processes
taskkill /f /im node.exe  # Windows
pkill -f node            # macOS/Linux
```

**API key not detected**
- Ensure `.env` file is in the `server` directory
- Check for extra spaces or line breaks in API keys
- Try adding keys via the UI as fallback

**Models not responding**
- Verify API keys are valid and have sufficient credits
- Check browser console for specific error messages
- Ensure internet connection for API calls

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow existing retro terminal aesthetic
- Add tests for new features
- Update documentation for API changes
- Ensure all AI models are properly supported

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for GPT models and API
- **Google** for Gemini models and AI Studio
- **Anthropic** for Claude models and API
- **Socket.IO** for real-time communication
- **VT323 & Press Start 2P** fonts for retro terminal aesthetic

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/boshjerns/Hay-is-for-LLMs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/boshjerns/Hay-is-for-LLMs/discussions)

---

<div align="center">

**Made with 🌾 for the AI community**

*Finding needles in haystacks, one LLM at a time*

</div> 