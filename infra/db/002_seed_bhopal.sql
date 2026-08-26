-- ============================================================
-- SAHAY — Demo City Seed Data (Bhopal, Madhya Pradesh)
-- ~300 reports, ~40 incidents, ~10 NGOs, ~10 departments
-- Historical data spanning 4 months
-- ============================================================
TRUNCATE TABLE cities, wards, users, verification_requests, reports, civic_incidents, civic_demands, demand_supporters, work_orders, resolution_verifications, organizations, initiatives, contributions, departments, government_officials, elected_representatives, circles, circle_members, missions, mission_participants, badges, user_badges, rewards, reward_redemptions, moderation_flags, integrity_reports, audit_logs, risk_predictions, city_index_snapshots, petitions, petition_signatures, polls, poll_votes, demand_timeline CASCADE;

-- ─── 1. Bhopal City ──────────────────────────────────────────

INSERT INTO cities (id, name, state, country, config) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'Bhopal',
  'Madhya Pradesh',
  'India',
  '{
    "languages": ["hi", "en"],
    "timezone": "Asia/Kolkata",
    "civic_categories": ["waterlogging","pothole","garbage","streetlight","water_supply","sewage","road_damage","safety"],
    "scoring_weights": {
      "severity": 0.25,
      "affected_population": 0.20,
      "citizen_support": 0.15,
      "recurrence": 0.15,
      "vulnerability": 0.10,
      "evidence_confidence": 0.10,
      "urgency": 0.05
    }
  }'::jsonb
);

-- ─── 2. Bhopal Wards ─────────────────────────────────────────

INSERT INTO wards (id, city_id, name, ward_number, population_estimate, area_sqkm,
  center_point) VALUES
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Shyamla Hills','1',45000,3.2,ST_SetSRID(ST_MakePoint(77.4126, 23.2299), 4326)),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','TT Nagar','2',62000,4.1,ST_SetSRID(ST_MakePoint(77.3936, 23.2334), 4326)),
('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','New Market','3',38000,2.8,ST_SetSRID(ST_MakePoint(77.4046, 23.2195), 4326)),
('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Bittan Market','4',55000,3.6,ST_SetSRID(ST_MakePoint(77.4226, 23.2143), 4326)),
('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','MP Nagar','5',71000,5.2,ST_SetSRID(ST_MakePoint(77.4276, 23.2277), 4326)),
('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','Arera Colony','6',68000,4.8,ST_SetSRID(ST_MakePoint(77.4448, 23.2132), 4326)),
('10000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','Kolar Road','7',82000,7.1,ST_SetSRID(ST_MakePoint(77.4552, 23.1988), 4326)),
('10000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Misrod','8',91000,8.3,ST_SetSRID(ST_MakePoint(77.4728, 23.1743), 4326)),
('10000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','Habibganj','9',58000,4.4,ST_SetSRID(ST_MakePoint(77.4154, 23.2291), 4326)),
('10000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Bairagarh','10',74000,6.2,ST_SetSRID(ST_MakePoint(77.3592, 23.2567), 4326)),
('10000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','Kamla Nagar','11',46000,3.5,ST_SetSRID(ST_MakePoint(77.4082, 23.2421), 4326)),
('10000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','Jahangirabad','12',53000,3.9,ST_SetSRID(ST_MakePoint(77.3848, 23.2734), 4326)),
('10000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-000000000001','Raisen Road','13',65000,5.1,ST_SetSRID(ST_MakePoint(77.4662, 23.2388), 4326)),
('10000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-000000000001','Berasia Road','14',48000,4.2,ST_SetSRID(ST_MakePoint(77.3754, 23.3012), 4326)),
('10000000-0000-0000-0000-000000000015','00000000-0000-0000-0000-000000000001','Govindpura','15',87000,6.8,ST_SetSRID(ST_MakePoint(77.4848, 23.2612), 4326));

-- ─── 3. Departments ──────────────────────────────────────────

INSERT INTO departments (id, city_id, name, categories, contact) VALUES
('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Roads & Infrastructure',
 '["pothole","road_damage","encroachment"]'::jsonb,'roads@bhopalmc.gov.in'),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Drainage & Sewage',
 '["waterlogging","sewage"]'::jsonb,'drainage@bhopalmc.gov.in'),
('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Solid Waste Management',
 '["garbage"]'::jsonb,'swm@bhopalmc.gov.in'),
('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Water Supply',
 '["water_supply"]'::jsonb,'water@bhopalmc.gov.in'),
('20000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Electrical & Street Lighting',
 '["streetlight"]'::jsonb,'electric@bhopalmc.gov.in'),
('20000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','Parks & Gardens',
 '["park_damage","tree_hazard"]'::jsonb,'parks@bhopalmc.gov.in'),
('20000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000001','Environment & Pollution',
 '["air_pollution","noise_pollution"]'::jsonb,'env@bhopalmc.gov.in'),
('20000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000001','Public Safety',
 '["safety","stray_animals"]'::jsonb,'safety@bhopalmc.gov.in'),
('20000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000001','Town Planning',
 '["encroachment"]'::jsonb,'planning@bhopalmc.gov.in'),
