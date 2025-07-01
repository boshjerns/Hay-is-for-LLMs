import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import mammoth from 'mammoth';
import { read, utils } from 'xlsx';
import Papa from 'papaparse';

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
  { id: 'o3', name: 'O3', company: 'openai', 
    cardColor: '#065F46', accentColor: '#047857', textColor: '#FFFFFF', 
    apiKeyField: 'openai' },
  { id: 'o1', name: 'O1', company: 'openai', 
    cardColor: '#047857', accentColor: '#064E3B', textColor: '#FFFFFF', 
    apiKeyField: 'openai' },
  { id: 'gpt-4.1', name: 'GPT-4.1', company: 'openai', 
    cardColor: '#10B981', accentColor: '#059669', textColor: '#FFFFFF', 
    apiKeyField: 'openai' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', company: 'openai', 
    cardColor: '#34D399', accentColor: '#10B981', textColor: '#065F46', 
    apiKeyField: 'openai' },
  { id: 'gpt-4', name: 'GPT-4', company: 'openai', 
    cardColor: '#059669', accentColor: '#047857', textColor: '#FFFFFF', 
    apiKeyField: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', company: 'openai', 
    cardColor: '#6EE7B7', accentColor: '#34D399', textColor: '#065F46', 
    apiKeyField: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', company: 'openai', 
    cardColor: '#A7F3D0', accentColor: '#6EE7B7', textColor: '#065F46', 
    apiKeyField: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', company: 'openai', 
    cardColor: '#D1FAE5', accentColor: '#A7F3D0', textColor: '#064E3B', 
    apiKeyField: 'openai' },
  
  // Google Models (Blue theme)
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', company: 'google', 
    cardColor: '#1E40AF', accentColor: '#1D4ED8', textColor: '#FFFFFF', 
    apiKeyField: 'google' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', company: 'google', 
    cardColor: '#3B82F6', accentColor: '#2563EB', textColor: '#FFFFFF', 
    apiKeyField: 'google' },
  { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview 04-17', company: 'google', 
    cardColor: '#2563EB', accentColor: '#1D4ED8', textColor: '#FFFFFF', 
    apiKeyField: 'google' },
  { id: 'gemini-2.5-flash-lite-preview-06-17', name: 'Gemini 2.5 Flash-Lite Preview 06-17', company: 'google', 
    cardColor: '#60A5FA', accentColor: '#3B82F6', textColor: '#1E3A8A', 
    apiKeyField: 'google' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', company: 'google', 
    cardColor: '#1D4ED8', accentColor: '#1E40AF', textColor: '#FFFFFF', 
    apiKeyField: 'google' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', company: 'google', 
    cardColor: '#93C5FD', accentColor: '#60A5FA', textColor: '#1E3A8A', 
    apiKeyField: 'google' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', company: 'google', 
    cardColor: '#BFDBFE', accentColor: '#93C5FD', textColor: '#1E40AF', 
    apiKeyField: 'google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', company: 'google', 
    cardColor: '#DBEAFE', accentColor: '#BFDBFE', textColor: '#1E40AF', 
    apiKeyField: 'google' },
  
  // Anthropic Models (Orange theme)
  { id: 'claude-opus-4', name: 'Claude Opus 4', company: 'anthropic', 
    cardColor: '#7C2D12', accentColor: '#92400E', textColor: '#FFFFFF', 
    apiKeyField: 'anthropic' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', company: 'anthropic', 
    cardColor: '#92400E', accentColor: '#B45309', textColor: '#FFFFFF', 
    apiKeyField: 'anthropic' },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', company: 'anthropic', 
    cardColor: '#D97706', accentColor: '#F59E0B', textColor: '#FFFFFF', 
    apiKeyField: 'anthropic' },
  { id: 'claude-3-5-sonnet-v2', name: 'Claude 3.5 Sonnet v2', company: 'anthropic', 
    cardColor: '#F59E0B', accentColor: '#FBBF24', textColor: '#7C2D12', 
    apiKeyField: 'anthropic' },
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

