import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Fetch Interceptor to gracefully handle API errors and non-JSON/offline server states
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const res = await originalFetch(...args);
    
    // Wrap the response's json() function
    const originalJson = res.json;
    res.json = async () => {
      const contentType = res.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      if (!res.ok) {
        let errorMessage = `Server error (Status ${res.status})`;
        try {
          if (isJson) {
            const errData = await originalJson.call(res);
            errorMessage = errData.message || errorMessage;
          } else {
            const text = await res.text();
            if (text) {
              try {
                const errData = JSON.parse(text);
                errorMessage = errData.message || errorMessage;
              } catch (e) {
                if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
                  errorMessage = `API Server is offline or undergoing maintenance (Vite Proxy Gateway Error).`;
                } else {
                  errorMessage = text.substring(0, 150);
                }
              }
            }
          }
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }
      
      if (res.status === 204 || res.status === 304) {
        return null;
      }
      
      if (!isJson) {
        const text = await res.text();
        if (text.includes('<!DOCTYPE html>') || text.includes('<html>')) {
          throw new Error(`API Server is offline or returned HTML page.`);
        }
        try {
          return JSON.parse(text);
        } catch (err) {
          throw new Error(`Expected JSON but received: ${text.substring(0, 100)}`);
        }
      }
      
      try {
        return await originalJson.call(res);
      } catch (err) {
        throw new Error(`Malformed JSON response: ${err.message}`);
      }
    };
    
    return res;
  } catch (err) {
    // Catch network connect errors (e.g. server completely down and no proxy gateway)
    if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
      throw new Error('Could not connect to the API Server. Please ensure the backend server is running.');
    }
    throw err;
  }
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
