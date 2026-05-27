-- Seed: 8 game account listings (idempotent — safe to re-run)
-- Copy entire contents → paste into Supabase SQL Editor → Run

-- Seller (skip if exists from previous run)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('a0000000-0000-0000-0000-000000000001', 'seller@ga.demo', '', now(), '{"provider":"email"}', '{}', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, role, kyc_status, discord_username, avg_rating)
VALUES ('a0000000-0000-0000-0000-000000000001', 'seller@ga.demo', 'seller', 'approved', 'demo_seller#1234', 4.8)
ON CONFLICT (id) DO NOTHING;

-- 8 Listings (idempotent)
INSERT INTO listings (id, seller_id, game, platform, rank, price_usd, inventory_summary, risk_rating, status, screenshots_urls) VALUES
('b0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Genshin Impact', 'PC', 'AR 60', 450.00, 'C6 Raiden Shogun, C6 Yelan, C4 Nahida. 35+ 5★ chars. All regions 100% explored. 240+ days Welkin. Original email included.', 'low', 'active', ARRAY['https://images.unsplash.com/photo-1612404730960-5c71577fca11?w=600&h=400&fit=crop','https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&h=400&fit=crop']),
('b0000002-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Honkai: Star Rail', 'PC', 'TL 70', 380.00, 'E6 Acheron, E6 Sparkle, E2 Dan Heng IL. Full MoC 12 clears. All events completed. Day 1 player. Email changeable.', 'medium', 'active', ARRAY['https://images.unsplash.com/photo-1552820728-8b83bb6b2cf7?w=600&h=400&fit=crop','https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=600&h=400&fit=crop']),
('b0000003-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Valorant', 'PC', 'Diamond 2', 220.00, 'Prime Vandal, Reaver Operator, Oni Phantom. 15+ premium skins. Battle pass done since EP3. Peak Ascendant 1. Clean record.', 'low', 'active', ARRAY['https://images.unsplash.com/photo-1542751110-97427bbecf20?w=600&h=400&fit=crop','https://images.unsplash.com/photo-1499198116522-4a6235013d63?w=600&h=400&fit=crop']),
('b0000004-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'League of Legends', 'PC', 'Grandmaster 450LP', 550.00, '200+ skins: Pulsefire Ezreal, Spirit Guard Udyr, DJ Sona. All champions unlocked. Honor 5. Clean chat history.', 'medium', 'active', ARRAY['https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=600&h=400&fit=crop','https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&h=400&fit=crop']),
('b0000005-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Fortnite', 'PlayStation', 'Level 320', 180.00, 'Black Knight, Renegade Raider, Aerial Assault Trooper. 100+ skins. Save the World Founder. OG email included.', 'low', 'active', ARRAY['https://images.unsplash.com/photo-1580327344181-c1163234e5a0?w=600&h=400&fit=crop','https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&h=400&fit=crop']),
('b0000006-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Apex Legends', 'PC', 'Predator #247', 320.00, 'Heirloom: Wraith, Bloodhound, Octane. 20-bomb + 4k damage badges on 5 legends. 500+ legendary items. Original Steam account.', 'medium', 'active', ARRAY['https://images.unsplash.com/photo-1534423861386-85a16f4d13fd?w=600&h=400&fit=crop','https://images.unsplash.com/photo-1556438064-2d7646166914?w=600&h=400&fit=crop']),
('b0000007-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Clash of Clans', 'Mobile', 'TH16 Max', 290.00, 'Fully maxed TH16. All walls maxed. 6000+ war stars. Legend League finishes. Max heroes + pet house. SCID changeable.', 'low', 'active', ARRAY['https://images.unsplash.com/photo-1605899435973-ca2d1a8861cf?w=600&h=400&fit=crop','https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?w=600&h=400&fit=crop']),
('b0000008-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'World of Warcraft', 'PC', 'ilvl 639', 400.00, 'CE: Mythic Fyrakk & Tindral. 2500+ M+ rating S4. 30+ mounts: Ashes of Alar, Invincible. All classes at 70. Full tier sets.', 'high', 'active', ARRAY['https://images.unsplash.com/photo-1586182989904-d2f5a79bebaa?w=600&h=400&fit=crop','https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop'])
ON CONFLICT (id) DO NOTHING;
