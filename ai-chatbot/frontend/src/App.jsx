import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Terminal, PenTool, HelpCircle, Dumbbell, ShieldAlert, Cpu, Sparkles, MessageSquare, AlertCircle, ThumbsUp, ThumbsDown, BarChart2, Mic, Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState('chat'); // 'chat' or 'analytics'
  const [analytics, setAnalytics] = useState({
    totalInteractions: 0,
    agentUsage: { shopping: 0 },
    sentimentCounts: { positive: 0, negative: 0, neutral: 0 },
    feedbackCounts: { positive: 0, negative: 0 }
  });

  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [predictions, setPredictions] = useState([]);

  const [personality, setPersonality] = useState('shopping'); // shopping is now the unified personality
  const [messages, setMessages] = useState({
    shopping: [
      { id: '1', sender: 'bot', text: "Hello! I am Amy, your Personal Customer Guide & Support assistant. I can help you find products from our catalog (like Electronics, Fashion, Books) or resolve order queries, cancellations, and refund policies. What can I do for you today?", source: "System" }
    ]
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  const socketRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Active personality details
  const personalitiesData = {
    shopping: {
      name: "Amy",
      title: "Customer Assistant (Catalog & Support)",
      accent: "shopping",
      icon: <Sparkles size={22} />,
      chips: ["Do you sell earbuds?", "Recommend a stylish backpack", "How to track my order", "What is the return/refund policy?"]
    }
  };

  const activeBot = personalitiesData[personality];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    }
  };

  // Trigger predictive suggestions dynamically as input changes (debounced by 150ms)
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/suggestions?q=${encodeURIComponent(input)}`);
        const list = await res.json();
        const filtered = list.filter(item => item.toLowerCase() !== input.trim().toLowerCase());
        setPredictions(filtered.slice(0, 3));
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
      }
    };

    if (!input.trim()) {
      setPredictions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 150);

    return () => clearTimeout(timer);
  }, [input]);

  // Speech Recognition (Speech-to-Text)
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Google Chrome or Microsoft Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setInput(speechToText);
      setIsListening(false);
      handleSend(speechToText);
    };

    recognition.onerror = (err) => {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Speech Synthesis (Text-to-Speech)
  const speakText = (text) => {
    if (!ttsEnabled) return;
    try {
      // Strip bracket notes/prefixes (like sentiment warnings)
      const cleanText = text.replace(/\[.*?\]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Failed speech synthesis:", e);
    }
  };

  useEffect(() => {
    // Setup and maintain direct WebSocket connection with backend server
    const connectWS = () => {
      // Connect to host port 5002 directly
      const socket = new WebSocket('ws://127.0.0.1:5002');

      socket.onopen = () => {
        console.log("WebSocket client link established with AI Chatbot server.");
        setWsConnected(true);
      };

      socket.onclose = () => {
        console.log("WebSocket link closed. Attempting reconnect in 5 seconds...");
        setWsConnected(false);
        setTimeout(connectWS, 5000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket transport error:", err);
        socket.close();
      };

      socketRef.current = socket;
    };

    connectWS();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, personality]);

  useEffect(() => {
    if (viewMode === 'analytics') {
      fetchAnalytics();
    }
  }, [viewMode]);

  const handleSend = async (messageText) => {
    if (!messageText.trim()) return;

    setError('');
    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: messageText
    };

    // Add user message to current personality history
    setMessages(prev => ({
      ...prev,
      [personality]: [...prev[personality], userMsg]
    }));
    setInput('');
    setIsTyping(true);

    // Check if WebSocket connection is active
    if (wsConnected && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const handleIncomingMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            setError(data.error);
            return;
          }

          const botMsg = {
            id: `bot_${Date.now()}`,
            sender: 'bot',
            text: data.reply,
            source: data.source || "Real-time WebSocket"
          };

          setMessages(prev => ({
            ...prev,
            [personality]: [...prev[personality], botMsg]
          }));

          speakText(data.reply);
        } catch (e) {
          console.error("Error parsing socket reply:", e);
        } finally {
          setIsTyping(false);
          socketRef.current.removeEventListener('message', handleIncomingMessage);
        }
      };

      socketRef.current.addEventListener('message', handleIncomingMessage);
      socketRef.current.send(JSON.stringify({ message: messageText, personality, lang: 'en-US' }));
      return;
    }

    // Fallback: standard HTTP POST pipeline
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, personality, lang: 'en-US' })
      });
      const data = await res.json();

      const botMsg = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: data.reply,
        source: data.source || "AI Server"
      };

      setMessages(prev => ({
        ...prev,
        [personality]: [...prev[personality], botMsg]
      }));

      // Speak response if TTS is toggled on
      speakText(data.reply);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error connecting to chatbot server.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleFeedback = async (messageId, rating) => {
    // Optimistically update message feedback state in frontend
    setMessages(prev => {
      const list = prev[personality];
      const updated = list.map(m => {
        if (m.id === messageId) {
          return { ...m, feedback: rating };
        }
        return m;
      });
      return { ...prev, [personality]: updated };
    });

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personality, rating })
      });
    } catch (err) {
      console.error("Failed to post RL feedback:", err);
    }
  };

  return (
    <div className="playground-container">
      {/* Sidebar - Personalities Selection */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Cpu style={{ color: '#818cf8' }} size={24} />
            <h1 style={{ fontSize: '1.4rem', color: '#fff' }}>AmazeBot Hub</h1>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Your AI-powered shopping assistant and customer support companion.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '0.72rem' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: wsConnected ? '#10b981' : '#f59e0b',
              boxShadow: wsConnected ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
              display: 'inline-block'
            }} />
            <span style={{ color: wsConnected ? '#10b981' : '#f59e0b', fontWeight: '600' }}>
              {wsConnected ? 'WebSockets: Live Optimization' : 'WebSockets: Reconnecting (HTTP fall-through)'}
            </span>
          </div>
        </div>

        {/* View Mode Selector */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '-8px' }}>
          <button
            onClick={() => setViewMode('chat')}
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: '0.82rem',
              fontWeight: '600',
              borderRadius: '8px',
              background: viewMode === 'chat' ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: viewMode === 'chat' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <MessageSquare size={14} />
            Chat Room
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            style={{
              flex: 1,
              padding: '10px 12px',
              fontSize: '0.82rem',
              fontWeight: '600',
              borderRadius: '8px',
              background: viewMode === 'analytics' ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: viewMode === 'analytics' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <BarChart2 size={14} />
            Analytics
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Connection status diagnostics */}
        <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Sparkles size={14} style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>System Diagnostics</span>
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            The module is pre-configured to detect API keys and auto-route. Currently defaulting to the Local NLP engine if no custom keys are present in .env.
          </p>
        </div>
      </div>

      {/* Main Panel - Dynamic Chat / Analytics Dashboard switch */}
      {viewMode === 'chat' ? (
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(12, 12, 18, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: `var(--accent-${activeBot.accent}-glow)`,
                border: `1px solid rgba(255,255,255,0.06)`,
                color: `var(--accent-${activeBot.accent})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {activeBot.icon}
              </div>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeBot.name}
                  <span style={{ fontSize: '0.65rem', background: `var(--accent-${activeBot.accent}-glow)`, color: `var(--accent-${activeBot.accent})`, padding: '2px 8px', borderRadius: '999px', border: `1px solid rgba(255,255,255,0.04)` }}>
                    ONLINE
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{activeBot.title}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

              {/* TTS Voice output toggle */}
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: ttsEnabled ? '#818cf8' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: '6px',
                  background: ttsEnabled ? 'rgba(129, 140, 248, 0.08)' : 'transparent',
                  border: ttsEnabled ? '1px solid rgba(129, 140, 248, 0.2)' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}
                title={ttsEnabled ? "Mute Bot Speech Output" : "Enable Bot Speech Output (TTS)"}
              >
                {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <MessageSquare size={14} />
                <span>Active Thread</span>
              </div>
            </div>
          </div>

          {/* Error Alert Bar */}
          {error && (
            <div style={{ padding: '14px 24px', background: 'rgba(239, 68, 68, 0.08)', borderBottom: '1px solid rgba(239, 68, 68, 0.15)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Message Stream */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages[personality].map((msg) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div className={`message-bubble message-${msg.sender}`}>
                    {msg.text}
                  </div>
                  {msg.sender === 'bot' && msg.id !== '1' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleFeedback(msg.id, 'positive')}
                        style={{ background: 'none', border: 'none', color: msg.feedback === 'positive' ? '#10b981' : '#8e95b0', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                        title="Helpful (Reinforces RL weights)"
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, 'negative')}
                        style={{ background: 'none', border: 'none', color: msg.feedback === 'negative' ? '#ef4444' : '#8e95b0', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                        title="Not helpful (Penalizes RL weights)"
                      >
                        <ThumbsDown size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '6px', padding: '0 8px' }}>
                  {msg.sender === 'user' ? 'You' : `${activeBot.name} • ${msg.source || 'AI'}`}
                </span>
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div className="message-bubble message-bot" style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '14px 20px' }}>
                  <span className="bounce-dot"></span>
                  <span className="bounce-dot"></span>
                  <span className="bounce-dot"></span>
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '6px', padding: '0 8px' }}>
                  {activeBot.name} is formulating response...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div style={{ padding: '0 24px 16px 24px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {activeBot.chips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                className="quick-chip"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* AI-Based Predictive Suggestions */}
          {predictions.length > 0 && (
            <div style={{ padding: '0 24px 8px 24px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} style={{ color: '#818cf8' }} />
                Suggestions:
              </span>
              {predictions.map((pred, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(pred);
                    setPredictions([]);
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    background: 'rgba(129, 140, 248, 0.08)',
                    border: '1px solid rgba(129, 140, 248, 0.2)',
                    color: '#c7d2fe',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Click to autocomplete"
                >
                  {pred}
                </button>
              ))}
            </div>
          )}

          {/* Footer Message Input */}
          <div style={{ padding: '24px', borderTop: '1px solid var(--border)', background: 'rgba(5, 5, 8, 0.2)', display: 'flex', gap: '14px', alignItems: 'center' }}>
            {/* Mic Button for Speech-to-Text */}
            <button
              onClick={startListening}
              style={{
                background: isListening ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.02)',
                border: isListening ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                color: isListening ? '#fca5a5' : 'var(--text-secondary)',
                borderRadius: '50%',
                width: '42px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
                flexShrink: 0
              }}
              title={isListening ? "Listening... Speak now" : "Start Voice Input (Speech-to-Text)"}
            >
              <Mic size={18} className={isListening ? "pulse-mic" : ""} />
            </button>

            <input
              type="text"
              className="input-control"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder={isListening ? "Listening..." : `Message ${activeBot.name} (${activeBot.title})...`}
              disabled={isListening}
            />
            <button
              onClick={() => handleSend(input)}
              className={`icon-btn ${input.trim() ? 'active-send' : ''}`}
              disabled={!input.trim() || isTyping || isListening}
            >
              <Send size={18} />
            </button>
          </div>

        </div>
      ) : (
        /* Visual Analytics Dashboard View */
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '32px', gap: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <BarChart2 size={24} style={{ color: 'var(--accent-shopping)' }} />
              <h2 style={{ fontSize: '1.4rem', color: '#fff' }}>Smart Analytics Dashboard</h2>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Real-time insights on chatbot usage metrics, user sentiment trends, and response helpfulness (RLHF).
            </p>
          </div>

          {/* Metric Cards Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px' }}>
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>Total Interactions</span>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', marginTop: '6px' }}>
                {analytics.totalInteractions}
              </div>
            </div>
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>RLHF Satisfaction</span>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', marginTop: '6px' }}>
                {analytics.feedbackCounts.positive + analytics.feedbackCounts.negative === 0
                  ? '100%'
                  : `${Math.round((analytics.feedbackCounts.positive / (analytics.feedbackCounts.positive + analytics.feedbackCounts.negative)) * 100)}%`}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                {analytics.feedbackCounts.positive} positive / {analytics.feedbackCounts.negative} negative
              </span>
            </div>
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>User Sentiment</span>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#818cf8', marginTop: '6px' }}>
                {analytics.totalInteractions === 0
                  ? 'Neutral'
                  : analytics.sentimentCounts.positive >= analytics.sentimentCounts.negative
                    ? 'Positive'
                    : 'Needs Attention'}
              </div>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                +{analytics.sentimentCounts.positive} Pos / -{analytics.sentimentCounts.negative} Neg
              </span>
            </div>
          </div>

          {/* Visual Analytics Sections */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            {/* Sentiment Profile */}
            <div style={{ padding: '24px', background: 'rgba(20,20,31,0.2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontSize: '0.92rem', color: '#fff', marginBottom: '16px' }}>Detected Sentiment Distribution</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {Object.entries(analytics.sentimentCounts).map(([sentiment, count]) => {
                  const total = Object.values(analytics.sentimentCounts).reduce((a, b) => a + b, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  const colors = {
                    positive: '#10b981',
                    neutral: '#8e95b0',
                    negative: '#ef4444'
                  };
                  return (
                    <div key={sentiment} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-primary)', fontWeight: '600' }}>{sentiment} Sentiment</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{count} occurrences ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '999px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: colors[sentiment] || '#fff', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
