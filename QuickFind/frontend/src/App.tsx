import { useState, useEffect, useRef, useMemo } from 'react';
import { Trie, SearchResult } from './Trie';
import './index.css';

function App() {
  const [query, setQuery] = useState('');
  const [datasetSize, setDatasetSize] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [timeMs, setTimeMs] = useState<number | null>(null);

  const trieRef = useRef<Trie>(new Trie());

  useEffect(() => {
    // Load a massive real-world dictionary dataset (370k+ words)
    const loadDataset = async () => {
      try {
        const res = await fetch('https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt');
        const text = await res.text();
        const words = text.split(/\r?\n/).filter(w => w.trim().length > 0);
        
        const start = performance.now();
        const trie = new Trie();
        for (const w of words) {
          trie.insert(w.trim().toLowerCase());
        }
        trieRef.current = trie;
        
        console.log(`Trie built in ${performance.now() - start}ms`);
        setDatasetSize(trie.size);
        setIsReady(true);
      } catch (e) {
        console.error("Failed to load dataset", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadDataset();
  }, []);

  // Debounced search
  useEffect(() => {
    if (!isReady || !query.trim()) {
      setResults([]);
      setTimeMs(null);
      return;
    }

    const t = setTimeout(() => {
      const start = performance.now();
      const q = query.trim().toLowerCase();
      
      // Get exact prefix matches
      const prefixMatches = trieRef.current.findPrefixes(q, 30);
      
      // Get fuzzy matches (max distance 2)
      // Only do fuzzy if query length >= 3 to avoid exploring too much of the tree on short inputs
      let fuzzyMatches: SearchResult[] = [];
      if (q.length >= 3) {
        const maxDist = q.length > 5 ? 2 : 1;
        fuzzyMatches = trieRef.current.searchFuzzy(q, maxDist);
      }

      // Merge and rank
      const mergedMap = new Map<string, SearchResult>();
      
      for (const m of fuzzyMatches) {
        mergedMap.set(m.word, m);
      }
      // Overwrite fuzzy with prefix if it exists (prefix implies distance 0)
      for (const m of prefixMatches) {
        mergedMap.set(m.word, m);
      }

      const allResults = Array.from(mergedMap.values());
      
      // Ranking function
      allResults.sort((a, b) => {
        // 1. Prefixes come first
        if (a.isPrefix && !b.isPrefix) return -1;
        if (!a.isPrefix && b.isPrefix) return 1;
        
        // 2. Lowest edit distance
        if (a.distance !== b.distance) return a.distance - b.distance;
        
        // 3. Shorter words first (more exact match)
        if (a.word.length !== b.word.length) return a.word.length - b.word.length;
        
        // 4. Alphabetical
        return a.word.localeCompare(b.word);
      });

      const topResults = allResults.slice(0, 15); // Show top 15

      const end = performance.now();
      setTimeMs(end - start);
      setResults(topResults);
      
    }, 100); // 100ms debounce

    return () => clearTimeout(t);
  }, [query, isReady]);

  // Highlighting function (Bonus 2)
  const renderHighlighted = (word: string, q: string) => {
    if (!q) return word;
    // Simple highlight: find the substring if it's a prefix
    if (word.startsWith(q)) {
      return (
        <>
          <span className="highlight">{word.substring(0, q.length)}</span>
          {word.substring(q.length)}
        </>
      );
    }
    // For fuzzy matches, doing a full sequence alignment highlight is complex,
    // so we just return the word normally if it's not a strict prefix match.
    return word;
  };

  return (
    <div className="container">
      <div className="header">
        <h1>QuickFind</h1>
        <p>High-Performance Sub-Millisecond Typo-Tolerant Autocomplete</p>
      </div>

      <div className="stats-panel">
        <div className="stat">
          <div className="stat-label">Dataset Size</div>
          <div className="stat-value">{isLoading ? 'Loading...' : datasetSize.toLocaleString()} words</div>
        </div>
        <div className="stat">
          <div className="stat-label">Last Query Time</div>
          <div className="stat-value">{timeMs !== null ? `${timeMs.toFixed(2)} ms` : '--'}</div>
        </div>
      </div>

      <div className="search-container">
        <input 
          type="text" 
          className="search-box" 
          placeholder="Start typing to search (e.g. 'strwbry' -> 'strawberry')..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={!isReady}
        />

        {query && results.length > 0 && (
          <div className="results-dropdown">
            {results.map((r, i) => (
              <div className="result-item" key={i}>
                <div className="result-word">{renderHighlighted(r.word, query.trim().toLowerCase())}</div>
                <div className="result-meta">
                  {r.isPrefix ? (
                    <span className="badge badge-prefix">Prefix Match</span>
                  ) : (
                    <span className="badge badge-fuzzy">Fuzzy (Dist: {r.distance})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {query && results.length === 0 && isReady && (
          <div className="results-dropdown empty">
            No matches found for "{query}".
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
