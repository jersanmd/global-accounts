# 🛡️ RaidStore

A premium gaming account marketplace with middleman verification, escrow payments, and secure trading.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery)](https://tanstack.com/query)
[![Tests](https://img.shields.io/badge/Tests-86_passing-10B981?logo=vitest)](https://vitest.dev/)

## ✨ Features

### Marketplace
| Feature | Description |
|---|---|
| 🎮 **Browse & Search** | Search by game, rank, inventory. Filter by platform, risk rating, price range |
| 🛡️ **Middleman Verification** | Verified middlemen witness account transfers in private Discord channels |
| 💳 **Escrow Payments** | Stripe-powered payments held in escrow until transfer is verified |
| 📸 **Screenshots** | Up to 15 screenshots per listing with lightbox viewer |
| 🏷️ **Dynamic Categories** | Game names auto-populate from existing listings |

### User Dashboard
| Feature | Description |
|---|---|
| 👤 **Buyer Dashboard** | Purchase showcase carousel, quick links, transaction history |
| 💰 **Seller Dashboard** | 5-stat unified cards, filterable recent sales, earnings breakdown, listing management |
| ⚖️ **Middleman Panel** | Active/History split, Discord channel creation, confirmation dialogs on all actions |
| 🛡️ **Admin Panel** | User management, transaction editing, listing toggling, delete with RPC fallback |

### Platform
| Feature | Description |
|---|---|
| 🌙 **Dark Mode** | System-preference detection, localStorage persistence, global CSS overrides |
| 📱 **Responsive** | Mobile-first design across all pages |
| 🔔 **Notifications** | Real-time toast notifications for transaction status changes |
| ⭐ **Reviews** | Star ratings and reviews for completed transactions |
| 🧪 **Testing** | 86 unit tests across 6 files (Vitest + Testing Library) |

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
npm test         # Run 86 unit tests
npm run preview  # Preview production build
```

Run the migrations in `supabase/migrations/` in order:
1. `00001_initial_schema.sql` — Tables, RLS policies, triggers
2. `00002_seed_listings.sql` — Demo listings (optional)
3. `00003_add_last_seen.sql` — Online status support
4. `00004_add_avatar_url.sql` — Avatar uploads

## 📁 Project Structure

```
src/
├── components/        # Layout, ListingCard, StarRating
├── contexts/          # AuthContext, SearchContext, ServerContext
├── hooks/             # useListings, useTransactions, useReviews, usePlatforms…
├── lib/               # supabase client, types, constants, utils
├── pages/             # BrowseListings, ListingDetail, Dashboard, Profile, CreateListing…
└── main.tsx           # Entry point

supabase/
├── functions/         # Edge Functions (discord-notify)
└── migrations/        # SQL migrations
```

## 📄 License

MIT
