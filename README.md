# 🌍 GlobalAccount

A premium gaming account marketplace with middleman verification, escrow payments, and secure trading.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vite.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery)](https://tanstack.com/query)

## ✨ Features

| Feature | Description |
|---|---|
| 🎮 **Account Listings** | Browse, search & filter gaming accounts across multiple platforms |
| 🛡️ **Middleman System** | Verified middlemen witness account transfers for safe trading |
| 💳 **Escrow Payments** | Funds held in escrow until transfer is verified |
| 📸 **Image Upload** | Up to 15 screenshots per listing with clipboard paste support |
| 🔍 **Dynamic Categories** | Game & platform filters populated from active listings |
| 👤 **Seller Profiles** | Ratings, reviews, KYC verification, online status |
| 💰 **Withdrawals** | GCash, Maya, PayPal payout methods for sellers |
| 📊 **Dashboard** | Real-time stats, listing management with edit/delete |
| 🌙 **Premium UI** | Dark navbar, gradient cards, lightbox viewer, responsive design |

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS 4
- **State**: TanStack Query v5 (`staleTime: 0, refetchOnMount: true`)
- **Routing**: React Router v7
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions, RLS)
- **Icons**: Lucide React
- **Forms**: Custom hooks with validation

## 🚀 Getting Started

```bash
# Clone
git clone https://github.com/jersanmd/global-accounts.git
cd global-accounts

# Install
npm install

# Set up environment
cp .env.example .env
# Fill in your Supabase URL + anon key

# Run
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Setup

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
