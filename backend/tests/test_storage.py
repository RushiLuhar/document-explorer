"""
Tests for the document storage service.

Includes security tests for path traversal prevention.
"""

import tempfile
from pathlib import Path

import pytest

from app.services.storage import DocumentStorage


@pytest.fixture
def temp_storage():
    """Create a temporary storage instance for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = DocumentStorage(documents_dir=Path(tmpdir))
        yield storage


class TestContentHashValidation:
    """Tests for content hash validation and path traversal prevention."""

    def test_valid_content_hash_accepted(self, temp_storage):
        """Valid 16-character hex hash should be accepted."""
        valid_hash = "a1b2c3d4e5f67890"
        # Should not raise
        folder = temp_storage._get_document_folder(valid_hash)
        assert folder.name == valid_hash

    def test_valid_content_hash_all_digits(self, temp_storage):
        """Hash with all digits should be accepted."""
        valid_hash = "1234567890123456"
        folder = temp_storage._get_document_folder(valid_hash)
        assert folder.name == valid_hash

    def test_valid_content_hash_all_letters(self, temp_storage):
        """Hash with all lowercase letters a-f should be accepted."""
        valid_hash = "abcdefabcdefabcd"
        folder = temp_storage._get_document_folder(valid_hash)
        assert folder.name == valid_hash

    def test_path_traversal_rejected(self, temp_storage):
        """Path traversal sequences should be rejected."""
        malicious_hashes = [
            "../../../etc/passwd",
            "..%2F..%2F..%2Fetc%2Fpasswd",
            "a1b2c3d4/../../../etc",
            "../a1b2c3d4e5f67890",
            "a1b2c3d4e5f67890/..",
        ]
        for malicious_hash in malicious_hashes:
            with pytest.raises(ValueError, match="Invalid content hash format"):
                temp_storage._get_document_folder(malicious_hash)

    def test_uppercase_hex_rejected(self, temp_storage):
        """Uppercase hex characters should be rejected (we use lowercase)."""
        with pytest.raises(ValueError, match="Invalid content hash format"):
            temp_storage._get_document_folder("A1B2C3D4E5F67890")

    def test_too_short_hash_rejected(self, temp_storage):
        """Hash shorter than 16 characters should be rejected."""
        with pytest.raises(ValueError, match="Invalid content hash format"):
            temp_storage._get_document_folder("a1b2c3d4")

    def test_too_long_hash_rejected(self, temp_storage):
        """Hash longer than 16 characters should be rejected."""
        with pytest.raises(ValueError, match="Invalid content hash format"):
            temp_storage._get_document_folder("a1b2c3d4e5f678901234")

    def test_empty_hash_rejected(self, temp_storage):
        """Empty string should be rejected."""
        with pytest.raises(ValueError, match="Invalid content hash format"):
            temp_storage._get_document_folder("")

    def test_special_characters_rejected(self, temp_storage):
        """Special characters should be rejected."""
        special_chars = [
            "a1b2c3d4e5f6789!",
            "a1b2c3d4e5f6789/",
            "a1b2c3d4e5f6789\\",
            "a1b2c3d4e5f6789.",
            "a1b2c3d4 5f67890",
        ]
        for invalid_hash in special_chars:
            with pytest.raises(ValueError, match="Invalid content hash format"):
                temp_storage._get_document_folder(invalid_hash)

    def test_non_hex_letters_rejected(self, temp_storage):
        """Letters outside a-f should be rejected."""
        with pytest.raises(ValueError, match="Invalid content hash format"):
            temp_storage._get_document_folder("ghijklmnopqrstuv")

    def test_null_bytes_rejected(self, temp_storage):
        """Null bytes should be rejected."""
        with pytest.raises(ValueError, match="Invalid content hash format"):
            temp_storage._get_document_folder("a1b2c3d4\x00e5f678")


class TestDocumentExists:
    """Tests for document_exists method with hash validation."""

    def test_document_exists_validates_hash(self, temp_storage):
        """document_exists should validate hash before checking filesystem."""
        with pytest.raises(ValueError, match="Invalid content hash format"):
            temp_storage.document_exists("../../../etc/passwd")

    def test_document_exists_returns_false_for_valid_nonexistent(self, temp_storage):
        """document_exists should return False for valid but nonexistent hash."""
        assert temp_storage.document_exists("a1b2c3d4e5f67890") is False


class TestComputeContentHash:
    """Tests for compute_content_hash method."""

    def test_compute_hash_returns_valid_format(self, temp_storage):
        """Computed hash should be 16 lowercase hex characters."""
        with tempfile.NamedTemporaryFile(delete=False) as f:
            f.write(b"test content")
            f.flush()

            content_hash = temp_storage.compute_content_hash(Path(f.name))

            # Should be exactly 16 characters
            assert len(content_hash) == 16
            # Should be lowercase hex
            assert content_hash == content_hash.lower()
            assert all(c in "0123456789abcdef" for c in content_hash)

            # Clean up
            Path(f.name).unlink()

    def test_same_content_same_hash(self, temp_storage):
        """Same content should produce same hash."""
        content = b"identical content"

        with tempfile.NamedTemporaryFile(delete=False) as f1:
            f1.write(content)
            f1.flush()
            hash1 = temp_storage.compute_content_hash(Path(f1.name))
            Path(f1.name).unlink()

        with tempfile.NamedTemporaryFile(delete=False) as f2:
            f2.write(content)
            f2.flush()
            hash2 = temp_storage.compute_content_hash(Path(f2.name))
            Path(f2.name).unlink()

        assert hash1 == hash2

    def test_different_content_different_hash(self, temp_storage):
        """Different content should produce different hash."""
        with tempfile.NamedTemporaryFile(delete=False) as f1:
            f1.write(b"content one")
            f1.flush()
            hash1 = temp_storage.compute_content_hash(Path(f1.name))
            Path(f1.name).unlink()

        with tempfile.NamedTemporaryFile(delete=False) as f2:
            f2.write(b"content two")
            f2.flush()
            hash2 = temp_storage.compute_content_hash(Path(f2.name))
            Path(f2.name).unlink()

        assert hash1 != hash2
