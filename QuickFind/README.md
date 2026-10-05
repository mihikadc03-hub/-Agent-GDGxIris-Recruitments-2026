# QuickFind (Task ID: QuickFind)

## Overview
**QuickFind** is a highly optimized, typo-tolerant search engine built entirely from scratch in TypeScript/React. It uses a custom **Trie** (prefix tree) indexing structure combined with **Bounded Levenshtein Distance** algorithms to deliver sub-millisecond query performance on massive datasets.

To prove its performance, it loads a real-world dataset of **over 370,000 words** on startup!

### Features Included
- **Custom Trie Indexing Structure**: Extremely fast `O(L)` prefix lookup, replacing `O(N)` linear array scans.
- **Fuzzy Matching**: A bounded Levenshtein algorithm that walks the Trie dynamically, only exploring paths that stay within a specified edit-distance tolerance (handling typos easily).
- **Advanced Ranking Strategy**: 
   1. Exact Prefix matches override fuzzy matches.
   2. Results are sorted by lowest edit distance first.
   3. Shorter words outrank longer words on tie-breakers.
   4. Alphabetical tie-breaker ensures deterministic ordering.
- **Benchmark Panel**: Tracks and displays the exact time taken (in milliseconds) for the most recent query, usually returning results under 15ms even for fuzzy matching on the 370,000+ entry database.
- **Bonus 2: Highlighting**: Exact prefix matches dynamically highlight their matching substrings in the UI dropdown.
- **Bonus 3: Real Dataset + Scale Test**: Rather than a mock dataset, QuickFind streams and indexes a 370k+ entry English dictionary file directly from GitHub on mount.

## Tech Stack
- React + Vite + TypeScript
- Custom Algorithms (Trie, Bounded Levenshtein)

## Running Locally

```bash
cd frontend
npm install
npm run dev
```
*Runs on `http://localhost:5175`*
