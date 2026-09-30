import React, { useState } from 'react';
import { 
  Activity, 
  Bell, 
  User, 
  Cpu, 
  ShieldAlert, 
  Layers, 
  History as HistoryIcon, 
  Sliders, 
  Radio,
  UploadCloud
} from 'lucide-react';

export const Header = ({ 
  activeTab, 
  setActiveTab, 
  snapshot, 
  onSelectEvent 
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const activeEventsCount = snapshot?.activeEvents?.filter(e => e.status === 'ACTIVE').length || 0;

  const navItems = [
    { id: 'OVERVIEW', label: 'OVERVIEW', icon: Activity },
    { id: 'DIAGNOSTICS', label: 'DIAGNOSTICS', icon: ShieldAlert },
    { id: 'OFFLINE_ANALYSIS', label: 'OFFLINE ANALYSIS', icon: UploadCloud },
    { id: 'SENSORS', label: 'SENSORS', icon: Radio },
    { id: 'HISTORY', label: 'HISTORY', icon: HistoryIcon },
    { id: 'SYSTEM', label: 'SYSTEM', icon: Layers },
  ];

  return (
    <header className="header-wrapper">
      <div className="header-container">
        {/* Brand / Logo */}
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Cpu size={18} className="text-blue" />
          </div>
          <div className="brand-meta">
            <div className="brand-title">MOTORSYNC</div>
            <div className="brand-subtitle">MOTOR HEALTH & FAULT DIAGNOSIS</div>
          </div>
        </div>

        {/* Global Navigation Bar */}
        <nav className="header-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`nav-btn ${isActive ? 'active' : ''}`}
                id={`nav-${item.id.toLowerCase().replace('_', '-')}`}
              >
                <Icon size={14} className="nav-icon" />
                <span>{item.label}</span>
                {isActive && <div className="nav-indicator" />}
              </button>
            );
          })}
        </nav>

        {/* Right Status Actions */}
        <div className="header-actions">
          {/* Selected Motor Context Pill (Req 18) */}
          <div className="selected-motor-header-badge" title={`Monitoring Asset: ${snapshot?.selectedMotor?.name || 'MTR-001'}`}>
            <span className="asset-tag-prefix font-mono">ASSET:</span>
            <span className="font-mono font-bold text-main">{snapshot?.selectedMotorId || 'MTR-001'}</span>
            <span className="asset-tag-sub font-mono text-muted">({snapshot?.selectedMotor?.shortName || 'MTR-001'})</span>
          </div>

          {/* Live Monitoring Pulse */}
          <div className="monitoring-status-pill">
            <span className="pulse-indicator" />
            <span className="monitoring-status-text">
              {snapshot?.isPaused ? 'MONITORING PAUSED' : 'MONITORING ACTIVE'}
            </span>
          </div>

          {/* Notification Indicator with popover */}
          <div className="notification-wrapper">
            <button 
              className={`action-btn-icon ${activeEventsCount > 0 ? 'has-alerts' : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
              title="Diagnostic Notifications"
              id="notifications-btn"
            >
              <Bell size={16} />
              {activeEventsCount > 0 && (
                <span className="notification-counter">{activeEventsCount}</span>
              )}
            </button>

            {showNotifications && (
              <div className="notifications-dropdown">
                <div className="dropdown-header">
                  <div className="dropdown-title">DIAGNOSTIC EVENTS ({snapshot?.activeEvents?.length || 0})</div>
                  <button 
                    className="dropdown-close"
                    onClick={() => setShowNotifications(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="dropdown-body">
                  {snapshot?.activeEvents && snapshot.activeEvents.length > 0 ? (
                    snapshot.activeEvents.slice(0, 6).map((evt) => (
                      <div 
                        key={evt.id} 
                        className={`notification-item severity-${evt.severity.toLowerCase()}`}
                        onClick={() => {
                          setShowNotifications(false);
                          if (onSelectEvent) onSelectEvent(evt);
                        }}
                      >
                        <div className="notif-header">
                          <span className="notif-name font-mono">{evt.event}</span>
                          <span className="notif-time font-mono">{evt.time}</span>
                        </div>
                        <div className="notif-desc">{evt.sensor}: {evt.value}</div>
                        <div className="notif-footer">
                          <span className={`badge badge-${evt.severity === 'CRITICAL' || evt.severity === 'HIGH' ? 'fault' : 'warning'} badge-sm`}>
                            {evt.severity}
                          </span>
                          <span className="notif-status">{evt.status}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="dropdown-empty">No active diagnostic events.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User / Station Profile */}
          <div className="user-profile-badge">
            <div className="user-avatar">
              <User size={14} />
            </div>
            <div className="user-info">
              <div className="user-name">Athulyaa</div>
              <div className="user-role">ECE LAB WORKSTATION #03</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .header-wrapper {
          background: #ffffff;
          border-bottom: 1px solid var(--border-subtle);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: 48px;
          max-width: 1720px;
          margin: 0 auto;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-right: 16px;
          border-right: 1px solid var(--border-subtle);
        }

        .brand-logo-icon {
          width: 28px;
          height: 28px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary-blue);
        }

        .brand-meta {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--text-main);
          line-height: 1.1;
        }

        .brand-subtitle {
          font-size: 8.5px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          line-height: 1.2;
        }

        .header-nav {
          display: flex;
          align-items: center;
          height: 100%;
          gap: 2px;
          margin-left: 8px;
        }

        .nav-btn {
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 11px;
          height: 48px;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          cursor: pointer;
          position: relative;
          transition: color 0.15s ease, background 0.15s ease;
          white-space: nowrap;
        }

        .nav-btn:hover {
          color: var(--text-main);
          background: #f8fafc;
        }

        .nav-btn.active {
          color: var(--primary-blue);
          font-weight: 700;
        }

        .nav-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--primary-blue);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .selected-motor-header-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          font-size: 11px;
        }

        .asset-tag-prefix {
          font-size: 9px;
          font-weight: 700;
          color: var(--primary-blue);
        }

        .asset-tag-sub {
          font-size: 10px;
        }

        .monitoring-status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 9px;
          border-radius: var(--radius-sm);
          background: #f8fafc;
          border: 1px solid var(--border-subtle);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }

        .notification-wrapper {
          position: relative;
        }

        .action-btn-icon {
          width: 30px;
          height: 30px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          cursor: pointer;
          position: relative;
          transition: all 0.15s ease;
        }

        .action-btn-icon:hover {
          background: var(--bg-card-subtle);
          color: var(--text-main);
          border-color: var(--border-strong);
        }

        .action-btn-icon.has-alerts {
          color: var(--status-warning-dot);
          border-color: #fde68a;
          background: #fffbeb;
        }

        .notification-counter {
          position: absolute;
          top: -4px;
          right: -4px;
          background: var(--status-fault-dot);
          color: #ffffff;
          font-size: 9px;
          font-weight: 700;
          font-family: var(--font-mono);
          width: 15px;
          height: 15px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #ffffff;
        }

        .notifications-dropdown {
          position: absolute;
          top: 36px;
          right: 0;
          width: 320px;
          background: #ffffff;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-dropdown);
          z-index: 200;
        }

        .dropdown-header {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-card-subtle);
        }

        .dropdown-title {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }

        .dropdown-close {
          background: transparent;
          border: none;
          font-size: 16px;
          color: var(--text-muted);
          cursor: pointer;
        }

        .dropdown-body {
          max-height: 280px;
          overflow-y: auto;
        }

        .notification-item {
          padding: 8px 12px;
          border-bottom: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .notification-item:hover {
          background: var(--bg-card-subtle);
        }

        .notif-header {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          font-weight: 600;
          margin-bottom: 3px;
        }

        .notif-name {
          color: var(--text-main);
        }

        .notif-time {
          color: var(--text-muted);
          font-size: 10px;
        }

        .notif-desc {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .notif-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .notif-status {
          font-size: 9.5px;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .dropdown-empty {
          padding: 16px;
          text-align: center;
          color: var(--text-muted);
          font-size: 11px;
        }

        .user-profile-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 8px;
          border-left: 1px solid var(--border-subtle);
          margin-left: 4px;
        }

        .user-avatar {
          width: 26px;
          height: 26px;
          border-radius: var(--radius-sm);
          background: #f1f5f9;
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-name {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.1;
        }

        .user-role {
          font-size: 8.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--text-muted);
          line-height: 1.2;
        }
      `}</style>
    </header>
  );
};
