# 🤖 AmazeBot Hub — Multi-Agent Standalone AI Chatbot

A standalone, highly interactive, multi-agent AI Chatbot module built with **React**, **Vite**, **Express**, and custom CSS. It features multiple chatbot agent personalities, preset suggestion queries, response stream simulations, and automatic fallback capabilities.

---

## 🌟 Key Features

1. **Four Unique E-Commerce AI Personalities:**
   - **Kira (Personal Shopping Guide):** Specialized in product details, catalog browsing, specs, pricing, and purchase matches.
   - **Barton (Reseller Success Manager):** Entrepreneurial coach explaining merchant registration, vetting, catalog additions, and sales metrics.
   - **Nova (Customer Support Agent):** Efficient concierge resolving billing queries, order cancellations, and return policies.
   - **Vance (Platform Operations Guide):** Policy guide describing category creation, admin controls, and seller moderation guidelines.
2. **Automatic Gemini API Routing:**
   - Detects the `GEMINI_API_KEY` in the `backend/.env` file to route prompts directly to Google's Gemini-1.5-Flash model via clean, zero-dependency HTTPS requests.
   - Falls back to a smart, local e-commerce keyword matching NLP engine when offline or if no key is configured.
3. **Advanced Aesthetics:**
   - Responsive sidebar with active status indicators.
   - Dynamic theme shifting (changes accent color tokens and ambient radial glows depending on the selected agent).
   - Glassmorphic panels, scroll controls, and animated bubble typing indicators.
   - Global fetch interceptor to gracefully capture and report backend offline states.

---

## 📁 Directory Structure

```
ai-chatbot-module/
├── backend/
│   ├── .env                 # Port & AI API Credentials
│   ├── package.json         # Backend Dependencies
│   └── server.js            # Express endpoint /api/chat with API routes
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # React Main application view & logic
│   │   ├── index.css        # Custom CSS styling with animation keyframes
│   │   └── main.jsx         # Mounting React with fetch interceptor
│   ├── index.html
│   ├── package.json
│   └── vite.config.js       # Vite proxy routing to backend on port 5002
├── package.json             # Root Orchestration script
└── README.md
```

---

## ⚡ How to Set Up & Run

1. **Install Dependencies:**
   Navigate into the root of `ai-chatbot-module` and run:
   ```bash
   npm run install-all
   ```

2. **Configure API Key (Optional):**
   Open `backend/.env` and update the key to route chats to a live model:
   ```env
   GEMINI_API_KEY=your_real_gemini_api_key_here
   ```

3. **Start Development Servers:**
   Run the following command to spin up the Express server (port `5002`) and the Vite React app (port `3001`) concurrently:
   ```bash
   npm run dev
   ```

4. **Access the App:**
   Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 🔌 API-Based Architecture & Multi-Channel Deployment

The chatbot is built with a decoupled, stateless **API-first architecture**. It exposes a single consolidated interface:

### ✉️ Chat Endpoint
* **URL:** `/api/chat`
* **Method:** `POST`
* **Content-Type:** `application/json`
* **Request Body:**
  ```json
  {
    "message": "Do you sell wireless earbuds?",
    "personality": "shopping" 
  }
  ```
  *(Valid personalities: `shopping`, `reseller`, `support`, `moderation`)*
* **Response Body:**
  ```json
  {
    "reply": "We have the Quantum Wireless Earbuds in stock for ₹2,499.00 featuring ANC!",
    "source": "Gemini AI"
  }
  ```

---

## 🚀 Multi-Channel Integrations

Because of this stateless API design, the backend is ready for immediate deployment on other channels:

### 📱 1. Mobile Apps (React Native / Flutter)
Make standard HTTP post requests to the host endpoint:
```javascript
const response = await fetch('https://your-chatbot-backend/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: userMessage, personality: 'shopping' })
});
```

### 💬 2. Messaging Platforms (WhatsApp, Telegram, Slack)
You can wrap the `/api/chat` endpoint in webhook controllers for messaging platforms:
* **WhatsApp (Twilio API):** Set up a webhook pointing to your server that receives the inbound message, forwards it to `/api/chat`, and sends the `reply` back as an SMS/WhatsApp template response.
* **Telegram Bot:** Use the `node-telegram-bot-api` package to listen to incoming chat events, request the reply from the backend server, and invoke `bot.sendMessage(chatId, reply)`.
* **Slack Webhooks:** Configure a Slack slash command or bot event subscription. When triggered, read the channel command, post to the backend, and reply to the Slack channel hook.

### 🗣️ 3. Voice Assistants (Alexa / Google Assistant)
* Map the spoken utterances (intents) to the `message` payload.
* Route the message to the `/api/chat` endpoint.
* Return the text response wrapped in SSML (Speech Synthesis Markup Language) for the speaker to read aloud.