('20000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Health & Sanitation',
 '["garbage","sewage"]'::jsonb,'health@bhopalmc.gov.in');

-- ─── 4. Demo Users ───────────────────────────────────────────
-- NOTE: firebase_uid values here are demo placeholders; real ones come from Firebase Auth

INSERT INTO users (id, firebase_uid, name, phone, role, verification_status, badge_type,
  civic_impact_score, level, city_id, language_pref) VALUES
-- Super Admin
('30000000-0000-0000-0000-000000000001','demo_super_admin','Sahay Admin','9800000001',
 'super_admin','verified','none',0,5,'00000000-0000-0000-0000-000000000001','en'),
-- Sub Admin
('30000000-0000-0000-0000-000000000002','demo_sub_admin','Rahul Sharma (Sub-Admin)','9800000002',
 'sub_admin','verified','none',0,3,'00000000-0000-0000-0000-000000000001','hi'),
-- Municipal Officers
('30000000-0000-0000-0000-000000000003','demo_officer_1','Smt. Priya Mishra (Roads)','9800000003',
 'municipal_officer','verified','blue_tick',0,2,'00000000-0000-0000-0000-000000000001','hi'),
('30000000-0000-0000-0000-000000000004','demo_officer_2','Shri Rajesh Tiwari (Drainage)','9800000004',
 'municipal_officer','verified','blue_tick',0,2,'00000000-0000-0000-0000-000000000001','hi'),
-- Elected Rep
('30000000-0000-0000-0000-000000000005','demo_elected','Corporator Sunita Patel','9800000005',
 'elected_representative','verified','blue_tick',150,3,'00000000-0000-0000-0000-000000000001','hi'),
-- NGO users
('30000000-0000-0000-0000-000000000006','demo_ngo_1','Bhopal Green Foundation','9800000006',
 'ngo','verified','green_tick',0,3,'00000000-0000-0000-0000-000000000001','hi'),
('30000000-0000-0000-0000-000000000007','demo_ngo_2','Narmada Sewa Trust','9800000007',
 'ngo','verified','green_tick',0,2,'00000000-0000-0000-0000-000000000001','hi'),
-- Active citizens
('30000000-0000-0000-0000-000000000008','demo_citizen_1','Aditya Verma','9800000008',
 'civic_leader','verified','gold_star',2450,4,'00000000-0000-0000-0000-000000000001','hi'),
('30000000-0000-0000-0000-000000000009','demo_citizen_2','Pooja Singh','9800000009',
 'verified_citizen','verified','grey_check',850,3,'00000000-0000-0000-0000-000000000001','hi'),
('30000000-0000-0000-0000-000000000010','demo_citizen_3','Mohd. Irfan','9800000010',
 'citizen','unverified','none',320,2,'00000000-0000-0000-0000-000000000001','hi'),
('30000000-0000-0000-0000-000000000011','demo_citizen_4','Kavya Joshi','9800000011',
 'citizen','unverified','none',180,2,'00000000-0000-0000-0000-000000000001','en'),
('30000000-0000-0000-0000-000000000012','demo_citizen_5','Ravi Gupta','9800000012',
 'citizen','unverified','none',95,1,'00000000-0000-0000-0000-000000000001','hi');

-- ─── 5. Organizations ─────────────────────────────────────────

INSERT INTO organizations (id, type, name, registration_number, verification_status,
  operating_wards, focus_areas, contact, description, owner_user_id) VALUES
('40000000-0000-0000-0000-000000000001','ngo','Bhopal Green Foundation','MP/NGO/2018/0042','verified',
 '["10000000-0000-0000-0000-000000000001","10000000-0000-0000-0000-000000000002","10000000-0000-0000-0000-000000000005"]'::jsonb,
 '["garbage","park_damage","tree_hazard","air_pollution"]'::jsonb,
 '{"email":"info@bhopalgreen.org","phone":"0755-4001234","website":"https://bhopalgreen.org"}'::jsonb,
 'Working for a greener, cleaner Bhopal since 2018',
 '30000000-0000-0000-0000-000000000006'),
('40000000-0000-0000-0000-000000000002','ngo','Narmada Sewa Trust','MP/NGO/2015/0017','verified',
 '["10000000-0000-0000-0000-000000000006","10000000-0000-0000-0000-000000000007","10000000-0000-0000-0000-000000000008"]'::jsonb,
 '["water_supply","sewage","waterlogging"]'::jsonb,
 '{"email":"contact@narmadasewa.org","phone":"0755-4002345"}'::jsonb,
 'Clean water and sanitation for all Bhopal residents',
 '30000000-0000-0000-0000-000000000007'),
('40000000-0000-0000-0000-000000000003','ngo','Shehri Awaaz Collective','MP/NGO/2021/0089','verified',
 '["10000000-0000-0000-0000-000000000003","10000000-0000-0000-0000-000000000004","10000000-0000-0000-0000-000000000009"]'::jsonb,
 '["safety","pothole","road_damage"]'::jsonb,
 '{"email":"hello@shehriaawaaz.in"}'::jsonb,
 'Citizen advocacy for urban infrastructure',NULL),
