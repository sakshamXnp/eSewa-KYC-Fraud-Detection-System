import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { checkLiveness, checkFaceMatch } from '@/lib/rekognition';
import { calculateRisk, type RiskSignals } from '@/lib/risk-engine';

interface DeviceSignals {
  fingerprint: string | null;
  isVpn: boolean;
  isEmulator: boolean;
  isTor: boolean;
}

interface SubmitRequestBody {
  fullName: string;
  dob?: string;
  idType?: string;
  idNumber?: string;
  selfieDataUrl: string;
  idPhotoDataUrl: string;
  deviceSignals: DeviceSignals;
}

/**
 * Convert a base64 data URL to a Buffer.
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.split(',')[1];
  return Buffer.from(base64, 'base64');
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env.local file.' },
        { status: 500 }
      );
    }
    const body: SubmitRequestBody = await req.json();

    // Validate required fields
    if (!body.fullName || !body.selfieDataUrl || !body.idPhotoDataUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName, selfieDataUrl, idPhotoDataUrl' },
        { status: 400 }
      );
    }

    // Extract client IP
    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0';

    // Convert data URLs to buffers
    const selfieBuffer = dataUrlToBuffer(body.selfieDataUrl);
    const idBuffer = dataUrlToBuffer(body.idPhotoDataUrl);

    const deviceFingerprint = body.deviceSignals?.fingerprint || null;

    // Check submission count for this device
    let submissionCount = 1;
    let isDuplicateDevice = false;
    if (deviceFingerprint) {
      const { count } = await supabaseAdmin
        .from('kyc_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('device_fingerprint', deviceFingerprint);
      submissionCount = (count || 0) + 1;
      isDuplicateDevice = (count || 0) > 0;
    }

    // Run analysis checks in parallel
    const [livenessResult, faceMatchScore, duplicateCheck] = await Promise.all([
      // 1. Liveness detection
      checkLiveness(selfieBuffer),

      // 2. Face match comparison
      checkFaceMatch(selfieBuffer, idBuffer),

      // 3. Duplicate identity check
      (async () => {
        let isDuplicate = false;
        let similarity = 0;
        let duplicateOf: string | null = null;

        // Check by device fingerprint
        if (deviceFingerprint) {
          const { data: deviceMatches } = await supabaseAdmin
            .from('kyc_submissions')
            .select('id, full_name, device_fingerprint')
            .eq('device_fingerprint', deviceFingerprint)
            .limit(1);

          if (deviceMatches && deviceMatches.length > 0) {
            isDuplicate = true;
            similarity = Math.max(similarity, 0.88);
            duplicateOf = deviceMatches[0].id;
          }
        }

        // Check by ID number
        if (body.idNumber) {
          const { data: idMatches } = await supabaseAdmin
            .from('kyc_submissions')
            .select('id, full_name, id_number')
            .eq('id_number', body.idNumber)
            .limit(1);

          if (idMatches && idMatches.length > 0) {
            isDuplicate = true;
            similarity = Math.max(similarity, 0.96);
            duplicateOf = idMatches[0].id;
          }
        }

        // Check by name + DOB combination
        if (body.fullName && body.dob) {
          const { data: nameMatches } = await supabaseAdmin
            .from('kyc_submissions')
            .select('id, full_name, dob')
            .eq('full_name', body.fullName)
            .eq('dob', body.dob)
            .limit(1);

          if (nameMatches && nameMatches.length > 0) {
            isDuplicate = true;
            similarity = Math.max(similarity, 0.94);
            duplicateOf = nameMatches[0].id;
          }
        }

        return { isDuplicate, similarity, duplicateOf };
      })(),
    ]);

    // Build risk signals
    const riskSignals: RiskSignals = {
      livenessPass: livenessResult.pass,
      livenessConfidence: livenessResult.confidence,
      faceMatchScore: faceMatchScore,
      duplicateSimilarity: duplicateCheck.similarity,
      isDuplicate: duplicateCheck.isDuplicate,
      isVpn: body.deviceSignals?.isVpn || false,
      isTor: body.deviceSignals?.isTor || false,
      isEmulator: body.deviceSignals?.isEmulator || false,
      isDuplicateDevice,
      submissionCount,
    };

    // Calculate risk score
    const riskResult = calculateRisk(riskSignals);

    // Upload images to Supabase Storage (in parallel with DB insert)
    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID();

    const [selfieUpload, idUpload, dbInsert] = await Promise.all([
      // Upload selfie
      supabaseAdmin.storage
        .from('kyc-photos')
        .upload(`selfies/${timestamp}-${uniqueId}.jpg`, selfieBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        }),

      // Upload ID photo
      supabaseAdmin.storage
        .from('kyc-photos')
        .upload(`ids/${timestamp}-${uniqueId}.jpg`, idBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        }),

      // Insert record
      supabaseAdmin.from('kyc_submissions').insert({
        full_name: body.fullName,
        dob: body.dob || null,
        id_type: body.idType || null,
        id_number: body.idNumber || null,
        selfie_url: `selfies/${timestamp}-${uniqueId}.jpg`,
        id_front_url: `ids/${timestamp}-${uniqueId}.jpg`,
        face_match_score: faceMatchScore,
        liveness_pass: livenessResult.pass,
        liveness_confidence: livenessResult.confidence,
        duplicate_similarity: duplicateCheck.similarity,
        duplicate_of: duplicateCheck.duplicateOf,
        device_fingerprint: deviceFingerprint,
        ip_address: ipAddress,
        is_vpn: body.deviceSignals?.isVpn || false,
        is_emulator: body.deviceSignals?.isEmulator || false,
        is_tor: body.deviceSignals?.isTor || false,
        duplicate_device: isDuplicateDevice,
        submission_count: submissionCount,
        risk_score: riskResult.score,
        risk_level: riskResult.level,
        flags: riskResult.flags,
        status: 'pending',
      }).select().single(),
    ]);

    // Get public URLs for uploaded images
    const selfieUrl = selfieUpload.data?.path
      ? supabaseAdmin.storage.from('kyc-photos').getPublicUrl(selfieUpload.data.path).data.publicUrl
      : null;
    const idPhotoUrl = idUpload.data?.path
      ? supabaseAdmin.storage.from('kyc-photos').getPublicUrl(idUpload.data.path).data.publicUrl
      : null;

    const submissionId = dbInsert.data?.id || uniqueId;

    return NextResponse.json({
      id: submissionId,
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
      flags: riskResult.flags,
      breakdown: riskResult.breakdown,
      signals: {
        liveness: { pass: livenessResult.pass, confidence: livenessResult.confidence },
        faceMatch: faceMatchScore,
        duplicate: {
          isDuplicate: duplicateCheck.isDuplicate,
          similarity: duplicateCheck.similarity,
        },
        device: {
          fingerprint: deviceFingerprint,
          isVpn: body.deviceSignals?.isVpn || false,
          isEmulator: body.deviceSignals?.isEmulator || false,
          isTor: body.deviceSignals?.isTor || false,
          isDuplicateDevice,
        },
      },
      selfieUrl,
      idPhotoUrl,
    });
  } catch (error: unknown) {
    console.error('[KYC Submit] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
