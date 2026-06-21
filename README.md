# 🛍️ Shopping App with AI-Powered Chatbot Assistant

## 📋 Project Overview 

The **Shopping App with AI Chatbot** is a complete e-commerce platform that integrates an intelligent conversational AI assistant to enhance the shopping experience. The application combines a full-featured shopping interface  (product catalog, cart management, checkout, order tracking) with a dynamic chatbot 💬 that understands natural language, provides product recommendations, answers customer queries, and assists with order-related tasks.

The chatbot leverages **Natural Language Processing (NLP)**, **Machine Learning (ML)**, and **Deep Learning** to deliver personalized, context-aware interactions that help users discover products, make purchasing decisions, and resolve issues in real-time.

### Key Features

| 🛒 Shopping App | 🤖 AI Chatbot Assistant |
|-----------------|-------------------------|
| User authentication & profiles | Natural language understanding |
| Product catalog with search & filters | Intent recognition & entity extraction |
| Smart cart with discounts | Personalized product recommendations |
| Secure checkout & payments | Order status & tracking support |
| Real-time order tracking | Contextual conversation memory |
| Reviews & ratings | 24/7 customer query resolution |
| Wishlist & favorites | Admin analytics & model training |


The **Multi-Role E-Commerce Platform** was done in a React frontend and an Express/SQLite backend.

1. **`backend` (Express.js & SQLite3)**
   - Manages users, product categories, products, shopping carts, orders, and product reviews.
   - Includes seed data to populate the SQLite database (`database.sqlite`) on first launch.
   - Integrates mock Razorpay payment processing.
   
2. **`frontend` (React 19 & Vite)**
   - The app supports three roles:
     - **Customer**: Browse products, manage cart, place orders, and leave reviews.
     - **Seller**: Add, edit, and delete product listings, and view stock status.
     - **Admin**: Approve or suspend users/sellers and manage product categories.
---

### 🔐 Default Test Accounts
The database will automatically seed the following accounts to test different roles:

| Role | Email | Password | Status |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@amazon.com` | `admin123` | Approved |
| **Seller** | `reseller@amazon.com` | `reseller123` | Approved |
| **Customer** | `customer@amazon.com` | `customer123` | Approved |

---

### 🚀 How to Run the Project

Open your terminal and run the following commands in the workspace directory:

1. **Navigate to the app module:**
   ```powershell
   cd "shopping-app-module"
   ```

2. **Install all dependencies** (for root, backend, and frontend):
   ```powershell
   npm run install-all
   ```

3. **Start the application** (runs both frontend and backend concurrently):
   ```powershell
   npm run dev
   ```

Once started, the console will display the URLs for the frontend (typically `http://localhost:5173`) and the backend (typically `http://localhost:5001`). Open the frontend URL in your browser to test it out.


- Chatbot that calls Google's Gemini API. 

1. Go to Google AI Studio / Google Cloud Console and **generate a key immediately**.
2. Replace it with `os.environ.get('GEMINI_API_KEY')` and load it from an environment variable via a `.env` file that's git-ignored.

### What's needed to run it

**Prerequisites:**
- Python 3.7+
- Internet access (to reach the Gemini API)
- A valid Gemini API key 

**Install & run:**
```bash
pip install -r requirements.txt   # Flask, requests, flask-cors
python server.py
```
Then open `http://localhost:5000`.


The Dynamic AI Chatbot is a conversational AI system that can understand natural 
language, respond contextually, and provide intelligent interactions. It leverages Natural 
Language Processing (NLP), Machine Learning (ML), and Deep Learning to deliver a 
seamless user experience. 

Key Features:

1. NLP-Based Conversational Understanding 
 Intent Recognition to understand user queries. 
 Named Entity Recognition (NER) for extracting important information. 
 Contextual Memory to maintain conversation flow. 

2. Multi-Platform Integration 
 Can be deployed on Web, Mobile, WhatsApp, Slack, Telegram, and Voice 
Assistants. 
 API-based architecture for easy integration with third-party services. 

3. AI-Powered Response Generation 
 Rule-based and ML-driven response models. 
 Generative AI (GPT-based models) for dynamic responses. 
 Pre-trained responses for FAQs and structured queries.
 
4. Sentiment Analysis & Emotion Detection 
 Detects user sentiment (positive, negative, neutral). 
 Adjusts responses based on sentiment analysis. 
 Personalized responses based on detected emotions. 

5. Self-Learning & Adaptive AI 
 Uses Reinforcement Learning to improve over time. 
 Learns from past interactions to provide better responses. 
 Automated error handling & fallback mechanisms. 

6. Smart Analytics Dashboard 
 Tracks chatbot performance, user interactions, and response efficiency. 
 Provides insights on user behavior and conversation trends. 
 Visual analytics for response effectiveness. 

- Voice-enabled chatbot with speech-to-text capabilities. 
- Multilingual support for broader accessibility. 
- AI-based predictive suggestions for better user interaction. 

customer support system:
- answers about orders, tracking system,..
- billing details and documents.
- purchases, payments, saving amounts
- purchases during a certain period of time
- customers can ask any detailed questions and still get accurate answers
- helping the shopping company reduce human virtual assistants

