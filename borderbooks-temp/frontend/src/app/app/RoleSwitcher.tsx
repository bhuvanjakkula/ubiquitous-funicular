"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export function RoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState("Finance Admin");

  const roles = [
    { name: "Owner", color: "#6366f1" },
    { name: "Finance Admin", color: "#10b981" },
    { name: "Approver", color: "#f59e0b" },
    { name: "Auditor", color: "#8b5cf6" },
    { name: "Read-only", color: "#6b7280" },
  ];

  const activeColor = roles.find(r => r.name === role)?.color || "#10b981";

  return (
    <div style={{ position: "relative", marginLeft: "1rem", paddingLeft: "1rem", borderLeft: "1px solid var(--border)" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: "flex", alignItems: "center", gap: "0.5rem", 
          background: "transparent", border: "none", cursor: "pointer",
          padding: "0.25rem 0.5rem", borderRadius: "4px"
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: activeColor }}></div>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#374151" }}>{role}</span>
        <ChevronDown size={14} style={{ color: "#6b7280" }} />
      </button>

      {isOpen && (
        <div style={{ 
          position: "absolute", top: "100%", right: 0, marginTop: "0.5rem",
          background: "white", border: "1px solid var(--border)", borderRadius: "8px",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", padding: "0.5rem",
          minWidth: "180px", zIndex: 50
        }}>
          <div style={{ padding: "0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
            Switch Role (RBAC)
          </div>
          {roles.map(r => (
            <button
              key={r.name}
              onClick={() => { setRole(r.name); setIsOpen(false); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "0.5rem", background: "transparent", border: "none",
                cursor: "pointer", borderRadius: "4px", fontSize: "0.85rem", color: "#374151"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.05)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: r.color }}></div>
                {r.name}
              </div>
              {role === r.name && <Check size={14} style={{ color: r.color }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
