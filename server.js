const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const natural = require('natural');
const sw = require('stopword');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname)));

const rawData = fs.readFileSync('./data/travel_data.json');
const data = JSON.parse(rawData);

// 🔧 Tokenizer and Stemmer
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// 🔍 Preprocessing function
function preprocess(text) {
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const filtered = sw.removeStopwords(tokens);
  const stemmed = filtered.map(word => stemmer.stem(word));
  return stemmed;
}

//  TF-IDF Index
const TfIdf = natural.TfIdf;
const tfidf = new TfIdf();

data.forEach(item => {
  const tokens = preprocess(item.Travel_Location).join(' ');
  tfidf.addDocument(tokens);
});

//  Search Endpoint
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json(data);

  const queryTokens = preprocess(q).join(' ');

  // TF-IDF based matching
  const results = [];
  tfidf.tfidfs(queryTokens, (i, score) => {
    if (score > 0) {
      results.push({
        ...data[i],
        _score: score.toFixed(4) 
      });
    }
  });

  // If no TF-IDF matches, use fuzzy fallback
  if (results.length === 0) {
    const threshold = 0.75; 
    data.forEach(item => {
      const sim = natural.JaroWinklerDistance(q.toLowerCase(), item.Travel_Location.toLowerCase());
      if (sim >= threshold) {
        results.push({
          ...item,
          _score: sim.toFixed(4)
        });
      }
    });
  }

  results.sort((a, b) => b._score - a._score); 
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
