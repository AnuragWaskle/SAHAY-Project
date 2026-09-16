-- ============================================================
-- SAHAY — Clean Seed Data (Bhopal, MP)
-- Exactly 6 Wards, 6 Users, and 6 Incidents
-- ============================================================

TRUNCATE TABLE cities, wards, users, verification_requests, reports, civic_incidents, civic_demands, demand_supporters, work_orders, resolution_verifications, organizations, initiatives, contributions, departments, government_officials, elected_representatives, circles, circle_members, missions, mission_participants, badges, user_badges, rewards, reward_redemptions, moderation_flags, integrity_reports, audit_logs, risk_predictions, city_index_snapshots, petitions, petition_signatures, polls, poll_votes, demand_timeline CASCADE;

-- ─── 1. City ──────────────────────────────────────────
INSERT INTO cities (id, name, state, country, config) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'Bhopal',
  'Madhya Pradesh',
  'India',
  '{
    "languages": ["en", "hi"],
    "timezone": "Asia/Kolkata",
    "civic_categories": ["waterlogging","pothole","garbage","streetlight","water_supply","road_damage"]
  }'::jsonb
);

-- ─── 2. Wards (6 Wards) ──────────────────────────────
INSERT INTO wards (id, city_id, name, ward_number, population_estimate, area_sqkm, center_point) VALUES
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Shyamla Hills','1',45000,3.2,ST_SetSRID(ST_MakePoint(77.4126, 23.2299), 4326)),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','TT Nagar','2',62000,4.1,ST_SetSRID(ST_MakePoint(77.3936, 23.2334), 4326)),
('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','New Market','3',38000,2.8,ST_SetSRID(ST_MakePoint(77.4046, 23.2195), 4326)),
('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','MP Nagar','5',71000,5.2,ST_SetSRID(ST_MakePoint(77.4276, 23.2277), 4326)),
('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','Arera Colony','6',68000,4.8,ST_SetSRID(ST_MakePoint(77.4448, 23.2132), 4326)),
('10000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Jahangirabad (Ward 12)','12',53000,3.9,ST_SetSRID(ST_MakePoint(77.3848, 23.2734), 4326));

-- ─── 3. Users (6 Users) ──────────────────────────────
INSERT INTO users (id, firebase_uid, name, phone, role, verification_status, badge_type, civic_impact_score, level, city_id, jurisdiction_id) VALUES
-- 1. Citizen Leader
('30000000-0000-0000-0000-000000000001','demo_citizen_1','Aryan Sharma','9876543210','citizen','verified','gold_star',1840,7,'00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000012'),
-- 2. Citizen Reporter
('30000000-0000-0000-0000-000000000002','demo_citizen_2','Sunita M.','9876543211','citizen','verified','grey_check',920,4,'00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000012'),
-- 3. NGO 1
('30000000-0000-0000-0000-000000000003','demo_ngo_1','Seva Foundation NGO','9876543212','ngo','verified','green_tick',3100,8,'00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000012'),
-- 4. NGO 2
('30000000-0000-0000-0000-000000000004','demo_ngo_2','Bhopal Green Foundation','9876543213','ngo','verified','green_tick',2450,6,'00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006'),
-- 5. Municipal Officer
('30000000-0000-0000-0000-000000000005','demo_officer_1','Smt. Priya Mishra (Roads)','9876543214','municipal_officer','verified','blue_tick',1200,5,'00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000012'),
-- 6. Super Admin
('30000000-0000-0000-0000-000000000006','demo_super_admin','Sahay Admin','9876543215','super_admin','verified','none',5000,10,'00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');

-- ─── 4. Organizations ─────────────────────────────────────────
INSERT INTO organizations (id, type, name, registration_number, verification_status, operating_wards, focus_areas, contact, description, owner_user_id) VALUES
('40000000-0000-0000-0000-000000000001','ngo','Seva Foundation NGO','MP/NGO/2020/0101','verified',
 '["10000000-0000-0000-0000-000000000012","10000000-0000-0000-0000-000000000006"]'::jsonb,
 '["pothole","road_damage","waterlogging"]'::jsonb,
 '{"email":"contact@sevafoundation.org","phone":"0755-4001234"}'::jsonb,
 'Community infrastructure & road safety NGO in Bhopal',
 '30000000-0000-0000-0000-000000000003'),
