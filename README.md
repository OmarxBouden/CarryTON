# CarryTON 📦

> Everyone's going somewhere. Someone's going your way.

A community delivery and carpooling network that lives inside Telegram. AI-powered route matching with intelligent pricing. TON escrow payments. Zero fleet required.

## How it works

1. **Carriers** post their trips: "I'm driving Lausanne → Geneva at 9am"
2. **Requesters** post delivery needs or ride requests: "Send my package from Lausanne to Lyon" or "I need a ride for 2 to Geneva"
3. **AI agent** finds the best route — including multi-hop relays through intermediate carriers — and sets fair prices automatically
4. **TON escrow** locks payment until both sides confirm delivery
5. **Badges & avatars** evolve as users build reputation through peer reviews and tips

## Features

- 🤖 **AI matching engine** — LLM-powered agent (Groq/Ollama/Claude) finds optimal single-hop, multi-hop relay, and sub-route matches. CFF-style connection search.
- 💰 **Intelligent pricing** — AI sets fair prices based on distance, effort, urgency, and carrier reputation. Proportional pricing for sub-routes.
- 📦 **Bundle discounts** — Multiple packages on the same route get automatic 20% discounts
- 🔒 **TON escrow** — Tact smart contract with 24h auto-refund protection. Mock fallback for testnet demo.
- 💱 **Fiat price display** — All TON prices show live local currency equivalent (CHF/EUR/USD) via CoinGecko
- 🎮 **Gamification** — 6 travel animal avatars, 12 achievement badges with auto-attribution, XP progression with 5 evolution levels, tipping system
- 🎙️ **Voice requests** — Speak to your travel animal avatar to post a delivery request. LLM parses natural language into structured data.
- 🚗 **Carpooling** — Carriers can offer seats for passengers alongside package delivery. Seat-based pricing.
- 📱 **Telegram-native** — Runs as a Mini App with bot notifications for match updates, pickup, delivery, and payment events
- 🏃 **Errand mode** — Carrier picks up items from shops/post offices on your behalf
- 💸 **Tipping** — Tip your carrier after delivery. 100% goes to the carrier. AI-suggested amounts. Earns XP and badges.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS (Telegram Mini App) |
| Backend | Node.js + Express + SQLite |
| AI | Configurable LLM: Groq (free, default), Ollama (local), or Claude API |
| Blockchain | TON testnet (Tact escrow smart contract) |
| Bot | Telegram Bot API (grammy) |
| Wallet | TON Connect |
| Distribution | Telegram Mini App |

## Architecture

```
User ←→ Telegram Mini App (Next.js)
         ↕
   REST API (Express + SQLite)
     ↕              ↕
TON Escrow       LLM Provider
  (Tact)       (Groq / Ollama / Claude)
     ↕
Telegram Bot
(notifications)
```

## Quick start

```bash
# Clone and install
git clone https://github.com/OmarxBouden/CarryTON.git
cd CarryTON

# Backend
cd backend
cp .env.example .env     # Add your Groq API key (free at console.groq.com)
npm install
npm run seed             # Load demo data
npm run dev              # Starts on :3001

# Frontend (new terminal)
cd frontend
npm install
npm run dev              # Starts on :3000

# Bot (new terminal, optional)
cd bot
cp .env.example .env     # Add bot token
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.

## Demo

- Telegram Bot: @CarryTON_bot
- Mini App: [deployed URL]
- Token: **Blockixchainix (BXC)** on TON testnet
- Testnet explorer: [tonviewer.com](https://testnet.tonviewer.com)

## Monetization

5% protocol fee on every settled delivery, deducted from escrow at release. LLM inference cost per match: ~$0.002 via Groq free tier — negligible against fee revenue at scale.

## Team

Built at Alphaton 2026, BSA EPFL.