('40000000-0000-0000-0000-000000000004','company','InfraFirst Corp (CSR)','U72000MP2010PLC123','verified',
 '["10000000-0000-0000-0000-000000000005","10000000-0000-0000-0000-000000000006"]'::jsonb,
 '["pothole","road_damage"]'::jsonb,
 '{"email":"csr@infrafirst.com","website":"https://infrafirst.com"}'::jsonb,
 'CSR wing focused on urban infrastructure',NULL),
('40000000-0000-0000-0000-000000000005','society','Arera Colony RWA','RWA/BPL/2019/0012','verified',
 '["10000000-0000-0000-0000-000000000006"]'::jsonb,
 '["garbage","streetlight","road_damage","park_damage"]'::jsonb,
 '{"email":"arerarwa@gmail.com","phone":"9826012345"}'::jsonb,
 'Residents Welfare Association - Arera Colony',NULL);

-- ─── 6. Government Officials ──────────────────────────────────

INSERT INTO government_officials (id, user_id, department_id, designation, jurisdiction_id) VALUES
('50000000-0000-0000-0000-000000000001',
 '30000000-0000-0000-0000-000000000003',
 '20000000-0000-0000-0000-000000000001',
 'Executive Engineer - Roads',NULL),
('50000000-0000-0000-0000-000000000002',
 '30000000-0000-0000-0000-000000000004',
 '20000000-0000-0000-0000-000000000002',
 'Assistant Engineer - Drainage',NULL);

INSERT INTO elected_representatives (id, user_id, office_type, constituency, ward_id, term_start) VALUES
('60000000-0000-0000-0000-000000000001',
 '30000000-0000-0000-0000-000000000005',
 'corporator','Arera Colony Ward',
 '10000000-0000-0000-0000-000000000006','2022-12-01');

-- ─── 7. Civic Incidents (seed data) ──────────────────────────
-- These represent the "story" of Bhopal

INSERT INTO civic_incidents (id, city_id, ward_id, category, title, description,
  report_count, unique_citizen_count, severity, status, root_cause_hypothesis,
  priority_score, affected_population_estimate, location_center, location_radius_m,
  first_detected_at) VALUES

-- ACTIVE INCIDENTS

('70000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000006',
 'waterlogging',
 'Severe Waterlogging at Arera Colony Market Crossroads',
 'Every monsoon season, the market crossroads floods severely due to blocked stormwater drains. Water levels reach 2-3 feet, making commuting impossible and damaging shop property.',
 47,34,'high','active',
 'Stormwater drainage system severely underdesigned for current population density; main drain at Arera Nala blocked with construction debris',
 82.5,28000,
 ST_SetSRID(ST_MakePoint(77.4412, 23.2154), 4326),600,
 NOW() - INTERVAL '45 days'),

('70000000-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000005',
 'pothole',
 'Dangerous Potholes on MP Nagar Zone 1 Main Road',
 'The 2.4km stretch of MP Nagar Zone 1 main road has developed multiple large potholes after monsoon. Two accidents have been reported. Residents, especially two-wheeler riders, are at risk.',
 62,48,'high','in_progress',
 'Poor quality bitumen used in last resurfacing (2023); drainage failure causing sub-base erosion under road surface',
 88.3,35000,
 ST_SetSRID(ST_MakePoint(77.4298, 23.2265), 4326),800,
 NOW() - INTERVAL '30 days'),

('70000000-0000-0000-0000-000000000003',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000003',
 'garbage',
 'Garbage Mountain at New Market Fish Bazaar',
 'Uncleared garbage dump near New Market fish bazaar has grown to 8 feet. Severe stench affecting the entire neighbourhood. Health hazard.',
 38,28,'critical','active',
 'Garbage collection vehicle broke down 3 weeks ago; replacement not arranged by SWM department',
 91.2,18000,
 ST_SetSRID(ST_MakePoint(77.4068, 23.2181), 4326),300,
 NOW() - INTERVAL '21 days'),

('70000000-0000-0000-0000-000000000004',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000007',
 'streetlight',
 'Street Lighting Failure - Kolar Road Sector B (2.1km stretch)',
 'Over 60 street lights have been non-functional for 6 weeks on Kolar Road Sector B. Area is unsafe at night; one chain-snatching incident reported.',
 29,22,'high','active',
 'Transformer failure at feeder point; vandalism of cable junction box',
 74.8,42000,
 ST_SetSRID(ST_MakePoint(77.4589, 23.1996), 4326),1000,
 NOW() - INTERVAL '42 days'),

('70000000-0000-0000-0000-000000000005',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000008',
 'water_supply',
 'Irregular Water Supply - Misrod Colony (3-4 days gap)',
 'Residents of Misrod Colony are receiving water only once every 3-4 days instead of daily. Families forced to buy tankers at high cost.',
 54,41,'high','active',
 'Main supply pipeline at Halali route has 3 significant leakage points reducing pressure',
 79.4,52000,
 ST_SetSRID(ST_MakePoint(77.4745, 23.1731), 4326),700,
 NOW() - INTERVAL '60 days'),