('40000000-0000-0000-0000-000000000002','ngo','Bhopal Green Foundation','MP/NGO/2018/0042','verified',
 '["10000000-0000-0000-0000-000000000006","10000000-0000-0000-0000-000000000005"]'::jsonb,
 '["garbage","park_damage","streetlight"]'::jsonb,
 '{"email":"info@bhopalgreen.org","phone":"0755-4002345"}'::jsonb,
 'Greener and safer city drive',
 '30000000-0000-0000-0000-000000000004');

-- ─── 5. Civic Incidents (6 Incidents) ──────────────────────────
INSERT INTO civic_incidents (id, city_id, ward_id, category, title, description, report_count, unique_citizen_count, severity, status, root_cause_hypothesis, priority_score, affected_population_estimate, location_center, location_radius_m, first_detected_at) VALUES

-- 1. Pothole (In Progress)
('70000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000012',
 'pothole',
 'Large pothole reported on Main Market Road',
 'This pothole is becoming extremely dangerous for bikes and pedestrians during evening hours. Immediate patching required.',
 24, 18, 'high', 'in_progress',
 'Sub-base erosion caused by heavy monsoon rainfall and vehicle loads',
 9.1, 15000,
 ST_SetSRID(ST_MakePoint(77.412613, 23.259933), 4326), 300,
 NOW() - INTERVAL '5 days'),

-- 2. Streetlight (Resolved)
('70000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000006',
 '10000000-0000-0000-0000-000000000006',
 'streetlight',
 'Streetlight #184 Failure near Sector 4 Community Park',
 'Entire row of 6 streetlights non-functional causing dark stretch near community park.',
 18, 14, 'medium', 'resolved',
 'Burned out LED driver fuse at feeder junction box',
 7.8, 8000,
 ST_SetSRID(ST_MakePoint(77.4448, 23.2132), 4326), 250,
 NOW() - INTERVAL '12 days'),

-- 3. Waterlogging (Active)
('70000000-0000-0000-0000-000000000003',
 '00000000-0000-0000-0000-000000000006',
 '10000000-0000-0000-0000-000000000006',
 'waterlogging',
 'Severe Waterlogging at Arera Colony Crossroads',
 'Waterlogging reaching 1.5 feet depth during heavy rains due to choked storm drain.',
 31, 22, 'high', 'active',
 'Construction silt blockage inside main storm sewer line',
 8.5, 22000,
 ST_SetSRID(ST_MakePoint(77.4412, 23.2154), 4326), 500,
 NOW() - INTERVAL '8 days'),

-- 4. Garbage (Active)
('70000000-0000-0000-0000-000000000004',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000003',
 'garbage',
 'Open Garbage Overflow near New Market Commercial Complex',
 'Unattended waste pile causing bad odor and clogging pedestrian walkway near market entrance.',
 19, 15, 'high', 'active',
 'Garbage truck collection route missed for 3 consecutive days',
 8.2, 18000,
 ST_SetSRID(ST_MakePoint(77.4046, 23.2195), 4326), 200,
 NOW() - INTERVAL '3 days'),

-- 5. Water Supply (Active)
('70000000-0000-0000-0000-000000000005',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000002',
 'water_supply',
 'Low Water Pressure in TT Nagar Sector B',
 'Pipeline pressure dropped significantly, households receiving water for only 15 minutes daily.',
 15, 12, 'medium', 'active',
 'Leakage valve in secondary distribution pipeline',
 7.2, 12000,
 ST_SetSRID(ST_MakePoint(77.3936, 23.2334), 4326), 400,
 NOW() - INTERVAL '6 days'),

