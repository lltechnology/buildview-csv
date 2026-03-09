'use client';

import { useState, useEffect, useCallback } from 'react';

interface Product {
    stock_no: string;
    description: string;
    as_is: number;
    code_18k: number;
    code_14k: number;
    code_10k: number;
    code_9k: number;
    silver_code: number;
    gold_weight: string;
    stn1_type: string;
    stn1_qty: number;
    stn1_weight: string;
    stn2_type: string;
    stn2_qty: number;
    stn2_weight: string;
    stn3_type: string;
    stn3_qty: number;
    stn3_weight: string;
    stn4_type: string;
    stn4_qty: number;
    stn4_weight: string;
}

interface ListResponse {
    rows: Product[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const COLUMNS: { key: keyof Product; label: string; width?: string }[] = [
    { key: 'stock_no', label: 'Stock No', width: '90px' },
    { key: 'description', label: 'Description', width: '160px' },
    { key: 'as_is', label: 'As Is', width: '70px' },
    { key: 'code_18k', label: '18K', width: '70px' },
    { key: 'code_14k', label: '14K', width: '70px' },
    { key: 'code_10k', label: '10K', width: '70px' },
    { key: 'code_9k', label: '9K', width: '70px' },
    { key: 'silver_code', label: 'Silver', width: '70px' },
    { key: 'gold_weight', label: 'Gold Wt', width: '65px' },
    { key: 'stn1_type', label: '1st Stn', width: '60px' },
    { key: 'stn1_qty', label: 'Qty', width: '40px' },
    { key: 'stn1_weight', label: 'Wt', width: '50px' },
    { key: 'stn2_type', label: '2nd Stn', width: '60px' },
    { key: 'stn2_qty', label: 'Qty', width: '40px' },
    { key: 'stn2_weight', label: 'Wt', width: '50px' },
    { key: 'stn3_type', label: '3rd Stn', width: '60px' },
    { key: 'stn3_qty', label: 'Qty', width: '40px' },
    { key: 'stn3_weight', label: 'Wt', width: '50px' },
    { key: 'stn4_type', label: '4th Stn', width: '60px' },
    { key: 'stn4_qty', label: 'Qty', width: '40px' },
    { key: 'stn4_weight', label: 'Wt', width: '50px' },
];

export default function DataPage() {
    const [listData, setListData] = useState<ListResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);

    const fetchList = useCallback(async (page: number, limit: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/list?page=${page}&limit=${limit}`);
            if (res.ok) {
                const data: ListResponse = await res.json();
                setListData(data);
            }
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchList(currentPage, pageSize);
    }, [fetchList, currentPage, pageSize]);

    function handlePageChange(newPage: number) {
        setCurrentPage(newPage);
    }

    function handlePageSizeChange(newSize: number) {
        setPageSize(newSize);
        setCurrentPage(1);
    }

    return (
        <>
            <div className="page-header">
                <h1>Product Data</h1>
                <p>Browse all products in the database</p>
            </div>

            {listData && (
                <>
                    <div className="table-controls">
                        <div className="table-info">
                            Showing {((listData.page - 1) * listData.limit) + 1}–{Math.min(listData.page * listData.limit, listData.total)} of {listData.total}
                        </div>
                        <div className="table-page-size">
                            <span>Per page:</span>
                            <button
                                className={pageSize === 50 ? 'active' : ''}
                                onClick={() => handlePageSizeChange(50)}
                            >50</button>
                            <button
                                className={pageSize === 100 ? 'active' : ''}
                                onClick={() => handlePageSizeChange(100)}
                            >100</button>
                        </div>
                    </div>

                    <div className="data-table-wrap">
                        {loading && <div className="table-loading">Loading...</div>}
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="row-num">#</th>
                                    {COLUMNS.map(col => (
                                        <th key={col.key} style={{ minWidth: col.width }}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {listData.rows.map((row, idx) => (
                                    <tr key={row.stock_no}>
                                        <td className="row-num">{((listData.page - 1) * listData.limit) + idx + 1}</td>
                                        {COLUMNS.map(col => (
                                            <td key={col.key}>{row[col.key] ?? ''}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="table-pagination">
                        <button
                            disabled={currentPage <= 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        >‹ Prev</button>
                        {Array.from({ length: listData.totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                className={p === currentPage ? 'active' : ''}
                                onClick={() => handlePageChange(p)}
                            >{p}</button>
                        ))}
                        <button
                            disabled={currentPage >= listData.totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
                        >Next ›</button>
                    </div>
                </>
            )}
        </>
    );
}