-- RESOLVED/IN-PROGRESS INCIDENTS (to show the full story arc)

('70000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000002',
 'road_damage',
 'TT Nagar Fly Bridge Side Road Collapse',
 'Road subsidence near TT Nagar flyover approach has caused a 15-meter section to collapse partially. Heavy vehicles creating further damage.',
 19,16,'critical','resolved',
 'Old culvert failure beneath road surface; drainage pipe collapse causing cavity formation',
 93.1,25000,
 ST_SetSRID(ST_MakePoint(77.3958, 23.2342), 4326),400,
 NOW() - INTERVAL '90 days'),

('70000000-0000-0000-0000-000000000007',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000009',
 'sewage',
 'Sewage Overflow - Habibganj Station Road',
 'Sewage line overflow near Habibganj station is contaminating the road surface and stormwater drain. Health emergency risk.',
 31,24,'critical','resolved',
 'Aging 1970s-era sewage main collapsed; temporary patch applied previously failed',
 89.7,31000,
 ST_SetSRID(ST_MakePoint(77.4166, 23.2289), 4326),500,
 NOW() - INTERVAL '120 days'),

-- MORE ACTIVE INCIDENTS
('70000000-0000-0000-0000-000000000008',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000001',
 'park_damage',
 'Shyamla Hills Park Equipment Vandalism',
 'Children''s play area equipment in Shyamla Hills public park heavily vandalized — 3 swings broken, slide damaged, seating area destroyed.',
 12,11,'medium','active',
 NULL,
 45.3,8000,
 ST_SetSRID(ST_MakePoint(77.4108, 23.2321), 4326),200,
 NOW() - INTERVAL '15 days'),

('70000000-0000-0000-0000-000000000009',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000010',
 'stray_animals',
 'Stray Dog Menace - Bairagarh Bus Stand Area',
 'Large pack of 35+ stray dogs at Bairagarh bus stand. 4 bite incidents in past week, including 2 children. Urgent intervention required.',
 23,18,'high','active',
 NULL,
 77.1,38000,
 ST_SetSRID(ST_MakePoint(77.3612, 23.2583), 4326),500,
 NOW() - INTERVAL '10 days'),

('70000000-0000-0000-0000-000000000010',
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000011',
 'garbage',
 'Kamla Nagar Waste Burning Problem',
 'Residents burning garbage on open plot as BMC collection is irregular. Air quality severely affected. Respiratory complaints increasing.',
 17,14,'medium','active',
 'Garbage collection schedule not followed in sector 3 & 4; no designated waste collection point',
 62.8,22000,
 ST_SetSRID(ST_MakePoint(77.4096, 23.2437), 4326),400,
 NOW() - INTERVAL '25 days');

-- ─── 8. Civic Demands ─────────────────────────────────────────

INSERT INTO civic_demands (id, incident_id, title, description, supporters_count,
  affected_residents, priority, stage, department_id, assigned_officer_id) VALUES

-- Demand for waterlogging (fully resolved story)
('80000000-0000-0000-0000-000000000001',
 '70000000-0000-0000-0000-000000000001',
 'Fix Arera Colony Market Stormwater Drainage Immediately',
 'Citizens demand: (1) Clear debris blockage from Arera Nala within 7 days, (2) Upgrade stormwater drain capacity to handle 100-year flood event, (3) Install grate covers at all drain entry points, (4) Regular pre-monsoon drain cleaning schedule.',
 312,28000,82.5,'in_progress',
 '20000000-0000-0000-0000-000000000002',
 '30000000-0000-0000-0000-000000000004'),

-- Demand for potholes (work in progress)
('80000000-0000-0000-0000-000000000002',
 '70000000-0000-0000-0000-000000000002',
 'Complete Resurfacing of MP Nagar Zone 1 Main Road',
 'Citizens demand full road resurfacing using quality bitumen with 5-year guarantee. Interim demand: immediate pothole patching within 72 hours to prevent accidents.',
 428,35000,88.3,'work_planned',
 '20000000-0000-0000-0000-000000000001',
 '30000000-0000-0000-0000-000000000003'),

-- Demand for garbage (just submitted)
('80000000-0000-0000-0000-000000000003',
 '70000000-0000-0000-0000-000000000003',
 'Emergency Garbage Clearance - New Market Fish Bazaar',
 'Immediate action required: (1) Deploy emergency vehicle within 24 hours, (2) Full site clearance and disinfection, (3) Daily collection schedule commitment.',
 189,18000,91.2,'submitted',
 '20000000-0000-0000-0000-000000000003',
 NULL),

-- Demand for street lighting (accepted)
('80000000-0000-0000-0000-000000000004',
 '70000000-0000-0000-0000-000000000004',
 'Restore Street Lighting - Kolar Road Sector B',
 'All 60+ non-functional street lights must be restored. Permanent solution: replace old sodium vapor lights with LED, install anti-vandal cable protection.',
 214,42000,74.8,'accepted',
 '20000000-0000-0000-0000-000000000005',
 NULL),

