import React from 'react';
import {
  ListFilter,
  FileCode2,
  Send,
  PhoneCall,
  UserCheck,
  BarChart3,
  TrendingUp
} from 'lucide-react';

const ICON_MAP = [
  ListFilter,
  FileCode2,
  Send,
  PhoneCall,
  UserCheck,
  BarChart3,
  TrendingUp
];

export default function Sidebar({ tools, activeIndex, onSelectTool, collapsed }) {
  return (
    <aside className={`waanee-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-nav-list">
        {tools.map((tool, idx) => {
          const isActive = activeIndex === idx;
          const IconComp = ICON_MAP[idx] || ListFilter;

          return (
            <button
              key={tool.id}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTool(idx)}
              title={tool.title}
            >
              <div className="nav-icon-wrapper">
                <IconComp
                  size={20}
                  className="nav-icon"
                  color={isActive ? '#fe0168' : '#4b5563'}
                />
              </div>

              {!collapsed && (
                <div className="nav-text-group">
                  <span className="nav-item-title">{tool.shortTitle || tool.title}</span>
                  <span className="nav-item-sub">{tool.desc}</span>
                </div>
              )}

              {isActive && <div className="active-pill-indicator" />}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
