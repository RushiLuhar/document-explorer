import { create } from 'zustand';
import type { QAResponse, WebSearchResult } from '../types';

interface Message {
  id: string;
  type: 'question' | 'answer';
  content: string;
  sourceNodes?: string[];
  confidence?: number;
  timestamp: Date;
}

interface QAState {
  messages: Message[];
  addQuestion: (question: string) => string;
  addAnswer: (questionId: string, response: QAResponse) => void;

  isAsking: boolean;
  setIsAsking: (asking: boolean) => void;

  // Web search results
  searchResults: WebSearchResult[];
  setSearchResults: (results: WebSearchResult[]) => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;

  // Panel visibility
  isPanelOpen: boolean;
  togglePanel: () => void;
  setIsPanelOpen: (open: boolean) => void;

  clear: () => void;
}

export const useQAStore = create<QAState>((set) => ({
  messages: [],

  addQuestion: (question) => {
    const id = crypto.randomUUID();
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          type: 'question',
          content: question,
          timestamp: new Date(),
        },
      ],
    }));
    return id;
  },

  addAnswer: (_questionId, response) => {
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          type: 'answer',
          content: response.answer,
          sourceNodes: response.source_nodes,
          confidence: response.confidence,
          timestamp: new Date(),
        },
      ],
    }));
  },

  isAsking: false,
  setIsAsking: (asking) => set({ isAsking: asking }),

  searchResults: [],
  setSearchResults: (results) => set({ searchResults: results }),
  isSearching: false,
  setIsSearching: (searching) => set({ isSearching: searching }),

  isPanelOpen: false,
  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
  setIsPanelOpen: (open) => set({ isPanelOpen: open }),

  clear: () =>
    set({
      messages: [],
      searchResults: [],
      isAsking: false,
      isSearching: false,
    }),
}));
