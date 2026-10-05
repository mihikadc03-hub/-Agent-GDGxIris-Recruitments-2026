export class TrieNode {
  children: Record<string, TrieNode> = {};
  isEndOfWord: boolean = false;
  word: string = '';
}

export interface SearchResult {
  word: string;
  distance: number;
  isPrefix: boolean;
}

export class Trie {
  root: TrieNode = new TrieNode();
  size: number = 0;

  insert(word: string) {
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    if (!node.isEndOfWord) {
      node.isEndOfWord = true;
      node.word = word;
      this.size++;
    }
  }

  findPrefixes(prefix: string, maxResults: number = 50): SearchResult[] {
    const results: SearchResult[] = [];
    if (!prefix) return results;
    
    let node = this.root;
    for (let i = 0; i < prefix.length; i++) {
      const char = prefix[i];
      if (!node.children[char]) return results;
      node = node.children[char];
    }

    const collect = (curr: TrieNode) => {
      if (results.length >= maxResults) return;
      if (curr.isEndOfWord) {
        results.push({ word: curr.word, distance: 0, isPrefix: true });
      }
      for (const key in curr.children) {
        collect(curr.children[key]);
      }
    };

    collect(node);
    return results;
  }

  searchFuzzy(word: string, maxDist: number = 2): SearchResult[] {
    const results: SearchResult[] = [];
    if (!word) return results;
    
    const currentRow = Array.from({ length: word.length + 1 }, (_, i) => i);
    
    const searchRecursive = (node: TrieNode, char: string, previousRow: number[]) => {
      const columns = word.length + 1;
      const currentRow = [previousRow[0] + 1];

      let minElement = currentRow[0];

      for (let i = 1; i < columns; i++) {
        const insertCost = currentRow[i - 1] + 1;
        const deleteCost = previousRow[i] + 1;
        const replaceCost = word[i - 1] === char ? previousRow[i - 1] : previousRow[i - 1] + 1;

        const val = Math.min(insertCost, deleteCost, replaceCost);
        currentRow.push(val);
        if (val < minElement) minElement = val;
      }

      if (currentRow[word.length] <= maxDist && node.isEndOfWord) {
        results.push({ word: node.word, distance: currentRow[word.length], isPrefix: false });
      }

      if (minElement <= maxDist) {
        for (const childChar in node.children) {
          searchRecursive(node.children[childChar], childChar, currentRow);
        }
      }
    };

    for (const childChar in this.root.children) {
      searchRecursive(this.root.children[childChar], childChar, currentRow);
    }

    return results;
  }
}
