import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { uploadDocument, getDocumentStatus } from '../services/api';
import { useMindMapStore } from '../store/mindMapStore';
import type { Document } from '../types';

export function useDocumentUpload() {
  const [uploadedDocument, setUploadedDocument] = useState<Document | null>(null);
  const { setDocument } = useMindMapStore();

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: (document) => {
      setUploadedDocument(document);
    },
  });

  // Poll for status when pending or processing
  const { data: status } = useQuery({
    queryKey: ['documentStatus', uploadedDocument?.id],
    queryFn: () => getDocumentStatus(uploadedDocument!.id),
    enabled: !!uploadedDocument && (uploadedDocument.status === 'pending' || uploadedDocument.status === 'processing'),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });

  // Update document when status changes
  if (status?.status === 'completed' && uploadedDocument) {
    setDocument({ ...uploadedDocument, status: 'completed' });
  }

  const handleUpload = useCallback(
    async (file: File) => {
      await uploadMutation.mutateAsync(file);
    },
    [uploadMutation]
  );

  return {
    uploadedDocument,
    status: status || uploadedDocument,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
    handleUpload,
  };
}
