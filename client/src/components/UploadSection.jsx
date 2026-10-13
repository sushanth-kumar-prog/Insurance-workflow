import { useState, useRef } from 'react';
import api from '../api/client';

/**
 * UploadSection — real multipart upload for claim documents.
 *
 * Posts FormData to POST /api/claims/:id/documents, which accepts up to 5 files
 * of 5 MB each (PDF/JPG/PNG/WEBP). Progress is tracked locally; no polling.
 *
 * Props:
 *   claimId        string  Required.
 *   onUploaded     fn      Optional callback after success (e.g. refetch claim).
 */
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp';

export default function UploadSection({ claimId, onUploaded }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle|uploading|success|error
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  function onFileChange(e) {
    const files = Array.from(e.target.files || []);
    setUploadError('');

    if (files.length > MAX_FILES) {
      setUploadError(`You can upload at most ${MAX_FILES} files at a time.`);
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setUploadError(`"${tooBig.name}" is larger than 5 MB.`);
      return;
    }

    setSelectedFiles(files);
    setUploadStatus('idle');
    setUploadProgress(0);
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one file.');
      return;
    }
    setUploadStatus('uploading');
    setUploadError('');
    setUploadProgress(0);

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('documents', file));

    try {
      await api.post(`/claims/${claimId}/documents`, formData, {
        withCredentials: true,
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      setUploadStatus('success');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onUploaded) onUploaded();
    } catch (err) {
      setUploadStatus('error');
      // API returns `error`; validation errors may arrive as `errors`.
      const apiError = err.response?.data?.error;
      const validation = err.response?.data?.errors;
      setUploadError(
        typeof apiError === 'string' ? apiError :
        Array.isArray(validation) ? validation.map((e) => e.msg).join(', ') :
        'Upload failed. Try again.'
      );
    }
  }

  return (
    <div className="border border-dashed border-[#E0ECF8] rounded-xl p-4 space-y-3 bg-[#F7FAFE]">
      <p className="text-sm font-medium text-[#1A2130]">Upload Supporting Documents</p>

      <label className="flex flex-col items-center gap-2 cursor-pointer">
        <div className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0ECF8] rounded-lg text-sm text-[#1A2130] hover:bg-white transition">
          <span>📎</span>
          <span>{selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Choose files…'}</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={onFileChange}
          className="sr-only"
          disabled={uploadStatus === 'uploading'}
        />
        <p className="text-xs text-[#6B7A94]">PDF, JPG, PNG or WEBP · Max 5 MB each · Max 5 files</p>
      </label>

      {selectedFiles.length > 0 && (
        <ul className="text-xs text-[#6B7A94] space-y-0.5">
          {selectedFiles.map((f, i) => (
            <li key={i} className="flex items-center gap-1">
              <span>📄</span>
              <span className="truncate max-w-xs">{f.name}</span>
              <span className="text-slate-600 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
            </li>
          ))}
        </ul>
      )}

      {uploadStatus === 'uploading' && (
        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {uploadStatus === 'success' && (
        <p className="text-[#15803D] text-sm">✅ Documents uploaded successfully.</p>
      )}
      {uploadError && (
        <p className="text-[#B91C1C] text-sm">⚠ {uploadError}</p>
      )}

      <button
        onClick={handleUpload}
        disabled={uploadStatus === 'uploading' || selectedFiles.length === 0}
        className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploadStatus === 'uploading' ? `Uploading… ${uploadProgress}%` : 'Upload Documents'}
      </button>
    </div>
  );
}
