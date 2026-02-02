import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askQuestion, searchWeb } from '../services/api';
import { useQAStore } from '../store/qaStore';
import { useMindMapStore } from '../store/mindMapStore';

export function useQA() {
  const { document, selectedNodeId } = useMindMapStore();
  const {
    messages,
    addQuestion,
    addAnswer,
    isAsking,
    setIsAsking,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching,
    isPanelOpen,
    togglePanel,
    setIsPanelOpen,
  } = useQAStore();

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!document) throw new Error('No document loaded');

      const questionId = addQuestion(question);
      setIsAsking(true);

      const response = await askQuestion(document.id, {
        question,
        context_node_id: selectedNodeId || undefined,
      });

      return { questionId, response };
    },
    onSuccess: ({ questionId, response }) => {
      addAnswer(questionId, response);
      setIsAsking(false);
    },
    onError: () => {
      setIsAsking(false);
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      setIsSearching(true);
      const response = await searchWeb(query);
      return response;
    },
    onSuccess: (response) => {
      setSearchResults(response.results);
      setIsSearching(false);
    },
    onError: () => {
      setIsSearching(false);
    },
  });

  const handleAsk = useCallback(
    (question: string) => {
      askMutation.mutate(question);
    },
    [askMutation]
  );

  const handleSearch = useCallback(
    (query: string) => {
      searchMutation.mutate(query);
    },
    [searchMutation]
  );

  return {
    messages,
    isAsking,
    handleAsk,
    askError: askMutation.error,
    searchResults,
    isSearching,
    handleSearch,
    searchError: searchMutation.error,
    isPanelOpen,
    togglePanel,
    setIsPanelOpen,
  };
}
