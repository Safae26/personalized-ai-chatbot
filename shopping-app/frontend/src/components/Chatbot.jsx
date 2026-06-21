import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles } from 'lucide-react';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: "Hi! I am AmazeBot, your shopping assistant. I can search our catalog, explain shipping/payments, or guide you through creating seller accounts. Ask me anything!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const presetQuestions = [
    { text: "📦 What products do you sell?", query: "list products" },
    { text: "🤝 How do I become a seller?", query: "how to become a reseller" },
    { text: "🚚 What are shipping terms?", query: "shipping and delivery policy" },
    { text: "💳 How are payments handled?", query: "payment methods and razorpay" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  const handleSend = async (messageText) => {
    if (!messageText.trim()) return;

    // Add user message
    const userMsg = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: messageText
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText })
      });
      const data = await res.json();
      
      // Simulate organic thinking time
      setTimeout(() => {
        const botMsg = {
          id: `bot_${Date.now()}`,
          sender: 'bot',
          text: data.reply || "I didn't receive a reply from the server. Please try again."
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }, 700);
      
    } catch (err) {
      console.error('Chat error:', err);
      setTimeout(() => {
        const botMsg = {
          id: `bot_err_${Date.now()}`,
          sender: 'bot',
          text: "I'm having trouble connecting to the chat server right now. Make sure the backend server is running."
        };
        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
      }, 700);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend(input);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999, fontFamily: 'var(--font-sans)' }}>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent) 0%, #d97706 100%)',
            color: '#050508',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.4), 0 0 20px var(--accent-glow)',
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            outline: 'none'
          }}
          className="chatbot-toggle-btn"
          title="Open Chat Assistant"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            height: '520px',
            background: 'rgba(12, 12, 18, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg), 0 0 40px rgba(245, 158, 11, 0.15)',
            backdropFilter: 'var(--glass-blur)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'modalEnter 0.35s cubic-bezier(0.25, 0.8, 0.25, 1)'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px',
              background: 'linear-gradient(90deg, var(--bg-tertiary) 0%, rgba(20, 20, 31, 0.5) 100%)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--accent-glow)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)'
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  AmazeBot
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 8px var(--success)' }}></span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AI Store Assistant</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  width: '100%'
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '12px 16px',
                    borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: msg.sender === 'user' 
                      ? 'linear-gradient(135deg, var(--accent) 0%, #d97706 100%)' 
                      : 'var(--bg-tertiary)',
                    color: msg.sender === 'user' ? '#050508' : 'var(--text-primary)',
                    border: msg.sender === 'user' ? 'none' : '1px solid var(--border)',
                    fontSize: '0.88rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-line',
                    boxShadow: msg.sender === 'user' ? '0 4px 12px rgba(245, 158, 11, 0.2)' : 'none',
                    fontWeight: msg.sender === 'user' ? '600' : '400'
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)', animation: 'bounce 1.4s infinite ease-in-out both 0.2s' }}></span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)', animation: 'bounce 1.4s infinite ease-in-out both 0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          {messages.length === 1 && !isTyping && (
            <div
              style={{
                padding: '0 20px 14px 20px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              {presetQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q.query)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.78rem',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  className="quick-chip"
                >
                  {q.text}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border)',
              background: 'rgba(5, 5, 8, 0.4)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask AmazeBot..."
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(12, 12, 18, 0.6)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '0.88rem'
              }}
            />
            <button
              onClick={() => handleSend(input)}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                background: input.trim() 
                  ? 'linear-gradient(135deg, var(--accent) 0%, #d97706 100%)' 
                  : 'var(--bg-tertiary)',
                color: input.trim() ? '#050508' : 'var(--text-secondary)',
                border: input.trim() ? 'none' : '1px solid var(--border)',
                cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              disabled={!input.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
