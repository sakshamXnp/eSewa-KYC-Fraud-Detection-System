import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function reset() {
  console.log('--- eSewa KYC Demo Reset Tool ---');

  // 1. Clear existing submissions
  console.log('Cleaning existing submissions...');
  await supabase
    .from('kyc_submissions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. Define seed data (same as seed.ts for consistency)
  const now = new Date();
  const subDays = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const subHours = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  const subMins = (mins: number) => new Date(now.getTime() - mins * 60 * 1000).toISOString();

  const submissions = [
    { full_name: 'Ram Bahadur Thapa', id_type: 'citizenship', dob: '1990-04-15', id_number: 'NP-10293847', risk_score: 0, risk_level: 'LOW', status: 'approved', face_match_score: 96.2, liveness_pass: true, created_at: subDays(3) },
    { full_name: 'Sita Kumari Shrestha', id_type: 'passport', dob: '1988-07-22', id_number: 'PA-55443322', risk_score: 36, risk_level: 'MEDIUM', status: 'pending', face_match_score: 73.1, liveness_pass: true, is_vpn: true, flags: ["VPN detected"], created_at: subDays(2) },
    { full_name: 'Bikash Tamang', id_type: 'driving_license', dob: '1995-11-03', id_number: 'DL-99887766', risk_score: 82, risk_level: 'HIGH', status: 'pending', face_match_score: 41.5, liveness_pass: false, is_emulator: true, flags: ["Liveness failed", "Emulator detected"], created_at: subDays(1) },
    { full_name: 'Anita Gurung', id_type: 'voter_id', dob: '1992-03-30', id_number: 'VI-11223344', risk_score: 0, risk_level: 'LOW', status: 'approved', face_match_score: 91.8, liveness_pass: true, created_at: subHours(5) },
    { full_name: 'Ram Bahadur Thapa (Duplicate)', id_type: 'citizenship', dob: '1990-04-15', id_number: 'NP-10293847', risk_score: 67, risk_level: 'HIGH', status: 'pending', face_match_score: 89.0, liveness_pass: true, duplicate_similarity: 0.96, created_at: subHours(4) },
    { full_name: 'Roshan Maharjan', id_type: 'citizenship', dob: '1987-12-10', id_number: 'NP-77665544', risk_score: 28, risk_level: 'MEDIUM', status: 'pending', face_match_score: 68.4, liveness_pass: true, created_at: subHours(3) },
    { full_name: 'Unknown Fraudster', id_type: 'passport', dob: '1980-01-01', id_number: 'PA-00000000', risk_score: 100, risk_level: 'HIGH', status: 'rejected', face_match_score: 11.0, liveness_pass: false, is_vpn: true, is_tor: true, is_emulator: true, duplicate_device: true, submission_count: 7, reviewed_at: subHours(2), reviewer_note: "Clear fraud attempt.", created_at: subHours(6) },
    { full_name: 'Priya Shrestha', id_type: 'citizenship', dob: '1993-08-14', id_number: 'NP-33221100', risk_score: 8, risk_level: 'LOW', status: 'pending', face_match_score: 88.3, liveness_pass: true, created_at: subHours(1) },
    { full_name: 'Dipesh Rai', id_type: 'voter_id', dob: '1991-05-20', id_number: 'VI-99001122', risk_score: 45, risk_level: 'MEDIUM', status: 'escalated', face_match_score: 77.2, liveness_pass: true, is_vpn: true, reviewer_note: "Escalated for identity team review", created_at: subHours(2) },
    { full_name: 'Kamala Devi Adhikari', id_type: 'passport', dob: '1985-09-08', id_number: 'PA-88776655', risk_score: 0, risk_level: 'LOW', status: 'approved', face_match_score: 94.1, liveness_pass: true, created_at: subMins(30) },
    { full_name: 'Suresh Bahadur KC', id_type: 'driving_license', dob: '1997-02-25', id_number: 'DL-55667788', risk_score: 55, risk_level: 'HIGH', status: 'pending', face_match_score: 59.3, liveness_pass: false, created_at: subMins(15) },
    { full_name: 'Maya Lama', id_type: 'citizenship', dob: '1994-06-18', id_number: 'NP-11002299', risk_score: 20, risk_level: 'MEDIUM', status: 'pending', face_match_score: 79.8, liveness_pass: true, created_at: subMins(5) }
  ];

  await supabase.from('kyc_submissions').insert(submissions);

  console.log('\n=================================================');
  console.log('eSewa KYC Demo Reset Complete');
  console.log('=================================================');
  console.log('LOW Risk:    4 submissions (2 approved, 2 pending)');
  console.log('MEDIUM Risk: 4 submissions (0 approved, 3 pending, 1 escalated)');
  console.log('HIGH Risk:   4 submissions (0 approved, 2 pending, 1 rejected)');
  console.log('-------------------------------------------------');
  console.log('Ready for demo at http://localhost:3000');
  console.log('Admin dashboard: http://localhost:3000/admin');
  console.log('=================================================\n');
}

reset();
