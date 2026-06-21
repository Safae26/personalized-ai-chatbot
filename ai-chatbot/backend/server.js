const express = require('express');
const cors = require('cors');
// loads variables from .env
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

// Global Analytics
const analyticsData = {
  totalInteractions: 0,
  sentimentCounts: { positive: 0, negative: 0, neutral: 0 },
  feedbackCounts: { positive: 0, negative: 0 }
};

// Response cache : stores previous chatbot responses so duplicate questions get answered instantly without calling the Gemini API again
const queryCache = {};

// Ethical safeguard configurations
const OFFENSIVE_KEYWORDS = [
  'hate', 'kill', 'scam', 'fraud', 'steal', 'hack', 'cheat', 'abuse',
  'bastard', 'bitch', 'idiot', 'moron', 'racist', 'sexist', 'slurs'
];
const PII_REGEX = /\b(?:\d{4}[- ]?){3}\d{4}\b/; // CC regex (e.g: credit card number)

/**
 * Audit input queries to ensure compliance with ethical AI standards
 */
function auditEthicalSafeguards(text) {
  const normalized = text.toLowerCase();
  if (PII_REGEX.test(normalized)) {
    return {
      violates: true,
      reason: "Security Safeguard: Detected sensitive Personal Identifiable Information (PII) like payment credentials. To protect your security, this query was intercepted."
    };
  }
  for (const term of OFFENSIVE_KEYWORDS) {
    if (normalized.includes(term)) {
      return {
        violates: true,
        reason: `Ethical Policy Safeguard: Content policy filter triggered due to potentially harmful, biased, or abusive tone/keywords ("${term}"). Let's focus our discussion on helpful, respectful topics.`
      };
    }
  }
  return { violates: false };
}

app.use(cors());
app.use(express.json());

// System instructions for the Customer Assistant
const CUSTOMER_ASSISTANT = {
  name: "Amy",
  title: "Customer Assistant (Catalog & Support)",
  greeting: "Hello! I am Amy, your Customer Assistant for AmazeKart. I can assist you with product catalog inquiries, specs, and shopping recommendations, as well as general support queries like order tracking, returns, and cancellations. How can I help you today?",
  instruction: "You are Amy, a helpful, styling, and efficient customer assistant for AmazeKart. You serve a dual purpose: recommending catalog products (Electronics, Fashion, Books, Health) and resolving customer experience issues (order tracking, returns, cancellations, policies). Your tone is friendly, empathetic, energetic, and problem-solving."
};

async function getProductsFromDatabase() {
  try {
    const res = await fetch('http://127.0.0.1:5001/api/products');
    if (!res.ok) return null;
    const products = await res.json();
    return products.map(p => ({
      title: p.title,
      description: p.description,
      price: p.price,
      stock: p.stock,
      category: p.category_name
    }));
  } catch {
    return null;
  }
}

async function getStoreCatalogContext() {
  const products = await getProductsFromDatabase();
  const items = products.map(p =>
    `- [Product]: ${p.title}\n  [Category]: ${p.category || 'General'}\n  [Price]: ₹${p.price.toFixed(2)}\n  [Stock]: ${p.stock} units remaining\n  [Description]: ${p.description}`
  ).join('\n\n');
  return `\n\n--- ACTUAL STORE CATALOG INVENTORY ---\n${items}\n---------------------------------------\n`;
}

// POST endpoint: Handle chatbot message
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ reply: "Please provide a message query." });

  // 1. Ethical & PII Bias Safeguard Audit
  const ethicalAudit = auditEthicalSafeguards(message);
  if (ethicalAudit.violates) return res.json({ reply: ethicalAudit.reason, source: "Ethical Safeguard System" });

  // 2. Real-time Response Cache Lookup
  const cacheKey = `shopping_${message.trim().toLowerCase()}`;
  if (queryCache[cacheKey] && queryCache[cacheKey].expires > Date.now()) {
    return res.json(queryCache[cacheKey].data);
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.includes('placeholder')) {
    return res.status(400).json({ reply: "Gemini API key is not configured. Please set GEMINI_API_KEY in the environment." });
  }

  // Sentiment tracking
  const sentimentAnalysis = analyzeSentiment(message);
  analyticsData.totalInteractions++;
  analyticsData.sentimentCounts[sentimentAnalysis.sentiment] = (analyticsData.sentimentCounts[sentimentAnalysis.sentiment] || 0) + 1;

  // Tailor instructions with real-time catalog
  const catalogContext = await getStoreCatalogContext();
  let customizedInstruction = CUSTOMER_ASSISTANT.instruction + catalogContext;
  if (sentimentAnalysis.sentiment === 'negative') {
    customizedInstruction += ` [User State: Negativity/Frustration detected. Apologize politely, show high empathy, and address the issue directly.]`;
  } else if (sentimentAnalysis.sentiment === 'positive') {
    customizedInstruction += ` [User State: Positive mood detected. Match their cheerful tone and thank them.]`;
  }

  try {
    const reply = await callGemini(geminiKey, message, customizedInstruction);
    const resObj = { reply, source: `Gemini AI (${sentimentAnalysis.sentiment})` };
    queryCache[cacheKey] = { data: resObj, expires: Date.now() + 300000 };
    return res.json(resObj);
  } catch (err) {
    console.error("Gemini API error:", err.message);
    return res.status(500).json({ reply: "Gemini API Error: " + err.message });
  }
});

