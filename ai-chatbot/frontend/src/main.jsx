import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global Fetch Interceptor to catch server offline states in the chatbot playground
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const res = await originalFetch(...args);
    const originalJson = res.json;
    
    res.json = async () => {
      const contentType = res.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      if (!res.ok) {
        let errMsg = `Server responded with status ${res.status}`;
        try {
          if (isJson) {
            const data = await originalJson.call(res);
            errMsg = data.reply || data.message || errMsg;
          } else {
            const text = await res.text();
            if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
              errMsg = "Vite gateway: Backend chatbot server is offline.";
            } else {
              errMsg = text.substring(0, 100);
            }
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errMsg);
      }
      
      if (!isJson) {
        const text = await res.text();
        if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
          throw new Error("Chat server returned HTML instead of API response.");
        }
        return JSON.parse(text);
      }
      
      return await originalJson.call(res);
    };
    return res;
  } catch (err) {
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      throw new Error('Could not connect to Chatbot API Server. Please verify the backend service is running on port 5002.');
    }
    throw err;
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
