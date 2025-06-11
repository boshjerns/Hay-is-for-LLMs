import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Card,
  CardContent,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SelectChangeEvent,
  ThemeProvider,
  createTheme
} from '@mui/material';
import {
  Send as SendIcon,
  Settings as SettingsIcon,
  Chat as ChatIcon,
  Stop as StopIcon,
  Visibility,
  VisibilityOff,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';

// Adjusted minimal theme for better color compatibility
const minimalTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000', // Black for primary actions if needed
    },
    secondary: {
      main: '#555555', // Dark grey
    },
    background: {
      default: '#F3F4F6', // Tailwind Cool Gray 100 (Light page background)
      paper: '#FFFFFF',   // White for Paper elements (main chat area, dropdowns)
    },
    text: {
      primary: '#1F2937',   // Tailwind Cool Gray 800 (Dark text)
      secondary: '#6B7280', // Tailwind Cool Gray 500 (Medium text)
    },
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
    h5: {
      fontWeight: 600,
      color: '#111827' // Tailwind Cool Gray 900
    },
    caption: {
        color: '#4B5563' // Tailwind Cool Gray 600
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '4px', // Slightly rounded
          textTransform: 'none',
          padding: '6px 16px',
        },
        containedPrimary: {
          backgroundColor: '#1F2937', // Dark Gray for buttons
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#111827',
          },
        },
        outlined: {
            borderColor: '#D1D5DB', // Cool Gray 300
            color: '#374151' // Cool Gray 700
        }
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '4px',
            '& fieldset': {
              borderColor: '#D1D5DB', // Cool Gray 300
            },
            '&:hover fieldset': {
              borderColor: '#9CA3AF', // Cool Gray 400
            },
            '&.Mui-focused fieldset': {
              borderColor: '#374151', // Cool Gray 700
            },
          },
        },
      },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                // General paper style, avoid overly specific overrides if Card will handle itself
            },
            elevation3: { // Main chat container paper
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', // Soft shadow
                border: 'none' // Remove border if shadow is present
            }
        }
    },
    MuiCard: {
        styleOverrides: {
            root: { // For message cards
                borderRadius: '8px', // Rounded message bubbles
                boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)', // Subtle shadow
                border: 'none'
            }
        }
    },
    MuiChip: {
        styleOverrides: {
            root: {
                borderRadius: '16px', // Pill-shaped chips
                padding: '0px 8px',
                height: '28px'
            }
        }
    },
    MuiDialog: {
        styleOverrides: {
            paper: {
                borderRadius: '8px',
                border: '1px solid #E5E7EB' // Cool Gray 200
            }
        }
    },
    MuiSelect: {
        styleOverrides:{
            root:{
                borderRadius: '4px'
            }
        }
    }
  },
});

interface Message {
  id: string;
  provider: string;
  content: string;
  timestamp: string;
  role: 'user' | 'ai';
}

interface ApiKeys {
  openai: string;
  google: string;
  anthropic: string;
}

interface AIModel {
  id: string;
  name: string;
  company: string;
  // For chat bubbles
  chatBgColor: string;
  chatTextColor: string;
  // For selection chips
  chipBgColor: string;
  chipTextColor: string;
  apiKeyField: keyof ApiKeys;
}

interface Company {
  id: string;
  name: string;
  baseColor: string; // Base color for the company (used for company selection chip)
  apiKeyField: keyof ApiKeys;
}

const AI_COMPANIES: Company[] = [
  { id: 'openai', name: 'OpenAI', baseColor: '#10B981', apiKeyField: 'openai' }, // Emerald 500
  { id: 'google', name: 'Google', baseColor: '#3B82F6', apiKeyField: 'google' }, // Blue 500
  { id: 'anthropic', name: 'Anthropic', baseColor: '#F97316', apiKeyField: 'anthropic' } // Orange 500
];

