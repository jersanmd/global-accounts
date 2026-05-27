-- Seed: Additional listings for testing related products
-- Run in Supabase SQL Editor

-- Genshin Impact listings (for testing "More Genshin Impact Accounts")
INSERT INTO listings (seller_id, game, platform, rank, price_usd, inventory_summary, risk_rating, status, screenshots_urls) VALUES
('a0000000-0000-0000-0000-000000000001', 'Genshin Impact', 'PC', 'AR 58', 280.00, 'C4 Hu Tao, C2 Zhongli, C3 Kazuha. 25+ 5★ characters. Sumeru + Fontaine 100%. 90 days Welkin remaining. Email changeable.', 'low', 'active', ARRAY['https://images.unsplash.com/photo-1612404730960-5c71577fca11?w=600&h=400&fit=crop']),
('a0000000-0000-0000-0000-000000000001', 'Genshin Impact', 'Mobile', 'AR 57', 195.00, 'C2 Raiden, C1 Nahida, C2 Yae Miko. 20+ 5★ chars. All archon quests done. F2P-friendly account with good artifacts.', 'medium', 'active', ARRAY['https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&h=400&fit=crop']),
('a0000000-0000-0000-0000-000000000001', 'Genshin Impact', 'PlayStation', 'AR 55', 120.00, 'C0 Ayaka, C0 Kokomi, C0 Raiden. Starter account with solid freeze team. Inazuma done. Good for new players.', 'low', 'active', ARRAY['https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&h=400&fit=crop']);

-- Valorant listings
INSERT INTO listings (seller_id, game, platform, rank, price_usd, inventory_summary, risk_rating, status, screenshots_urls) VALUES
('a0000000-0000-0000-0000-000000000001', 'Valorant', 'PC', 'Ascendant 3', 180.00, 'Elderflame Vandal, Glitchpop Phantom, Sentinels of Light Operator. 12+ premium skins. EP5 onwards BP completed.', 'low', 'active', ARRAY['https://images.unsplash.com/photo-1542751110-97427bbecf20?w=600&h=400&fit=crop']),
('a0000000-0000-0000-0000-000000000001', 'Valorant', 'PC', 'Platinum 1', 95.00, 'Prime Classic, Ion Sheriff. 5+ premium skins. Clean account, great for climbing. Low hours played.', 'low', 'active', ARRAY['https://images.unsplash.com/photo-1499198116522-4a6235013d63?w=600&h=400&fit=crop']);

-- League of Legends listings
INSERT INTO listings (seller_id, game, platform, rank, price_usd, inventory_summary, risk_rating, status, screenshots_urls) VALUES
('a0000000-0000-0000-0000-000000000001', 'League of Legends', 'PC', 'Diamond 1', 320.00, '150+ skins: Elementalist Lux, Dark Star Thresh, Project Ashe. All champs. Honor 4. Rare legacy skins included.', 'medium', 'active', ARRAY['https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=600&h=400&fit=crop']),
('a0000000-0000-0000-0000-000000000001', 'League of Legends', 'PC', 'Platinum 3', 140.00, '80+ skins. Pool Party, Arcade, Blood Moon collection. 100+ champions unlocked. Good MMR.', 'low', 'active', ARRAY['https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&h=400&fit=crop']),

-- World of Warcraft listings
('a0000000-0000-0000-0000-000000000001', 'World of Warcraft', 'PC', 'ilvl 626', 250.00, 'AOTC: Amirdrassil. 2200+ M+ S3. All classes 70. 20+ rare mounts. Loremaster achievement. Original email.', 'medium', 'active', ARRAY['https://images.unsplash.com/photo-1586182989904-d2f5a79bebaa?w=600&h=400&fit=crop']);
