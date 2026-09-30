import React, { useState, useEffect } from 'react';
import { 
  History as HistoryIcon, 
  Search, 
  Download, 
  Eye, 
  RefreshCw,
  Cpu,
  Calendar,
  Layers
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { RecordDetailModal } from './RecordDetailModal';
import { apiClient } from '../../services/apiClient';
import { fileAnalysisService } from '../../services/fileAnalysisService';

export const HistoryPage = () => {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [filterSource, setFilterSource] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch real history
  const fetchHistory = async () => {
    setLoading(true);
    try {
      // 1. Fetch real ESP32 telemetry history from backend database
      const raw = await apiClient.getRawTelemetryHistory('MTR-001', { limit: 200 }).catch(() => []);
      
      const mappedRaw = Array.isArray(raw) ? raw.map((r, idx) => {
        const d = new Date(r.timestamp);
        const vx = r.vibrationX != null ? r.vibrationX : null;
        const vy = r.vibrationY != null ? r.vibrationY : null;
        const vz = r.vibrationZ != null ? r.vibrationZ : null;
        const mag = r.vibrationMagnitude != null ? r.vibrationMagnitude : (
          vx != null && vy != null && vz != null
            ? parseFloat(Math.sqrt(vx * vx + vy * vy + vz * vz).toFixed(3))
            : null
        );

        return {
          recordId: `ESP32-REC-${r.id || (1000 + idx)}`,
          timestamp: d.toLocaleString(),
          rawDate: d.toISOString().split('T')[0],
          date: d.toLocaleDateString(),
          time: d.toLocaleTimeString(),
          motorId: r.motorId || 'MTR-001',
          motor: 'Motor MTR-001',
          voltage: r.voltage != null ? `${r.voltage} V` : '--',
          current: r.current != null ? `${r.current} A` : '--',
          temperature: r.temperature != null ? `${r.temperature} °C` : '--',
          vibration: mag != null ? `${mag} mm/s` : '--',
          vibrationMagnitude: mag,
          vibrationX: vx,
          vibrationY: vy,
          vibrationZ: vz,
          voltageVal: r.voltage,
          currentVal: r.current,
          tempVal: r.temperature,
          sourceType: 'ESP32',
          source: 'ESP32 Real Hardware [RAW STREAM]',
          status: 'HEALTHY',
          health: 95,
          mode: 'LIVE MONITORING',
          notes: `Real 3-Axis: X=${vx ?? '—'} mm/s, Y=${vy ?? '—'} mm/s, Z=${vz ?? '—'} mm/s`,
          operator: 'ESP32 Hardware Stream',
          rawRecord: r
        };
      }).reverse() : [];

      // 2. Fetch offline analyzed files (if any were uploaded)
      const offline = fileAnalysisService.getSavedRecords();
      const mappedOffline = Array.isArray(offline) ? offline.map(s => {
        const d = new Date(s.timestamp || s.date || Date.now());
        return {
          recordId: s.id,
          timestamp: d.toLocaleString(),
          rawDate: d.toISOString().split('T')[0],
          date: d.toLocaleDateString(),
          time: d.toLocaleTimeString(),
          motorId: s.motorId || 'MTR-001',
          motor: 'Motor MTR-001',
          voltage: s.analysisData?.voltageAnalysis?.rms != null ? `${s.analysisData.voltageAnalysis.rms} V` : '--',
          current: s.analysisData?.currentAnalysis?.rms != null ? `${s.analysisData.currentAnalysis.rms} A` : '--',
          temperature: s.analysisData?.temperatureAnalysis?.mean != null ? `${s.analysisData.temperatureAnalysis.mean} °C` : '--',
          vibration: s.analysisData?.vibrationFeatures?.rms != null ? `${s.analysisData.vibrationFeatures.rms} mm/s` : '--',
          vibrationMagnitude: s.analysisData?.vibrationFeatures?.rms,
          sourceType: 'OFFLINE_FILE',
          source: s.fileName || 'offline_dataset.csv',
          status: s.status === 'ANALYZED' ? 'HEALTHY' : 'WARNING',
          health: 88,
          mode: 'OFFLINE ANALYSIS',
          notes: `Offline dataset processed (${s.samples || 0} samples)`,
          operator: 'Offline File Ingestion',
          analysisData: s.analysisData
        };
      }) : [];

      setHistoryRecords([...mappedRaw, ...mappedOffline]);
    } catch (e) {
      console.warn('History fetch notice:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter records
  const filtered = historyRecords.filter((r) => {
    if (filterSource !== 'ALL' && r.sourceType !== filterSource) return false;
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (filterDate !== 'ALL' && r.rawDate !== filterDate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.recordId.toLowerCase().includes(q) ||
        r.motorId.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Unique dynamic dates for filter dropdown
  const uniqueDates = Array.from(new Set(historyRecords.map(r => r.rawDate).filter(Boolean)));

  // Real CSV Export
  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Timestamp', 'MotorID', 'Voltage', 'Current', 'Temperature', 'Vibration', 'SourceType', 'Status'];
    const rows = filtered.map(r => [
      `"${r.timestamp}"`,
      `"${r.motorId}"`,
      `"${r.voltage}"`,
      `"${r.current}"`,
      `"${r.temperature}"`,
      `"${r.vibration}"`,
      `"${r.sourceType}"`,
      `"${r.status}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `motorsync_history_MTR-001_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="history-page">
      {/* Header */}
      <div className="history-header-card">
        <div>
          <h1 className="history-page-title">MOTOR TELEMETRY HISTORY</h1>
          <div className="history-page-subtitle">
            Historical operational telemetry records for real motor MTR-001
          </div>
        </div>
        <div className="header-actions-row">
          <button 
            className="eng-btn eng-btn-secondary eng-btn-sm font-mono"
            onClick={fetchHistory}
            disabled={loading}
            title="Refresh history records from backend"
          >
            <RefreshCw size={12} className={loading ? 'spin-icon' : ''} />
            <span>{loading ? 'REFRESHING...' : 'REFRESH'}</span>
          </button>

          <button 
            className="eng-btn eng-btn-secondary eng-btn-sm font-mono"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            title="Export filtered records as CSV"
          >
            <Download size={12} />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="history-filter-card">
        <div className="filter-inner-grid">
          {/* Search */}
          <div className="filter-field flex-1">
            <span className="filter-label">SEARCH</span>
            <div className="search-wrap">
              <Search size={12} className="search-icon" />
              <input 
                type="text"
                placeholder="Search record ID or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-input font-mono"
              />
            </div>
          </div>

          {/* Motor ID (Locked to real motor MTR-001) */}
          <div className="filter-field">
            <span className="filter-label">MOTOR</span>
            <div className="filter-static-pill font-mono">MTR-001</div>
          </div>

          {/* Source Type */}
          <div className="filter-field">
            <span className="filter-label">SOURCE</span>
            <select 
              value={filterSource} 
              onChange={(e) => setFilterSource(e.target.value)}
              className="filter-select font-mono"
            >
              <option value="ALL">ALL SOURCES</option>
              <option value="ESP32">ESP32 REAL HARDWARE</option>
              <option value="OFFLINE_FILE">OFFLINE DATASET</option>
            </select>
          </div>

          {/* Status */}
          <div className="filter-field">
            <span className="filter-label">STATUS</span>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select font-mono"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="HEALTHY">HEALTHY</option>
              <option value="WARNING">WARNING</option>
              <option value="FAULT">FAULT</option>
            </select>
          </div>

          {/* Dynamic Date Filter */}
          <div className="filter-field">
            <span className="filter-label">DATE</span>
            <select 
              value={filterDate} 
              onChange={(e) => setFilterDate(e.target.value)}
              className="filter-select font-mono"
            >
              <option value="ALL">ALL DATES</option>
              {uniqueDates.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <div className="filter-field filter-btn-col">
            <button 
              className="eng-btn eng-btn-secondary eng-btn-sm font-mono"
              onClick={() => {
                setFilterSource('ALL');
                setFilterStatus('ALL');
                setFilterDate('ALL');
                setSearchQuery('');
              }}
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* History Table (Section 14) */}
      <div className="history-table-card">
        <div className="table-header-strip">
          <div className="table-title-group">
            <HistoryIcon size={14} className="text-blue" />
            <span className="table-title">OPERATIONAL TELEMETRY LOGS ({filtered.length})</span>
          </div>
          <span className="font-mono text-xs text-muted">Click row for full telemetry breakdown</span>
        </div>

        <div className="eng-table-container">
          <table className="eng-table font-mono">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>MOTOR</th>
                <th>VOLTAGE</th>
                <th>CURRENT</th>
                <th>TEMPERATURE</th>
                <th>VIBRATION</th>
                <th>SOURCE</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-history-cell">
                    <div className="empty-history-content">
                      <div className="empty-title">NO TELEMETRY HISTORY</div>
                      <div className="empty-subtitle">WAITING FOR REAL MOTOR DATA FROM ESP32</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr 
                    key={r.recordId} 
                    className="clickable-row"
                    onClick={() => setSelectedRecord(r)}
                  >
                    <td className="text-muted">{r.timestamp}</td>
                    <td className="font-bold text-blue">{r.motorId}</td>
                    <td>{r.voltage}</td>
                    <td>{r.current}</td>
                    <td>{r.temperature}</td>
                    <td className="font-bold">{r.vibration}</td>
                    <td>
                      <span className={`badge ${r.sourceType === 'ESP32' ? 'badge-healthy' : 'badge-info'} badge-sm`}>
                        {r.sourceType}
                      </span>
                    </td>
                    <td>
                      <Badge status={r.status} size="sm" />
                    </td>
                    <td>
                      <button 
                        className="eng-btn eng-btn-secondary eng-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(r);
                        }}
                      >
                        <Eye size={11} />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal 
          record={selectedRecord} 
          onClose={() => setSelectedRecord(null)} 
        />
      )}

      <style>{`
        .history-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-width: 1720px;
          margin: 0 auto;
        }

        .history-header-card {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 14px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .history-page-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: -0.01em;
          margin: 0;
        }

        .history-page-subtitle {
          font-size: 11.5px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .header-actions-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .history-filter-card {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
        }

        .filter-inner-grid {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-label {
          font-size: 9.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .search-wrap {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 240px;
        }

        .search-icon {
          position: absolute;
          left: 8px;
          color: var(--text-muted);
        }

        .filter-input {
          width: 100%;
          padding: 4px 10px 4px 26px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 11.5px;
          outline: none;
        }

        .filter-input:focus {
          border-color: var(--border-focus);
        }

        .filter-static-pill {
          padding: 4px 10px;
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 700;
          color: var(--primary-blue);
        }

        .filter-select {
          padding: 4px 8px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 11px;
          background: #ffffff;
          outline: none;
        }

        .filter-btn-col {
          justify-content: flex-end;
        }

        .history-table-card {
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          display: flex;
          flex-direction: column;
        }

        .table-header-strip {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .table-title-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .table-title {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: 0.03em;
        }

        .clickable-row {
          cursor: pointer;
          transition: background 0.1s ease;
        }

        .clickable-row:hover {
          background: #f8fafc;
        }

        .empty-history-cell {
          text-align: center;
          padding: 48px 16px !important;
        }

        .empty-history-content {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
        }

        .empty-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
          letter-spacing: 0.04em;
        }

        .empty-subtitle {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
