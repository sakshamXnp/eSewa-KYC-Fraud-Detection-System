'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useFingerprint } from '@/lib/fingerprint';

type Step = 'intro' | 'selfie' | 'id_upload' | 'submitting' | 'done';

interface SignalResult {
  liveness: { pass: boolean; confidence: number };
  faceMatch: number;
  duplicate: { isDuplicate: boolean; similarity: number };
  device: {
    fingerprint: string | null;
    isVpn: boolean;
    isEmulator: boolean;
    isTor: boolean;
    isDuplicateDevice: boolean;
  };
}

interface SubmitResult {
  id: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  flags: string[];
  breakdown: Record<string, number>;
  signals: SignalResult;
}

const ID_TYPES = [
  { value: 'citizenship', label: 'Citizenship Card (Nagarikta)' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID Card' },
  { value: 'driving_license', label: 'Driving License' },
];

export default function KYCSubmissionPage() {
  const [step, setStep] = useState<Step>('intro');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [idType, setIdType] = useState('citizenship');
  const [idNumber, setIdNumber] = useState('');
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [idPhotoDataUrl, setIdPhotoDataUrl] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { fingerprint, isVpn, isEmulator, isTor, loading: fpLoading } = useFingerprint();

  // Cleanup webcam stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please allow camera permissions.');
    }
  }, []);

  // Capture selfie from video feed
  const captureSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setSelfieDataUrl(dataUrl);
      stopCamera();
    }
  }, [stopCamera]);

  // Handle ID photo upload
  const handleIdUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setIdPhotoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Submit KYC
  const handleSubmit = useCallback(async () => {
    if (!selfieDataUrl || !idPhotoDataUrl) return;
    setStep('submitting');
    setError(null);

    try {
      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          dob: dob || undefined,
          idType,
          idNumber: idNumber || undefined,
          selfieDataUrl,
          idPhotoDataUrl,
          deviceSignals: {
            fingerprint,
            isVpn,
            isEmulator,
            isTor,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      // Wait a bit to show the animation
      await new Promise((r) => setTimeout(r, 2500));
      setResult(data);
      setStep('done');
    } catch (err: unknown) {
      setError((err as Error).message);
      setStep('id_upload');
    }
  }, [fullName, dob, idType, idNumber, selfieDataUrl, idPhotoDataUrl, fingerprint, isVpn, isEmulator, isTor]);

  // Transition to selfie step
  const goToSelfie = useCallback(() => {
    setStep('selfie');
    setTimeout(startCamera, 300);
  }, [startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const isIntroValid = fullName.trim().length > 0;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'HIGH': return 'rgba(239,68,68,0.12)';
      case 'MEDIUM': return 'rgba(245,158,11,0.12)';
      case 'LOW': return 'rgba(34,197,94,0.12)';
      default: return 'rgba(100,116,139,0.12)';
    }
  };

  return (
    <>
      {/* Navigation */}
      <nav className="kyc-nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <span className="brand-e">e</span>
            <span className="brand-sewa">Sewa</span>
            <span className="brand-divider">|</span>
            <span className="brand-label">KYC Verify</span>
          </div>
          <a href="/admin" className="nav-admin-link">
            Admin Dashboard →
          </a>
        </div>
      </nav>

      <main className="kyc-main">
        {/* STEP: INTRO */}
        {step === 'intro' && (
          <div className="card fade-up">
            <div className="card-header">
              <div className="shield-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4" stroke="#60a5fa"/>
                </svg>
              </div>
              <h1 className="card-title">Complete Your KYC Verification</h1>
              <p className="card-subtitle">
                As per Nepal Rastra Bank (NRB) regulations, identity verification is required
                for all eSewa accounts. This process takes less than 2 minutes.
              </p>
            </div>

            <div className="steps-preview">
              <div className="step-chip">
                <span className="step-num">1</span>
                <span>Live Selfie</span>
              </div>
              <div className="step-arrow">→</div>
              <div className="step-chip">
                <span className="step-num">2</span>
                <span>Upload ID</span>
              </div>
              <div className="step-arrow">→</div>
              <div className="step-chip">
                <span className="step-num">3</span>
                <span>Instant Review</span>
              </div>
            </div>

            <div className="form-section">
              <div className="input-group">
                <label htmlFor="fullName">Full Name (as on ID document)</label>
                <input
                  id="fullName"
                  type="text"
                  placeholder="e.g. Ram Bahadur Thapa"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="input-row">
                <div className="input-group">
                  <label htmlFor="dob">Date of Birth</label>
                  <input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="idType">ID Document Type</label>
                  <select
                    id="idType"
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                  >
                    {ID_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="idNumber">Document Number</label>
                <input
                  id="idNumber"
                  type="text"
                  placeholder="e.g. NP-012345678"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="trust-badges">
              <div className="trust-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                NRB Compliant
              </div>
              <div className="trust-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                256-bit Encrypted
              </div>
              <div className="trust-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                AI Verified
              </div>
            </div>

            <button
              className="btn-primary"
              disabled={!isIntroValid}
              onClick={goToSelfie}
            >
              Begin Verification →
            </button>
          </div>
        )}

        {/* STEP: SELFIE */}
        {step === 'selfie' && (
          <div className="card fade-up">
            <div className="step-indicator">Step 1 of 3</div>
            <h2 className="card-title-sm">Take a Live Selfie</h2>
            <p className="card-subtitle-sm">
              Position your face within the oval guide. Ensure good lighting and face the camera directly.
            </p>

            <div className="tips-row">
              <span className="tip">☀️ Good lighting</span>
              <span className="tip">👓 No glasses</span>
              <span className="tip">😊 Face forward</span>
              <span className="tip">🚫 No coverings</span>
            </div>

            {!selfieDataUrl ? (
              <div className="camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-feed"
                />
                <div className="face-guide" />
                <p className="guide-text">Position your face in the oval</p>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
            ) : (
              <div className="preview-container">
                <img src={selfieDataUrl} alt="Captured selfie" className="preview-image" />
                <div className="preview-badge">✓ Captured</div>
              </div>
            )}

            <div className="btn-row">
              {!selfieDataUrl ? (
                <button className="btn-primary" onClick={captureSelfie}>
                  📸 Capture Photo
                </button>
              ) : (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setSelfieDataUrl(null);
                      startCamera();
                    }}
                  >
                    ↺ Retake
                  </button>
                  <button className="btn-primary" onClick={() => setStep('id_upload')}>
                    Continue →
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP: ID UPLOAD */}
        {step === 'id_upload' && (
          <div className="card fade-up">
            <div className="step-indicator">Step 2 of 3</div>
            <h2 className="card-title-sm">Upload Your ID Document</h2>
            <p className="card-subtitle-sm">
              Upload your {ID_TYPES.find((t) => t.value === idType)?.label || 'ID document'}.
              Ensure all text is clearly visible.
            </p>

            {error && (
              <div className="error-banner">⚠️ {error}</div>
            )}

            <div className="photos-row">
              <div className="photo-card">
                <div className="photo-label">Your Selfie</div>
                {selfieDataUrl && (
                  <img src={selfieDataUrl} alt="Selfie" className="photo-thumb" />
                )}
                <span className="photo-status pass">✓ Captured</span>
              </div>

              <div className="photo-card">
                <div className="photo-label">ID Document</div>
                {idPhotoDataUrl ? (
                  <img src={idPhotoDataUrl} alt="ID Photo" className="photo-thumb" />
                ) : (
                  <div
                    className="upload-zone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M12 8v8M8 12h8"/>
                    </svg>
                    <span>Click to upload</span>
                    <span className="upload-hint">JPG, PNG — max 10MB</span>
                  </div>
                )}
                {idPhotoDataUrl && <span className="photo-status pass">✓ Uploaded</span>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIdUpload}
                  style={{ display: 'none' }}
                  id="idPhotoInput"
                />
              </div>
            </div>

            <p className="note-text">
              ⓘ Ensure all text on your document is legible. Blurry or cropped images will reduce accuracy.
            </p>

            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep('selfie')}>
                ← Back
              </button>
              <button
                className="btn-primary"
                disabled={!idPhotoDataUrl || fpLoading}
                onClick={handleSubmit}
              >
                {fpLoading ? 'Collecting signals...' : 'Submit for Verification →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP: SUBMITTING */}
        {step === 'submitting' && (
          <div className="card fade-up submitting-card">
            <div className="spinner" />
            <h2 className="card-title-sm">Analyzing Your Submission</h2>
            <p className="card-subtitle-sm">
              Running AI-powered fraud detection checks...
            </p>

            <div className="analysis-steps">
              <div className="analysis-step step-1">
                <span className="step-dot" />
                <span className="step-label">Verifying liveness...</span>
                <span className="step-check">✓</span>
              </div>
              <div className="analysis-step step-2">
                <span className="step-dot" />
                <span className="step-label">Matching face to ID document...</span>
                <span className="step-check">✓</span>
              </div>
              <div className="analysis-step step-3">
                <span className="step-dot" />
                <span className="step-label">Scanning for duplicate identities...</span>
                <span className="step-check">✓</span>
              </div>
              <div className="analysis-step step-4">
                <span className="step-dot" />
                <span className="step-label">Checking device &amp; network signals...</span>
                <span className="step-check">✓</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP: DONE */}
        {step === 'done' && result && (
          <div className="card fade-up">
            <div className="result-header">
              <div
                className="risk-badge-large"
                style={{
                  background: getRiskBg(result.riskLevel),
                  color: getRiskColor(result.riskLevel),
                  borderColor: getRiskColor(result.riskLevel),
                }}
              >
                {result.riskLevel} RISK
              </div>
              <div className="score-display">
                <span className="score-number" style={{ color: getRiskColor(result.riskLevel) }}>
                  {result.riskScore}
                </span>
                <span className="score-label">/100</span>
              </div>
              <div className="score-bar-container">
                <div
                  className="score-bar-fill"
                  style={{
                    width: `${result.riskScore}%`,
                    background: getRiskColor(result.riskLevel),
                  }}
                />
              </div>
            </div>

            <div className="signals-grid">
              <div className="signal-card">
                <div className="signal-icon">
                  {result.signals.liveness.pass ? '✓' : '✗'}
                </div>
                <div className="signal-label">Liveness</div>
                <div
                  className="signal-value"
                  style={{ color: result.signals.liveness.pass ? '#22c55e' : '#ef4444' }}
                >
                  {result.signals.liveness.pass ? 'Pass' : 'Fail'}
                </div>
                <div className="signal-detail">{result.signals.liveness.confidence}%</div>
              </div>

              <div className="signal-card">
                <div className="signal-icon">👤</div>
                <div className="signal-label">Face Match</div>
                <div
                  className="signal-value"
                  style={{ color: result.signals.faceMatch >= 70 ? '#22c55e' : result.signals.faceMatch >= 50 ? '#f59e0b' : '#ef4444' }}
                >
                  {result.signals.faceMatch}%
                </div>
              </div>

              <div className="signal-card">
                <div className="signal-icon">
                  {result.signals.duplicate.isDuplicate ? '⚠️' : '✓'}
                </div>
                <div className="signal-label">Duplicate</div>
                <div
                  className="signal-value"
                  style={{ color: result.signals.duplicate.isDuplicate ? '#f59e0b' : '#22c55e' }}
                >
                  {result.signals.duplicate.isDuplicate ? 'Found' : 'None'}
                </div>
                {result.signals.duplicate.isDuplicate && (
                  <div className="signal-detail">
                    {Math.round(result.signals.duplicate.similarity * 100)}% match
                  </div>
                )}
              </div>

              <div className="signal-card">
                <div className="signal-icon">🌐</div>
                <div className="signal-label">Network</div>
                <div
                  className="signal-value"
                  style={{
                    color:
                      result.signals.device.isVpn || result.signals.device.isTor
                        ? '#ef4444'
                        : '#22c55e',
                  }}
                >
                  {result.signals.device.isVpn || result.signals.device.isTor ? 'Flagged' : 'Clean'}
                </div>
              </div>
            </div>

            {result.flags.length > 0 && (
              <div className="flags-section">
                <h3 className="flags-title">⚠ Flags Detected</h3>
                <div className="flags-list">
                  {result.flags.map((flag, i) => (
                    <div key={i} className="flag-chip">
                      {flag}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="result-message">
              {result.riskLevel === 'LOW' && (
                <p>✅ Your verification looks good. A reviewer will confirm within 24 hours.</p>
              )}
              {result.riskLevel === 'MEDIUM' && (
                <p>🔍 Your submission has been flagged for manual review. We&apos;ll contact you within 48 hours.</p>
              )}
              {result.riskLevel === 'HIGH' && (
                <p>🚨 Your submission requires additional verification. Our team will reach out for further steps.</p>
              )}
            </div>

            <div className="ref-id">
              Submission Reference: <span className="mono">{result.id}</span>
            </div>

            <div className="btn-row">
              <a href="/admin" className="btn-secondary">
                View in Admin Dashboard →
              </a>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .kyc-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 15, 30, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #1e2d4a;
        }

        .nav-inner {
          max-width: 800px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          font-size: 18px;
        }

        .brand-e {
          background: #60B158;
          color: white;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-weight: 700;
          margin-right: 6px;
          font-size: 16px;
        }

        .brand-sewa { color: #f1f5f9; }
        .brand-divider { color: #334155; margin: 0 8px; font-weight: 300; }
        .brand-label { color: #3b82f6; font-weight: 500; font-size: 14px; }

        .nav-admin-link {
          color: #64748b;
          font-size: 13px;
          transition: color 0.2s;
        }
        .nav-admin-link:hover { color: #3b82f6; }

        .kyc-main {
          max-width: 720px;
          margin: 0 auto;
          padding: 40px 20px 80px;
          min-height: calc(100vh - 62px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }

        .card {
          background: #0f1929;
          border: 1px solid #1e2d4a;
          border-radius: 16px;
          padding: 40px;
          width: 100%;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fade-up {
          animation: fadeUp 0.5s ease forwards;
        }

        .card-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .shield-icon {
          margin-bottom: 16px;
        }

        .card-title {
          font-size: 26px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 12px;
        }

        .card-subtitle {
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          max-width: 480px;
          margin: 0 auto;
        }

        .card-title-sm {
          font-size: 22px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 8px;
        }

        .card-subtitle-sm {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 24px;
        }

        .step-indicator {
          color: #3b82f6;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        /* Steps preview */
        .steps-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .step-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          font-size: 13px;
          color: #94a3b8;
        }

        .step-num {
          background: #3b82f6;
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
        }

        .step-arrow { color: #334155; font-size: 16px; }

        /* Form */
        .form-section { margin-bottom: 24px; }

        .input-group {
          margin-bottom: 16px;
        }

        .input-group label {
          display: block;
          color: #94a3b8;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .input-group input,
        .input-group select {
          width: 100%;
          padding: 12px 16px;
          background: #0a0f1e;
          border: 1px solid #1e2d4a;
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 15px;
          transition: border-color 0.2s;
        }

        .input-group input:focus,
        .input-group select:focus {
          border-color: #3b82f6;
          outline: none;
        }

        .input-group input::placeholder {
          color: #334155;
        }

        .input-group select option {
          background: #0a0f1e;
          color: #f1f5f9;
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* Trust badges */
        .trust-badges {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-bottom: 28px;
        }

        .trust-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #64748b;
        }

        /* Buttons */
        .btn-primary {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          font-size: 15px;
          font-weight: 600;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #60a5fa, #3b82f6);
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-secondary {
          padding: 12px 24px;
          background: transparent;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          border-radius: 10px;
          border: 1px solid #1e2d4a;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn-secondary:hover {
          background: rgba(59, 130, 246, 0.08);
          color: #f1f5f9;
          border-color: #3b82f6;
        }

        .btn-row {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .btn-row .btn-primary {
          flex: 1;
        }

        /* Camera */
        .camera-container {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto 24px;
          border-radius: 16px;
          overflow: hidden;
          background: #0a0f1e;
          aspect-ratio: 4/3;
        }

        .camera-feed {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }

        .face-guide {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 260px;
          border: 2px dashed rgba(59, 130, 246, 0.5);
          border-radius: 50%;
          pointer-events: none;
        }

        .guide-text {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          color: #60a5fa;
          font-size: 12px;
          background: rgba(10, 15, 30, 0.8);
          padding: 6px 14px;
          border-radius: 6px;
        }

        .tips-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .tip {
          font-size: 12px;
          color: #64748b;
          padding: 4px 10px;
          background: rgba(100, 116, 139, 0.08);
          border-radius: 6px;
        }

        /* Preview */
        .preview-container {
          position: relative;
          width: 100%;
          max-width: 400px;
          margin: 0 auto 24px;
          border-radius: 16px;
          overflow: hidden;
        }

        .preview-image {
          width: 100%;
          border-radius: 16px;
          border: 2px solid #22c55e;
        }

        .preview-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(34, 197, 94, 0.9);
          color: white;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        /* ID Upload */
        .photos-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .photo-card {
          background: #0a0f1e;
          border: 1px solid #1e2d4a;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }

        .photo-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .photo-thumb {
          width: 100%;
          max-height: 180px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .photo-status {
          font-size: 12px;
          font-weight: 500;
        }

        .photo-status.pass { color: #22c55e; }

        .upload-zone {
          border: 2px dashed #1e2d4a;
          border-radius: 12px;
          padding: 32px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: border-color 0.2s;
          color: #64748b;
          font-size: 14px;
        }

        .upload-zone:hover {
          border-color: #3b82f6;
          background: rgba(59, 130, 246, 0.04);
        }

        .upload-hint {
          font-size: 11px;
          color: #334155;
        }

        .note-text {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 8px;
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 20px;
        }

        /* Submitting animation */
        .submitting-card {
          text-align: center;
          padding: 60px 40px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid #1e2d4a;
          border-top-color: #3b82f6;
          border-radius: 50%;
          margin: 0 auto 24px;
          animation: spin 1s linear infinite;
        }

        .analysis-steps {
          text-align: left;
          max-width: 380px;
          margin: 24px auto 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .analysis-step {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #64748b;
          opacity: 0;
          animation: fadeUp 0.4s ease forwards;
        }

        .step-1 { animation-delay: 0s; }
        .step-2 { animation-delay: 0.5s; }
        .step-3 { animation-delay: 1.0s; }
        .step-4 { animation-delay: 1.5s; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3b82f6;
          animation: pulse 1s ease infinite;
        }

        .step-check {
          color: #22c55e;
          font-weight: 600;
          margin-left: auto;
          opacity: 0;
          animation: fadeUp 0.3s ease forwards;
        }

        .step-1 .step-check { animation-delay: 0.4s; }
        .step-2 .step-check { animation-delay: 0.9s; }
        .step-3 .step-check { animation-delay: 1.4s; }
        .step-4 .step-check { animation-delay: 1.9s; }

        .step-label { flex: 1; }

        /* Results */
        .result-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .risk-badge-large {
          display: inline-block;
          padding: 8px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          border: 1px solid;
          margin-bottom: 16px;
          font-family: 'JetBrains Mono', monospace;
        }

        .score-display {
          margin-bottom: 12px;
        }

        .score-number {
          font-family: 'JetBrains Mono', monospace;
          font-size: 56px;
          font-weight: 700;
        }

        .score-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 20px;
          color: #64748b;
        }

        .score-bar-container {
          width: 100%;
          height: 6px;
          background: #1e2d4a;
          border-radius: 3px;
          overflow: hidden;
        }

        .score-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s ease;
        }

        /* Signal grid */
        .signals-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }

        .signal-card {
          background: #0a0f1e;
          border: 1px solid #1e2d4a;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
        }

        .signal-icon {
          font-size: 24px;
          margin-bottom: 8px;
        }

        .signal-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .signal-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 18px;
          font-weight: 600;
        }

        .signal-detail {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #64748b;
          margin-top: 4px;
        }

        /* Flags */
        .flags-section {
          margin-bottom: 24px;
        }

        .flags-title {
          font-size: 14px;
          font-weight: 600;
          color: #f59e0b;
          margin-bottom: 12px;
        }

        .flags-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .flag-chip {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.4;
        }

        .result-message {
          background: rgba(59, 130, 246, 0.06);
          border: 1px solid rgba(59, 130, 246, 0.15);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .result-message p {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.5;
        }

        .ref-id {
          text-align: center;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 8px;
        }

        .mono {
          font-family: 'JetBrains Mono', monospace;
          color: #94a3b8;
          font-size: 11px;
        }

        @media (max-width: 600px) {
          .card { padding: 24px 20px; }
          .input-row { grid-template-columns: 1fr; }
          .steps-preview { flex-direction: column; }
          .step-arrow { transform: rotate(90deg); }
          .photos-row { grid-template-columns: 1fr; }
          .signals-grid { grid-template-columns: 1fr 1fr; }
          .trust-badges { flex-direction: column; align-items: center; }
        }
      `}</style>
    </>
  );
}