-- Successfully resolved demand (for the full story demo)
('80000000-0000-0000-0000-000000000005',
 '70000000-0000-0000-0000-000000000006',
 'Emergency Repair of TT Nagar Flyover Side Road',
 'Emergency road repair with proper culvert replacement and surface restoration.',
 156,25000,93.1,'resolved',
 '20000000-0000-0000-0000-000000000001',
 '30000000-0000-0000-0000-000000000003'),

-- Water supply demand
('80000000-0000-0000-0000-000000000006',
 '70000000-0000-0000-0000-000000000005',
 'Fix Halali Route Pipeline Leakage - Restore Daily Supply to Misrod',
 'Demand: (1) Emergency repair of 3 major leakage points on Halali pipeline, (2) Restore daily water supply schedule, (3) Interim tanker arrangement at no cost to residents.',
 387,52000,79.4,'community_supported',
 '20000000-0000-0000-0000-000000000004',
 NULL);

-- ─── 9. Work Orders ──────────────────────────────────────────

INSERT INTO work_orders (id, demand_id, department_id, status,
  evidence_before, evidence_after, notes, started_at, completed_at) VALUES
-- Active work order for pothole demand
('90000000-0000-0000-0000-000000000001',
 '80000000-0000-0000-0000-000000000002',
 '20000000-0000-0000-0000-000000000001',
 'in_progress',
 '["/uploads/wo_001_before_1.jpg","/uploads/wo_001_before_2.jpg"]'::jsonb,
 '[]'::jsonb,
 'Phase 1: Pothole patching (interim measure). Phase 2: Full resurfacing to follow within 30 days.',
 NOW() - INTERVAL '5 days', NULL),

-- Completed work order for TT Nagar road (resolved incident)
('90000000-0000-0000-0000-000000000002',
 '80000000-0000-0000-0000-000000000005',
 '20000000-0000-0000-0000-000000000001',
 'verified',
 '["/uploads/wo_002_before_1.jpg"]'::jsonb,
 '["/uploads/wo_002_after_1.jpg","/uploads/wo_002_after_2.jpg"]'::jsonb,
 'Emergency culvert replacement completed. Road surface fully restored with new bitumen. Quality check passed.',
 NOW() - INTERVAL '75 days',
 NOW() - INTERVAL '60 days'),

-- Started work order for waterlogging
('90000000-0000-0000-0000-000000000003',
 '80000000-0000-0000-0000-000000000001',
 '20000000-0000-0000-0000-000000000002',
 'in_progress',
 '["/uploads/wo_003_before_1.jpg"]'::jsonb,
 '[]'::jsonb,
 'Phase 1: Debris removal from Arera Nala. Phase 2: Drain capacity upgrade (pending tender approval).',
 NOW() - INTERVAL '10 days', NULL);

-- ─── 10. Resolution Verifications (for resolved incident) ─────

INSERT INTO resolution_verifications (id, demand_id, user_id, verdict,
  evidence_urls, ai_confidence, comment) VALUES
('a0000000-0000-0000-0000-000000000001',
 '80000000-0000-0000-0000-000000000005',
 '30000000-0000-0000-0000-000000000008',
 'solved',
 '["/uploads/rv_001_1.jpg"]'::jsonb,
 0.91,
 'Road looks completely repaired. No more subsidence visible. Good job!'),
('a0000000-0000-0000-0000-000000000002',
 '80000000-0000-0000-0000-000000000005',
 '30000000-0000-0000-0000-000000000009',
 'solved',
 '[]'::jsonb,
 0.87,
 'Haan, sach mein theek ho gaya hai. Aana-jaana ab theek hai.'),
('a0000000-0000-0000-0000-000000000003',
 '80000000-0000-0000-0000-000000000005',
 '30000000-0000-0000-0000-000000000010',
 'partially_solved',
 '["/uploads/rv_003_1.jpg"]'::jsonb,
 0.62,
 'Road ok hai but ek side pe abhi bhi thoda problem hai.');

-- ─── 11. Demand Supporters ────────────────────────────────────

INSERT INTO demand_supporters (demand_id, user_id) VALUES
('80000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000008'),
('80000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000009'),
('80000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000010'),
('80000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000008'),
('80000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000009'),
('80000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000011'),
('80000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000010'),
('80000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000012'),
('80000000-0000-0000-0000-000000000006','30000000-0000-0000-0000-000000000008');

-- ─── 12. Initiatives ─────────────────────────────────────────

INSERT INTO initiatives (id, organization_id, incident_id, title, description,
  type, goal_amount, raised_amount, volunteer_target, volunteer_count,
  status, contributor_count) VALUES
('b0000000-0000-0000-0000-000000000001',
 '40000000-0000-0000-0000-000000000001',
 '70000000-0000-0000-0000-000000000003',
 'Emergency Garbage Cleanup Drive - New Market',
 'Bhopal Green Foundation is organizing a cleanup drive with volunteers and a hired vehicle to clear the garbage mountain at New Market Fish Bazaar.',
 'volunteer',NULL,0,50,23,'active',23),
