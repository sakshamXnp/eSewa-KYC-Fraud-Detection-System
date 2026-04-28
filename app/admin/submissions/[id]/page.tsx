'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface Submission {
  id: string;
  created_at: string;
  full_name: string;
  dob: string;
  id_type: string;
  id_number: string;
  selfie_url: string;
  id_front_url: string;
  face_match_score: number;
  liveness_pass: boolean;
  liveness_confidence: number;
  duplicate_similarity: number;
  duplicate_of: string;
  device_fingerprint: string;
  ip_address: string;
  is_vpn: boolean;
  is_emulator: boolean;
  is_tor: boolean;
  duplicate_device: boolean;
  submission_count: number;
  risk_score: number;
  risk_level: string;
  flags: string[];
  status: string;
  reviewed_at: string;
  reviewer_note: string;
}

export default function SubmissionDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [scoreBarWidth, setScoreBarWidth] = useState(0);

  const fetchSubmission = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/submissions/${id}`);
      if (!res.ok) throw new Error('Submission not found');
      const data = await res.json();
      setSubmission(data);
      setNote(data.reviewer_note || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  useEffect(() => {
    if (submission) {
      setTimeout(() => {
        setScoreBarWidth(submission.risk_score);
      }, 100);
    }
  }, [submission]);

  const handleAction = async (status: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewer_note: note }),
      });
      if (res.ok) {
        setSuccessMsg(`Submission ${status} successfully.`);
        setTimeout(() => router.push('/admin'), 2500);
      }
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getPublicUrl = (path: string | null) => {
    if (!path) return null;
    // In a real app, this would use the Supabase client to get the public URL.
    // Here we construct it based on the expected bucket structure.
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1].split('.')[0];
    return `https://${projectRef}.supabase.co/storage/v1/object/public/kyc-photos/${path}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'HIGH': return '#ef4444';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#22c55e';
      default: return '#64748b';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#22c55e';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'escalated': return '#a855f7';
      default: return '#64748b';
    }
  };

  if (loading) return <div className="loading-screen">Loading Submission...</div>;
  if (error) return <div className="error-screen">Error: {error}</div>;
  if (!submission) return null;

  return (
    <div className="admin-container">
      {/* Lightbox */}
      {lightboxImg && (
        <div className="lightbox" onClick={() => setLightboxImg(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img 
              src={lightboxImg} 
              alt="Zoomed" 
              style={{ transform: `scale(${zoom})` }}
              className="lightbox-image"
            />
            <div className="lightbox-controls">
              <button onClick={() => setZoom(z => Math.min(z + 0.25, 3))}>+</button>
              <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}>-</button>
              <button onClick={() => { setZoom(1); setLightboxImg(null); }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="admin-nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <Link href="/admin" className="back-link">← Back to Dashboard</Link>
            <span className="brand-divider">|</span>
            <span className="brand-label">Submission Detail</span>
          </div>
          <div className="nav-id mono">{submission.id}</div>
        </div>
      </nav>

      <main className="detail-main">
        <div className="detail-grid">
          {/* Left Column */}
          <div className="detail-col left">
            {/* Photo Comparison */}
            <div className="card fade-up">
              <div className="card-header">
                <span className="label">Identity Verification</span>
                <span className="id-mono mono">{submission.id.split('-')[0]}...</span>
              </div>
              <div className="photos-grid">
                <div className="photo-box">
                  <span className="photo-label">Live Selfie</span>
                  <div className="img-wrapper" onClick={() => { setLightboxImg(getPublicUrl(submission.selfie_url)); setZoom(1); }}>
                    {submission.selfie_url ? (
                      <img src={getPublicUrl(submission.selfie_url)!} alt="Selfie" />
                    ) : (
                      <div className="placeholder"><CameraIcon /></div>
                    )}
                  </div>
                </div>
                <div className="photo-box">
                  <span className="photo-label">ID Document</span>
                  <div className="img-wrapper" onClick={() => { setLightboxImg(getPublicUrl(submission.id_front_url)); setZoom(1); }}>
                    {submission.id_front_url ? (
                      <img src={getPublicUrl(submission.id_front_url)!} alt="ID Document" />
                    ) : (
                      <div className="placeholder"><IDCardIcon /></div>
                    )}
                  </div>
                </div>
              </div>
              <div className="face-match-section">
                <div className="fm-header">
                  <span>Face Match Confidence</span>
                  <span className="mono" style={{ color: submission.face_match_score > 85 ? '#22c55e' : '#f59e0b' }}>
                    {Math.round(submission.face_match_score)}%
                  </span>
                </div>
                <div className="fm-bar">
                  <div className="fill" style={{ width: `${submission.face_match_score}%`, background: submission.face_match_score > 85 ? '#22c55e' : '#f59e0b' }} />
                </div>
              </div>
            </div>

            {/* Applicant Info */}
            <div className="card fade-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="card-title">Applicant Information</h3>
              <div className="info-grid">
                <InfoField label="Full Name" value={submission.full_name} />
                <InfoField label="Date of Birth" value={submission.dob || 'Not provided'} />
                <InfoField label="ID Type" value={submission.id_type.replace('_', ' ')} capitalize />
                <InfoField label="ID Number" value={submission.id_number} mono />
                <InfoField label="Submitted At" value={formatDate(submission.created_at)} mono />
                <InfoField label="IP Address" value={submission.ip_address} mono />
              </div>
              {submission.submission_count > 2 && (
                <div className="alert-box">
                  ⚠️ This device has submitted {submission.submission_count} times.
                </div>
              )}
            </div>

            {/* Audit Timeline */}
            <div className="card fade-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="card-title">Audit Timeline</h3>
              <div className="timeline">
                <TimelineItem label="Submission received" time={submission.created_at} color="#3b82f6" />
                <TimelineItem 
                  label={`Liveness check: ${submission.liveness_pass ? 'PASS' : 'FAIL'}`} 
                  time={submission.created_at} 
                  color={submission.liveness_pass ? '#22c55e' : '#ef4444'} 
                />
                <TimelineItem 
                  label={`Face match completed: ${Math.round(submission.face_match_score)}%`} 
                  time={submission.created_at} 
                  color={submission.face_match_score > 70 ? '#22c55e' : '#f59e0b'} 
                />
                <TimelineItem label="Duplicate scan completed" time={submission.created_at} color="#3b82f6" />
                <TimelineItem 
                  label={`Risk score assigned: ${submission.risk_score} — ${submission.risk_level}`} 
                  time={submission.created_at} 
                  color={getRiskColor(submission.risk_level)} 
                />
                {submission.reviewed_at && (
                  <TimelineItem 
                    label={`Reviewed by admin: ${submission.status.toUpperCase()}`} 
                    time={submission.reviewed_at} 
                    color={getStatusColor(submission.status)}
                    note={submission.reviewer_note}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="detail-col right">
            {/* Risk Score */}
            <div className="card risk-card fade-up" style={{ animationDelay: '0.3s' }}>
              <div className="risk-level-badge" style={{ background: `${getRiskColor(submission.risk_level)}20`, color: getRiskColor(submission.risk_level), borderColor: getRiskColor(submission.risk_level) }}>
                {submission.risk_level} RISK
              </div>
              <div className="risk-score-value mono" style={{ color: getRiskColor(submission.risk_level) }}>
                {submission.risk_score}
              </div>
              <div className="risk-score-bar">
                <div className="fill" style={{ width: `${scoreBarWidth}%`, background: getRiskColor(submission.risk_level) }} />
              </div>
              <div className="risk-label">Automated Risk Assessment</div>
            </div>

            {/* Signal Breakdown */}
            <div className="card fade-up" style={{ animationDelay: '0.4s' }}>
              <h3 className="card-title">Risk Signal Breakdown</h3>
              <table className="breakdown-table">
                <thead>
                  <tr>
                    <th>Signal</th>
                    <th>Value</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  <BreakdownRow label="Liveness Check" value={submission.liveness_pass ? 'Pass' : 'Fail'} points={submission.liveness_pass ? 0 : 25} />
                  <BreakdownRow label="Liveness Confidence" value={`${Math.round(submission.liveness_confidence)}%`} points={submission.liveness_confidence < 70 ? 8 : 0} />
                  <BreakdownRow label="Face Match Score" value={`${Math.round(submission.face_match_score)}%`} points={submission.face_match_score < 50 ? 40 : submission.face_match_score < 70 ? 25 : submission.face_match_score < 82 ? 12 : 0} />
                  <BreakdownRow label="Duplicate Identity" value={submission.duplicate_similarity > 0 ? `${Math.round(submission.duplicate_similarity * 100)}%` : 'None'} points={submission.duplicate_similarity > 0.93 ? 25 : submission.duplicate_similarity >= 0.85 ? 12 : 0} />
                  <BreakdownRow label="VPN/Proxy" value={submission.is_vpn ? 'Detected' : 'Clean'} points={submission.is_vpn ? 8 : 0} />
                  <BreakdownRow label="Tor Network" value={submission.is_tor ? 'Detected' : 'Clean'} points={submission.is_tor ? 15 : 0} />
                  <BreakdownRow label="Device Emulator" value={submission.is_emulator ? 'Detected' : 'Clean'} points={submission.is_emulator ? 10 : 0} />
                  <BreakdownRow label="Duplicate Device" value={submission.duplicate_device ? 'Yes' : 'No'} points={submission.duplicate_device ? 12 : 0} />
                  <BreakdownRow label="Submission Count" value={`${submission.submission_count} times`} points={submission.submission_count > 3 ? 10 : 0} />
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td colSpan={2}>Total Risk Score</td>
                    <td className="mono" style={{ color: getRiskColor(submission.risk_level) }}>{submission.risk_score}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Flags */}
            {submission.flags?.length > 0 && (
              <div className="card fade-up" style={{ animationDelay: '0.5s' }}>
                <div className="card-header">
                  <h3 className="card-title">⚠ Active Flags</h3>
                  <span className="flag-count-badge">{submission.flags.length}</span>
                </div>
                <div className="flags-list">
                  {submission.flags.map((flag, i) => (
                    <div key={i} className="flag-item" style={{ animationDelay: `${0.6 + i * 0.1}s` }}>
                      <span className="warning-icon">⚠</span>
                      {flag}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviewer Action */}
            <div className="card action-card fade-up" style={{ animationDelay: '0.6s' }}>
              <h3 className="card-title">Review Decision</h3>
              
              {successMsg ? (
                <div className="success-banner">{successMsg}</div>
              ) : submission.status !== 'pending' ? (
                <div className="reviewed-info">
                  <div className="status-pill" style={{ color: getStatusColor(submission.status) }}>
                    {submission.status.toUpperCase()}
                  </div>
                  <div className="date">Reviewed on {formatDate(submission.reviewed_at)}</div>
                  {submission.reviewer_note && (
                    <div className="note-display">"{submission.reviewer_note}"</div>
                  )}
                </div>
              ) : (
                <>
                  <div className="input-group">
                    <label>Add reviewer note (optional)</label>
                    <textarea 
                      placeholder="Enter internal notes for this decision..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                  <div className="actions-stack">
                    <button 
                      className="btn-approve" 
                      disabled={actionLoading}
                      onClick={() => handleAction('approved')}
                    >
                      {actionLoading ? '...' : '✓ Approve Submission'}
                    </button>
                    <button 
                      className="btn-reject" 
                      disabled={actionLoading}
                      onClick={() => handleAction('rejected')}
                    >
                      {actionLoading ? '...' : '✗ Reject Submission'}
                    </button>
                    <button 
                      className="btn-escalate" 
                      disabled={actionLoading}
                      onClick={() => handleAction('escalated')}
                    >
                      {actionLoading ? '...' : '⚑ Escalate for Further Review'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-container {
          min-height: 100vh;
          background: #070d1a;
          background-image: radial-gradient(circle at top, #1a2744 0%, #070d1a 100%);
          color: #f1f5f9;
          font-family: 'Sora', sans-serif;
        }

        .admin-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(7, 13, 26, 0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #1e2d4a;
        }

        .nav-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .back-link {
          font-size: 14px;
          color: #64748b;
          transition: color 0.2s;
        }

        .back-link:hover { color: #3b82f6; }

        .brand-divider { color: #334155; }
        .brand-label { color: #60a5fa; font-weight: 500; font-size: 14px; }

        .nav-id {
          font-size: 12px;
          color: #334155;
        }

        .detail-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 55% 45%;
          gap: 24px;
          align-items: start;
        }

        .card {
          background: #0f1929;
          border: 1px solid #1e2d4a;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
          opacity: 0;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .card-header .label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #64748b;
          font-weight: 700;
        }

        .id-mono {
          font-size: 12px;
          color: #334155;
        }

        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin-bottom: 20px;
        }

        .photos-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .photo-box {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .photo-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
        }

        .img-wrapper {
          height: 220px;
          border-radius: 10px;
          overflow: hidden;
          background: #070d1a;
          border: 1px solid #1e2d4a;
          cursor: zoom-in;
          transition: transform 0.2s;
        }

        .img-wrapper:hover {
          transform: translateY(-2px);
          border-color: #3b82f6;
        }

        .img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1e2d4a;
        }

        .face-match-section {
          background: #070d1a;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #1e2d4a;
        }

        .fm-header {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 10px;
          color: #94a3b8;
        }

        .fm-bar {
          width: 100%;
          height: 8px;
          background: #141e33;
          border-radius: 4px;
          overflow: hidden;
        }

        .fm-bar .fill {
          height: 100%;
          border-radius: 4px;
          transition: width 1s ease-out;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .info-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .info-field .label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-field .value {
          font-size: 15px;
          font-weight: 500;
          color: #f1f5f9;
        }

        .alert-box {
          margin-top: 24px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        .timeline {
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          padding-left: 12px;
        }

        .timeline::before {
          content: "";
          position: absolute;
          left: 15px;
          top: 0;
          bottom: 0;
          width: 1px;
          background: #1e2d4a;
        }

        .timeline-item {
          position: relative;
          padding-left: 24px;
        }

        .timeline-dot {
          position: absolute;
          left: 0;
          top: 6px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          z-index: 1;
          box-shadow: 0 0 0 4px #0f1929;
        }

        .timeline-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .timeline-label {
          font-size: 14px;
          font-weight: 600;
          color: #f1f5f9;
        }

        .timeline-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #334155;
        }

        .timeline-note {
          font-size: 13px;
          color: #64748b;
          font-style: italic;
          margin-top: 4px;
        }

        /* Risk Card */
        .risk-card {
          text-align: center;
          padding: 40px 24px;
        }

        .risk-level-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          border: 1px solid;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 24px;
        }

        .risk-score-value {
          font-size: 82px;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 24px;
        }

        .risk-score-bar {
          width: 100%;
          height: 12px;
          background: #070d1a;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .risk-score-bar .fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.8s ease-out;
        }

        .risk-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        /* Breakdown Table */
        .breakdown-table {
          width: 100%;
          border-collapse: collapse;
        }

        .breakdown-table th {
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          color: #334155;
          padding: 12px 0;
          border-bottom: 1px solid #1e2d4a;
        }

        .breakdown-table td {
          padding: 14px 0;
          font-size: 14px;
          border-bottom: 1px solid rgba(30, 45, 74, 0.5);
        }

        .breakdown-table .label { color: #f1f5f9; font-weight: 500; }
        .breakdown-table .val { color: #64748b; font-weight: 500; }
        .breakdown-table .pts { text-align: right; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
        .pts.positive { color: #ef4444; }
        .pts.muted { color: #334155; }

        .total-row td {
          padding-top: 20px;
          font-weight: 700;
          font-size: 16px;
          border-bottom: none;
        }

        /* Flags */
        .flag-count-badge {
          background: #ef4444;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
        }

        .flags-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .flag-item {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          color: #ef4444;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: fadeUp 0.35s ease forwards;
          opacity: 0;
        }

        /* Action Card */
        .action-card {
          position: sticky;
          bottom: 24px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }

        .input-group label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
        }

        .input-group textarea {
          background: #070d1a;
          border: 1px solid #1e2d4a;
          border-radius: 10px;
          padding: 12px;
          color: #f1f5f9;
          font-size: 14px;
          min-height: 100px;
          resize: vertical;
          outline: none;
          transition: border-color 0.2s;
        }

        .input-group textarea:focus { border-color: #3b82f6; }

        .actions-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .actions-stack button {
          padding: 14px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-approve { background: #22c55e; color: white; }
        .btn-approve:hover { background: #16a34a; transform: translateY(-1px); }

        .btn-reject { background: #ef4444; color: white; }
        .btn-reject:hover { background: #dc2626; transform: translateY(-1px); }

        .btn-escalate { background: #a855f7; color: white; }
        .btn-escalate:hover { background: #9333ea; transform: translateY(-1px); }

        .actions-stack button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .success-banner {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          padding: 16px;
          border-radius: 10px;
          text-align: center;
          font-weight: 600;
        }

        .reviewed-info {
          text-align: center;
        }

        .note-display {
          margin-top: 16px;
          padding: 16px;
          background: #070d1a;
          border-radius: 10px;
          font-style: italic;
          color: #64748b;
          font-size: 14px;
        }

        /* Lightbox */
        .lightbox {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.9);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .lightbox-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
        }

        .lightbox-image {
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
          transition: transform 0.2s ease;
          border-radius: 4px;
        }

        .lightbox-controls {
          position: fixed;
          top: 24px;
          right: 24px;
          display: flex;
          gap: 12px;
        }

        .lightbox-controls button {
          width: 44px;
          height: 44px;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          border-radius: 50%;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .lightbox-controls button:hover {
          background: rgba(255,255,255,0.2);
          transform: scale(1.1);
        }

        .loading-screen, .error-screen {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #64748b;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mono { font-family: 'JetBrains Mono', monospace; }
      `}} />
    </div>
  );
}

function InfoField({ label, value, mono, capitalize }: { label: string; value: string; mono?: boolean; capitalize?: boolean }) {
  return (
    <div className="info-field">
      <span className="label">{label}</span>
      <span className={`value ${mono ? 'mono' : ''}`} style={{ textTransform: capitalize ? 'capitalize' : 'none' }}>
        {value}
      </span>
    </div>
  );
}

function TimelineItem({ label, time, color, note }: { label: string; time: string; color: string; note?: string }) {
  return (
    <div className="timeline-item">
      <div className="timeline-dot" style={{ background: color }} />
      <div className="timeline-content">
        <span className="timeline-label">{label}</span>
        <span className="timeline-time">{new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        {note && <div className="timeline-note">"{note}"</div>}
      </div>
    </div>
  );
}

function BreakdownRow({ label, value, points }: { label: string; value: string; points: number }) {
  return (
    <tr>
      <td className="label">{label}</td>
      <td className="val">{value}</td>
      <td className={`pts ${points > 0 ? 'positive' : 'muted'}`}>
        {points > 0 ? `+${points}` : '0'} pts
      </td>
    </tr>
  );
}

function CameraIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
}

function IDCardIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><line x1="15" y1="8" x2="19" y2="8"/><line x1="15" y1="12" x2="19" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>;
}
