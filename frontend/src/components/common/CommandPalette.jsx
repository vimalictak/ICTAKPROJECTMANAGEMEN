import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FolderKanban, CheckSquare, Users, BarChart3, Settings, Zap } from 'lucide-react';
import { searchApi } from '../../api';
import { cn } from '../../lib/utils';

const shortcuts = [
  { label: 'Dashboard', icon: BarChart3, to: '/dashboard', category: 'Navigation' },
  { label: 'Projects', icon: FolderKanban, to: '/projects', category: 'Navigation' },
  { label: 'Tasks', icon: CheckSquare, to: '/tasks', category: 'Navigation' },
  { label: 'Team Members', icon: Users, to: '/users', category: 'Navigation' },
  { label: 'Settings', icon: Settings, to: '/settings', category: 'Navigation' },
  { label: 'New Project', icon: FolderKanban, to: '/projects/new', category: 'Create' },
  { label: 'New Task', icon: CheckSquare, to: '/tasks/new', category: 'Create' },
  { label: 'New Sprint', icon: Zap, to: '/sprints/new', category: 'Create' },
];

export const CommandPalette = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await searchApi.global(query);
        setResults(data.results || []);
      } catch {}
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredShortcuts = shortcuts.filter(s =>
    !query || s.label.toLowerCase().includes(query.toLowerCase())
  );

  const allItems = query
    ? [...filteredShortcuts, ...results.map(r => ({ label: r.title || r.name, to: r.url || '#', category: r.type, icon: CheckSquare }))]
    : filteredShortcuts;

  const handleSelect = (item) => {
    navigate(item.to);
    onClose();
  };

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); if (allItems[selectedIdx]) handleSelect(allItems[selectedIdx]); }
    if (e.key === 'Escape') onClose();
  };

  const categories = [...new Set(allItems.map(i => i.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-50 w-full max-w-lg rounded-xl border bg-background shadow-2xl overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or jump to..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searching && <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
          <kbd className="hidden sm:flex h-5 items-center rounded border px-1.5 text-xs text-muted-foreground">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-2">
          {allItems.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {query ? 'No results found' : 'Start typing to search...'}
            </p>
          ) : (
            categories.map(cat => {
              const items = allItems.filter(i => i.category === cat);
              let flatIdx = allItems.indexOf(items[0]);
              return (
                <div key={cat}>
                  <p className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat}</p>
                  {items.map((item, i) => {
                    const idx = flatIdx + i;
                    const Icon = item.icon || Search;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                          idx === selectedIdx ? 'bg-primary/10 text-primary' : 'hover:bg-accent'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="border rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border rounded px-1">↵</kbd> select</span>
          <span><kbd className="border rounded px-1">ESC</kbd> close</span>
        </div>
      </motion.div>
    </div>
  );
};