const ANTHROPIC_LOGO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 15.87 15.47' width='16' height='16'%3E%3Cpath d='M5.824605464935303,9.348296165466309 C5.824605464935303,9.348296165466309 7.93500280380249,3.911694288253784 7.93500280380249,3.911694288253784 C7.93500280380249,3.911694288253784 10.045400619506836,9.348296165466309 10.045400619506836,9.348296165466309 C10.045400619506836,9.348296165466309 5.824605464935303,9.348296165466309 5.824605464935303,9.348296165466309 C5.824605464935303,9.348296165466309 5.824605464935303,9.348296165466309 5.824605464935303,9.348296165466309z M6.166755199432373,0 C6.166755199432373,0 0,15.470022201538086 0,15.470022201538086 C0,15.470022201538086 3.4480772018432617,15.470022201538086 3.4480772018432617,15.470022201538086 C3.4480772018432617,15.470022201538086 4.709278583526611,12.22130012512207 4.709278583526611,12.22130012512207 C4.709278583526611,12.22130012512207 11.16093635559082,12.22130012512207 11.16093635559082,12.22130012512207 C11.16093635559082,12.22130012512207 12.421928405761719,15.470022201538086 12.421928405761719,15.470022201538086 C12.421928405761719,15.470022201538086 15.87000560760498,15.470022201538086 15.87000560760498,15.470022201538086 C15.87000560760498,15.470022201538086 9.703250885009766,0 9.703250885009766,0 C9.703250885009766,0 6.166755199432373,0 6.166755199432373,0 C6.166755199432373,0 6.166755199432373,0 6.166755199432373,0z' fill='currentColor'/%3E%3C/svg%3E";

const OPENAI_LOGO = "data:image/svg+xml,%3Csvg fill='currentColor' width='16' height='16' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z'/%3E%3C/svg%3E";

const GOOGLE_LOGO = "data:image/svg+xml,%3Csvg fill='currentColor' width='16' height='16' viewBox='0 0 210 210' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,105C0,47.103,47.103,0,105,0c23.383,0,45.515,7.523,64.004,21.756l-24.4,31.696C133.172,44.652,119.477,40,105,40c-35.841,0-65,29.159-65,65s29.159,65,65,65c28.867,0,53.398-18.913,61.852-45H105V85h105v20c0,57.897-47.103,105-105,105S0,162.897,0,105z'/%3E%3C/svg%3E";

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

