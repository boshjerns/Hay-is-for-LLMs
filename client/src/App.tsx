import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface NeedleTestResult {
  modelId: string;
  response: string;
  foundNeedle: boolean;
  responseTime: number;
  timestamp: string;
  wordCount?: number;
  characterCount?: number;
  sentenceCount?: number;
  readingTime?: number;
}

interface ModelCardState {
  isExpanded: boolean;
  isLoading: boolean;
  result: NeedleTestResult | null;
  temperature: number;
  maxTokens: number;
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
  cardColor: string;
  accentColor: string;
  textColor: string;
  apiKeyField: keyof ApiKeys;
}

// Define AI models with their card styling
const AI_MODELS: AIModel[] = [
  // OpenAI Models (Green theme)
  { id: 'gpt-4', name: 'GPT-4', company: 'openai', 
    cardColor: '#10B981', accentColor: '#059669', textColor: '#FFFFFF', 
    apiKeyField: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', company: 'openai', 
    cardColor: '#059669', accentColor: '#047857', textColor: '#FFFFFF', 
    apiKeyField: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', company: 'openai', 
    cardColor: '#34D399', accentColor: '#10B981', textColor: '#065F46', 
    apiKeyField: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', company: 'openai', 
    cardColor: '#6EE7B7', accentColor: '#34D399', textColor: '#065F46', 
    apiKeyField: 'openai' },
  
  // Google Models (Blue theme)
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', company: 'google', 
    cardColor: '#3B82F6', accentColor: '#2563EB', textColor: '#FFFFFF', 
    apiKeyField: 'google' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', company: 'google', 
    cardColor: '#2563EB', accentColor: '#1D4ED8', textColor: '#FFFFFF', 
    apiKeyField: 'google' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', company: 'google', 
    cardColor: '#60A5FA', accentColor: '#3B82F6', textColor: '#1E3A8A', 
    apiKeyField: 'google' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', company: 'google', 
    cardColor: '#1D4ED8', accentColor: '#1E40AF', textColor: '#FFFFFF', 
    apiKeyField: 'google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', company: 'google', 
    cardColor: '#93C5FD', accentColor: '#60A5FA', textColor: '#1E3A8A', 
    apiKeyField: 'google' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', company: 'google', 
    cardColor: '#BFDBFE', accentColor: '#93C5FD', textColor: '#1E40AF', 
    apiKeyField: 'google' },
  
  // Anthropic Models (Orange theme)
  { id: 'claude-3-opus', name: 'Claude 3 Opus', company: 'anthropic', 
    cardColor: '#F97316', accentColor: '#EA580C', textColor: '#FFFFFF', 
    apiKeyField: 'anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', company: 'anthropic', 
    cardColor: '#EA580C', accentColor: '#C2410C', textColor: '#FFFFFF', 
    apiKeyField: 'anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', company: 'anthropic', 
    cardColor: '#FB923C', accentColor: '#F97316', textColor: '#7C2D12', 
    apiKeyField: 'anthropic' },
  { id: 'claude-instant', name: 'Claude Instant', company: 'anthropic', 
    cardColor: '#FED7AA', accentColor: '#FDBA74', textColor: '#9A3412', 
    apiKeyField: 'anthropic' },
];

// Needle and Haystack SVG images as data URLs
const NEEDLE_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 300'%3E%3Cdefs%3E%3ClinearGradient id='metal' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' style='stop-color:%23a0a0a0'/%3E%3Cstop offset='50%25' style='stop-color:%23f0f0f0'/%3E%3Cstop offset='100%25' style='stop-color:%23707070'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cellipse cx='50' cy='40' rx='20' ry='35' fill='%23364e65'/%3E%3Crect x='45' y='40' width='10' height='240' fill='url(%23metal)'/%3E%3Cpolygon points='50,280 45,290 55,290' fill='url(%23metal)'/%3E%3C/svg%3E";

const HAYSTACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 150'%3E%3Cpath d='M100 20 L30 140 L170 140 Z' fill='%23daa520' stroke='%238b4513' stroke-width='3'/%3E%3Cpath d='M100 20 Q80 60 70 100' stroke='%238b4513' stroke-width='2' fill='none'/%3E%3Cpath d='M100 20 Q120 60 130 100' stroke='%238b4513' stroke-width='2' fill='none'/%3E%3Cpath d='M100 20 Q100 60 100 100' stroke='%238b4513' stroke-width='2' fill='none'/%3E%3C/svg%3E";

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [haystack, setHaystack] = useState('');
  const [needle, setNeedle] = useState('');
  const [exactMatch, setExactMatch] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: '',
    google: '',
    anthropic: ''
  });
  const [modelStates, setModelStates] = useState<Map<string, ModelCardState>>(new Map());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<{[key: string]: boolean}>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [selectedModelsToShow, setSelectedModelsToShow] = useState<string[]>(AI_MODELS.map(m => m.id));
  const [masterTemperature, setMasterTemperature] = useState(0.7);
  const [masterMaxTokens, setMasterMaxTokens] = useState(1000);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize model states
  useEffect(() => {
    const initialStates = new Map<string, ModelCardState>();
    AI_MODELS.forEach(model => {
      initialStates.set(model.id, {
        isExpanded: false,
        isLoading: false,
        result: null,
        temperature: 0.7,
        maxTokens: 1000
      });
    });
    setModelStates(initialStates);
  }, []);

  // Socket connection
  useEffect(() => {
    let storedSessionId = localStorage.getItem('needleTestSessionId');
    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('needleTestSessionId', storedSessionId);
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
          localStorage.setItem('needleTestSessionId', returnedSessionId);
        }
      } else {
        setError(`Failed to set ${provider} API key`);
      }
    });

    newSocketInstance.on('needleTestResult', (result: NeedleTestResult) => {
      // Calculate additional metrics
      const enhancedResult = {
        ...result,
        wordCount: getWordCount(result.response),
        characterCount: getCharacterCount(result.response),
        sentenceCount: getSentenceCount(result.response),
        readingTime: getReadingTime(result.response)
      };

      setModelStates(prev => {
        const newStates = new Map(prev);
        const state = newStates.get(result.modelId);
        if (state) {
          newStates.set(result.modelId, {
            ...state,
            isLoading: false,
            result: enhancedResult
          });
        }
        return newStates;
      });
    });

    newSocketInstance.on('needleTestError', ({ modelId, error }) => {
      setModelStates(prev => {
        const newStates = new Map(prev);
        const state = newStates.get(modelId);
        if (state) {
          newStates.set(modelId, {
            ...state,
            isLoading: false,
            result: {
              modelId,
              response: `Error: ${error}`,
              foundNeedle: false,
              responseTime: 0,
              timestamp: new Date().toISOString(),
              wordCount: 0,
              characterCount: 0,
              sentenceCount: 0,
              readingTime: 0
            }
          });
        }
        return newStates;
      });
    });

    newSocketInstance.on('allTestsComplete', () => {
      setIsTestRunning(false);
      setSuccess('All tests completed!');
    });

    newSocketInstance.on('error', ({ message }) => {
      setError(message);
    });

    return () => {
      newSocketInstance.close();
    };
  }, []);

  // Auto-clear success/error messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Utility functions for message metrics
  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getCharacterCount = (text: string) => {
    return text.length;
  };

  const getReadingTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = getWordCount(text);
    const minutes = Math.ceil(words / wordsPerMinute);
    return minutes;
  };

  const getSentenceCount = (text: string) => {
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
  };

  const handleApiKeyChange = (provider: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const saveApiKey = (provider: keyof ApiKeys) => {
    if (socket && apiKeys[provider]) {
      socket.emit('setApiKey', { provider, apiKey: apiKeys[provider] });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setHaystack(content);
      };
      reader.readAsText(file);
    }
  };

  const toggleModelExpansion = (modelId: string) => {
    setModelStates(prev => {
      const newStates = new Map(prev);
      const state = newStates.get(modelId);
      if (state) {
        newStates.set(modelId, {
          ...state,
          isExpanded: !state.isExpanded
        });
      }
      return newStates;
    });
  };

  const updateModelSetting = (modelId: string, setting: 'temperature' | 'maxTokens', value: number) => {
    setModelStates(prev => {
      const newStates = new Map(prev);
      const state = newStates.get(modelId);
      if (state) {
        newStates.set(modelId, {
          ...state,
          [setting]: value
        });
      }
      return newStates;
    });
  };

  // Master control functions
  const applyMasterTemperature = (temperature: number) => {
    setMasterTemperature(temperature);
    setModelStates(prev => {
      const newStates = new Map(prev);
      selectedModelsToShow.forEach(modelId => {
        const state = newStates.get(modelId);
        if (state) {
          newStates.set(modelId, {
            ...state,
            temperature: temperature
          });
        }
      });
      return newStates;
    });
  };

  const applyMasterMaxTokens = (maxTokens: number) => {
    setMasterMaxTokens(maxTokens);
    setModelStates(prev => {
      const newStates = new Map(prev);
      selectedModelsToShow.forEach(modelId => {
        const state = newStates.get(modelId);
        if (state) {
          newStates.set(modelId, {
            ...state,
            maxTokens: maxTokens
          });
        }
      });
      return newStates;
    });
  };

  const runNeedleTest = () => {
    if (!socket || !haystack.trim() || !needle.trim() || !exactMatch.trim()) {
      setError('Please provide haystack content, needle to search for, and exact match text');
      return;
    }

    // Reset all results and set loading state - only for selected models
    setModelStates(prev => {
      const newStates = new Map(prev);
      selectedModelsToShow.forEach(modelId => {
        const state = newStates.get(modelId);
        if (state) {
          newStates.set(modelId, {
            ...state,
            isLoading: true,
            result: null
          });
        }
      });
      return newStates;
    });

    setIsTestRunning(true);
    setError(null);

    // Prepare model configurations - only for selected models
    const modelConfigs = selectedModelsToShow.map(modelId => {
      const state = modelStates.get(modelId);
      return {
        modelId: modelId,
        temperature: state?.temperature || 0.7,
        maxTokens: state?.maxTokens || 1000
      };
    });

    socket.emit('runNeedleTest', {
      haystack: haystack.trim(),
      needle: needle.trim(),
      exactMatch: exactMatch.trim(),
      models: modelConfigs
    });
  };

  const copyResponse = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Response copied to clipboard');
  };

  const getCompanyIcon = (company: string) => {
    const icons: { [key: string]: string } = {
      openai: '⚙',
      google: '◆',
      anthropic: '◈'
    };
    return icons[company] || '●';
  };

  return (
    <div className="terminal-container">
      {/* Header */}
      <div className="pixel-border" style={{ padding: '20px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '10px', textAlign: 'center' }}>
          NEEDLE IN THE HAYSTACK TEST
        </h1>
        <p style={{ textAlign: 'center', margin: 0, fontSize: '18px', opacity: 0.8 }}>
          Test multiple LLMs' ability to find specific information within large contexts
        </p>
      </div>

      {/* Master Controls */}
      <div className="pixel-border" style={{ padding: '15px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', margin: '0 0 15px 0' }}>MASTER CONTROLS</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px' }}>
              MASTER TEMPERATURE: {masterTemperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={masterTemperature}
              onChange={(e) => applyMasterTemperature(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px' }}>
              MASTER MAX TOKENS: {masterMaxTokens}
            </label>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={masterMaxTokens}
              onChange={(e) => applyMasterMaxTokens(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Haystack Input */}
        <div className="pixel-border" style={{ padding: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <img src={HAYSTACK_IMAGE} alt="Haystack" style={{ width: '30px', height: '30px', marginRight: '10px' }} />
            <h2 style={{ fontSize: '18px', margin: 0 }}>HAYSTACK</h2>
          </div>
          <textarea
            className="terminal-input"
            style={{ width: '100%', height: '100px', resize: 'vertical' }}
            placeholder="Paste your large text here or upload a file..."
            value={haystack}
            onChange={(e) => setHaystack(e.target.value)}
          />
          <div style={{ marginTop: '10px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".txt,.md,.json,.csv"
            />
            <button
              className="farm-button"
              style={{ fontSize: '18px', padding: '8px 16px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              UPLOAD FILE
            </button>
            {uploadedFile && (
              <span style={{ marginLeft: '10px', fontSize: '16px' }}>
                {uploadedFile.name}
              </span>
            )}
          </div>
        </div>

        {/* Needle Input */}
        <div className="pixel-border" style={{ padding: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <img src={NEEDLE_IMAGE} alt="Needle" style={{ width: '20px', height: '30px', marginRight: '10px' }} />
            <h2 style={{ fontSize: '18px', margin: 0 }}>NEEDLE</h2>
          </div>
          <textarea
            className="terminal-input"
            style={{ width: '100%', height: '100px', resize: 'vertical' }}
            placeholder="What to find..."
            value={needle}
            onChange={(e) => setNeedle(e.target.value)}
          />
        </div>

        {/* Exact Match Input */}
        <div className="pixel-border" style={{ padding: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '24px', marginRight: '10px' }}>🎯</span>
            <h2 style={{ fontSize: '18px', margin: 0 }}>EXACT MATCH</h2>
          </div>
          <textarea
            className="terminal-input"
            style={{ width: '100%', height: '100px', resize: 'vertical' }}
            placeholder="Exact text that should appear in correct responses (e.g., 'FAR 15.609', 'Section 3.2.1', etc.)..."
            value={exactMatch}
            onChange={(e) => setExactMatch(e.target.value)}
          />
          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
            💡 Use specific phrases, numbers, or regulations for accurate detection
          </div>
          <button
            className="farm-button"
            style={{ width: '100%', marginTop: '10px', fontSize: '20px' }}
            onClick={runNeedleTest}
            disabled={isTestRunning || !haystack.trim() || !needle.trim() || !exactMatch.trim()}
          >
            {isTestRunning ? 'RUNNING...' : 'RUN TEST'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="farm-alert farm-alert-error" style={{ marginBottom: '20px' }}>
          <span className="terminal-chevron">&gt;</span> {error}
        </div>
      )}
      {success && (
        <div className="farm-alert farm-alert-success" style={{ marginBottom: '20px' }}>
          <span className="terminal-chevron">&gt;</span> {success}
        </div>
      )}

      {/* Model Selection */}
      <div className="pixel-border" style={{ padding: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', margin: 0 }}>SELECT MODELS</h3>
          <div>
            <button
              className="farm-button"
              style={{ fontSize: '16px', padding: '6px 12px', marginRight: '10px' }}
              onClick={() => setSelectedModelsToShow(AI_MODELS.map(m => m.id))}
            >
              ALL
            </button>
            <button
              className="farm-button"
              style={{ fontSize: '16px', padding: '6px 12px', marginRight: '10px' }}
              onClick={() => setSelectedModelsToShow([])}
            >
              NONE
            </button>
            <button
              className="farm-button"
              style={{ fontSize: '16px', padding: '6px 12px' }}
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              API KEYS
            </button>
          </div>
        </div>
        <div style={{ marginTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
          {AI_MODELS.map(model => (
            <label key={model.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedModelsToShow.includes(model.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedModelsToShow([...selectedModelsToShow, model.id]);
                  } else {
                    setSelectedModelsToShow(selectedModelsToShow.filter(id => id !== model.id));
                  }
                }}
                style={{ marginRight: '8px', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '16px' }}>
                {getCompanyIcon(model.company)} {model.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Model Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
        {AI_MODELS.filter(model => selectedModelsToShow.includes(model.id)).map((model) => {
          const state = modelStates.get(model.id);
          if (!state) return null;

          return (
            <div key={model.id} className="model-card">
              <div className="model-card-header">
                <div>
                  <span style={{ fontSize: '14px', opacity: 0.8 }}>
                    {getCompanyIcon(model.company)} {model.company}
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    {model.name}
                  </div>
                </div>
                <button
                  onClick={() => toggleModelExpansion(model.id)}
                  className="farm-button"
                  style={{ 
                    fontSize: '16px',
                    padding: '4px 8px',
                    minWidth: '40px'
                  }}
                >
                  {state.isExpanded ? '▼' : '▶'}
                </button>
              </div>

              {state.isExpanded && (
                <div style={{ padding: '10px', borderBottom: '3px solid var(--farm-green)', background: 'var(--farm-dark-beige)' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '14px' }}>
                      TEMP: {state.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={state.temperature}
                      onChange={(e) => updateModelSetting(model.id, 'temperature', parseFloat(e.target.value))}
                      style={{ width: '100%', marginTop: '5px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '14px' }}>
                      TOKENS: {state.maxTokens}
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="4000"
                      step="100"
                      value={state.maxTokens}
                      onChange={(e) => updateModelSetting(model.id, 'maxTokens', parseInt(e.target.value))}
                      style={{ width: '100%', marginTop: '5px' }}
                    />
                  </div>
                </div>
              )}

              <div className="model-card-content">
                {state.isLoading ? (
                  <div className="status-loading">
                    SEARCHING<span className="loading-dots"></span>
                  </div>
                ) : state.result ? (
                  <div style={{ width: '100%' }}>
                    <div className={state.result.foundNeedle ? 'status-found' : 'status-not-found'}>
                      {state.result.foundNeedle ? '✓ EXACT MATCH FOUND!' : '✗ EXACT MATCH NOT FOUND'}
                    </div>
                    
                    {/* Enhanced Metrics */}
                    <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                      <div>⏱️ {state.result.responseTime}ms</div>
                      <div>📝 {state.result.wordCount || 0} words</div>
                      <div>📏 {state.result.characterCount || 0} chars</div>
                      <div>🔤 {state.result.sentenceCount || 0} sentences</div>
                      <div style={{ gridColumn: '1 / -1' }}>📖 ~{state.result.readingTime || 0} min read</div>
                    </div>
                    
                    <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '8px', marginBottom: '5px' }}>
                      📝 MODEL RESPONSE:
                    </div>
                    <div style={{
                      padding: '10px',
                      background: 'var(--farm-dark-beige)',
                      border: '2px solid var(--farm-green)',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}>
                      {state.result.response}
                    </div>
                    <button
                      className="farm-button"
                      style={{ fontSize: '14px', padding: '4px 8px', marginTop: '10px' }}
                      onClick={() => copyResponse(state.result!.response)}
                    >
                      COPY
                    </button>
                  </div>
                ) : (
                  <div className="status-ready">READY</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* API Keys Dialog */}
      {settingsOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="pixel-border" style={{
            background: 'var(--farm-beige)',
            padding: '20px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>API KEY SETTINGS</h2>
            {(['openai', 'google', 'anthropic'] as const).map((provider) => (
              <div key={provider} style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '16px', textTransform: 'uppercase' }}>
                  {provider} API KEY
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type={showApiKeys[provider] ? 'text' : 'password'}
                    className="terminal-input"
                    style={{ flex: 1 }}
                    value={apiKeys[provider]}
                    onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                    placeholder={`Enter ${provider} API key`}
                  />
                  <button
                    className="farm-button"
                    style={{ fontSize: '16px', padding: '8px 12px' }}
                    onClick={() => setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }))}
                  >
                    {showApiKeys[provider] ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
                <button
                  className="farm-button"
                  style={{ marginTop: '10px', fontSize: '16px' }}
                  onClick={() => saveApiKey(provider)}
                  disabled={!apiKeys[provider]}
                >
                  SAVE {provider.toUpperCase()} KEY
                </button>
              </div>
            ))}
            <button
              className="farm-button"
              style={{ width: '100%', marginTop: '20px', fontSize: '18px' }}
              onClick={() => setSettingsOpen(false)}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 