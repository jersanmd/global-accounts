# 🛡️ RaidStore

A premium gaming marketplace with middleman verification, crypto payments, in-app chat, and escrow-protected trading.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery)](https://tanstack.com/query)
[![Tests](https://img.shields.io/badge/Tests-passing-10B981?logo=vitest)](https://vitest.dev/)

## ✨ Features

### 💎 Crypto Payments
| Feature | Description |
|---|---|
| 🪙 **138 Coins** | BTC, ETH, USDC, USDT, SOL, and 130+ more across 4 networks |
| 🔗 **Multi-Network** | Ethereum, BSC, TRON, Klaytn with auto-detection |
| 🏦 **Binance Rails** | Direct wallet-to-wallet deposits via Binance addresses |
| 🔍 **Blockchain Verification** | Etherscan/BscScan/TronGrid/KlaytnScope tx verification |
| 📋 **Binance-Style UI** | 3-step deposit: Select Coin → Network → Deposit |

### 💬 In-App Chat (Facebook-Style)
| Feature | Description |
|---|---|
| 💬 **Direct Messages** | Buyer ↔ Seller, Seller ↔ Seller with real-time messaging |
| 👥 **Group Chats** | Middleman creates group with buyer + seller per transaction |
| 🏷️ **Role Badges** | [SELLER], [ADMIN], [MIDDLEMAN] visible in chat UI |
| 🎨 **Premium UI** | Gradient headers, animations, avatars, consistent sizing |
| ⚡ **Supabase Realtime** | Instant message delivery via Postgres changes |

### 🛒 Marketplace
| Feature | Description |
|---|---|
| 🎮 **Browse & Search** | Filter by game, platform, risk rating, price range, listing type |
| 🛡️ **Middleman Verification** | Live middlemen verify trades in group chats |
| 💳 **Escrow Payments** | Crypto payments secured by middleman escrow |
| 📸 **Screenshots** | Up to 15 screenshots per listing with lightbox viewer |

### 📊 Seller Dashboard
| Feature | Description |
|---|---|
| 💰 **Revenue KPI** | Month/Year/All toggle for gross sales tracking |
| ✅ **Released KPI** | Net earnings with escrow badge for pending funds |
| 🏦 **Wallet KPI** | Withdrawable balance with direct link to earnings |
| 📦 **My Listings** | Compact card view with edit/delete, stock tracking |

### 💵 Wallet & Withdrawals
| Feature | Description |
|---|---|
| 🏦 **Wallet Balance** | Real-time balance from immutable ledger |
| 📤 **Withdraw** | Select sales → choose payment method → confirm |
| 📜 **Withdrawal History** | Expandable batches showing each sale |

### 👥 Role-Based Dashboards
| Role | Features |
|---|---|
| 👤 **Buyer** | Browse, purchase, chat, transaction history |
| 💰 **Seller** | Finance KPIs, listings, sales, wallet, withdrawals |
| ⚖️ **Middleman** | Queue, group chat creation, step-by-step verification |
| 🛡️ **Admin** | User management, transaction editing, listing control |

### 🎨 Platform
| Feature | Description |
|---|---|
| 🌙 **Dark Mode** | System-preference, localStorage persistence, all components covered |
| 📱 **Responsive** | Mobile-first across all 14 pages |
| 🔔 **Notifications** | Real-time Supabase subscriptions for status changes |
| ⭐ **Reviews** | Star ratings + reviews for completed transactions |
| 🧪 **Testing** | 116 tests across 10 files (Vitest + Testing Library) |

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS 4
- **State**: TanStack Query v5 (`staleTime: 0, refetchOnMount: true`)
- **Routing**: React Router v7
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
- **Payments**: Stripe integration via Edge Functions
- **Icons**: Lucide React
- **Testing**: Vitest, Testing Library, jsdom

## 🚀 Getting Started

```bash
git clone https://github.com/jersanmd/raidstore.git
cd raidstore
npm install
cp .env.example .env  # Add Supabase URL + anon key + Stripe keys
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm test         # Run 116 unit tests
npm run preview  # Preview production build
```

## 🗄️ Database Migrations

Run in order via Supabase SQL Editor:

| # | File | Purpose |
|---|---|---|
| 00001 | `initial_schema.sql` | Core tables, RLS, auth trigger |
| 00002 | `seed_listings.sql` | Demo data |
| 00003 | `add_last_seen.sql` | Online status |
| 00004 | `add_avatar_url.sql` | Avatar uploads |
| 00005 | `add_transaction_history.sql` | Audit trail trigger |
| 00006 | `add_discord_invites.sql` | Discord bot config |
| 00007 | `add_buyer_listing_update.sql` | Buyer listing updates |
| 00008-12 | `listing_view`, `get_listing_for_participant`, `get_transactions_with_listings`, `get_seller_transactions`, `get_all_game_names` | SECURITY DEFINER RPCs |
| 00013 | `add_stock_to_listings.sql` | Inventory tracking |
| 00014 | `add_title_to_listings.sql` | Custom listing titles |
| 00015 | `add_quantity_to_transactions.sql` | Quantity in transactions |
| 00016 | `deduct_listing_stock.sql` | Auto-deduct RPC |
| 00017 | `wallet_system.sql` | Wallets, ledger, 4 RPCs (escrow release, withdraw, withdrawable entries, withdrawal history) |

## 📁 Project Structure

```
src/
├── components/        # Layout, ListingCard, StripeCheckout, StarRating,
│                      # ProtectedRoute, WithdrawalPanel, WithdrawalHistory
├── contexts/          # AuthContext, SearchContext
├── hooks/             # useListings, useTransactions, useWallet,
│                      # useReviews, useNotifications, useDebounce…
├── lib/               # supabase client, types, constants, utils, rotation
├── pages/             # BrowseListings, ListingDetail, CreateListing,
│                      # Dashboard, MyListingsView, TransactionView,
│                      # Profile, MiddlemanDashboard, AdminDashboard,
│                      # Login, SetupProfile, TermsOfService, PrivacyPolicy
└── main.tsx           # Entry point

supabase/
├── functions/         # 6 Edge Functions (discord-bot, stripe, escrow, refund)
└── migrations/        # 17 SQL migrations
```

## 🧪 Test Coverage

| File | Tests |
|---|---|
| `constants.test.ts` | 14 |
| `extra-coverage.test.ts` | 23 |
| `utils.test.ts` | 35 |
| `useDebounce.test.ts` | 5 |
| `useOnlineStatus.test.ts` | 7 |
| `useWallet.test.tsx` | 4 |
| `StarRating.test.tsx` | 2 |
| `WithdrawalPanel.test.tsx` | 10 |
| `WithdrawalHistory.test.tsx` | 8 |
| `ProtectedRoute.test.tsx` | 8 |
| **Total** | **116** |

## 📄 License

MIT
