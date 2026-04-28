-- =============================================
-- eSewa KYC Fraud Detection System
-- Database Schema + Seed Data
-- =============================================

-- Drop table if re-running
DROP TABLE IF EXISTS kyc_submissions CASCADE;

-- Main KYC submissions table
CREATE TABLE kyc_submissions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ DEFAULT now(),
  full_name            TEXT NOT NULL,
  dob                  DATE,
  id_type              TEXT,                          -- citizenship/passport/voter_id/driving_license
  id_number            TEXT,                          -- document number
  selfie_url           TEXT,
  id_front_url         TEXT,
  id_back_url          TEXT,
  face_match_score     FLOAT,                         -- 0–100
  liveness_pass        BOOLEAN,
  liveness_confidence  FLOAT,                         -- 0–100
  duplicate_similarity FLOAT DEFAULT 0,               -- 0–1
  duplicate_of         UUID REFERENCES kyc_submissions(id),
  device_fingerprint   TEXT,
  ip_address           TEXT,
  is_vpn               BOOLEAN DEFAULT FALSE,
  is_emulator          BOOLEAN DEFAULT FALSE,
  is_tor               BOOLEAN DEFAULT FALSE,
  duplicate_device     BOOLEAN DEFAULT FALSE,
  submission_count     INT DEFAULT 1,
  risk_score           INT,                            -- 0–100
  risk_level           TEXT,                            -- LOW / MEDIUM / HIGH
  flags                TEXT[],
  status               TEXT DEFAULT 'pending',         -- pending/approved/rejected/escalated
  reviewed_at          TIMESTAMPTZ,
  reviewer_note        TEXT
);

-- Indexes for performance
CREATE INDEX idx_kyc_risk_level ON kyc_submissions(risk_level);
CREATE INDEX idx_kyc_status ON kyc_submissions(status);
CREATE INDEX idx_kyc_device_fingerprint ON kyc_submissions(device_fingerprint);
CREATE INDEX idx_kyc_created_at ON kyc_submissions(created_at DESC);
CREATE INDEX idx_kyc_id_number ON kyc_submissions(id_number);
CREATE INDEX idx_kyc_duplicate_of ON kyc_submissions(duplicate_of);

-- Enable Row Level Security
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;

-- Permissive policies for demo / development
CREATE POLICY "Allow public read" ON kyc_submissions
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON kyc_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON kyc_submissions
  FOR UPDATE USING (true) WITH CHECK (true);

-- =============================================
-- Seed Data — 8 Realistic Test Rows
-- =============================================

-- 1. Ram Bahadur Thapa — LOW risk, approved, clean
INSERT INTO kyc_submissions (
  id, created_at, full_name, dob, id_type, id_number,
  selfie_url, id_front_url,
  face_match_score, liveness_pass, liveness_confidence,
  duplicate_similarity, device_fingerprint, ip_address,
  is_vpn, is_emulator, is_tor, duplicate_device, submission_count,
  risk_score, risk_level, flags, status, reviewed_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-000000000001',
  now() - interval '3 hours',
  'Ram Bahadur Thapa', '1992-05-14', 'citizenship', 'NP-012345678',
  NULL, NULL,
  96.2, TRUE, 98.5,
  0.0, 'fp_abc123def456', '103.1.92.45',
  FALSE, FALSE, FALSE, FALSE, 1,
  0, 'LOW', '{}', 'approved', now() - interval '2 hours'
);

-- 2. Sita Kumari Shrestha — MEDIUM risk, pending, VPN + moderate face match
INSERT INTO kyc_submissions (
  id, created_at, full_name, dob, id_type, id_number,
  selfie_url, id_front_url,
  face_match_score, liveness_pass, liveness_confidence,
  duplicate_similarity, device_fingerprint, ip_address,
  is_vpn, is_emulator, is_tor, duplicate_device, submission_count,
  risk_score, risk_level, flags, status
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-000000000002',
  now() - interval '2 hours',
  'Sita Kumari Shrestha', '1988-11-22', 'passport', 'PA-98765432',
  NULL, NULL,
  74.3, TRUE, 88.1,
  0.12, 'fp_ghi789jkl012', '45.33.32.100',
  TRUE, FALSE, FALSE, FALSE, 1,
  33, 'MEDIUM',
  ARRAY['Moderate face match (74%) — recommended manual review', 'VPN or proxy network detected during submission'],
  'pending'
);

-- 3. Bikash Tamang — HIGH risk, pending, liveness fail + very low face match + emulator
INSERT INTO kyc_submissions (
  id, created_at, full_name, dob, id_type, id_number,
  selfie_url, id_front_url,
  face_match_score, liveness_pass, liveness_confidence,
  duplicate_similarity, device_fingerprint, ip_address,
  is_vpn, is_emulator, is_tor, duplicate_device, submission_count,
  risk_score, risk_level, flags, status
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-000000000003',
  now() - interval '1 hour',
  'Bikash Tamang', '1995-03-08', 'driving_license', 'DL-45678901',
  NULL, NULL,
  41.2, FALSE, 52.3,
  0.0, 'fp_mno345pqr678', '192.168.1.100',
  FALSE, TRUE, FALSE, FALSE, 1,
  83, 'HIGH',
  ARRAY['Liveness check failed — possible photo or video spoofing attack', 'Low liveness confidence — borderline result', 'Very low face match (41%) — selfie does not match ID document', 'Device emulator or virtual machine detected'],
  'pending'
);

