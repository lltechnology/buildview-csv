'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ProgressState {
    current: number;
    total: number;
    inserted: number;
    archived: number;
    errors: number;
    status: 'archiving' | 'clearing' | 'starting' | 'processing' | 'complete';
}

interface DbStatus {
    lastUpdated: string | null;
    totalProducts: number;
    archiveCount: number;
}

interface ArchiveEntry {
    archived_at: string;
    total_products: number;
    first_stock_no: string;
    last_stock_no: string;
}

export default function UploadPage() {
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
    const [archives, setArchives] = useState<ArchiveEntry[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
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

    const fetchArchives = useCallback(async () => {
        try {
            const res = await fetch('/api/archives');
            if (res.ok) {
                const data = await res.json();
                setArchives(data.archives || []);
            }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        fetchStatus();
        fetchArchives();
    }, [fetchStatus, fetchArchives]);

    function handleUploadClick() {
        const file = fileRef.current?.files?.[0];
        if (!file) {
            setStatus({ type: 'error', message: 'Please select a CSV file first.' });
            return;
        }

        // Show confirmation if there are existing products
        if (dbStatus && dbStatus.totalProducts > 0) {
            setShowConfirm(true);
        } else {
            doUpload();
        }
    }

    async function doUpload() {
        setShowConfirm(false);
        const file = fileRef.current?.files?.[0];
        if (!file) return;

        setUploading(true);
        setStatus(null);
        setProgress({ current: 0, total: 0, inserted: 0, archived: 0, errors: 0, status: 'archiving' });

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
                                    message: `Done! Archived ${data.archived} old products. Inserted ${data.inserted} new products from CSV.${data.errors > 0 ? ` Errors: ${data.errors}` : ''}`,
                                });
                                setUploading(false);
                                fetchStatus();
                                fetchArchives();
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

    const progressLabel = progress
        ? progress.status === 'complete' ? '✅ Complete'
            : progress.status === 'archiving' ? '📦 Archiving existing data...'
                : progress.status === 'clearing' ? '🗑️ Clearing old data...'
                    : `Processing row ${progress.current} of ${progress.total}`
        : '';

    return (
        <>
            <div className="page-header">
                <h1>Update Product Database</h1>
                <p>Upload a CSV file to replace the product database. Current data will be archived automatically.</p>
            </div>

            {dbStatus?.lastUpdated && (
                <div className="db-status-bar">
                    <span>📋 {dbStatus.totalProducts} products</span>
                    <span>🕒 Last updated: {new Date(dbStatus.lastUpdated).toLocaleString()}</span>
                    {dbStatus.archiveCount > 0 && (
                        <span>📦 {dbStatus.archiveCount} archive{dbStatus.archiveCount !== 1 ? 's' : ''}</span>
                    )}
                </div>
            )}

            <div className="form-section">
                <div className="section-label">
                    <span className="step-num">1</span>
                    Select CSV File
                </div>
                <p>Choose a CSV file with the standard product data format. The current data will be archived before importing the new file.</p>
                <div className="upload-row">
                    <input type="file" ref={fileRef} accept=".csv" />
                    <button className="btn-upload" onClick={handleUploadClick} disabled={uploading}>
                        {uploading ? (
                            <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Upload & Replace
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Confirmation Dialog */}
            {showConfirm && (
                <div className="confirm-overlay">
                    <div className="confirm-dialog">
                        <h3>⚠️ Replace Product Data?</h3>
                        <p>
                            This will archive the current <strong>{dbStatus?.totalProducts}</strong> products
                            and replace them with data from the new CSV file.
                        </p>
                        <p style={{ fontSize: '13px', opacity: 0.7 }}>
                            The archived data will be preserved and can be viewed in the archive history below.
                        </p>
                        <div className="confirm-actions">
                            <button className="btn-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
                            <button className="btn-confirm" onClick={doUpload}>Archive & Replace</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Bar */}
            {progress && (
                <div className="progress-container" style={{ marginTop: '24px' }}>
                    <div className="progress-header">
                        <span className="progress-label">{progressLabel}</span>
                        {progress.total > 0 && <span className="progress-pct">{pct}%</span>}
                    </div>
                    {progress.total > 0 && (
                        <div className="progress-track">
                            <div
                                className={`progress-fill ${progress.status === 'complete' ? 'complete' : ''}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    )}
                    <div className="progress-stats">
                        {progress.archived > 0 && (
                            <span className="stat-item stat-archived">Archived: {progress.archived}</span>
                        )}
                        <span className="stat-item stat-inserted">Inserted: {progress.inserted}</span>
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

            {/* Archive History */}
            {archives.length > 0 && (
                <div className="archive-section">
                    <h2>📦 Archive History</h2>
                    <div className="archive-list">
                        {archives.map((a, idx) => (
                            <div key={idx} className="archive-item">
                                <div className="archive-date">
                                    {new Date(a.archived_at).toLocaleString()}
                                </div>
                                <div className="archive-meta">
                                    <span>{a.total_products} products</span>
                                    <span className="archive-range">{a.first_stock_no} — {a.last_stock_no}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
