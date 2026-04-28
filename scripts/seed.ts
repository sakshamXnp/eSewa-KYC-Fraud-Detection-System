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

async function seed() {
  console.log('--- eSewa KYC Seed Tool ---');

  // 1. Clear existing submissions
  console.log('Cleaning existing submissions...');
  const { error: deleteError } = await supabase
    .from('kyc_submissions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Hack to delete all rows

  if (deleteError) {
    console.error('Error clearing DB:', deleteError);
    return;
  }

  // 2. Define seed data
  const now = new Date();
  const subDays = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  const subHours = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
  const subMins = (mins: number) => new Date(now.getTime() - mins * 60 * 1000).toISOString();

  const submissions = [
    {
      full_name: 'Ram Bahadur Thapa', id_type: 'citizenship', dob: '1990-04-15', id_number: 'NP-10293847',
      risk_score: 0, risk_level: 'LOW', status: 'approved', face_match_score: 96.2, liveness_pass: true,
      liveness_confidence: 98.5, duplicate_similarity: 0, flags: [], created_at: subDays(3)
    },
    {
      full_name: 'Sita Kumari Shrestha', id_type: 'passport', dob: '1988-07-22', id_number: 'PA-55443322',
      risk_score: 36, risk_level: 'MEDIUM', status: 'pending', face_match_score: 73.1, liveness_pass: true,
      liveness_confidence: 89.2, is_vpn: true, flags: ["VPN detected", "Moderate face match (73.1%) — needs review"],
      created_at: subDays(2)
    },
    {
      full_name: 'Bikash Tamang', id_type: 'driving_license', dob: '1995-11-03', id_number: 'DL-99887766',
      risk_score: 82, risk_level: 'HIGH', status: 'pending', face_match_score: 41.5, liveness_pass: false,
      liveness_confidence: 12.4, is_emulator: true, flags: ["Liveness failed", "Device emulator detected", "Low face match (41.5%)"],
      created_at: subDays(1)
    },
    {
      full_name: 'Anita Gurung', id_type: 'voter_id', dob: '1992-03-30', id_number: 'VI-11223344',
      risk_score: 0, risk_level: 'LOW', status: 'approved', face_match_score: 91.8, liveness_pass: true,
      liveness_confidence: 95.1, flags: [], created_at: subHours(5)
    },
    {
      full_name: 'Ram Bahadur Thapa', id_type: 'citizenship', dob: '1990-04-15', id_number: 'NP-10293847',
      risk_score: 67, risk_level: 'HIGH', status: 'pending', face_match_score: 89.0, liveness_pass: true,
      liveness_confidence: 94.2, duplicate_similarity: 0.96, flags: ["Near-identical identity already registered"],
      created_at: subHours(4)
    },
    {
      full_name: 'Roshan Maharjan', id_type: 'citizenship', dob: '1987-12-10', id_number: 'NP-77665544',
      risk_score: 28, risk_level: 'MEDIUM', status: 'pending', face_match_score: 68.4, liveness_pass: true,
      liveness_confidence: 90.1, flags: ["Low face match (68.4%)"], created_at: subHours(3)
    },
    {
      full_name: 'Unknown Fraudster', id_type: 'passport', dob: '1980-01-01', id_number: 'PA-00000000',
      risk_score: 100, risk_level: 'HIGH', status: 'rejected', face_match_score: 11.0, liveness_pass: false,
      liveness_confidence: 5.2, is_vpn: true, is_tor: true, is_emulator: true, duplicate_device: true,
      submission_count: 7, flags: ["Liveness failed", "VPN detected", "Tor detected", "Emulator detected", "Duplicate device", "High submission count"],
      reviewed_at: subHours(2), reviewer_note: "Clear fraud attempt — all signals triggered. Blocked.",
      created_at: subHours(6)
    },
    {
      full_name: 'Priya Shrestha', id_type: 'citizenship', dob: '1993-08-14', id_number: 'NP-33221100',
      risk_score: 8, risk_level: 'LOW', status: 'pending', face_match_score: 88.3, liveness_pass: true,
      liveness_confidence: 92.4, flags: [], created_at: subHours(1)
    },
    {
      full_name: 'Dipesh Rai', id_type: 'voter_id', dob: '1991-05-20', id_number: 'VI-99001122',
      risk_score: 45, risk_level: 'MEDIUM', status: 'escalated', face_match_score: 77.2, liveness_pass: true,
      liveness_confidence: 85.6, is_vpn: true, duplicate_similarity: 0.87,
      reviewer_note: "Escalated for identity team review", created_at: subHours(2)
    },
    {
      full_name: 'Kamala Devi Adhikari', id_type: 'passport', dob: '1985-09-08', id_number: 'PA-88776655',
      risk_score: 0, risk_level: 'LOW', status: 'approved', face_match_score: 94.1, liveness_pass: true,
      liveness_confidence: 97.2, flags: [], created_at: subMins(30)
    },
    {
      full_name: 'Suresh Bahadur KC', id_type: 'driving_license', dob: '1997-02-25', id_number: 'DL-55667788',
      risk_score: 55, risk_level: 'HIGH', status: 'pending', face_match_score: 59.3, liveness_pass: false,
      liveness_confidence: 34.1, flags: ["Liveness failed", "Low face match (59.3%)"],
      created_at: subMins(15)
    },
    {
      full_name: 'Maya Lama', id_type: 'citizenship', dob: '1994-06-18', id_number: 'NP-11002299',
      risk_score: 20, risk_level: 'MEDIUM', status: 'pending', face_match_score: 79.8, liveness_pass: true,
      liveness_confidence: 88.5, is_tor: false, flags: ["Moderate face match (79.8%)"],
      created_at: subMins(5)
    }
  ];

  // Fix duplicate_of for Ram Bahadur Thapa (index 4)
  // We need to insert row 0 first to get its ID
  const { data: insertedFirst, error: insertFirstError } = await supabase
    .from('kyc_submissions')
    .insert(submissions[0])
    .select('id')
    .single();

  if (insertFirstError) {
    console.error('Error inserting first record:', insertFirstError);
    return;
  }

  (submissions[4] as any).duplicate_of = insertedFirst.id;

  const { data: insertedRest, error: insertError } = await supabase
    .from('kyc_submissions')
    .insert(submissions.slice(1));

  if (insertError) {
    console.error('Error seeding data:', insertError);
    return;
  }

  console.log('✓ Seeded 12 submissions successfully');
  
  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  submissions.forEach(s => {
    counts[s.risk_level as keyof typeof counts]++;
  });
  console.log(`Breakdown: ${counts.LOW} Low, ${counts.MEDIUM} Medium, ${counts.HIGH} High`);
}

seed();