-- 4. Anita Gurung — LOW risk, approved, clean signals
INSERT INTO kyc_submissions (
  id, created_at, full_name, dob, id_type, id_number,
  selfie_url, id_front_url,
  face_match_score, liveness_pass, liveness_confidence,
  duplicate_similarity, device_fingerprint, ip_address,
  is_vpn, is_emulator, is_tor, duplicate_device, submission_count,
  risk_score, risk_level, flags, status, reviewed_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-000000000004',
  now() - interval '5 hours',
  'Anita Gurung', '1990-07-30', 'voter_id', 'VT-11223344',
  NULL, NULL,
  91.7, TRUE, 95.0,
  0.0, 'fp_stu901vwx234', '202.70.66.12',
  FALSE, FALSE, FALSE, FALSE, 1,
  0, 'LOW', '{}', 'approved', now() - interval '4 hours'
);

-- 5. Duplicate attempt of Ram Bahadur Thapa — HIGH risk, pending
INSERT INTO kyc_submissions (
  id, created_at, full_name, dob, id_type, id_number,
  selfie_url, id_front_url,
  face_match_score, liveness_pass, liveness_confidence,
  duplicate_similarity, duplicate_of, device_fingerprint, ip_address,
  is_vpn, is_emulator, is_tor, duplicate_device, submission_count,
  risk_score, risk_level, flags, status
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-000000000005',
  now() - interval '30 minutes',
  'Ram Bahadur Thapa', '1992-05-14', 'citizenship', 'NP-012345678',
  NULL, NULL,
  88.4, TRUE, 91.0,
  0.96, 'a1b2c3d4-e5f6-7890-abcd-000000000001', 'fp_yza567bcd890', '103.1.92.45',
  FALSE, FALSE, FALSE, TRUE, 2,
  59, 'HIGH',
  ARRAY['Near-identical identity already registered in system (similarity: 96%)', 'Device fingerprint already linked to another account', 'Moderate face match (88%) — recommended manual review'],
  'pending'
);

-- 6. Roshan Maharjan — MEDIUM risk, pending, moderate face match
INSERT INTO kyc_submissions (
  id, created_at, full_name, dob, id_type, id_number,
  selfie_url, id_front_url,
  face_match_score, liveness_pass, liveness_confidence,
  duplicate_similarity, device_fingerprint, ip_address,
  is_vpn, is_emulator, is_tor, duplicate_device, submission_count,
  risk_score, risk_level, flags, status
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-000000000006',
  now() - interval '45 minutes',
  'Roshan Maharjan', '1998-01-15', 'citizenship', 'NP-55667788',
  NULL, NULL,
  68.5, TRUE, 82.3,
  0.21, 'fp_efg123hij456', '27.34.68.90',
  FALSE, FALSE, FALSE, FALSE, 1,
  25, 'MEDIUM',
  ARRAY['Low face match (68%) — possible identity mismatch'],
  'pending'
);

-- 7. Unknown fraudster — HIGH risk, rejected, ALL flags triggered
INSERT INTO kyc_submissions (
  id, created_at, full_name, dob, id_type, id_number,
  selfie_url, id_front_url,
  face_match_score, liveness_pass, liveness_confidence,
  duplicate_similarity, device_fingerprint, ip_address,
  is_vpn, is_emulator, is_tor, duplicate_device, submission_count,
  risk_score, risk_level, flags, status, reviewed_at, reviewer_note
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-000000000007',
  now() - interval '6 hours',
  'Suspicious User', '2000-12-25', 'passport', 'PA-00000000',
  NULL, NULL,
  22.1, FALSE, 35.0,
  0.97, 'fp_klm789nop012', '10.10.10.10',
  TRUE, TRUE, TRUE, TRUE, 5,
  100, 'HIGH',
  ARRAY[
    'Liveness check failed — possible photo or video spoofing attack',
    'Low liveness confidence — borderline result',
    'Very low face match (22%) — selfie does not match ID document',
    'Near-identical identity already registered in system (similarity: 97%)',
    'VPN or proxy network detected during submission',
    'Tor network detected — high anonymity risk',
    'Device emulator or virtual machine detected',
    'Device fingerprint already linked to another account',
    'Unusual number of submissions from this device (5 attempts)'
  ],
  'rejected', now() - interval '5 hours', 'Multiple fraud signals. Clearly synthetic / stolen identity.'
);

-- 8. Priya Shrestha — LOW risk, pending, clean
INSERT INTO kyc_submissions (
  id, created_at, full_name, dob, id_type, id_number,
  selfie_url, id_front_url,
  face_match_score, liveness_pass, liveness_confidence,
  duplicate_similarity, device_fingerprint, ip_address,
  is_vpn, is_emulator, is_tor, duplicate_device, submission_count,
  risk_score, risk_level, flags, status
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-000000000008',
  now() - interval '15 minutes',
  'Priya Shrestha', '1996-09-03', 'citizenship', 'NP-99887766',
  NULL, NULL,
  88.9, TRUE, 93.2,
  0.05, 'fp_qrs345tuv678', '202.70.90.15',
  FALSE, FALSE, FALSE, FALSE, 1,
  0, 'LOW', '{}', 'pending'
);