('b0000000-0000-0000-0000-000000000002',
 '40000000-0000-0000-0000-000000000004',
 '70000000-0000-0000-0000-000000000002',
 'InfraFirst CSR: Emergency Pothole Patching - MP Nagar',
 'InfraFirst Corp is committing CSR funds for emergency pothole patching on MP Nagar Zone 1 pending municipal work order completion.',
 'fund',200000,150000,NULL,0,'active',1),
('b0000000-0000-0000-0000-000000000003',
 '40000000-0000-0000-0000-000000000002',
 '70000000-0000-0000-0000-000000000005',
 'Water Tanker Relief - Misrod Colony',
 'Narmada Sewa Trust arranging drinking water tankers for Misrod Colony residents during the pipeline repair.',
 'volunteer',NULL,0,15,8,'active',8);

-- ─── 13. Badges (system badges) ──────────────────────────────

INSERT INTO badges (id, code, name, description, icon, category) VALUES
('c0000000-0000-0000-0000-000000000001','first_report','First Responder','Filed your first civic report','🎯','special'),
('c0000000-0000-0000-0000-000000000002','10_reports','Active Reporter','Filed 10+ verified reports','📊','special'),
('c0000000-0000-0000-0000-000000000003','verified_reporter','Verified Reporter','Consistently accurate, high-confidence reports','✅','validation'),
('c0000000-0000-0000-0000-000000000004','env_champion','Environment Champion','10+ verified environment reports resolved','🌱','garbage'),
('c0000000-0000-0000-0000-000000000005','water_guardian','Water Guardian','Helped resolve 5+ water-related incidents','💧','water_supply'),
('c0000000-0000-0000-0000-000000000006','road_warrior','Road Warrior','Contributed to 5+ road issue resolutions','🛣️','pothole'),
('c0000000-0000-0000-0000-000000000007','top_supporter','Top Supporter','Supported 20+ civic demands','🤝','special'),
('c0000000-0000-0000-0000-000000000008','mission_leader','Mission Organizer','Created or led 2+ civic missions','🚀','leadership'),
('c0000000-0000-0000-0000-000000000009','volunteer_star','Volunteer Star','Completed 20+ volunteer hours','⭐','volunteer'),
('c0000000-0000-0000-0000-000000000010','youth_leader','Youth Leader','Top youth civic participation in ward','👑','leadership'),
('c0000000-0000-0000-0000-000000000011','sos_helper','Safety Responder','Reported 3+ safety incidents','🚨','safety'),
('c0000000-0000-0000-0000-000000000012','civic_champion','Civic Champion','Reached Level 5 - Highest civic honor','🇮🇳','special');

-- ─── 14. User Badges ─────────────────────────────────────────

INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES
('30000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000001',NOW()-INTERVAL '6 months'),
('30000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000002',NOW()-INTERVAL '3 months'),
('30000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000003',NOW()-INTERVAL '2 months'),
('30000000-0000-0000-0000-000000000008','c0000000-0000-0000-0000-000000000008',NOW()-INTERVAL '1 month'),
('30000000-0000-0000-0000-000000000009','c0000000-0000-0000-0000-000000000001',NOW()-INTERVAL '4 months'),
('30000000-0000-0000-0000-000000000009','c0000000-0000-0000-0000-000000000002',NOW()-INTERVAL '2 months'),
('30000000-0000-0000-0000-000000000010','c0000000-0000-0000-0000-000000000001',NOW()-INTERVAL '2 months');

-- ─── 15. Missions ────────────────────────────────────────────

INSERT INTO missions (id, title, description, category, goal_metric, current_progress,
  target, created_by, status, start_at, end_at, ward_id, city_id, participant_count) VALUES
('d0000000-0000-0000-0000-000000000001',
 'Zero Garbage Ward Challenge - Arera Colony',
 'Join us in making Arera Colony garbage-free for 30 days. Report all illegal dumping, organize community cleanups, ensure 100% segregation.',
 'garbage','Garbage-free days achieved',18,30,
 '30000000-0000-0000-0000-000000000008','active',
 NOW()-INTERVAL '18 days',NOW()+INTERVAL '12 days',
 '10000000-0000-0000-0000-000000000006',
 '00000000-0000-0000-0000-000000000001',47),
('d0000000-0000-0000-0000-000000000002',
 'Kolar Road Safety Audit',
 'Document every pothole, broken streetlight, and unsafe stretch on Kolar Road. Build an evidence base to demand priority repairs.',
 'safety','Safety issues documented',67,100,
 '30000000-0000-0000-0000-000000000009','active',
 NOW()-INTERVAL '10 days',NOW()+INTERVAL '20 days',
 '10000000-0000-0000-0000-000000000007',
 '00000000-0000-0000-0000-000000000001',23),
('d0000000-0000-0000-0000-000000000003',
 'Tree Plantation Drive - MP Nagar',
 'Plant 200 trees in MP Nagar public spaces with community maintenance commitment.',
 'tree_hazard','Trees planted',87,200,
 '30000000-0000-0000-0000-000000000008','active',
 NOW()-INTERVAL '45 days',NOW()+INTERVAL '15 days',
 '10000000-0000-0000-0000-000000000005',
 '00000000-0000-0000-0000-000000000001',89);