const AI_MODELS: AIModel[] = [
  // OpenAI Models (Emerald/Green shades)
  { id: 'gpt-4', name: 'GPT-4', company: 'openai', 
    chatBgColor: '#059669', chatTextColor: '#ECFDF5', 
    chipBgColor: '#A7F3D0', chipTextColor: '#065F46', 
    apiKeyField: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', company: 'openai', 
    chatBgColor: '#047857', chatTextColor: '#D1FAE5', 
    chipBgColor: '#6EE7B7', chipTextColor: '#064E3B', 
    apiKeyField: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', company: 'openai', 
    chatBgColor: '#10B981', chatTextColor: '#ECFDF5', 
    chipBgColor: '#A7F3D0', chipTextColor: '#047857', 
    apiKeyField: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', company: 'openai', 
    chatBgColor: '#065F46', chatTextColor: '#A7F3D0', 
    chipBgColor: '#34D399', chipTextColor: '#047857', 
    apiKeyField: 'openai' },
  
  // Google Models (Blue shades)
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', company: 'google', 
    chatBgColor: '#1E40AF', chatTextColor: '#EFF6FF', 
    chipBgColor: '#BFDBFE', chipTextColor: '#1D4ED8', 
    apiKeyField: 'google' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', company: 'google', 
    chatBgColor: '#2563EB', chatTextColor: '#EFF6FF', 
    chipBgColor: '#BFDBFE', chipTextColor: '#1E40AF', 
    apiKeyField: 'google' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', company: 'google', 
    chatBgColor: '#1D4ED8', chatTextColor: '#DBEAFE', 
    chipBgColor: '#93C5FD', chipTextColor: '#1E3A8A', 
    apiKeyField: 'google' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', company: 'google', 
    chatBgColor: '#3B82F6', chatTextColor: '#EFF6FF', 
    chipBgColor: '#93C5FD', chipTextColor: '#1E40AF', 
    apiKeyField: 'google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', company: 'google', 
    chatBgColor: '#60A5FA', chatTextColor: '#1E3A8A', 
    chipBgColor: '#BFDBFE', chipTextColor: '#1D4ED8', 
    apiKeyField: 'google' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', company: 'google', 
    chatBgColor: '#1E3A8A', chatTextColor: '#BFDBFE', 
    chipBgColor: '#60A5FA', chipTextColor: '#1D4ED8', 
    apiKeyField: 'google' },
  { id: 'gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash Preview', company: 'google', 
    chatBgColor: '#1E3A8A', chatTextColor: '#BFDBFE', 
    chipBgColor: '#60A5FA', chipTextColor: '#1D4ED8', 
    apiKeyField: 'google' },
  { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro Preview', company: 'google', 
    chatBgColor: '#1E40AF', chatTextColor: '#93C5FD', 
    chipBgColor: '#3B82F6', chipTextColor: '#EFF6FF', 
    apiKeyField: 'google' },
  
  // Anthropic Models (Orange/Amber shades)
  { id: 'claude-3-opus', name: 'Claude 3 Opus', company: 'anthropic', 
    chatBgColor: '#EA580C', chatTextColor: '#FFF7ED', 
    chipBgColor: '#FED7AA', chipTextColor: '#9A3412', 
    apiKeyField: 'anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', company: 'anthropic', 
    chatBgColor: '#C2410C', chatTextColor: '#FFEFEA', 
    chipBgColor: '#FDBA74', chipTextColor: '#7C2D12', 
    apiKeyField: 'anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', company: 'anthropic', 
    chatBgColor: '#9A3412', chatTextColor: '#FED7AA', 
    chipBgColor: '#FB923C', chipTextColor: '#EA580C', 
    apiKeyField: 'anthropic' },
  { id: 'claude-instant', name: 'Claude Instant', company: 'anthropic', 
    chatBgColor: '#F97316', chatTextColor: '#FFF7ED', 
    chipBgColor: '#FED7AA', chipTextColor: '#C2410C', 
    apiKeyField: 'anthropic' },
];

