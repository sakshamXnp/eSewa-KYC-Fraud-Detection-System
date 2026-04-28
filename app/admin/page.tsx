'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import StatsChart from './components/StatsChart';
import ExportButton from './components/ExportButton';

interface Stats {
  today: { total: number; high: number; medium: number; low: number; pending: number; approved: number };
  allTime: { total: number; approved: number; rejected: number; escalated: number; pending: number };
}

interface Submission {
  id: string;
  created_at: string;
  full_name: string;
  id_type: string;
  id_number: string;
  risk_score: number;
  risk_level: string;
  face_match_score: number;
  liveness_pass: boolean;
  flags: string[];
  status: string;
}

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/submissions?stats=true');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchSubmissions = useCallback(async (isAuto = false) => {
    if (!isAuto) setRefreshLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        risk: riskFilter,
        status: statusFilter,
      });
      const res = await fetch(`/api/admin/submissions?${params.toString()}`);
      const data = await res.json();
      setSubmissions(data.submissions);
      setTotalPages(data.totalPages);
      setTotalCount(data.total);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
      setRefreshLoading(false);
    }
  }, [page, riskFilter, statusFilter]);

  useEffect(() => {
    fetchStats();
    fetchSubmissions();
  }, [fetchStats, fetchSubmissions]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats();
      fetchSubmissions(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats, fetchSubmissions]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/submissions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchSubmissions(true);
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const then = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const filteredSubmissions = useMemo(() => {
    if (!search) return submissions;
    const s = search.toLowerCase();
    return submissions.filter(sub => 
      sub.full_name.toLowerCase().includes(s) || 
      sub.id_number?.toLowerCase().includes(s)
    );
  }, [submissions, search]);

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

  return (
    <div className="admin-container">
      {/* Navbar */}
      <nav className="admin-nav">
        <div className="nav-inner">
          <div className="nav-brand">
            <span className="brand-e">e</span>
            <span className="brand-sewa">Sewa</span>
            <span className="brand-divider">|</span>
            <span className="brand-label">Fraud Detection Admin</span>
          </div>
          <div className="nav-actions">
            <div className="auto-refresh">
              <div className={`refresh-dot ${autoRefresh ? 'pulsing' : ''}`} />
              <span className="refresh-label">Live</span>
              <button 
                className={`toggle-btn ${autoRefresh ? 'active' : ''}`}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <div className="toggle-thumb" />
              </button>
            </div>
            <Link href="/" className="nav-link">← Submit KYC</Link>
          </div>
        </div>
      </nav>

      <main className="admin-main">
        {/* Stats Bar */}
        <div className="stats-bar">
          <StatCard 
            label="Total Submissions" 
            value={stats?.allTime.total || 0} 
            color="#3b82f6" 
            delay="0s" 
          />
          <StatCard 
            label="Pending Review" 
            value={stats?.allTime.pending || 0} 
            color="#f59e0b" 
            delay="0.1s" 
          />
          <StatCard 
            label="High Risk Today" 
            value={stats?.today.high || 0} 
            color="#ef4444" 
            delay="0.2s" 
          />
          <StatCard 
            label="Approved Today" 
            value={stats?.today.approved || 0} 
            color="#22c55e" 
            delay="0.3s" 
          />
        </div>

        {/* 7-Day Trend Chart */}
        <StatsChart />

        {/* Filter Row */}
        <div className="filter-row fade-up" style={{ animationDelay: '0.4s' }}>
          <div className="filter-group">
            <span className="filter-label">Risk Level</span>
            <div className="toggle-group">
              {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map(r => (
                <button 
                  key={r}
                  className={`filter-btn ${riskFilter === r ? 'active' : ''}`}
                  onClick={() => { setRiskFilter(r); setPage(1); }}
                  style={{ '--active-color': getRiskColor(r) } as any}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">Status</span>
            <div className="toggle-group">
              {['ALL', 'Pending', 'Approved', 'Rejected', 'Escalated'].map(s => (
                <button 
                  key={s}
                  className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  style={{ '--active-color': getStatusColor(s.toLowerCase()) } as any}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="search-group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <ExportButton />
        </div>

        <div className="results-info fade-up" style={{ animationDelay: '0.5s' }}>
          Showing {filteredSubmissions.length} of {totalCount} submissions
        </div>

        {/* Submissions Table */}
        <div className="table-container fade-up" style={{ animationDelay: '0.6s' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Applicant</th>
                <th>ID Type</th>
                <th>Risk</th>
                <th>Score</th>
                <th>Face Match</th>
                <th>Liveness</th>
                <th>Flags</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub, i) => (
                  <tr key={sub.id} className="table-row" style={{ animationDelay: `${i * 0.04}s` }}>
                    <td className="mono">{i + 1 + (page - 1) * 20}</td>
                    <td>
                      <div className="applicant-cell">
                        <div className="avatar" style={{ background: `${getRiskColor(sub.risk_level)}20`, color: getRiskColor(sub.risk_level) }}>
                          {sub.full_name[0]}
                        </div>
                        <div className="info">
                          <div className="name">{sub.full_name}</div>
                          <div className="id-num mono">{sub.id_number}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="id-type-chip">
                        <IDTypeIcon type={sub.id_type} />
                        {sub.id_type.replace('_', ' ')}
                      </div>
                    </td>
                    <td>
                      <div className="risk-badge" style={{ borderLeftColor: getRiskColor(sub.risk_level) }}>
                        {sub.risk_level}
                      </div>
                    </td>
                    <td>
                      <div className="score-cell">
                        <span className="mono">{sub.risk_score}</span>
                        <div className="mini-progress">
                          <div 
                            className="fill" 
                            style={{ width: `${sub.risk_score}%`, background: getRiskColor(sub.risk_level) }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ color: sub.face_match_score > 85 ? '#22c55e' : sub.face_match_score > 70 ? '#f59e0b' : '#ef4444' }}>
                        {Math.round(sub.face_match_score)}%
                      </span>
                    </td>
                    <td>
                      {sub.liveness_pass ? (
                        <span className="status-pass">✓ Pass</span>
                      ) : (
                        <span className="status-fail">✗ Fail</span>
                      )}
                    </td>
                    <td>
                      {sub.flags?.length > 0 ? (
                        <div className="flag-count">{sub.flags.length}</div>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                    <td className="muted">{getRelativeTime(sub.created_at)}</td>
                    <td>
                      <div className="status-pill" style={{ color: getStatusColor(sub.status) }}>
                        <div className="dot" style={{ background: getStatusColor(sub.status) }} />
                        {sub.status}
                      </div>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <Link href={`/admin/submissions/${sub.id}`} className="view-btn">View →</Link>
                        {sub.status === 'pending' && (
                          <>
                            <button className="action-icon approve" onClick={() => handleStatusUpdate(sub.id, 'approved')}>✓</button>
                            <button className="action-icon reject" onClick={() => handleStatusUpdate(sub.id, 'rejected')}>✗</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="empty-state">
                    <div className="empty-content">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1e2d4a" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                      </svg>
                      <p>No submissions match your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="page-btn"
            >
              Previous
            </button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="page-btn"
            >
              Next
            </button>
          </div>
        )}
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
        .brand-label { color: #60a5fa; font-weight: 500; font-size: 14px; }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .auto-refresh {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .refresh-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          opacity: 0.4;
        }

        .refresh-dot.pulsing {
          animation: pulse 2s infinite;
          opacity: 1;
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 148, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(34, 197, 148, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 148, 0); }
        }

        .refresh-label {
          font-size: 13px;
          color: #94a3b8;
          font-weight: 500;
        }

        .toggle-btn {
          width: 36px;
          height: 20px;
          background: #1e2d4a;
          border-radius: 10px;
          position: relative;
          transition: background 0.2s;
        }

        .toggle-btn.active {
          background: #3b82f6;
        }

        .toggle-thumb {
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 3px;
          left: 3px;
          transition: transform 0.2s;
        }

        .toggle-btn.active .toggle-thumb {
          transform: translateX(16px);
        }

        .nav-link {
          color: #64748b;
          font-size: 13px;
          transition: color 0.2s;
        }

        .nav-link:hover { color: #3b82f6; }

        .admin-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        .stats-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #0f1929;
          border: 1px solid #1e2d4a;
          border-top: 3px solid var(--accent-color);
          border-radius: 12px;
          padding: 24px;
          animation: fadeUp 0.35s ease forwards;
          opacity: 0;
        }

        .stat-value {
          font-family: 'JetBrains Mono', monospace;
          font-size: 32px;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }

        .filter-row {
          display: flex;
          align-items: center;
          gap: 40px;
          background: #0f1929;
          border: 1px solid #1e2d4a;
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 24px;
          opacity: 0;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .filter-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #334155;
          font-weight: 700;
        }

        .toggle-group {
          display: flex;
          background: #070d1a;
          padding: 4px;
          border-radius: 8px;
          border: 1px solid #1e2d4a;
        }

        .filter-btn {
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          color: #64748b;
          background: transparent;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          color: #f1f5f9;
        }

        .filter-btn.active {
          background: #0f1929;
          color: var(--active-color, #3b82f6);
          box-shadow: 0 0 0 1px #1e2d4a, 0 4px 12px rgba(0,0,0,0.2);
        }

        .search-group {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 12px;
          background: #070d1a;
          border: 1px solid #1e2d4a;
          padding: 10px 16px;
          border-radius: 10px;
        }

        .search-group input {
          background: transparent;
          border: none;
          color: #f1f5f9;
          font-size: 14px;
          width: 100%;
          outline: none;
        }

        .results-info {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 12px;
          opacity: 0;
        }

        .table-container {
          background: #0f1929;
          border: 1px solid #1e2d4a;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.4);
          opacity: 0;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-table th {
          background: #141e33;
          padding: 16px 20px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #334155;
          border-bottom: 1px solid #1e2d4a;
        }

        .table-row {
          border-bottom: 1px solid #1e2d4a;
          transition: background 0.15s;
          animation: fadeUp 0.35s ease forwards;
          opacity: 0;
          cursor: pointer;
        }

        .table-row:hover {
          background: rgba(59, 130, 246, 0.04);
        }

        .admin-table td {
          padding: 16px 20px;
          font-size: 14px;
          vertical-align: middle;
        }

        .mono {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }

        .applicant-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
        }

        .info .name {
          font-weight: 600;
          color: #f1f5f9;
        }

        .info .id-num {
          font-size: 11px;
          color: #334155;
        }

        .id-type-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #141e33;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          color: #94a3b8;
          text-transform: capitalize;
        }

        .risk-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #070d1a;
          border: 1px solid #1e2d4a;
          border-left: 4px solid #64748b;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          color: #f1f5f9;
        }

        .score-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          width: 60px;
        }

        .mini-progress {
          width: 100%;
          height: 4px;
          background: #1e2d4a;
          border-radius: 2px;
          overflow: hidden;
        }

        .mini-progress .fill {
          height: 100%;
          border-radius: 2px;
        }

        .status-pass { color: #22c55e; font-weight: 600; }
        .status-fail { color: #ef4444; font-weight: 600; }

        .flag-count {
          width: 20px;
          height: 20px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
        }

        .muted { color: #334155; }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
          background: rgba(0,0,0,0.2);
          padding: 4px 10px;
          border-radius: 12px;
          border: 1px solid currentColor;
        }

        .status-pill .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .actions-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .view-btn {
          font-size: 13px;
          color: #3b82f6;
          font-weight: 600;
          transition: color 0.2s;
        }

        .view-btn:hover { color: #60a5fa; }

        .action-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .action-icon.approve {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .action-icon.approve:hover {
          background: #22c55e;
          color: white;
        }

        .action-icon.reject {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .action-icon.reject:hover {
          background: #ef4444;
          color: white;
        }

        .empty-state {
          padding: 80px 0 !important;
          text-align: center;
        }

        .empty-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          color: #1e2d4a;
        }

        .empty-content p {
          font-size: 16px;
          font-weight: 500;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-top: 32px;
        }

        .page-btn {
          background: #0f1929;
          border: 1px solid #1e2d4a;
          color: #f1f5f9;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .page-btn:hover:not(:disabled) {
          border-color: #3b82f6;
          background: #141e33;
        }

        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 14px;
          color: #64748b;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Shimmer skeleton */
        .skeleton-row td {
          padding: 20px !important;
        }

        .shimmer {
          height: 16px;
          background: #141e33;
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }

        .shimmer::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}

function StatCard({ label, value, color, delay }: { label: string; value: number; color: string; delay: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 600;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div className="stat-card" style={{ '--accent-color': color, animationDelay: delay } as any}>
      <div className="stat-value">{displayValue}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function IDTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'citizenship':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><line x1="15" y1="8" x2="19" y2="8"/><line x1="15" y1="12" x2="19" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>;
    case 'passport':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><circle cx="12" cy="8" r="3"/><line x1="12" y1="11" x2="12" y2="18"/></svg>;
    default:
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg>;
  }
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map(i => (
        <tr key={i} className="skeleton-row">
          <td colSpan={11}><div className="shimmer" /></td>
        </tr>
      ))}
    </>
  );
}
