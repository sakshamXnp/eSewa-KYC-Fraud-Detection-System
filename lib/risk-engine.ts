/**
 * Risk Scoring Engine — Pure function, no side effects.
 * Combines all fraud signals into a 0–100 risk score with explainable flags.
 */

export interface RiskSignals {
  livenessPass: boolean;
  livenessConfidence: number;
  faceMatchScore: number;
  duplicateSimilarity: number;
  isDuplicate: boolean;
  isVpn: boolean;
  isTor: boolean;
  isEmulator: boolean;
  isDuplicateDevice: boolean;
  submissionCount: number;
}

export interface RiskResult {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  flags: string[];
  breakdown: Record<string, number>;
}

/**
 * Calculate risk score from fraud signals.
 * Each signal contributes a specific number of points and a descriptive flag.
 */
export function calculateRisk(signals: RiskSignals): RiskResult {
  let score = 0;
  const flags: string[] = [];
  const breakdown: Record<string, number> = {};

  // --- Liveness check ---
  if (!signals.livenessPass) {
    score += 25;
    breakdown['liveness_fail'] = 25;
    flags.push('Liveness check failed — possible photo or video spoofing attack');
  }

  if (signals.livenessConfidence < 70) {
    score += 8;
    breakdown['liveness_low_confidence'] = 8;
    flags.push('Low liveness confidence — borderline result');
  }

  // --- Face match ---
  const fm = signals.faceMatchScore;
  if (fm < 50) {
    score += 40;
    breakdown['face_match_very_low'] = 40;
    flags.push(`Very low face match (${fm}%) — selfie does not match ID document`);
  } else if (fm < 70) {
    score += 25;
    breakdown['face_match_low'] = 25;
    flags.push(`Low face match (${fm}%) — possible identity mismatch`);
  } else if (fm < 82) {
    score += 12;
    breakdown['face_match_moderate'] = 12;
    flags.push(`Moderate face match (${fm}%) — recommended manual review`);
  }

  // --- Duplicate identity ---
  const ds = signals.duplicateSimilarity;
  if (ds > 0.93) {
    score += 25;
    breakdown['duplicate_high'] = 25;
    flags.push(`Near-identical identity already registered in system (similarity: ${Math.round(ds * 100)}%)`);
  } else if (ds >= 0.85) {
    score += 12;
    breakdown['duplicate_moderate'] = 12;
    flags.push('Similar identity found — possible duplicate account attempt');
  }

  // --- Network signals ---
  if (signals.isVpn) {
    score += 8;
    breakdown['vpn'] = 8;
    flags.push('VPN or proxy network detected during submission');
  }

  if (signals.isTor) {
    score += 15;
    breakdown['tor'] = 15;
    flags.push('Tor network detected — high anonymity risk');
  }

  // --- Device signals ---
  if (signals.isEmulator) {
    score += 10;
    breakdown['emulator'] = 10;
    flags.push('Device emulator or virtual machine detected');
  }

  if (signals.isDuplicateDevice) {
    score += 12;
    breakdown['duplicate_device'] = 12;
    flags.push('Device fingerprint already linked to another account');
  }

  if (signals.submissionCount > 3) {
    score += 10;
    breakdown['high_submission_count'] = 10;
    flags.push(`Unusual number of submissions from this device (${signals.submissionCount} attempts)`);
  }

  // Cap score at 100
  score = Math.min(score, 100);

  // Determine risk level
  let level: 'LOW' | 'MEDIUM' | 'HIGH';
  if (score >= 55) {
    level = 'HIGH';
  } else if (score >= 28) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }

  return { score, level, flags, breakdown };
}

/**
 * Get the display color for a risk level.
 */
export function getRiskColor(level: string): string {
  switch (level) {
    case 'HIGH':
      return '#ef4444';
    case 'MEDIUM':
      return '#f59e0b';
    case 'LOW':
      return '#22c55e';
    default:
      return '#64748b';
  }
}
