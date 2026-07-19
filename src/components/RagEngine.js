const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'at', 
  'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 
  'after', 'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 
  'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 
  'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
]);

// Cache parsed virtual FS to avoid re-parsing localStorage on every query
let _cachedFSRaw = null
let _cachedFS = null

function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

export function searchRAG(queryText) {
  if (!queryText || typeof queryText !== 'string' || !queryText.trim()) {
    return [];
  }

  // 1. Load the virtual filesystem from localStorage (cached)
  let fs = {};
  try {
    const saved = localStorage.getItem('iris_virtual_fs');
    if (saved) {
      if (saved !== _cachedFSRaw) {
        _cachedFSRaw = saved
        _cachedFS = JSON.parse(saved)
      }
      fs = _cachedFS;
    }
  } catch (e) {
    console.error("Failed to parse iris_virtual_fs", e);
    _cachedFSRaw = null
    _cachedFS = null
    return [];
  }

  // 2. Extract files
  const files = [];
  Object.keys(fs).forEach(path => {
    const node = fs[path];
    if (node && node.type === 'file' && typeof node.content === 'string') {
      files.push({
        path,
        name: path.split('/').pop() || path,
        content: node.content
      });
    }
  });

  if (files.length === 0) return [];

  // 3. Tokenize all documents and the query
  const queryTokens = tokenize(queryText);
  if (queryTokens.length === 0) return [];

  const docTokens = files.map(file => ({
    ...file,
    tokens: tokenize(file.content)
  }));

  // 4. Calculate IDF for all unique terms in the query
  const totalDocs = files.length;
  const idfs = {};
  
  queryTokens.forEach(term => {
    if (idfs[term] !== undefined) return;
    const docsWithTerm = docTokens.filter(doc => doc.tokens.includes(term)).length;
    // Smoothed Inverse Document Frequency
    idfs[term] = Math.log(1 + (totalDocs / (1 + docsWithTerm)));
  });

  // 5. Calculate query vector and its magnitude
  const queryTfs = {};
  queryTokens.forEach(term => {
    queryTfs[term] = (queryTfs[term] || 0) + 1;
  });
  
  const queryVector = {};
  let queryMagSq = 0;
  Object.keys(queryTfs).forEach(term => {
    const tf = queryTfs[term] / queryTokens.length;
    const idf = idfs[term];
    queryVector[term] = tf * idf;
    queryMagSq += queryVector[term] * queryVector[term];
  });
  const queryMagnitude = Math.sqrt(queryMagSq);

  if (queryMagnitude === 0) return [];

  // 6. Calculate Cosine Similarity for each document
  const results = docTokens.map(doc => {
    if (doc.tokens.length === 0) {
      return { ...doc, score: 0, snippet: "" };
    }

    // Term frequencies for ALL terms in the document (needed for true document magnitude)
    const docTermCounts = {};
    doc.tokens.forEach(term => {
      docTermCounts[term] = (docTermCounts[term] || 0) + 1;
    });

    // Compute IDF for all doc terms to calculate true doc vector magnitude
    const docVector = {};
    let docMagSq = 0;
    Object.keys(docTermCounts).forEach(term => {
      // If term is not in query, we need to compute its IDF
      let idf = idfs[term];
      if (idf === undefined) {
        const docsWithTerm = docTokens.filter(d => d.tokens.includes(term)).length;
        idf = Math.log(1 + (totalDocs / (1 + docsWithTerm)));
      }
      const tf = docTermCounts[term] / doc.tokens.length;
      docVector[term] = tf * idf;
      docMagSq += docVector[term] * docVector[term];
    });
    const docMagnitude = Math.sqrt(docMagSq);

    if (docMagnitude === 0) {
      return { ...doc, score: 0, snippet: "" };
    }

    // Dot product only over query terms (since query terms are the only non-zero components in query vector)
    let dotProduct = 0;
    Object.keys(queryVector).forEach(term => {
      if (docVector[term]) {
        dotProduct += queryVector[term] * docVector[term];
      }
    });

    const cosineSimilarity = dotProduct / (queryMagnitude * docMagnitude);
    
    // Extract a snippet containing query words or the first lines of the file
    let snippet = "";
    const lines = doc.content.split('\n');
    let bestLine = lines[0] || "";
    let maxMatches = -1;

    lines.forEach(line => {
      const lineTokens = line.toLowerCase().split(/\s+/);
      const matches = queryTokens.filter(t => lineTokens.includes(t)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestLine = line;
      }
    });
    
    snippet = bestLine.trim().substring(0, 120);
    if (bestLine.trim().length > 120) snippet += "...";

    return {
      path: doc.path,
      name: doc.name,
      score: cosineSimilarity,
      snippet: snippet || doc.content.substring(0, 80)
    };
  });

  // 7. Filter out 0 scores, sort by highest similarity
  return results
    .filter(res => res.score > 0)
    .sort((a, b) => b.score - a.score);
}
