import { useCallback, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentUpload } from '../../hooks/useDocumentUpload';

interface DocumentUploadProps {
  onDocumentReady: (documentId: string, contentHash?: string) => void;
  onBack?: () => void;
}

export function DocumentUpload({ onDocumentReady, onBack }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { uploadedDocument, status, isUploading, uploadError, handleUpload } =
    useDocumentUpload();

  // Track if we've already called onDocumentReady to prevent multiple calls
  const hasCalledOnReady = useRef(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const pdfFile = files.find((f) => f.type === 'application/pdf');
      if (pdfFile) {
        handleUpload(pdfFile);
      }
    },
    [handleUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  // Handle document ready in useEffect to avoid side effects during render
  useEffect(() => {
    if (status?.status === 'completed' && uploadedDocument && !hasCalledOnReady.current) {
      hasCalledOnReady.current = true;
      onDocumentReady(uploadedDocument.id);
    }
  }, [status?.status, uploadedDocument, onDocumentReady]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Documents
          </button>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {onBack ? 'Upload New Document' : 'Document Explorer'}
          </h1>
          <p className="text-slate-600">
            {onBack
              ? 'Add another document to explore'
              : 'Transform documents into interactive mind-maps'}
          </p>
        </div>

        {/* Upload area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-xl p-12
            transition-all duration-200 cursor-pointer
            ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            }
            ${isUploading ? 'pointer-events-none' : ''}
          `}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />

          <div className="text-center">
            <AnimatePresence mode="wait">
              {isUploading || status?.status === 'pending' || status?.status === 'processing' ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">
                    {status?.status === 'processing'
                      ? 'Analyzing document structure...'
                      : status?.status === 'pending'
                        ? 'Starting document analysis...'
                        : 'Uploading...'}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    This may take a moment for larger documents
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <svg
                    className="w-16 h-16 text-slate-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-slate-600 font-medium mb-2">
                    Drop a PDF here or click to upload
                  </p>
                  <p className="text-sm text-slate-500">
                    Supports PDF documents up to 50MB
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Error message */}
        {(uploadError || status?.status === 'failed') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-red-700 text-sm">
              {status?.error_message ||
                (uploadError instanceof Error
                  ? uploadError.message
                  : 'Upload failed')}
            </p>
          </motion.div>
        )}

        {/* Sample document hint */}
        {!onBack && (
          <p className="text-center text-sm text-slate-500 mt-6">
            Try uploading "claudes-constitution.pdf" to explore Claude's values
          </p>
        )}
      </motion.div>
    </div>
  );
}
