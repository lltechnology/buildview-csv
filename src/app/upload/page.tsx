'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ProgressState {
    current: number;
    total: number;
    inserted: number;
    updated: number;
    errors: number;
    status: 'starting' | 'processing' | 'complete';
}

interface DbStatus {
    lastUpdated: string | null;
    totalProducts: number;
}

export default function UploadPage() {
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/status');
            if (res.ok) {
                const data = await res.json();
                setDbStatus(data);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    async function handleUpload() {
        const file = fileRef.current?.files?.[0];
        if (!file) {
            setStatus({ type: 'error', message: 'Please select a CSV file first.' });
            return;
        }

        setUploading(true);
        setStatus(null);
        setProgress({ current: 0, total: 0, inserted: 0, updated: 0, errors: 0, status: 'starting' });

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json();
                setStatus({ type: 'error', message: errData.error || 'Upload failed' });
                setProgress(null);
                setUploading(false);
                return;
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                setStatus({ type: 'error', message: 'Failed to read response stream' });
                setUploading(false);
                return;
            }

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = '';

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.startsWith('data: ')) {
                        try {
                            const data: ProgressState = JSON.parse(line.slice(6));
                            setProgress(data);

                            if (data.status === 'complete') {
                                setStatus({
                                    type: 'success',
                                    message: `Done! Processed ${data.total} rows — Inserted: ${data.inserted}, Updated: ${data.updated}${data.errors > 0 ? `, Errors: ${data.errors}` : ''}`,
                                });
                                setUploading(false);
                                fetchStatus();
                            }
                        } catch {
                            buffer = line;
                        }
                    } else if (line !== '') {
                        buffer += line + '\n';
                    }
                }
            }
        } catch {
            setStatus({ type: 'error', message: 'Network error. Please try again.' });
            setProgress(null);
        } finally {
            setUploading(false);
        }
    }

    const pct = progress && progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;

    return (
        <>
            <div className="page-header">
                <h1>Update Product Database</h1>
                <p>Upload a CSV file to insert or update products</p>
            </div>

            {dbStatus?.lastUpdated && (
                <div className="db-status-bar">
                    <span>📋 {dbStatus.totalProducts} products</span>
                    <span>🕒 Last updated: {new Date(dbStatus.lastUpdated).toLocaleString()}</span>
                </div>
            )}

            <div className="form-section">
                <div className="section-label">
                    <span className="step-num">1</span>
                    Select CSV File
                </div>
                <p>Choose a CSV file with the standard product data format.</p>
                <div className="upload-row">
                    <input type="file" ref={fileRef} accept=".csv" />
                    <button className="btn-upload" onClick={handleUpload} disabled={uploading}>
                        {uploading ? (
                            <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Upload
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            {progress && progress.total > 0 && (
                <div className="progress-container" style={{ marginTop: '24px' }}>
                    <div className="progress-header">
                        <span className="progress-label">
                            {progress.status === 'complete' ? '✅ Complete' : `Processing row ${progress.current} of ${progress.total}`}
                        </span>
                        <span className="progress-pct">{pct}%</span>
                    </div>
                    <div className="progress-track">
                        <div
                            className={`progress-fill ${progress.status === 'complete' ? 'complete' : ''}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="progress-stats">
                        <span className="stat-item stat-inserted">Inserted: {progress.inserted}</span>
                        <span className="stat-item stat-updated">Updated: {progress.updated}</span>
                        {progress.errors > 0 && (
                            <span className="stat-item stat-errors">Errors: {progress.errors}</span>
                        )}
                    </div>
                </div>
            )}

            {status && !uploading && (
                <div className={`message ${status.type}`} style={{ marginTop: '16px' }}>
                    {status.message}
                </div>
            )}
        </>
    );
}
