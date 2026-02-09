-- Seed basic admin data for new tables

INSERT INTO settings (store_name, currency, tax_rate) VALUES ('My Store', 'USD', 0.0) ON CONFLICT DO NOTHING;

INSERT INTO pages (id, slug, title, content, status) VALUES
('p_about', 'about', 'About us', '<p>About content</p>', 'published'),
('p_contact', 'contact', 'Contact', '<p>Contact content</p>', 'published')
ON CONFLICT DO NOTHING;

INSERT INTO coupons (id, code, discount_type, discount_value, usage_limit, expires_at, active) VALUES
('c1', 'WELCOME10', 'percentage', 10, 100, '2026-12-31', true)
ON CONFLICT DO NOTHING;

INSERT INTO shipping_zones (id, name, methods, price_range, eta, enabled) VALUES
('z1', 'Europe', '["Standard","Express"]', '5.00-20.00', '2-7 days', true)
ON CONFLICT DO NOTHING;
