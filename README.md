# 🛡️ RaidStore

A premium gaming marketplace with middleman verification, escrow-protected payments, wallet withdrawals, and secure trading.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery)](https://tanstack.com/query)
[![Tests](https://img.shields.io/badge/Tests-116_passing-10B981?logo=vitest)](https://vitest.dev/)

## ✨ Features

### 🛒 Marketplace
| Feature | Description |
|---|---|
| 🎮 **Browse & Search** | 28 supported games. Filter by game, platform, risk rating, price range, listing type |
| 🛡️ **Middleman Verification** | Live middlemen verify account transfers in private Discord channels |
| 💳 **Escrow Payments** | Stripe payments held in escrow, released to seller wallet on completion |
| 📸 **Screenshots** | Up to 15 screenshots per listing with lightbox viewer |
| 🏷️ **Dynamic Categories** | Game names + emoji icons auto-populate from existing listings |
| 🔽 **Smooth Scroll** | Click a game pill in the hero to scroll directly to listings |

### 📊 Seller Finance Dashboard
| Feature | Description |
|---|---|
| 💰 **Revenue KPI** | Month/Year/All toggle for gross sales tracking |
| ✅ **Released KPI** | Net earnings (92%) with escrow badge for pending funds |
| 🏦 **Wallet KPI** | Withdrawable balance with direct link to earnings |
| 📋 **Sales Table** | Proper data table with Transaction, Date, Status, Fee, Amount columns |
| 📦 **My Listings** | Compact card view with edit/delete, View All → full management page |
| 🔍 **Filter Chips** | Quick All / Completed / Pending toggles with live counts |

### 💵 Wallet & Withdrawals
| Feature | Description |
|---|---|
| 🏦 **Wallet Balance** | Real-time balance from immutable ledger |
| 📤 **Withdraw** | Select sales → choose GCash/Maya/Bank Transfer → confirm |
| 📜 **Withdrawal History** | Expandable batches showing each sale within a withdrawal |
| 🔒 **Server-Side Validation** | RPC validates `auth.uid()`, row locks prevent double-withdrawal, amounts from DB not frontend |

### 👥 Role-Based Dashboards
| Role | Features |
|---|---|
| 👤 **Buyer** | Purchase carousel, quick links, transaction history |
| 💰 **Seller** | Finance KPIs, listings management, sales table, wallet, withdrawal history |
| ⚖️ **Middleman** | Active/History queue, Discord channel creation, step-by-step verification |
| 🛡️ **Admin** | User management, transaction editing, listing control, delete with RPC fallback |

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