-- 6. Road Damage (In Progress)
('70000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000005',
 'road_damage',
 'Damaged Footpath & Broken Curb on MP Nagar Zone 1',
 'Broken concrete slabs creating tripping hazard for commuters near commercial center.',
 29, 21, 'high', 'in_progress',
 'Heavy vehicle parking on pedestrian curb causing slab collapse',
 8.8, 25000,
 ST_SetSRID(ST_MakePoint(77.4276, 23.2277), 4326), 350,
 NOW() - INTERVAL '10 days');

-- ─── 6. Reports (6 Reports) ─────────────────────────
INSERT INTO reports (id, user_id, category, description, location, address, ward_id, evidence_confidence, status, incident_id, media_urls) VALUES
('80000000-0000-0000-0000-000000000001',
 '30000000-0000-0000-0000-000000000002',
 'pothole',
 'Large pothole reported on Main Market Road. Immediate patching required.',
 ST_SetSRID(ST_MakePoint(77.412613, 23.259933), 4326),
 'Main Market Road, Ward 12, Bhopal (Opp. SBI ATM)',
 '10000000-0000-0000-0000-000000000012', 0.98, 'in_progress',
 '70000000-0000-0000-0000-000000000001',
 '["https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"]'::jsonb),

('80000000-0000-0000-0000-000000000002',
 '30000000-0000-0000-0000-000000000001',
 'streetlight',
 'Streetlight #184 Failure near Sector 4 Community Park.',
 ST_SetSRID(ST_MakePoint(77.4448, 23.2132), 4326),
 'Sector 4, Near Community Park, Arera Colony',
 '10000000-0000-0000-0000-000000000006', 0.94, 'resolved',
 '70000000-0000-0000-0000-000000000002',
 '["https://images.unsplash.com/photo-1517420704952-d9f39e95b43e?auto=format&fit=crop&w=800&q=80"]'::jsonb),

('80000000-0000-0000-0000-000000000003',
 '30000000-0000-0000-0000-000000000002',
 'waterlogging',
 'Severe Waterlogging at Arera Colony Market Crossroads.',
 ST_SetSRID(ST_MakePoint(77.4412, 23.2154), 4326),
 'Market Crossroads, Arera Colony, Bhopal',
 '10000000-0000-0000-0000-000000000006', 0.91, 'submitted',
 '70000000-0000-0000-0000-000000000003',
 '["https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80"]'::jsonb),

('80000000-0000-0000-0000-000000000004',
 '30000000-0000-0000-0000-000000000001',
 'garbage',
 'Open Garbage Overflow near New Market Commercial Complex.',
 ST_SetSRID(ST_MakePoint(77.4046, 23.2195), 4326),
 'New Market Complex, Ward 3, Bhopal',
 '10000000-0000-0000-0000-000000000003', 0.89, 'submitted',
 '70000000-0000-0000-0000-000000000004',
 '["https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80"]'::jsonb),

('80000000-0000-0000-0000-000000000005',
 '30000000-0000-0000-0000-000000000002',
 'water_supply',
 'Low Water Pressure in TT Nagar Sector B.',
 ST_SetSRID(ST_MakePoint(77.3936, 23.2334), 4326),
 'Sector B, TT Nagar, Bhopal',
 '10000000-0000-0000-0000-000000000002', 0.88, 'submitted',
 '70000000-0000-0000-0000-000000000005',
 '["https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80"]'::jsonb),

('80000000-0000-0000-0000-000000000006',
 '30000000-0000-0000-0000-000000000001',
 'road_damage',
 'Damaged Footpath & Broken Curb on MP Nagar Zone 1.',
 ST_SetSRID(ST_MakePoint(77.4276, 23.2277), 4326),
 'Zone 1 Main Road, MP Nagar, Bhopal',
 '10000000-0000-0000-0000-000000000005', 0.95, 'in_progress',
 '70000000-0000-0000-0000-000000000006',
 '["https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80"]'::jsonb);