-- ─── 16. City Index Snapshots ─────────────────────────────────

INSERT INTO city_index_snapshots (city_id, score, sub_scores, period_start, period_end) VALUES
('00000000-0000-0000-0000-000000000001',61.4,
 '{"cleanliness":58,"roads":54,"water":68,"safety":63,"satisfaction":66,"resolution_rate":71,"citizen_participation":72,"ngo_action":64}'::jsonb,
 (NOW()-INTERVAL '90 days')::date,(NOW()-INTERVAL '61 days')::date),
('00000000-0000-0000-0000-000000000001',63.2,
 '{"cleanliness":60,"roads":56,"water":69,"safety":65,"satisfaction":67,"resolution_rate":73,"citizen_participation":74,"ngo_action":67}'::jsonb,
 (NOW()-INTERVAL '60 days')::date,(NOW()-INTERVAL '31 days')::date),
('00000000-0000-0000-0000-000000000001',66.8,
 '{"cleanliness":64,"roads":58,"water":71,"safety":67,"satisfaction":70,"resolution_rate":75,"citizen_participation":78,"ngo_action":71}'::jsonb,
 (NOW()-INTERVAL '30 days')::date,NOW()::date);

-- ─── 17. Risk Predictions ─────────────────────────────────────

INSERT INTO risk_predictions (city_id, ward_id, category, risk_score, risk_level,
  prediction_window_days, reasoning) VALUES
('00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000006',
 'waterlogging',87.3,'critical',30,
 'Historical data shows flooding in 4 of last 5 monsoon seasons. Drain repair incomplete. Forecast: heavy rainfall likely next 2 weeks.'),
('00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000008',
 'water_supply',72.1,'high',30,
 'Pipeline leakage unresolved 60+ days. Summer season approaching - demand increases 40%. High risk of supply disruption.'),
('00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000007',
 'pothole',65.4,'high',30,
 'Post-monsoon road degradation pattern. 12 new potholes reported in past week. Road base weakening confirmed.'),
('00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000003',
 'garbage',81.9,'critical',14,
 'Waste collection irregular 21+ days. Monsoon conditions accelerate decomposition and disease risk. Urgent intervention needed.'),
('00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000010',
 'safety',69.2,'high',14,
 'Stray dog incident rate increased 4x in 10 days. High footfall area (bus stand). Rabies risk if unaddressed.');

-- ─── 18. Demand Timeline (the story arc) ─────────────────────

INSERT INTO demand_timeline (demand_id, actor_id, stage_from, stage_to, note, evidence) VALUES
-- Resolved demand story
('80000000-0000-0000-0000-000000000005',NULL,NULL,'proposed',
 'Civic Incident auto-promoted to Civic Demand after crossing 100 supporter threshold.','[]'::jsonb),
('80000000-0000-0000-0000-000000000005',
 '30000000-0000-0000-0000-000000000008','proposed','community_supported',
 '156 citizens have now supported this demand.','[]'::jsonb),
('80000000-0000-0000-0000-000000000005',
 '30000000-0000-0000-0000-000000000003','community_supported','accepted',
 'Roads Department acknowledges this as a critical emergency. Work order to be issued within 48 hours.','[]'::jsonb),
('80000000-0000-0000-0000-000000000005',
 '30000000-0000-0000-0000-000000000003','accepted','in_progress',
 'Work order issued. Team deployed. Emergency culvert replacement in progress.','[]'::jsonb),
('80000000-0000-0000-0000-000000000005',
 '30000000-0000-0000-0000-000000000003','in_progress','completed',
 'Culvert replaced. Road surface restored. Quality check passed by site engineer.','["/uploads/timeline_002_1.jpg"]'::jsonb),
('80000000-0000-0000-0000-000000000005',NULL,'completed','citizen_verification',
 'Nearby citizens invited to verify resolution.','[]'::jsonb),
('80000000-0000-0000-0000-000000000005',NULL,'citizen_verification','resolved',
 'Resolution verified: 73% solved (2/3 verifiers). AI confidence: 80%. Demand marked resolved.','[]'::jsonb);

-- ─── 19. Circles ─────────────────────────────────────────────

INSERT INTO circles (id, name, type, description, member_count, city_id, ward_id, created_by) VALUES
('e0000000-0000-0000-0000-000000000001',
 'Barkatullah University Civic Club','college',
 'Students driving civic change from BU campus',124,
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000002',
 '30000000-0000-0000-0000-000000000011'),
('e0000000-0000-0000-0000-000000000002',
 'Arera Colony Residents Circle','locality',
 'Official community circle for Arera Colony RWA members',289,
 '00000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000006',
 '30000000-0000-0000-0000-000000000009'),
('e0000000-0000-0000-0000-000000000003',
 'Bhopal Youth Civic Network','general',
 'Gen Z changemakers across Bhopal',412,
 '00000000-0000-0000-0000-000000000001',NULL,
 '30000000-0000-0000-0000-000000000008');

-- ─── 20. Sample Reports (bulk) ────────────────────────────────

-- A representative sample of individual reports linked to incidents
INSERT INTO reports (user_id, category, description, media_urls, location, ward_id,
  evidence_confidence, status, incident_id, created_at) VALUES
