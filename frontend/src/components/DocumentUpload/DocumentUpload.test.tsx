/**
 * Test file for DocumentUpload component
 *
 * Bug: Infinite loop when document processing completes
 *
 * Testing Strategy:
 * 1. Mock the useDocumentUpload hook to control status transitions
 * 2. Verify onDocumentReady is called exactly ONCE when status becomes 'completed'
 * 3. Verify no calls happen during initial render or while processing
 *
 * Manual Testing Steps:
 * 1. Start the app with docker-compose up
 * 2. Navigate to upload page
 * 3. Upload a PDF document
 * 4. Open browser DevTools Network tab
 * 5. Watch for document processing to complete
 * 6. BUG: Observe infinite GET /api/v1/documents/ requests
 * 7. FIXED: Should see single transition to mindmap view
 *
 * Automated Test Cases:
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { DocumentUpload } from './DocumentUpload';

// Mock the hook
vi.mock('../../hooks/useDocumentUpload', () => ({
  useDocumentUpload: vi.fn(),
}));

import { useDocumentUpload } from '../../hooks/useDocumentUpload';

const mockUseDocumentUpload = useDocumentUpload as ReturnType<typeof vi.fn>;

describe('DocumentUpload', () => {
  const mockOnDocumentReady = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should NOT call onDocumentReady during initial render', () => {
    mockUseDocumentUpload.mockReturnValue({
      uploadedDocument: null,
      status: null,
      isUploading: false,
      uploadError: null,
      handleUpload: vi.fn(),
    });

    render(<DocumentUpload onDocumentReady={mockOnDocumentReady} />);

    expect(mockOnDocumentReady).not.toHaveBeenCalled();
  });

  it('should NOT call onDocumentReady while processing', () => {
    mockUseDocumentUpload.mockReturnValue({
      uploadedDocument: { id: 'test-id', status: 'processing' },
      status: { status: 'processing' },
      isUploading: false,
      uploadError: null,
      handleUpload: vi.fn(),
    });

    render(<DocumentUpload onDocumentReady={mockOnDocumentReady} />);

    expect(mockOnDocumentReady).not.toHaveBeenCalled();
  });

  it('should call onDocumentReady EXACTLY ONCE when status becomes completed', async () => {
    // Start with processing status
    mockUseDocumentUpload.mockReturnValue({
      uploadedDocument: { id: 'test-id', status: 'processing' },
      status: { status: 'processing' },
      isUploading: false,
      uploadError: null,
      handleUpload: vi.fn(),
    });

    const { rerender } = render(
      <DocumentUpload onDocumentReady={mockOnDocumentReady} />
    );

    expect(mockOnDocumentReady).not.toHaveBeenCalled();

    // Simulate status changing to completed
    mockUseDocumentUpload.mockReturnValue({
      uploadedDocument: { id: 'test-id', status: 'completed' },
      status: { status: 'completed' },
      isUploading: false,
      uploadError: null,
      handleUpload: vi.fn(),
    });

    rerender(<DocumentUpload onDocumentReady={mockOnDocumentReady} />);

    // Should be called exactly once
    await waitFor(() => {
      expect(mockOnDocumentReady).toHaveBeenCalledTimes(1);
      expect(mockOnDocumentReady).toHaveBeenCalledWith('test-id');
    });

    // Simulate multiple re-renders (this is what causes the infinite loop bug)
    rerender(<DocumentUpload onDocumentReady={mockOnDocumentReady} />);
    rerender(<DocumentUpload onDocumentReady={mockOnDocumentReady} />);
    rerender(<DocumentUpload onDocumentReady={mockOnDocumentReady} />);

    // BUG: Without fix, this would be called 4 times (once per render)
    // FIXED: Should still be exactly 1
    expect(mockOnDocumentReady).toHaveBeenCalledTimes(1);
  });

  it('should not cause infinite loop when parent re-renders due to state change', async () => {
    let renderCount = 0;

    mockUseDocumentUpload.mockImplementation(() => {
      renderCount++;
      return {
        uploadedDocument: { id: 'test-id', status: 'completed' },
        status: { status: 'completed' },
        isUploading: false,
        uploadError: null,
        handleUpload: vi.fn(),
      };
    });

    // Simulate what happens when parent calls setDocuments
    const { rerender } = render(
      <DocumentUpload onDocumentReady={mockOnDocumentReady} />
    );

    // Simulate 10 parent re-renders (like from async state updates)
    for (let i = 0; i < 10; i++) {
      rerender(<DocumentUpload onDocumentReady={mockOnDocumentReady} />);
    }

    // onDocumentReady should be called exactly once, not 11 times
    await waitFor(() => {
      expect(mockOnDocumentReady).toHaveBeenCalledTimes(1);
    });
  });
});
