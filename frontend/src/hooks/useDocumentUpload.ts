import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { uploadDocument, getDocumentStatus } from '../services/api';
import { useMindMapStore } from '../store/mindMapStore';
import type { Document } from '../types';

export function useDocumentUpload() {
  const [uploadedDocument, setUploadedDocument] = useState<Document | null>(null);
  const { setDocument } = useMindMapStore();

  // Track if we've already set the document to prevent multiple calls
  const hasSetDocument = useRef(false);

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: (document) => {
      setUploadedDocument(document);
      // Reset the flag for new uploads
      hasSetDocument.current = false;
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

  // Update document when status changes - use useEffect to avoid side effects during render
  useEffect(() => {
    if (status?.status === 'completed' && uploadedDocument && !hasSetDocument.current) {
      hasSetDocument.current = true;
      setDocument({ ...uploadedDocument, status: 'completed' });
    }
  }, [status?.status, uploadedDocument, setDocument]);

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