const getMessageStyle = (provider: string, role: 'user' | 'ai') => {
  if (role === 'user') {
    return {
      backgroundColor: '#4B5563', // Cool Gray 600
      color: '#F9FAFB',           // Cool Gray 50
      borderColor: '#374151'    // Cool Gray 700
    };
  }
  const model = AI_MODELS.find(m => m.id === provider);
  if (model) {
    return {
      backgroundColor: model.chatBgColor,
      color: model.chatTextColor,
      borderColor: model.chatBgColor // Or a slightly darker shade of chatBgColor
    };
  }
  // Fallback AI style
  return {
    backgroundColor: '#E5E7EB', // Cool Gray 200
    color: '#1F2937',           // Cool Gray 800
    borderColor: '#D1D5DB'    // Cool Gray 300
  };
};

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: '',
    google: '',
    anthropic: ''
  });
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [conversationActive, setConversationActive] = useState(false);
  const [thinkingModel, setThinkingModel] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let storedSessionId = localStorage.getItem('multiAiChatSessionId');
    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('multiAiChatSessionId', storedSessionId);
    }
    
    const newSocketInstance = io('http://localhost:5000', {
      query: { sessionId: storedSessionId }
    });
    setSocket(newSocketInstance);

    newSocketInstance.on('connect', () => {
      console.log('Connected to server');
      setSuccess('Connected to server');
    });

    newSocketInstance.on('apiKeySet', ({ provider, success, sessionId: returnedSessionId }) => {
      if (success) {
        setSuccess(`${provider} API key set successfully`);
        if (returnedSessionId) {
          localStorage.setItem('multiAiChatSessionId', returnedSessionId);
        }
      } else {
        setError(`Failed to set ${provider} API key`);
      }
    });

    newSocketInstance.on('conversationStarted', ({ conversationId }) => {
      console.log('Conversation started:', conversationId);
      setConversationActive(true);
      setCurrentConversationId(conversationId);
    });

    newSocketInstance.on('newMessage', (message: Message) => {
      setMessages(prev => [...prev, message]);
      setThinkingModel(null);
    });

    newSocketInstance.on('aiThinking', ({ provider }) => {
      setThinkingModel(provider);
    });

    newSocketInstance.on('conversationEnded', ({ reason }) => {
      setConversationActive(false);
      setThinkingModel(null);
      setCurrentConversationId(null);
      setSuccess(reason ? `Conversation ended: ${reason}` : 'Conversation ended');
    });

    newSocketInstance.on('error', ({ message, provider }) => {
      setError(`Error${provider ? ` with ${provider}` : ''}: ${message}`);
      setThinkingModel(null);
    });

    return () => {
      newSocketInstance.close();
      console.log('Socket connection closed');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinkingModel]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    const filtered = AI_MODELS.filter(model => selectedCompanies.includes(model.company));
    setAvailableModels(filtered);
    setSelectedModels(prev => prev.filter(modelId => 
      filtered.some(model => model.id === modelId)
    ));
  }, [selectedCompanies]);

  const handleApiKeyChange = (provider: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const saveApiKey = (provider: keyof ApiKeys) => {
    if (socket && apiKeys[provider]) {
      socket.emit('setApiKey', { provider, apiKey: apiKeys[provider] });
    }
  };

  const handleCompanySelection = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedCompanies(typeof value === 'string' ? value.split(',') : value);
  };

  const handleModelSelection = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedModels(typeof value === 'string' ? value.split(',') : value);
  };

  const startConversation = () => {
    if (socket && selectedModels.length >= 2 && initialPrompt.trim()) {
      setMessages([]);
      setError(null);
      setCurrentConversationId(null);
      socket.emit('startConversation', {
        participants: selectedModels,
        initialPrompt: initialPrompt.trim()
      });
    } else {
      setError('Please select at least 2 AI models and enter an initial prompt');
    }
  };

  const stopConversation = () => {
    if (socket && currentConversationId) {
      socket.emit('stopConversation', { conversationId: currentConversationId });
    }
    setConversationActive(false);
    setThinkingModel(null);
  };

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const getModelName = (modelId: string) => {
    const model = AI_MODELS.find(m => m.id === modelId);
    return model?.name || modelId;
  };

  const getCompanyName = (companyId: string) => {
    const company = AI_COMPANIES.find(c => c.id === companyId);
    return company?.name || companyId;
  };
  
  const getCompanyChipStyle = (companyId: string) => {
    const company = AI_COMPANIES.find(c => c.id === companyId);
    return {
        backgroundColor: company?.baseColor || '#E5E7EB', // Cool Gray 200 as fallback
        color: '#FFFFFF' // Assuming base colors are dark enough for white text
    };
  };

  const getModelChipStyle = (modelId: string) => {
      const model = AI_MODELS.find(m => m.id === modelId);
      return {
          backgroundColor: model?.chipBgColor || '#E5E7EB', // Fallback
          color: model?.chipTextColor || '#1F2937' // Fallback
      };
  };

  return (
    <ThemeProvider theme={minimalTheme}>
      <Container maxWidth="lg" sx={{ py: 2, bgcolor: 'background.default', minHeight: '100vh' }}>
        <Paper elevation={3} sx={{ height: 'calc(95vh - 32px)', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: 1, borderColor: '#E5E7EB' /* Cool Gray 200 */ }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ChatIcon sx={{color: theme => theme.palette.text.primary}} />
                <Typography variant="h5" component="h1">
                  Conversation-LLMulator
                </Typography>
              </Box>
              <IconButton onClick={() => setSettingsOpen(true)} sx={{color: theme => theme.palette.text.primary}}>
                <SettingsIcon />
              </IconButton>
            </Box>
            {error && <Alert severity="error" sx={{ mt: 1, borderRadius: '4px' }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mt: 1, borderRadius: '4px' }}>{success}</Alert>}
          </Box>

          {/* Controls */} 
          <Box sx={{ p: 2, borderBottom: 1, borderColor: '#E5E7EB' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Select Companies</InputLabel>
                  <Select
                    label="Select Companies"
                    multiple
                    value={selectedCompanies}
                    onChange={handleCompanySelection}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => {
                            const style = getCompanyChipStyle(value);
                            return (
                                <Chip key={value} label={getCompanyName(value)} sx={{backgroundColor: style.backgroundColor, color: style.color}} />
                            );
                        })}
                      </Box>
                    )}
                  >
                    {AI_COMPANIES.map((company) => (
                      <MenuItem key={company.id} value={company.id} sx={{backgroundColor: company.baseColor, color: '#FFFFFF', '&.Mui-selected': {backgroundColor: company.baseColor, color: '#FFFFFF'}, '&:hover': {backgroundColor: company.baseColor, opacity: 0.8}}}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth variant="outlined" disabled={selectedCompanies.length === 0}>
                  <InputLabel>Select AI Models</InputLabel>
                  <Select
                    label="Select AI Models"
                    multiple
                    value={selectedModels}
                    onChange={handleModelSelection}
                    disabled={selectedCompanies.length === 0}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => {
                            const style = getModelChipStyle(value);
                            return (
                                <Chip key={value} label={getModelName(value)} sx={{backgroundColor: style.backgroundColor, color: style.color}} />
                            );
                        })}
                      </Box>
                    )}
                  >
                    {availableModels.map((model) => {
                       const style = getModelChipStyle(model.id);
                       return (
                        <MenuItem 
                            key={model.id} 
                            value={model.id} 
                            sx={{
                                backgroundColor: style.backgroundColor, 
                                color: style.color,
                                '&.Mui-selected': {
                                    fontWeight: 'bold',
                                }, 
                                '&:hover': {
                                    backgroundColor: style.backgroundColor, 
                                    opacity: 0.8,
                                }
                            }}
                        >
                            {model.name} 
                        </MenuItem>
                       );
                    })}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Initial Prompt"
                  value={initialPrompt}
                  onChange={(e) => setInitialPrompt(e.target.value)}
                  placeholder="Enter a topic or question..."
                  disabled={conversationActive}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                {!conversationActive ? (
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<SendIcon />}
                    onClick={startConversation}
                    disabled={selectedModels.length < 2 || !initialPrompt.trim()}
                  >
                    Start Chat
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<StopIcon />}
                    onClick={stopConversation}
                  >
                    Stop
                  </Button>
                )}
              </Grid>
            </Grid>
          </Box>

          {/* Chat Messages */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {messages.length === 0 && !conversationActive && (
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  Welcome to Conversation-LLMulator
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Configure API keys, select AI models, and start a conversation!
                </Typography>
              </Box>
            )}

            {messages.map((message) => {
              const getMessageClass = (provider: string, role: 'user' | 'ai') => {
                if (role === 'user') return 'message-user';
                
                const model = AI_MODELS.find(m => m.id === provider);
                if (model) {
                  if (model.company === 'openai') return 'message-openai';
                  if (model.company === 'google') return 'message-google';
                  if (model.company === 'anthropic') return 'message-anthropic';
                }
                return 'message-bubble'; // fallback
              };

              return (
                <div
                  key={message.id}
                  className={`message-bubble ${getMessageClass(message.provider, message.role)}`}
                >
                  <div style={{ 
                    fontFamily: 'JetBrains Mono, monospace', 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    opacity: 0.7, 
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {message.role === 'user' ? '> user' : `> ${getModelName(message.provider)}`}
                  </div>
                  <div style={{ 
                    lineHeight: 1.6, 
                    fontSize: '14px',
                    whiteSpace: 'pre-wrap' 
                  }}>
                    {message.content}
                  </div>
                  <div style={{ 
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px', 
                    opacity: 0.5, 
                    marginTop: '8px',
                    textAlign: 'right'
                  }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              );
            })}

            {thinkingModel && (
              <div className="thinking-indicator">
                <span>{getModelName(thinkingModel)} is thinking</span>
                <div className="typing-dots">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </Box>
        </Paper>
      </Container>
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} PaperProps={{sx: {borderRadius: '8px'}}} maxWidth="sm" fullWidth>
        <DialogTitle sx={{borderBottom: `1px solid ${minimalTheme.palette.background.default}`, color: 'text.primary'}}>API Key Settings</DialogTitle>
        <DialogContent sx={{pt: '20px !important'}}>
          {(Object.keys(apiKeys) as Array<keyof ApiKeys>).map((provider) => (
            <Box key={provider} sx={{ mb: 2.5 }}>
              <Typography variant="h6" gutterBottom sx={{color: 'text.primary', fontSize: '1.1rem', mb: 1.5}}>{AI_COMPANIES.find(c=>c.apiKeyField === provider)?.name || provider.charAt(0).toUpperCase() + provider.slice(1)} API Key</Typography>
              <TextField
                fullWidth
                variant="outlined"
                type={showApiKeys[provider] ? 'text' : 'password'}
                value={apiKeys[provider]}
                onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                placeholder={`Enter your ${AI_COMPANIES.find(c=>c.apiKeyField === provider)?.name || provider} API key`}
                InputProps={{
                  endAdornment: (
                    <IconButton onClick={() => toggleApiKeyVisibility(provider)} edge="end" sx={{color: 'text.secondary'}}>
                      {showApiKeys[provider] ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  )
                }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={() => saveApiKey(provider)}
                sx={{ mt: 1 }}
              >
                Save {AI_COMPANIES.find(c=>c.apiKeyField === provider)?.name || provider.charAt(0).toUpperCase() + provider.slice(1)} Key
              </Button>
            </Box>
          ))}
        </DialogContent>
        <DialogActions sx={{borderTop: `1px solid ${minimalTheme.palette.background.default}`, px:3, py:2}}>
          <Button onClick={() => setSettingsOpen(false)} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}

export default App; 