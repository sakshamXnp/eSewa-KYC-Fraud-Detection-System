'use client';

import { useState } from 'react';

export default function ExportButton() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/submissions?limit=1000');
      const data = await res.json();
      const submissions = data.submissions;

      if (!submissions || !submissions.length) {
        alert('No data to export');
        return;
      }

      const headers = [
        'ID', 'Name', 'DOB', 'ID Type', 'ID Number', 'Risk Level', 
        'Risk Score', 'Face Match', 'Liveness', 'Flags', 'Status', 
        'Submitted At', 'Reviewed At', 'Reviewer Note'
      ];

      const csvRows = [headers.join(',')];

      submissions.forEach((sub: any) => {
        const row = [
          sub.id,
          `"${sub.full_name}"`,
          sub.dob || '',
          sub.id_type,
          sub.id_number || '',
          sub.risk_level,
          sub.risk_score,
          `${sub.face_match_score.toFixed(1)}%`,
          sub.liveness_pass ? 'Pass' : 'Fail',
          `"${(sub.flags || []).join(' | ')}"`,
          sub.status,
          sub.created_at,
          sub.reviewed_at || '',
          `"${sub.reviewer_note || ''}"`
        ];
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `esewa-kyc-export-${timestamp}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <button 
        className={`export-btn ${exporting ? 'loading' : ''}`} 
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting ? (
          <>
            <div className="spinner" />
            Exporting...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </>
        )}
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .export-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid #1e2d4a;
          color: #64748b;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
          cursor: pointer;
        }

        .export-btn:hover:not(:disabled) {
          border-color: #3b82f6;
          color: #f1f5f9;
          background: rgba(59, 130, 246, 0.04);
        }

        .export-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(100, 116, 139, 0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </>
  );
}
