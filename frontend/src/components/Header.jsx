import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, User, LogOut, Shield } from 'lucide-react';

export default function Header({ onToggleSidebar, activeToolTitle, sessionUser, onLogout }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="waanee-header">
      {/* Left side: Hamburger, Logo, Breadcrumb */}
      <div className="header-left">
        <button
          type="button"
          className="header-menu-btn"
          onClick={onToggleSidebar}
          title="Toggle Navigation"
        >
          <Menu size={22} color="#fe0168" strokeWidth={2.5} />
        </button>

        <div className="header-logo-wrap">
          <img
            src="/logo.png"
            alt="waanee.ai - POWER OF CHOICE"
            className="header-brand-logo"
          />
        </div>

        <div className="header-breadcrumb">
          <span className="crumb-main">CDR Toolkit</span>
          {activeToolTitle && (
            <>
              <span className="crumb-sep">/</span>
              <span className="crumb-sub">{activeToolTitle}</span>
            </>
          )}
        </div>
      </div>

      {/* Right side: User Profile Dropdown */}
      <div className="header-right" ref={dropdownRef}>
        <div
          className="user-profile-btn"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          role="button"
          tabIndex={0}
        >
          <div className="user-details">
            <span className="user-role">System</span>
            <span className="user-name">{sessionUser || 'Administrator'}</span>
          </div>

          <div className="user-avatar-circle">
            <User size={18} color="#9aa5b1" />
          </div>

          <ChevronDown size={15} color="#5b6b79" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
        </div>

        {dropdownOpen && (
          <div className="user-dropdown-menu">
            <div className="dropdown-header">
              <Shield size={14} color="#fe0168" style={{ marginRight: 6 }} />
              <span>Admin Access Active</span>
            </div>
            <div className="dropdown-divider" />
            <button
              type="button"
              className="dropdown-item logout"
              onClick={() => {
                setDropdownOpen(false);
                if (onLogout) onLogout();
              }}
            >
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