// File processing functions
const processFile = async (file: File): Promise<string> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const fileType = file.type;

  try {
    switch (fileExtension) {
      case 'pdf':
        return await processPDFWithBackend(file);
      case 'docx':
        return await processWordDocument(file);
      case 'xlsx':
      case 'xls':
        return await processExcelFile(file);
      case 'csv':
        return await processCSVFile(file);
      case 'html':
      case 'htm':
        return await processHTMLFile(file);
      case 'json':
        return await processJSONFile(file);
      case 'txt':
      case 'md':
        return await processTextFile(file);
      default:
        // Try to process as text if it's a text-based file
        if (fileType.startsWith('text/')) {
          return await processTextFile(file);
        }
        throw new Error(`Unsupported file type: ${fileExtension || fileType}`);
    }
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error(`Failed to process ${fileExtension?.toUpperCase()} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const processPDFWithBackend = async (file: File): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('pdf', file);
    
    console.log(`📤 Uploading PDF to backend: ${file.name}`);
    
    const response = await fetch('http://localhost:5000/api/upload-pdf', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to process PDF');
    }
    
    const result = await response.json();
    console.log(`✅ PDF processed successfully: ${result.pageCount} pages, ${result.characterCount} characters`);
    
    return result.text;
    
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const processWordDocument = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const processExcelFile = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = read(arrayBuffer);
  let fullText = '';

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const csv = utils.sheet_to_csv(worksheet);
    fullText += `Sheet: ${sheetName}\n${csv}\n\n`;
  });

  return fullText.trim();
};

const processCSVFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results: any) => {
        const csv = results.data
          .map((row: any) => Array.isArray(row) ? row.join(', ') : '')
          .join('\n');
        resolve(csv);
      },
      error: (error: any) => reject(error)
    });
  });
};

const processHTMLFile = async (file: File): Promise<string> => {
  const text = await file.text();
  // Remove HTML tags and decode entities
  const div = document.createElement('div');
  div.innerHTML = text;
  return div.textContent || div.innerText || '';
};

const processJSONFile = async (file: File): Promise<string> => {
  const text = await file.text();
  try {
    const json = JSON.parse(text);
    return JSON.stringify(json, null, 2);
  } catch {
    return text; // Return as-is if not valid JSON
  }
};

const processTextFile = async (file: File): Promise<string> => {
  return await file.text();
};

function App() {
  const [socket, setSocket] = useState<any>(null);
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

  // Auto-generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatorModel, setGeneratorModel] = useState('gpt-4');
  const [wordCount, setWordCount] = useState(1000);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [topic, setTopic] = useState('');

  // Modal state for expanded response view
  const [modalOpen, setModalOpen] = useState(false);
  const [modalResult, setModalResult] = useState<NeedleTestResult | null>(null);
  const [modalModel, setModalModel] = useState<AIModel | null>(null);

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

    newSocketInstance.on('apiKeySet', ({ provider, success, sessionId: returnedSessionId }: { provider: string, success: boolean, sessionId: string }) => {
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

    newSocketInstance.on('needleTestError', ({ modelId, error }: { modelId: string, error: string }) => {
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

    newSocketInstance.on('error', ({ message }: { message: string }) => {
      setError(message);
      // Also reset generating state if there's a general error
      setIsGenerating(false);
    });

    newSocketInstance.on('testContentGenerated', ({ haystack, needle, exactMatch, success, error }: { haystack: string, needle: string, exactMatch: string, success: boolean, error?: string }) => {
      console.log('📥 Received testContentGenerated event:', {
        haystackLength: haystack?.length,
        needleLength: needle?.length,
        exactMatchLength: exactMatch?.length,
        success,
        error
      });
      
      // Always reset generating state
      setIsGenerating(false);
      
      if (success) {
        console.log('✅ Setting haystack, needle, and exactMatch fields');
        console.log('📝 Haystack preview:', haystack?.substring(0, 100) + '...');
        console.log('🎯 Needle:', needle);
        console.log('🔍 Exact match:', exactMatch);
        
        setHaystack(haystack);
        setNeedle(needle);
        setExactMatch(exactMatch);
        setSuccess(`Test content generated successfully! (${haystack.length.toLocaleString()} characters)`);
        console.log('✅ All fields updated successfully');
      } else {
        console.error('❌ Test generation failed:', error);
        setError(`Failed to generate test content: ${error}`);
      }
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

  const handleApiKeyChange = (provider: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
  };

  const saveApiKey = (provider: keyof ApiKeys) => {
    if (socket && apiKeys[provider]) {
      socket.emit('setApiKey', { provider, apiKey: apiKeys[provider] });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setError(null);
      setSuccess(`Processing ${file.name}...`);
      
      try {
        const content = await processFile(file);
        setHaystack(content);
        setSuccess(`Successfully processed ${file.name} (${content.length.toLocaleString()} characters)`);
      } catch (error) {
        setError(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setUploadedFile(null);
      }
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

  // Function to check exact match (replicated from server logic)
  const checkExactMatch = (response: string, exactMatch: string): boolean => {
    if (!response || !exactMatch) {
      return false;
    }

    const cleanResponse = response.trim();
    const cleanExactMatch = exactMatch.trim();

    if (!cleanResponse || !cleanExactMatch) {
      return false;
    }

    const responseLower = cleanResponse.toLowerCase();
    const exactMatchLower = cleanExactMatch.toLowerCase();

    // Strategy 1: Word boundary match (case-insensitive)
    const wordBoundaryRegex = new RegExp(`\\b${exactMatchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const hasWordBoundary = wordBoundaryRegex.test(responseLower);

    // Strategy 2: Exact case-sensitive match
    const hasExactCase = cleanResponse.includes(cleanExactMatch);

    // Final result: word boundary OR exact case match (matches server logic)
    return hasWordBoundary || hasExactCase;
  };

  // Function to recheck exact matches for all existing responses
  const recheckExactMatches = () => {
    if (!exactMatch.trim()) {
      setError('Please provide exact match text to recheck against');
      return;
    }

    let recheckCount = 0;
    setModelStates(prev => {
      const newStates = new Map(prev);
      
      selectedModelsToShow.forEach(modelId => {
        const state = newStates.get(modelId);
        if (state && state.result && state.result.response) {
          // Re-evaluate the existing response against the current exact match text
          const foundNeedle = checkExactMatch(state.result.response, exactMatch.trim());
          
          newStates.set(modelId, {
            ...state,
            result: {
              ...state.result,
              foundNeedle
            }
          });
          recheckCount++;
        }
      });
      
      return newStates;
    });

    if (recheckCount > 0) {
      setSuccess(`Rechecked ${recheckCount} responses against new exact match criteria`);
    } else {
      setError('No existing responses found to recheck. Run a needle test first.');
    }
  };

  const generateTest = async () => {
    if (!socket) {
      setError('Not connected to server');
      return;
    }

    console.log('🚀 Starting test generation with parameters:', {
      model: generatorModel,
      wordCount,
      difficulty,
      topic: topic.trim() || 'general knowledge'
    });

    setIsGenerating(true);
    setError(null);
    setSuccess('Generating test content...');

    // Set a timeout to reset generating state after 60 seconds
    const timeoutId = setTimeout(() => {
      console.log('⏰ Test generation timeout - resetting state');
      setIsGenerating(false);
      setError('Test generation timed out. Please try again.');
    }, 60000); // 60 seconds timeout

    try {
      // Emit request to generate test content
      const requestData = {
        model: generatorModel,
        wordCount,
        difficulty,
        topic: topic.trim() || 'general knowledge'
      };
      
      console.log('📤 Emitting generateTestContent with:', requestData);
      socket.emit('generateTestContent', requestData);
      console.log('✅ Event emitted successfully');
      
      // Store the timeout ID to clear it when we receive a response
      socket.once('testContentGenerated', () => {
        clearTimeout(timeoutId);
      });
      
    } catch (error) {
      console.error('❌ Error in generateTest:', error);
      clearTimeout(timeoutId);
      setError(`Failed to generate test: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  const getCompanyIcon = (company: string): React.ReactNode => {
    if (company === 'anthropic') {
      return <img src={ANTHROPIC_LOGO} alt="Anthropic" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />;
    }
    
    if (company === 'openai') {
      return <img src={OPENAI_LOGO} alt="OpenAI" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />;
    }
    
    if (company === 'google') {
      return <img src={GOOGLE_LOGO} alt="Google" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />;
    }
    
    return '●';
  };

  // Modal functions
  const openModal = (result: NeedleTestResult, model: AIModel) => {
    setModalResult(result);
    setModalModel(model);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalResult(null);
    setModalModel(null);
  };

  // Handle keyboard shortcuts for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalOpen) {
        closeModal();
      }
    };

    if (modalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen]);

  return (
    <div className="terminal-container">
          {/* Header */}
      <div className="pixel-border" style={{ padding: '20px', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '10px', textAlign: 'center', fontWeight: 'bold' }}>
          🚜 HAY IS FOR LLMS 🌾
        </h1>
        <p style={{ textAlign: 'center', margin: '0 0 8px 0', fontSize: '18px', opacity: 0.8 }}>
          👨‍🌾 Test multiple AI language models' ability to find needles in haystacks of information 🔍
        </p>
        <div style={{ textAlign: 'center', fontSize: '14px', opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>🏗️ Testing AI models from:</span>
          <img src={OPENAI_LOGO} alt="OpenAI" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />
          <span style={{ fontSize: '12px' }}>OpenAI</span>
          <img src={GOOGLE_LOGO} alt="Google" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />
          <span style={{ fontSize: '12px' }}>Google</span>
          <img src={ANTHROPIC_LOGO} alt="Anthropic" style={{ width: '16px', height: '16px', verticalAlign: 'middle' }} />
          <span style={{ fontSize: '12px' }}>Anthropic</span>
          <span>🌽</span>
        </div>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        {/* Haystack Input */}
        <div className="pixel-border" style={{ padding: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <img src={HAYSTACK_IMAGE} alt="Haystack" style={{ width: '30px', height: '30px', marginRight: '10px' }} />
            <h2 style={{ fontSize: '18px', margin: 0 }}>HAYSTACK</h2>
          </div>
          <textarea
            className="terminal-input"
            style={{ width: '100%', height: '100px', resize: 'vertical' }}
            placeholder="Paste your text here or upload a file (Word, Excel, CSV, etc.)..."
            value={haystack}
            onChange={(e) => setHaystack(e.target.value)}
          />
          <div style={{ marginTop: '10px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept=".txt,.md,.json,.csv,.docx,.xlsx,.xls,.html,.htm,.pdf"
            />
            <button
              className="farm-button"
              style={{ fontSize: '18px', padding: '8px 16px' }}
              onClick={() => fileInputRef.current?.click()}
            >
              UPLOAD FILE
            </button>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px' }}>
              📁 Supports: PDF, Word, Excel, CSV, HTML, TXT, JSON, MD
            </div>
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
          <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '5px', marginBottom: '10px' }}>
            💡 Use specific phrases, numbers, or regulations for accurate detection
          </div>
          <button
            className="farm-button"
            style={{ width: '100%', fontSize: '16px', padding: '8px' }}
            onClick={recheckExactMatches}
            disabled={isTestRunning || !exactMatch.trim()}
            title="Re-evaluate existing responses against the current exact match text without running new tests"
          >
            🔄 RECHECK MATCHES
          </button>
          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '5px', textAlign: 'center' }}>
            ⚡ Test different exact match criteria against existing responses
          </div>
        </div>

        {/* Auto-Generate Test Input */}
        <div className="pixel-border" style={{ padding: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '24px', marginRight: '10px' }}>🤖</span>
            <h2 style={{ fontSize: '18px', margin: 0 }}>AUTO-GENERATE TEST</h2>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>
              GENERATOR MODEL:
            </label>
            <select
              className="terminal-input"
              style={{ width: '100%', fontSize: '12px' }}
              value={generatorModel}
              onChange={(e) => setGeneratorModel(e.target.value)}
            >
              <optgroup label="OpenAI">
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </optgroup>
              <optgroup label="Google">
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              </optgroup>
              <optgroup label="Anthropic">
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
              </optgroup>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>
              WORD COUNT: {wordCount}
            </label>
            <input
              type="range"
              min="500"
              max="5000"
              step="250"
              value={wordCount}
              onChange={(e) => setWordCount(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>
              DIFFICULTY:
            </label>
            <select
              className="terminal-input"
              style={{ width: '100%', fontSize: '12px' }}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="elementary">Elementary</option>
              <option value="high-school">High School</option>
              <option value="undergraduate">Undergraduate</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
              <option value="phd">PhD Level</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              className="terminal-input"
              style={{ width: '100%', fontSize: '12px' }}
              placeholder="Topic (optional, e.g., 'science', 'history')..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <button
            className="farm-button"
            style={{ width: '100%', fontSize: '14px', padding: '8px' }}
            onClick={generateTest}
            disabled={isGenerating}
          >
            {isGenerating ? 'GENERATING...' : 'GENERATE TEST'}
          </button>
          
          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '5px', textAlign: 'center' }}>
            🎯 Creates haystack, needle &amp; exact match
          </div>
        </div>
      </div>

      {/* Run Test Button */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button
          className="farm-button"
          style={{ fontSize: '24px', padding: '15px 30px' }}
          onClick={runNeedleTest}
          disabled={isTestRunning || !haystack.trim() || !needle.trim() || !exactMatch.trim()}
        >
          {isTestRunning ? 'RUNNING TESTS...' : 'RUN NEEDLE TEST'}
        </button>
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
              style={{ fontSize: '14px', padding: '4px 8px', marginRight: '6px' }}
              onClick={() => setSelectedModelsToShow(AI_MODELS.map(m => m.id))}
            >
              ALL
            </button>
            <button
              className="farm-button"
              style={{ fontSize: '14px', padding: '4px 8px', marginRight: '10px' }}
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
        <div style={{ marginTop: '15px' }}>
          {/* Group models by company */}
          {['openai', 'google', 'anthropic'].map(company => {
            const companyModels = AI_MODELS.filter(model => model.company === company);
            const companyName = company === 'openai' ? 'OpenAI' : company === 'google' ? 'Google' : 'Anthropic';
            const companyIcon = getCompanyIcon(company);

              return (
              <div key={company} style={{ marginBottom: '20px' }}>
                  <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <h4 style={{ 
                    fontSize: '14px',
                    margin: 0, 
                    color: '#8B4513',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '18px' }}>{companyIcon}</span>
                    {companyName.toUpperCase()} MODELS
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>({companyModels.length})</span>
                  </h4>
                  <div>
                    <button
                      className="farm-button"
                      style={{ fontSize: '12px', padding: '2px 6px', marginRight: '4px' }}
                      onClick={() => {
                        const companyModelIds = companyModels.map(m => m.id);
                        const combined = [...selectedModelsToShow, ...companyModelIds];
                        const uniqueModels = combined.filter((id, index) => combined.indexOf(id) === index);
                        setSelectedModelsToShow(uniqueModels);
                      }}
                    >
                      ALL {companyIcon}
                    </button>
                    <button
                      className="farm-button"
                      style={{ fontSize: '12px', padding: '2px 6px' }}
                      onClick={() => {
                        const companyModelIds = companyModels.map(m => m.id);
                        setSelectedModelsToShow(selectedModelsToShow.filter(id => !companyModelIds.includes(id)));
                      }}
                    >
                      NONE
                    </button>
                  </div>
                  </div>
                  <div style={{ 
                  height: '2px',
                  backgroundColor: '#8B4513',
                  marginBottom: '10px'
                }}></div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: '8px',
                  marginLeft: '10px'
                }}>
                  {companyModels.map(model => (
                    <label key={model.id} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: selectedModelsToShow.includes(model.id) ? 'rgba(139, 69, 19, 0.1)' : 'transparent',
                      border: selectedModelsToShow.includes(model.id) ? '1px solid rgba(139, 69, 19, 0.3)' : '1px solid transparent'
                    }}>
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
                      <span style={{ fontSize: '14px' }}>
                        {model.name}
                      </span>
                    </label>
                  ))}
                  </div>
                </div>
              );
            })}
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
                  <div 
                    style={{ 
                      width: '100%',
                      cursor: 'pointer',
                      padding: '5px',
                      margin: '-5px',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => openModal(state.result!, model)}
                    title="Click anywhere to view full response"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(139, 69, 19, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
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
                  <div 
                    style={{ 
                      padding: '10px',
                      background: 'var(--farm-dark-beige)',
                      border: '2px solid var(--farm-green)',
                      maxHeight: '120px',
                      overflowY: 'auto',
                      fontSize: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(state.result!, model);
                    }}
                    title="Click to view full response in larger window"
                    onMouseEnter={(e) => e.currentTarget.style.border = '2px solid var(--farm-brown)'}
                    onMouseLeave={(e) => e.currentTarget.style.border = '2px solid var(--farm-green)'}
                  >
                      {state.result.response}
                      <div style={{
                        position: 'absolute',
                        bottom: '5px',
                        right: '5px',
                        fontSize: '12px',
                        opacity: 0.6,
                        background: 'var(--farm-beige)',
                        padding: '2px 4px',
                        borderRadius: '2px'
                      }}>
                        🔍 Click to expand
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        className="farm-button"
                        style={{ fontSize: '14px', padding: '4px 8px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyResponse(state.result!.response);
                        }}
                      >
                        COPY
                      </button>
                      <button
                        className="farm-button"
                        style={{ fontSize: '14px', padding: '4px 8px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(state.result!, model);
                        }}
                      >
                        📖 VIEW FULL
                      </button>
                    </div>
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

      {/* Response Modal */}
      {modalOpen && modalResult && modalModel && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }} onClick={closeModal}>
          <div className="pixel-border" style={{
            background: 'var(--farm-beige)',
            padding: '20px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '100%',
            height: 'auto',
            overflowY: 'auto',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '3px solid var(--farm-green)',
              paddingBottom: '15px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  {getCompanyIcon(modalModel.company)}
                  <h2 style={{ fontSize: '24px', margin: 0 }}>{modalModel.name}</h2>
                </div>
                <div className={modalResult.foundNeedle ? 'status-found' : 'status-not-found'} style={{ 
                  fontSize: '18px',
                  padding: '8px 12px',
                  display: 'inline-block'
                }}>
                  {modalResult.foundNeedle ? '✓ EXACT MATCH FOUND!' : '✗ EXACT MATCH NOT FOUND'}
                </div>
              </div>
              <button
                className="farm-button"
                style={{ fontSize: '24px', padding: '8px 12px', minWidth: '50px' }}
                onClick={closeModal}
                title="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Metrics */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
              gap: '15px',
              marginBottom: '20px',
              padding: '15px',
              background: 'var(--farm-dark-beige)',
              border: '2px solid var(--farm-green)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>RESPONSE TIME</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>⏱️ {modalResult.responseTime}ms</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>WORD COUNT</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>📝 {modalResult.wordCount || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>CHARACTERS</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>📏 {modalResult.characterCount || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>SENTENCES</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>🔤 {modalResult.sentenceCount || 0}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>READING TIME</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>📖 ~{modalResult.readingTime || 0} min</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>TIMESTAMP</div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                  {new Date(modalResult.timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Modal Response Content */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>📝 MODEL RESPONSE:</h3>
              <div style={{ 
                padding: '20px',
                background: 'var(--farm-dark-beige)',
                border: '3px solid var(--farm-green)',
                fontSize: '16px',
                lineHeight: '1.6',
                textAlign: 'left',
                maxHeight: '50vh',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {modalResult.response}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'center',
              borderTop: '2px solid var(--farm-green)',
              paddingTop: '15px'
            }}>
              <button
                className="farm-button"
                style={{ fontSize: '16px', padding: '10px 20px' }}
                onClick={() => copyResponse(modalResult.response)}
              >
                📋 COPY RESPONSE
              </button>
              <button
                className="farm-button"
                style={{ fontSize: '16px', padding: '10px 20px' }}
                onClick={closeModal}
              >
                ✕ CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 