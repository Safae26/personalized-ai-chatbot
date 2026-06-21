import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles } from 'lucide-react';

export default function Chatbot({ token, user }) {
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

  const downloadAsTXT = (text) => {
    const cleanText = text.replace(/🧾\s*/g, '');
    const element = document.createElement("a");
    const file = new Blob([cleanText], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    
    const orderIdMatch = text.match(/Order Reference:\*\*\s*#?ORD-(\d+)/i) || text.match(/ORD-(\d+)/i) || text.match(/order\s*#?(\d+)/i);
    const filename = orderIdMatch ? `invoice_ORD_${orderIdMatch[1]}.txt` : 'invoice.txt';
    
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadAsPDF = (text) => {
    const lines = text.split('\n');
    
    let orderRef = 'N/A';
    let date = 'N/A';
    let customerName = 'N/A';
    let email = 'N/A';
    let address = 'N/A';
    let gateway = 'N/A';
    let subtotal = 'N/A';
    let shipping = '₹0.00';
    let total = 'N/A';
    const items = [];
    
    let parsingItems = false;
    
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('order reference:')) {
        orderRef = line.split(/order reference:\*\*/i)[1]?.replace(/[^a-zA-Z0-9#-]/g, '').trim() || 'N/A';
      } else if (lower.includes('transaction date:')) {
        date = line.split(/transaction date:\*\*/i)[1]?.trim() || 'N/A';
      } else if (lower.includes('customer name:')) {
        customerName = line.split(/customer name:\*\*/i)[1]?.trim() || 'N/A';
      } else if (lower.includes('registered email:')) {
        email = line.split(/registered email:\*\*/i)[1]?.trim() || 'N/A';
      } else if (lower.includes('billing & shipping address:')) {
        address = line.split(/billing & shipping address:\*\*/i)[1]?.trim() || 'N/A';
      } else if (lower.includes('payment gateway:')) {
        gateway = line.split(/payment gateway:\*\*/i)[1]?.trim() || 'N/A';
      } else if (lower.includes('subtotal:')) {
        subtotal = line.split(/subtotal:\*\*/i)[1]?.trim() || 'N/A';
      } else if (lower.includes('shipping & processing:')) {
        shipping = line.split(/shipping & processing:\*\*/i)[1]?.trim() || 'N/A';
      } else if (lower.includes('total paid amount:')) {
        total = line.split(/total paid amount:\*\*/i)[1]?.trim() || 'N/A';
      }
      
      if (lower.includes('purchased items:')) {
        parsingItems = true;
      } else if (parsingItems && line.startsWith('------')) {
        if (items.length > 0) {
          parsingItems = false;
        }
      } else if (parsingItems && (line.trim().startsWith('•') || line.trim().startsWith('*'))) {
        const cleanLine = line.replace(/^[•*]\s*/, '').trim();
        const titleMatch = cleanLine.match(/\*\*(.*?)\*\*/);
        const title = titleMatch ? titleMatch[1] : 'Product';
        
        const qtyMatch = cleanLine.match(/\(Qty:\s*(\d+)\)/i);
        const qty = qtyMatch ? qtyMatch[1] : '1';
        
        const priceMatch = cleanLine.match(/-\s*(.*?)\s*each/i) || cleanLine.match(/-\s*(.*?)$/);
        const price = priceMatch ? priceMatch[1].trim() : 'N/A';
        
        items.push({ title, qty, price });
      }
    });
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print or download the invoice PDF.");
      return;
    }
    
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: left; font-weight: 500;">${item.title}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #6b7280;">${item.qty}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.price}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${item.price}</td>
      </tr>
    `).join('');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${orderRef}</title>
          <style>
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              color: #1f2937;
              margin: 0;
              padding: 40px;
              background-color: #f9fafb;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .invoice-box {
              max-width: 800px;
              margin: auto;
              padding: 40px;
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #f59e0b;
              padding-bottom: 24px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: 800;
              color: #111827;
              letter-spacing: -0.025em;
            }
            .logo span {
              color: #f59e0b;
            }
            .invoice-title {
              font-size: 24px;
              font-weight: 800;
              color: #f59e0b;
              letter-spacing: 0.05em;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-bottom: 40px;
            }
            .section-title {
              font-size: 12px;
              text-transform: uppercase;
              color: #9ca3af;
              margin-bottom: 12px;
              font-weight: 700;
              letter-spacing: 0.05em;
              border-bottom: 1px solid #f3f4f6;
              padding-bottom: 6px;
            }
            .info-block p {
              margin: 6px 0;
              font-size: 14px;
            }
            .info-block p strong {
              color: #4b5563;
              font-weight: 600;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              font-size: 14px;
            }
            th {
              background-color: #f9fafb;
              padding: 12px;
              font-weight: 700;
              color: #4b5563;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.05em;
              border-bottom: 2px solid #e5e7eb;
            }
            .totals {
              float: right;
              width: 320px;
              margin-top: 20px;
              font-size: 14px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              color: #4b5563;
            }
            .totals-row.grand-total {
              font-weight: 800;
              font-size: 18px;
              color: #111827;
              border-top: 2px solid #f59e0b;
              background-color: #fffbeb;
              border-radius: 6px;
              padding: 12px;
              margin-top: 8px;
            }
            .footer {
              margin-top: 80px;
              text-align: center;
              font-size: 12px;
              color: #9ca3af;
              border-top: 1px solid #e5e7eb;
              padding-top: 24px;
            }
            @media print {
              body {
                background-color: #ffffff;
                padding: 0;
              }
              .invoice-box {
                border: none;
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-box">
            <div class="header">
              <div class="logo">Amaze<span>Kart</span></div>
              <div class="invoice-title">INVOICE</div>
            </div>
            
            <div class="grid">
              <div class="info-block">
                <div class="section-title">Invoice Details</div>
                <p><strong>Order Ref:</strong> ${orderRef}</p>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Payment Gateway:</strong> ${gateway}</p>
              </div>
              <div class="info-block">
                <div class="section-title">Billed To</div>
                <p><strong>Name:</strong> ${customerName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Shipping Address:</strong> ${address}</p>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="text-align: left; width: 45%;">Item</th>
                  <th style="text-align: center; width: 15%;">Qty</th>
                  <th style="text-align: right; width: 20%;">Price</th>
                  <th style="text-align: right; width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="totals">
              <div class="totals-row">
                <span>Subtotal</span>
                <strong>${subtotal}</strong>
              </div>
              <div class="totals-row">
                <span>Shipping & Handling</span>
                <strong style="color: #10b981;">${shipping}</strong>
              </div>
              <div class="totals-row grand-total">
                <span>Total Paid</span>
                <span>${total}</span>
              </div>
            </div>
            
            <div style="clear: both;"></div>
            
            <div class="footer">
              <p style="font-weight: 600; color: #6b7280; margin-bottom: 4px;">Thank you for shopping with AmazeKart!</p>
              <p>For support inquiries, please contact us at support@amazekart.com</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Dynamically update welcome message based on user login state
  useEffect(() => {
    if (user) {
      setMessages([
        {
          id: 'welcome',
          sender: 'bot',
          text: `Hi ${user.name}! I am AmazeBot, your premium shopping assistant. I can track your orders, retrieve billing/invoices, summarize your purchases/payments/savings, or show catalog items. How can I help you today?`
        }
      ]);
    } else {
      setMessages([
        {
          id: 'welcome',
          sender: 'bot',
          text: "Hi! I am AmazeBot, your shopping assistant. I can search our catalog, explain shipping/payments, or guide you through creating seller accounts. Ask me anything!"
        }
      ]);
    }
  }, [user]);

  const presetQuestions = user ? [
    { text: "📦 What products do you sell?", query: "list products" },
    { text: "📋 Show my orders & tracking", query: "show my orders" },
    { text: "💰 How much have I saved?", query: "my savings" },
    { text: "🧾 Billing & Invoices", query: "billing details" }
  ] : [
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
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
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
                  {msg.sender === 'bot' && msg.text.includes('INVOICE / BILLING DOCUMENT') && (
                    <div style={{
                      marginTop: '12px',
                      display: 'flex',
                      gap: '8px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      paddingTop: '8px'
                    }}>
                      <button
                        onClick={() => downloadAsPDF(msg.text)}
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: 'var(--accent)',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                      >
                        📄 Download PDF
                      </button>
                      <button
                        onClick={() => downloadAsTXT(msg.text)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                      >
                        💾 Download TXT
                      </button>
                    </div>
                  )}
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