// GET endpoint: Retrieve global session interaction analytics
app.get('/api/analytics', (req, res) => res.json(analyticsData));

// GET endpoint: Retrieve dynamic suggestions
app.get('/api/suggestions', async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    const products = await getProductsFromDatabase();

    if (!q) {
      return res.json(["Track my order status", "How to request a refund?", "Cancel my order", "Show category departments"]);
    }

    const suggestions = [];
    if (q.includes('order') || q.includes('track') || q.includes('status')) suggestions.push("Track my order status");
    if (q.includes('refund') || q.includes('return') || q.includes('money')) suggestions.push("How to request a refund?");
    if (q.includes('cancel') || q.includes('stop')) suggestions.push("Cancel my order");

    for (const product of products) {
      if (product.title.toLowerCase().includes(q) || product.description.toLowerCase().includes(q)) {
        suggestions.push(`Price of ${product.title}`);
        suggestions.push(`Info about ${product.title}`);
        suggestions.push(`Is ${product.title} in stock?`);
      }
    }

    const uniqueSuggestions = Array.from(new Set(suggestions)).slice(0, 5);
    if (uniqueSuggestions.length === 0) {
      uniqueSuggestions.push("Track my order status", "How to request a refund?", "Cancel my order");
    }
    res.json(uniqueSuggestions);
  } catch (error) {
    res.status(500).json(["Track my order status", "How to request a refund?", "Cancel my order"]);
  }
});

// API helper for Gemini requests
async function callGemini(apiKey, prompt, systemInstruction) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  if (systemInstruction) {
    payload.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const json = await res.json();
  if (res.ok && json.candidates?.[0]?.content?.parts?.[0]?.text) {
    return json.candidates[0].content.parts[0].text;
  }
  throw new Error(json.error?.message || `Gemini API status ${res.status}`);
}

// Sentiment Analyzer
function analyzeSentiment(text) {
  const positiveLexicon = ['good', 'great', 'awesome', 'excellent', 'happy', 'love', 'thanks', 'thank', 'perfect', 'wonderful', 'amazing', 'glad', 'appreciate', 'cool', 'nice', 'helpful', 'yes', 'super', 'joy', 'excited', 'best', 'satisfied'];
  const negativeLexicon = ['bad', 'worst', 'poor', 'terrible', 'useless', 'broken', 'angry', 'hate', 'stupid', 'garbage', 'trash', 'fail', 'failed', 'error', 'scam', 'refund', 'complaint', 'sad', 'annoyed', 'disappointed', 'disappointing', 'wrong', 'frustrated', 'late', 'slow', 'stupid', 'horrible'];

  const words = text.toLowerCase().split(/\W+/);
  let posCount = 0, negCount = 0;

  for (const word of words) {
    if (positiveLexicon.includes(word)) posCount++;
    if (negativeLexicon.includes(word)) negCount++;
  }

  if (posCount > negCount) return { sentiment: 'positive', emotion: 'joy/gratitude' };
  if (negCount > posCount) return { sentiment: 'negative', emotion: 'frustration/anger' };
  return { sentiment: 'neutral', emotion: 'neutral' };
}

const http = require('http');
const WebSocket = require('ws');

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Real-time WebSocket client connected.');

  ws.on('message', async (data) => {
    try {
      const payload = JSON.parse(data);
      const { message } = payload;
      if (!message) return ws.send(JSON.stringify({ error: "Missing message query." }));

      // 1. Ethical safeguards
      const ethicalAudit = auditEthicalSafeguards(message);
      if (ethicalAudit.violates) return ws.send(JSON.stringify({ reply: ethicalAudit.reason, source: "Ethical Safeguard System" }));

      // 2. Cache Lookup
      const cacheKey = `shopping_${message.trim().toLowerCase()}`;
      if (queryCache[cacheKey] && queryCache[cacheKey].expires > Date.now()) {
        return ws.send(JSON.stringify(queryCache[cacheKey].data));
      }

      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey || geminiKey.includes('placeholder')) {
        return ws.send(JSON.stringify({ reply: "Gemini API key is not configured.", source: "System" }));
      }

      const sentimentAnalysis = analyzeSentiment(message);
      const catalogContext = await getStoreCatalogContext();
      let customizedInstruction = CUSTOMER_ASSISTANT.instruction + catalogContext;
      if (sentimentAnalysis.sentiment === 'negative') {
        customizedInstruction += ` [User State: Negativity/Frustration detected. Apologize politely, show high empathy, and address the issue directly.]`;
      } else if (sentimentAnalysis.sentiment === 'positive') {
        customizedInstruction += ` [User State: Positive mood detected. Match their cheerful tone and thank them.]`;
      }

      const reply = await callGemini(geminiKey, message, customizedInstruction);
      const finalResponse = { reply, source: `Gemini AI (${sentimentAnalysis.sentiment})` };
      queryCache[cacheKey] = { data: finalResponse, expires: Date.now() + 300000 };
      ws.send(JSON.stringify(finalResponse));
    } catch (err) {
      ws.send(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`AI Chatbot backend server (with WebSockets support) listening on http://localhost:${PORT}`);
});
