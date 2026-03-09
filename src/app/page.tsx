'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

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

interface SearchTab {
  id: number;
  query: string;
  product: Product | null;
  error: string;
  loading: boolean;
  label: string;
}

const STORAGE_KEY = 'buildview_search_state';

function loadState(): { tabs: SearchTab[]; activeTabId: number; nextId: number } | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    // Clear loading flags from restored state
    state.tabs = state.tabs.map((t: SearchTab) => ({ ...t, loading: false }));
    return state;
  } catch {
    return null;
  }
}

function saveState(tabs: SearchTab[], activeTabId: number, nextId: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeTabId, nextId }));
  } catch { /* ignore */ }
}

let globalNextId = 1;

function createTab(): SearchTab {
  return {
    id: globalNextId++,
    query: '',
    product: null,
    error: '',
    loading: false,
    label: '',
  };
}

function FieldBox({ label, value, span }: { label: string; value: string | number; span: string }) {
  return (
    <div className={`field-box ${span}`}>
      <div className="label">{label}</div>
      <div className="value">{value ?? ''}</div>
    </div>
  );
}

export default function SearchPage() {
  const [tabs, setTabs] = useState<SearchTab[]>([createTab()]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const hydrated = useRef(false);

  // Restore from sessionStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const saved = loadState();
    if (saved && saved.tabs.length > 0) {
      globalNextId = saved.nextId;
      setTabs(saved.tabs);
      setActiveTabId(saved.activeTabId);
    }
    hydrated.current = true;
  }, []);

  // Persist state on every change (skip initial mount)
  useEffect(() => {
    if (!hydrated.current) return;
    saveState(tabs, activeTabId, globalNextId);
  }, [tabs, activeTabId]);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const updateTab = useCallback((id: number, updates: Partial<SearchTab>) => {
    setTabs(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  async function handleSearch(tab: SearchTab) {
    const code = tab.query.trim();
    if (!code) return;

    updateTab(tab.id, { loading: true, product: null, error: '' });

    try {
      const res = await fetch(`/api/products?stock_no=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (!res.ok) {
        updateTab(tab.id, { loading: false, error: data.error || 'Search failed' });
      } else {
        updateTab(tab.id, {
          loading: false,
          product: data.product,
          label: data.product?.stock_no || code,
        });
      }
    } catch {
      updateTab(tab.id, { loading: false, error: 'Network error. Please try again.' });
    }
  }

  function addTab() {
    const newTab = createTab();
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }

  function closeTab(id: number) {
    if (tabs.length <= 1) return;
    const idx = tabs.findIndex(t => t.id === id);
    const remaining = tabs.filter(t => t.id !== id);
    setTabs(remaining);
    if (activeTabId === id) {
      const newIdx = Math.min(idx, remaining.length - 1);
      setActiveTabId(remaining[newIdx].id);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch(activeTab);
  }

  return (
    <>
      <div className="page-header">
        <h1>Product Search</h1>
        <p>Search by stock number to view product specifications</p>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span className="tab-label">{tab.label || `Search ${tabs.indexOf(tab) + 1}`}</span>
            {tabs.length > 1 && (
              <span
                className="tab-close"
                onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
              >
                ×
              </span>
            )}
          </button>
        ))}
        <button className="tab-add" onClick={addTab} title="New search tab">+</button>
      </div>

      {/* Search input for active tab */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Enter Stock Number..."
          value={activeTab.query}
          onChange={e => updateTab(activeTab.id, { query: e.target.value })}
          onKeyDown={handleKeyPress}
        />
        <button type="button" onClick={() => handleSearch(activeTab)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </button>
        {activeTab.query && (
          <button
            type="button"
            className="search-clear"
            onMouseDown={e => e.preventDefault()}
            onClick={() => updateTab(activeTab.id, { query: '', product: null, error: '', label: '' })}
          >×</button>
        )}
      </div>

      {activeTab.loading && <div className="message loading">Searching...</div>}
      {activeTab.error && <div className="message error">{activeTab.error}</div>}

      {activeTab.product && (
        <div className="spec-grid">
          <FieldBox label="Stock Number" value={activeTab.product.stock_no} span="span-6" />
          <FieldBox label="Description" value={activeTab.product.description} span="span-6" />
          <FieldBox label="As Is" value={activeTab.product.as_is} span="span-6" />

          <FieldBox label="18K Code" value={activeTab.product.code_18k} span="span-3" />
          <FieldBox label="14K Code" value={activeTab.product.code_14k} span="span-3" />
          <FieldBox label="10K Code" value={activeTab.product.code_10k} span="span-3" />
          <FieldBox label="9K Code" value={activeTab.product.code_9k} span="span-3" />
          <FieldBox label="Silver Code" value={activeTab.product.silver_code} span="span-3" />
          <FieldBox label="Gold Weight" value={activeTab.product.gold_weight} span="span-3" />

          <FieldBox label="1st Stn" value={activeTab.product.stn1_type} span="span-2" />
          <FieldBox label="1st Stn Qty" value={activeTab.product.stn1_qty} span="span-2" />
          <FieldBox label="1st Stn Weight" value={activeTab.product.stn1_weight} span="span-2" />

          <FieldBox label="2nd Stn" value={activeTab.product.stn2_type} span="span-2" />
          <FieldBox label="2nd Stn Qty" value={activeTab.product.stn2_qty} span="span-2" />
          <FieldBox label="2nd Stn Weight" value={activeTab.product.stn2_weight} span="span-2" />

          <FieldBox label="3rd Stn" value={activeTab.product.stn3_type} span="span-2" />
          <FieldBox label="3rd Stn Qty" value={activeTab.product.stn3_qty} span="span-2" />
          <FieldBox label="3rd Stn Weight" value={activeTab.product.stn3_weight} span="span-2" />

          <FieldBox label="4th Stn" value={activeTab.product.stn4_type} span="span-2" />
          <FieldBox label="4th Stn Qty" value={activeTab.product.stn4_qty} span="span-2" />
          <FieldBox label="4th Stn Weight" value={activeTab.product.stn4_weight} span="span-2" />
        </div>
      )}
    </>
  );
}