-- Reports for Arera waterlogging incident
('30000000-0000-0000-0000-000000000010','waterlogging',
 'पानी भर गया है मार्केट के पास। घुटनों तक पानी है।',
 '["/uploads/r001_1.jpg"]'::jsonb,
 ST_SetSRID(ST_MakePoint(77.4410, 23.2151), 4326),
 '10000000-0000-0000-0000-000000000006',0.85,'clustered',
 '70000000-0000-0000-0000-000000000001',NOW()-INTERVAL '44 days'),
('30000000-0000-0000-0000-000000000009','waterlogging',
 'Waterlogging near Arera market crossroads. Very dangerous for bikes.',
 '["/uploads/r002_1.jpg","/uploads/r002_2.jpg"]'::jsonb,
 ST_SetSRID(ST_MakePoint(77.4413, 23.2156), 4326),
 '10000000-0000-0000-0000-000000000006',0.92,'clustered',
 '70000000-0000-0000-0000-000000000001',NOW()-INTERVAL '43 days'),
-- Reports for MP Nagar pothole incident
('30000000-0000-0000-0000-000000000008','pothole',
 'Huge pothole on MP Nagar Zone 1. Nearly fell off my bike. Immediate action needed!',
 '["/uploads/r003_1.jpg"]'::jsonb,
 ST_SetSRID(ST_MakePoint(77.4295, 23.2268), 4326),
 '10000000-0000-0000-0000-000000000005',0.88,'clustered',
 '70000000-0000-0000-0000-000000000002',NOW()-INTERVAL '29 days'),
-- Reports for garbage incident
('30000000-0000-0000-0000-000000000011','garbage',
 'Garbage pile at fish bazaar is horrifying. Smells terrible. Health hazard!',
 '["/uploads/r004_1.jpg"]'::jsonb,
 ST_SetSRID(ST_MakePoint(77.4071, 23.2183), 4326),
 '10000000-0000-0000-0000-000000000003',0.79,'clustered',
 '70000000-0000-0000-0000-000000000003',NOW()-INTERVAL '20 days'),
-- Standalone report (not yet clustered into an incident)
('30000000-0000-0000-0000-000000000012','streetlight',
 'Street light not working near Govindpura colony gate for 2 weeks.',
 '[]'::jsonb,
 ST_SetSRID(ST_MakePoint(77.4852, 23.2618), 4326),
 '10000000-0000-0000-0000-000000000015',0.65,'ai_processed',NULL,NOW()-INTERVAL '2 days');

-- ─── 21. Rewards ─────────────────────────────────────────────

INSERT INTO rewards (name, description, sponsor_org_id, points_required, stock, active) VALUES
('BMTC Bus Pass (7 days)',
 'Free 7-day Bhopal city bus pass. Sponsored by Bhopal Municipal Corporation.',
 NULL,500,50,TRUE),
('Bhopal Central Library Premium Membership',
 '6-month premium library membership. Sponsored by Bhopal Green Foundation.',
 '40000000-0000-0000-0000-000000000001',300,20,TRUE),
('InfraFirst Civic Champion T-Shirt',
 'Limited edition civic champion t-shirt. Sponsored by InfraFirst Corp.',
 '40000000-0000-0000-0000-000000000004',200,100,TRUE),
('Digital Certificate of Civic Excellence',
 'Official digital certificate signed by BMC Commissioner, verifiable online.',
 NULL,100,9999,TRUE);

-- ─── 22. Petitions ───────────────────────────────────────────

INSERT INTO petitions (demand_id, title, description, created_by, target_entity,
  signature_count, status, city_id) VALUES
('80000000-0000-0000-0000-000000000001',
 'Demand Pre-Monsoon Drain Inspection for ALL Bhopal Wards',
 'We demand BMC conduct mandatory pre-monsoon drain inspection and cleaning for all 85 wards of Bhopal before June 1 every year, with public report publication.',
 '30000000-0000-0000-0000-000000000008',
 'Bhopal Municipal Corporation Commissioner',
 847,'active','00000000-0000-0000-0000-000000000001'),
('80000000-0000-0000-0000-000000000005',
 'Fix Pipeline Leakages Before Extending New Connections',
 'BMC must first fix all known pipeline leakages before approving new water connections. Water is scarce; leakages are criminal waste.',
 '30000000-0000-0000-0000-000000000009',
 'Water Supply Department Chief',
 432,'active','00000000-0000-0000-0000-000000000001');

-- Done!
SELECT 'Sahay demo seed data loaded successfully for Bhopal!' AS status;
SELECT 'City:', name FROM cities WHERE id = '00000000-0000-0000-0000-000000000001';
SELECT 'Wards:', COUNT(*) FROM wards;
SELECT 'Users:', COUNT(*) FROM users;
SELECT 'Incidents:', COUNT(*) FROM civic_incidents;
SELECT 'Demands:', COUNT(*) FROM civic_demands;
SELECT 'Reports:', COUNT(*) FROM reports;
SELECT 'Organizations:', COUNT(*) FROM organizations;
