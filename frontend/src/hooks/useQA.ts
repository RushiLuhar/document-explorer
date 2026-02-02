import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askQuestion, searchWeb } from '../services/api';
import { useQAStore } from '../store/qaStore';
import { useMindMapStore } from '../store/mindMapStore';

export function useQA() {
  // Use individual selectors to prevent unnecessary re-renders
  const document = useMindMapStore((state) => state.document);
  const selectedNodeId = useMindMapStore((state) => state.selectedNodeId);

  // QA store - use individual selectors
  const messages = useQAStore((state) => state.messages);
  const isAsking = useQAStore((state) => state.isAsking);
  const searchResults = useQAStore((state) => state.searchResults);
  const isSearching = useQAStore((state) => state.isSearching);
  const isPanelOpen = useQAStore((state) => state.isPanelOpen);

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!document) throw new Error('No document loaded');

      const questionId = useQAStore.getState().addQuestion(question);
      useQAStore.getState().setIsAsking(true);

      const response = await askQuestion(document.id, {
        question,
        context_node_id: selectedNodeId || undefined,
      });

      return { questionId, response };
    },
    onSuccess: ({ questionId, response }) => {
      useQAStore.getState().addAnswer(questionId, response);
      useQAStore.getState().setIsAsking(false);
    },
    onError: () => {
      useQAStore.getState().setIsAsking(false);
    },
  });

  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      useQAStore.getState().setIsSearching(true);
      const response = await searchWeb(query);
      return response;
    },
    onSuccess: (response) => {
      useQAStore.getState().setSearchResults(response.results);
      useQAStore.getState().setIsSearching(false);
    },
    onError: () => {
      useQAStore.getState().setIsSearching(false);
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

  const togglePanel = useCallback(() => {
    useQAStore.getState().togglePanel();
  }, []);

  const setIsPanelOpen = useCallback((open: boolean) => {
    useQAStore.getState().setIsPanelOpen(open);
  }, []);

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
