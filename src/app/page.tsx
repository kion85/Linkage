"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════════
   Linkage — Software Framework Imitation Device
   Full Application Shell — All buttons functional
   ═══════════════════════════════════════════════════════════════ */

// ─── Types ───
interface SystemMetrics {
  cpu: number;
  ram: number;
  uptime: number;
  uptimeFormatted: string;
  temperature: number;
  totalRxBytes: number;
  totalTxBytes: number;
  activeConnections: number;
  dhcpLeases: number;
  dnsQueries: number;
  firewallHits: number;
  adblockBlocked: number;
  timestamp: number;
  interfaces?: Array<{
    name: string;
    status: string;
    role: string;
    type: string;
    ipAddress: string;
    rxBytesPerSec: number;
    txBytesPerSec: number;
    sparkline?: number[];
  }>;
}

interface LogEntry {
  id: number;
  timestamp: string;
  level: string;
  source: string;
  message: string;
}

interface FirewallRule {
  id: number;
  name: string;
  order: number;
  sourceZone: string;
  destZone: string;
  protocol: string;
  destPort: string;
  action: string;
  enabled: boolean;
  logging: boolean;
}

interface VpnProfile {
  id: number;
  name: string;
  type: string;
  server: string;
  port?: number;
  username?: string;
  status: string;
  enabled: boolean;
}

type Page =
  | "dashboard" | "interfaces" | "dhcp" | "firewall"
  | "wifi24" | "wifi5" | "guest"
  | "vpn" | "adblock" | "torrent"
  | "system" | "password" | "security" | "update" | "backup"
  | "personalization" | "logs" | "diagnostics";

type ToastFn = (msg: string, type: "success" | "error" | "info") => void;

// ─── Utility ───
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─── Wallpaper Presets ───
const WALLPAPER_PRESETS = [
  { id: "default", label: "Default", css: "none", preview: "#F5F7FA" },
  { id: "ocean", label: "Ocean", css: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", preview: "#667eea" },
  { id: "sunset", label: "Sunset", css: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", preview: "#f093fb" },
  { id: "forest", label: "Forest", css: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", preview: "#11998e" },
  { id: "midnight", label: "Midnight", css: "linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%)", preview: "#1a1a3e" },
  { id: "aurora", label: "Aurora", css: "linear-gradient(135deg, #00c6fb 0%, #005bea 100%)", preview: "#005bea" },
  { id: "peach", label: "Peach", css: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", preview: "#fcb69f" },
  { id: "steel", label: "Steel", css: "linear-gradient(135deg, #485563 0%, #29323c 100%)", preview: "#29323c" },
  { id: "custom", label: "Custom URL", css: "", preview: "#ccc" },
];

// ─── SVG Logo ───
function LinkageLogo({ size = "normal" }: { size?: "small" | "normal" }) {
  const s = size === "small" ? 0.7 : 1;
  return (
    <svg width={160 * s} height={40 * s} viewBox="0 0 160 40" role="img" aria-label="Linkage logo" className="inline-block">
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="14" cy="20" r="6" />
        <circle cx="40" cy="12" r="6" />
        <circle cx="40" cy="28" r="6" />
        <line x1="20" y1="20" x2="34" y2="12" />
        <line x1="20" y1="20" x2="34" y2="28" />
      </g>
      <text x="56" y="26" fontFamily="Inter, sans-serif" fontSize={18 * s} fontWeight="700" fill="currentColor">Linkage</text>
    </svg>
  );
}

// ─── Sparkline ───
function Sparkline({ data, width = 100, height = 24, color = "#0066FF" }: { data: number[]; width?: number; height?: number; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !data.length) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr; c.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const max = Math.max(...data, 1);
    const step = width / (data.length - 1);
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.lineJoin = "round";
    data.forEach((v, i) => {
      const x = i * step;
      const y = height - (v / max) * (height - 2) - 1;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, width, height, color]);
  return <canvas ref={ref} style={{ width, height }} />;
}

// ─── Skeleton ───
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} style={{ minHeight: 16 }}>&nbsp;</div>;
}

// ─── Toast ───
function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-blue-500" }[type];
  const icon = { success: "✓", error: "✕", info: "ℹ" }[type];
  return (
    <div className={`toast-enter flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${bg}`}>
      <span>{icon}</span><span>{message}</span>
      <button onClick={onClose} className="ml-auto opacity-70 hover:opacity-100">✕</button>
    </div>
  );
}

// ─── Modal ───
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-xl opacity-50 hover:opacity-100 p-1">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Sidebar Navigation ───
const NAV_ITEMS: Array<{ id: Page; icon: string; label: string; group: string }> = [
  { id: "dashboard", icon: "📊", label: "Overview", group: "" },
  { id: "interfaces", icon: "🔌", label: "Interfaces", group: "Network" },
  { id: "dhcp", icon: "📡", label: "DHCP", group: "Network" },
  { id: "firewall", icon: "🛡️", label: "Firewall", group: "Network" },
  { id: "wifi24", icon: "📶", label: "Wi-Fi 2.4GHz", group: "Wireless" },
  { id: "wifi5", icon: "📶", label: "Wi-Fi 5GHz", group: "Wireless" },
  { id: "guest", icon: "👥", label: "Guest Network", group: "Wireless" },
  { id: "vpn", icon: "🔒", label: "VPN", group: "Services" },
  { id: "adblock", icon: "🚫", label: "AdBlock", group: "Services" },
  { id: "torrent", icon: "⬇️", label: "Torrent", group: "Services" },
  { id: "system", icon: "⚙️", label: "General", group: "System" },
  { id: "password", icon: "🔑", label: "Password", group: "System" },
  { id: "security", icon: "🛡️", label: "Security", group: "System" },
  { id: "update", icon: "🔄", label: "Updates", group: "System" },
  { id: "backup", icon: "💾", label: "Backup", group: "System" },
  { id: "personalization", icon: "🎨", label: "Personalization", group: "System" },
  { id: "logs", icon: "📋", label: "Logs", group: "System" },
  { id: "diagnostics", icon: "🔍", label: "Diagnostics", group: "System" },
];

function Sidebar({ currentPage, onNavigate, collapsed, searchQuery, onSearchChange, onCollapse }: {
  currentPage: Page; onNavigate: (p: Page) => void; collapsed: boolean;
  searchQuery: string; onSearchChange: (q: string) => void; onCollapse: () => void;
}) {
  const filtered = searchQuery
    ? NAV_ITEMS.filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase()) || i.group.toLowerCase().includes(searchQuery.toLowerCase()))
    : NAV_ITEMS;

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={onCollapse} />}
      <nav
        className={`fixed left-0 top-[var(--header-height)] bottom-0 overflow-y-auto transition-transform duration-200 z-40 no-print ${collapsed ? "-translate-x-full md:translate-x-0" : "translate-x-0"}`}
        style={{ width: "var(--sidebar-width)", background: "var(--surface)", borderRight: "1px solid var(--border)" }}
        role="navigation" aria-label="Main navigation"
      >
        <div className="p-3">
          <div className="relative mb-3">
            <input type="search" placeholder="Search settings..." value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="input-field text-sm pl-8" aria-label="Search settings" />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">🔍</span>
          </div>
        </div>
        <ul className="px-2 pb-4" role="list">
          {filtered.map((item) => {
            const isFirst = item.group && filtered.indexOf(item) === filtered.findIndex((i) => i.group === item.group);
            return (
              <li key={item.id}>
                {isFirst && <div className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{item.group}</div>}
                {!item.group && item.id === "dashboard" && <div className="h-1" />}
                <button
                  onClick={() => { onNavigate(item.id); if (window.innerWidth < 768) onCollapse(); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${currentPage === item.id ? "font-semibold" : "hover:bg-[var(--bg)]"}`}
                  style={{ color: currentPage === item.id ? "var(--accent)" : "var(--text)", background: currentPage === item.id ? "color-mix(in srgb, var(--accent) 10%, transparent)" : undefined }}
                  aria-current={currentPage === item.id ? "page" : undefined}
                >
                  <span className="text-base">{item.icon}</span><span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

// ─── Header ───
function Header({ metrics, onReboot, onToggleSidebar, theme, onToggleTheme, onLogout }: {
  metrics: SystemMetrics | null; onReboot: () => void; onToggleSidebar: () => void;
  theme: string; onToggleTheme: () => void; onLogout: () => void;
}) {
  return (
    <header className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 no-print"
      style={{ height: "var(--header-height)", background: "var(--surface)", borderBottom: "1px solid var(--border)", zIndex: 50 }} role="banner">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="p-1 rounded hover:bg-[var(--bg)]" aria-label="Toggle menu">☰</button>
        <div className="text-[var(--accent)]"><LinkageLogo /></div>
        <div className="hidden sm:flex items-center gap-1.5 ml-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Online</span>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
        {metrics ? (<>
          <span>CPU: <strong className="text-[var(--text)]">{metrics.cpu}%</strong></span>
          <span>RAM: <strong className="text-[var(--text)]">{metrics.ram}%</strong></span>
          <span>Temp: <strong className="text-[var(--text)]">{metrics.temperature}°C</strong></span>
          <span>Uptime: <strong className="text-[var(--text)]">{metrics.uptimeFormatted}</strong></span>
        </>) : <Skeleton className="w-48 h-4" />}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onToggleTheme} className="p-2 rounded-lg hover:bg-[var(--bg)] transition-colors text-lg" aria-label="Toggle theme" title={theme === "dark" ? "Switch to light" : "Switch to dark"}>
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <button onClick={onReboot} className="btn btn-secondary text-xs py-1.5 px-3 hidden sm:inline-flex" title="Reboot (simulated)">🔄 Reboot</button>
        <button onClick={onLogout} className="btn btn-secondary text-xs py-1.5 px-3" title="Sign out">↩ Sign Out</button>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── PAGE COMPONENTS ───
// ═══════════════════════════════════════════════════════════════

// ─── Dashboard ───
function DashboardPage({ metrics, logs }: { metrics: SystemMetrics | null; logs: LogEntry[] }) {
  if (!metrics) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map((i) => <div key={i} className="card p-5"><Skeleton className="w-16 h-3 mb-3" /><Skeleton className="w-20 h-8 mb-2" /><Skeleton className="w-full h-2" /></div>)}
      </div>
      <div className="card p-5"><Skeleton className="w-32 h-5 mb-4" /><Skeleton className="w-full h-40" /></div>
    </div>
  );

  const cards = [
    { label: "CPU Usage", value: `${metrics.cpu}%`, color: metrics.cpu > 80 ? "#EF4444" : metrics.cpu > 50 ? "#F59E0B" : "#10B981", pct: metrics.cpu },
    { label: "RAM Usage", value: `${metrics.ram}%`, color: metrics.ram > 80 ? "#EF4444" : "#3B82F6", pct: metrics.ram },
    { label: "Connections", value: String(metrics.activeConnections), color: "#8B5CF6", pct: Math.min(metrics.activeConnections * 2, 100) },
    { label: "FW Hits", value: String(metrics.firewallHits), color: "#F59E0B", pct: Math.min(metrics.firewallHits * 5, 100) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{c.label}</div>
            <div className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${c.pct}%`, background: c.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Traffic</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>↓ RX</span><span className="font-mono font-semibold">{formatBytes(metrics.totalRxBytes)}</span></div>
            <div className="flex justify-between"><span>↑ TX</span><span className="font-mono font-semibold">{formatBytes(metrics.totalTxBytes)}</span></div>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Uptime</div>
          <div className="text-xl font-bold">{metrics.uptimeFormatted}</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Temperature: {metrics.temperature}°C</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>Services</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>DHCP Leases</span><span className="font-semibold">{metrics.dhcpLeases}</span></div>
            <div className="flex justify-between"><span>DNS Queries</span><span className="font-semibold">{metrics.dnsQueries}</span></div>
            <div className="flex justify-between"><span>AdBlock</span><span className="font-semibold">{metrics.adblockBlocked}</span></div>
          </div>
        </div>
      </div>
      {metrics.interfaces && (
        <div className="card overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h2 className="text-lg font-semibold">Active Interfaces</h2></div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Interface</th><th>Type</th><th>Role</th><th>IP</th><th>Status</th><th>RX/s</th><th>TX/s</th><th>Activity</th></tr></thead>
              <tbody>{metrics.interfaces.map((i) => (
                <tr key={i.name}>
                  <td className="font-mono font-semibold">{i.name}</td>
                  <td className="capitalize">{i.type}</td>
                  <td><span className={`badge ${i.role === "wan" ? "badge-info" : "badge-success"}`}>{i.role.toUpperCase()}</span></td>
                  <td className="font-mono text-sm">{i.ipAddress}</td>
                  <td><span className={`badge ${i.status === "up" ? "badge-success" : "badge-error"}`}>● {i.status}</span></td>
                  <td className="font-mono text-xs">{formatBytes(i.rxBytesPerSec)}/s</td>
                  <td className="font-mono text-xs">{formatBytes(i.txBytesPerSec)}/s</td>
                  <td>{i.sparkline ? <Sparkline data={i.sparkline} /> : null}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="px-5 pt-5 pb-3"><h2 className="text-lg font-semibold">Recent Events</h2></div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Time</th><th>Level</th><th>Source</th><th>Message</th></tr></thead>
            <tbody>{logs.slice(0, 8).map((l) => (
              <tr key={l.id}>
                <td className="font-mono text-xs whitespace-nowrap">{new Date(l.timestamp).toLocaleTimeString()}</td>
                <td><span className={`badge ${l.level === "error" ? "badge-error" : l.level === "warn" ? "badge-warning" : "badge-info"}`}>{l.level}</span></td>
                <td className="capitalize text-sm">{l.source}</td>
                <td className="text-sm">{l.message}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Interfaces ───
function InterfacesPage({ metrics, showToast }: { metrics: SystemMetrics | null; showToast: ToastFn }) {
  const ifaces = metrics?.interfaces || [];
  const [editIface, setEditIface] = useState<string | null>(null);
  const [editMode, setEditMode] = useState("dhcp");
  const [editIp, setEditIp] = useState("");
  const [editMask, setEditMask] = useState("255.255.255.0");

  const handleEdit = (name: string) => {
    setEditIface(name);
    const iface = ifaces.find((i) => i.name === name);
    setEditIp(iface?.ipAddress || "");
    setEditMode("dhcp");
  };

  const handleSaveIface = async () => {
    if (!editIface) return;
    await fetch("/api/v1/interfaces", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editIface, mode: editMode, ipAddress: editIp, netmask: editMask }),
    });
    setEditIface(null);
    showToast(`Interface ${editIface} updated`, "success");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Network Interfaces</h1>
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead><tr><th>Interface</th><th>Type</th><th>Role</th><th>IP / Mask</th><th>Status</th><th>RX/s</th><th>TX/s</th><th>Activity</th><th>Actions</th></tr></thead>
          <tbody>{ifaces.map((i) => (
            <tr key={i.name}>
              <td className="font-mono font-semibold">{i.name}</td>
              <td className="capitalize">{i.type}</td>
              <td><span className={`badge ${i.role === "wan" ? "badge-info" : "badge-success"}`}>{i.role.toUpperCase()}</span></td>
              <td className="font-mono text-sm">{i.ipAddress}</td>
              <td><span className={`badge ${i.status === "up" ? "badge-success" : "badge-error"}`}>● {i.status}</span></td>
              <td className="font-mono text-xs">{formatBytes(i.rxBytesPerSec)}/s</td>
              <td className="font-mono text-xs">{formatBytes(i.txBytesPerSec)}/s</td>
              <td>{i.sparkline ? <Sparkline data={i.sparkline} /> : null}</td>
              <td><button className="btn btn-secondary text-xs" onClick={() => handleEdit(i.name)}>✏️ Edit</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">Static Routes</h2>
        <table className="data-table">
          <thead><tr><th>Destination</th><th>Gateway</th><th>Interface</th><th>Metric</th><th>Type</th></tr></thead>
          <tbody>
            <tr><td className="font-mono">192.168.1.0/24</td><td className="font-mono">0.0.0.0</td><td>eth1</td><td>0</td><td><span className="badge badge-success">Connected</span></td></tr>
            <tr><td className="font-mono">203.0.113.0/24</td><td className="font-mono">0.0.0.0</td><td>eth0</td><td>0</td><td><span className="badge badge-success">Connected</span></td></tr>
            <tr><td className="font-mono">0.0.0.0/0</td><td className="font-mono">203.0.113.1</td><td>eth0</td><td>1</td><td><span className="badge badge-info">Default</span></td></tr>
          </tbody>
        </table>
      </div>
      {editIface && (
        <Modal title={`Edit ${editIface}`} onClose={() => setEditIface(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mode</label>
              <select className="input-field" value={editMode} onChange={(e) => setEditMode(e.target.value)}>
                <option value="dhcp">DHCP</option><option value="static">Static</option><option value="pppoe">PPPoE</option>
              </select>
            </div>
            {editMode === "static" && (<>
              <div><label className="block text-sm font-medium mb-1">IP Address</label><input className="input-field" value={editIp} onChange={(e) => setEditIp(e.target.value)} /></div>
              <div><label className="block text-sm font-medium mb-1">Netmask</label><input className="input-field" value={editMask} onChange={(e) => setEditMask(e.target.value)} /></div>
            </>)}
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn btn-secondary" onClick={() => setEditIface(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveIface}>Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── DHCP ───
function DhcpPage({ showToast }: { showToast: ToastFn }) {
  const [cfg, setCfg] = useState({ enabled: true, interfaceName: "eth1", poolStart: "192.168.1.100", poolEnd: "192.168.1.199", leaseTime: "24h", dnsServers: "1.1.1.1, 8.8.8.8", gateway: "192.168.1.1", domain: "local" });
  const [leases, setLeases] = useState<Array<{ mac: string; ip: string; hostname: string; expiry: string; reserved: boolean }>>([]);

  useEffect(() => {
    fetch("/api/v1/dhcp").then((r) => r.json()).then((d) => {
      if (d.config) setCfg((p) => ({ ...p, ...d.config, dnsServers: (d.config.dnsServers || []).join(", ") }));
      if (d.leases) setLeases(d.leases);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    await fetch("/api/v1/dhcp", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cfg, dnsServers: cfg.dnsServers.split(",").map((s) => s.trim()) }),
    });
    showToast("DHCP settings saved", "success");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">DHCP Server</h1>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">DHCP Settings</h2>
          <div className={`toggle-switch ${cfg.enabled ? "active" : ""}`} onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })} role="switch" aria-checked={cfg.enabled} tabIndex={0} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Interface</label>
            <select className="input-field" value={cfg.interfaceName} onChange={(e) => setCfg({ ...cfg, interfaceName: e.target.value })}>
              <option value="eth1">eth1 (LAN)</option><option value="wlan0">wlan0 (Wi-Fi)</option>
            </select></div>
          <div><label className="block text-sm font-medium mb-1">Lease Time</label><input className="input-field" value={cfg.leaseTime} onChange={(e) => setCfg({ ...cfg, leaseTime: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">Pool Start</label><input className="input-field" value={cfg.poolStart} onChange={(e) => setCfg({ ...cfg, poolStart: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">Pool End</label><input className="input-field" value={cfg.poolEnd} onChange={(e) => setCfg({ ...cfg, poolEnd: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">DNS Servers</label><input className="input-field" value={cfg.dnsServers} onChange={(e) => setCfg({ ...cfg, dnsServers: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">Gateway</label><input className="input-field" value={cfg.gateway} onChange={(e) => setCfg({ ...cfg, gateway: e.target.value })} /></div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 pt-5 pb-3"><h2 className="text-lg font-semibold">Active Leases</h2></div>
        <table className="data-table">
          <thead><tr><th>MAC Address</th><th>IP Address</th><th>Hostname</th><th>Expiry</th><th>Reserved</th></tr></thead>
          <tbody>{leases.map((l, i) => (
            <tr key={i}>
              <td className="font-mono text-sm">{l.mac}</td>
              <td className="font-mono text-sm font-semibold">{l.ip}</td>
              <td>{l.hostname}</td>
              <td className="text-sm">{new Date(l.expiry).toLocaleString()}</td>
              <td>{l.reserved ? <span className="badge badge-info">Yes</span> : <span className="badge badge-warning">No</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="sticky-apply"><button className="btn btn-primary" onClick={handleSave}>Apply Changes</button></div>
    </div>
  );
}

// ─── Firewall ───
function FirewallPage({ showToast }: { showToast: ToastFn }) {
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [defaults, setDefaults] = useState({ wanDefaultPolicy: "deny", lanDefaultPolicy: "allow" });
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({ name: "", sourceZone: "any", destZone: "any", protocol: "any", destPort: "", action: "deny", logging: false });

  const loadRules = () => {
    fetch("/api/v1/firewall").then((r) => r.json()).then((d) => {
      if (d.defaults) setDefaults(d.defaults);
      if (d.rules) setRules(d.rules);
    }).catch(() => {});
  };
  useEffect(() => { loadRules(); }, []);

  const handleSaveDefaults = async () => {
    await fetch("/api/v1/firewall", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ defaults }) });
    showToast("Firewall defaults saved", "success");
  };

  const handleAddRule = async () => {
    await fetch("/api/v1/firewall", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newRule, order: rules.length + 1, enabled: true }),
    });
    setShowAdd(false);
    setNewRule({ name: "", sourceZone: "any", destZone: "any", protocol: "any", destPort: "", action: "deny", logging: false });
    loadRules();
    showToast("Firewall rule added", "success");
  };

  const handleDeleteRule = async (id: number) => {
    await fetch(`/api/v1/firewall?id=${id}`, { method: "DELETE" });
    loadRules();
    showToast("Rule deleted", "info");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Firewall</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-3">Default Policies</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">WAN → Default</span>
              <select className="input-field w-32" value={defaults.wanDefaultPolicy} onChange={(e) => setDefaults({ ...defaults, wanDefaultPolicy: e.target.value })}>
                <option value="allow">Allow</option><option value="deny">Deny</option><option value="reject">Reject</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">LAN → Default</span>
              <select className="input-field w-32" value={defaults.lanDefaultPolicy} onChange={(e) => setDefaults({ ...defaults, lanDefaultPolicy: e.target.value })}>
                <option value="allow">Allow</option><option value="deny">Deny</option><option value="reject">Reject</option>
              </select>
            </div>
            <button className="btn btn-primary text-sm mt-2" onClick={handleSaveDefaults}>Save Policies</button>
          </div>
        </div>
        <div className="card p-5">
          <h2 className="text-lg font-semibold mb-3">Statistics</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total Rules</span><span className="font-semibold">{rules.length}</span></div>
            <div className="flex justify-between"><span>Active</span><span className="font-semibold">{rules.filter((r) => r.enabled).length}</span></div>
            <div className="flex justify-between"><span>NAT Masquerade</span><span className="badge badge-success">Enabled</span></div>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rules</h2>
          <button className="btn btn-primary text-sm" onClick={() => setShowAdd(true)}>+ Add Rule</button>
        </div>
        <table className="data-table">
          <thead><tr><th>#</th><th>Name</th><th>Source</th><th>Dest</th><th>Proto</th><th>Port</th><th>Action</th><th>Log</th><th>Status</th><th></th></tr></thead>
          <tbody>{rules.length === 0 ? (
            <tr><td colSpan={10} className="text-center py-8" style={{ color: "var(--text-muted)" }}>No rules configured</td></tr>
          ) : rules.map((r) => (
            <tr key={r.id}>
              <td>{r.order}</td><td className="font-medium">{r.name || `Rule ${r.id}`}</td>
              <td>{r.sourceZone}</td><td>{r.destZone}</td>
              <td className="uppercase text-xs">{r.protocol}</td><td className="font-mono text-sm">{r.destPort || "*"}</td>
              <td><span className={`badge ${r.action === "allow" ? "badge-success" : "badge-error"}`}>{r.action}</span></td>
              <td>{r.logging ? "✓" : "—"}</td>
              <td>{r.enabled ? <span className="badge badge-success">On</span> : <span className="badge badge-error">Off</span>}</td>
              <td><button className="text-red-500 hover:text-red-700 text-sm" onClick={() => handleDeleteRule(r.id)}>🗑️</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {showAdd && (
        <Modal title="Add Firewall Rule" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Name</label><input className="input-field" value={newRule.name} onChange={(e) => setNewRule({ ...newRule, name: e.target.value })} placeholder="Block SSH" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Source Zone</label>
                <select className="input-field" value={newRule.sourceZone} onChange={(e) => setNewRule({ ...newRule, sourceZone: e.target.value })}>
                  <option value="any">Any</option><option value="wan">WAN</option><option value="lan">LAN</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Dest Zone</label>
                <select className="input-field" value={newRule.destZone} onChange={(e) => setNewRule({ ...newRule, destZone: e.target.value })}>
                  <option value="any">Any</option><option value="wan">WAN</option><option value="lan">LAN</option>
                </select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Protocol</label>
                <select className="input-field" value={newRule.protocol} onChange={(e) => setNewRule({ ...newRule, protocol: e.target.value })}>
                  <option value="any">Any</option><option value="tcp">TCP</option><option value="udp">UDP</option><option value="icmp">ICMP</option>
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Dest Port</label><input className="input-field" value={newRule.destPort} onChange={(e) => setNewRule({ ...newRule, destPort: e.target.value })} placeholder="22, 80, 443" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Action</label>
                <select className="input-field" value={newRule.action} onChange={(e) => setNewRule({ ...newRule, action: e.target.value })}>
                  <option value="allow">Allow</option><option value="deny">Deny</option><option value="reject">Reject</option>
                </select></div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" checked={newRule.logging} onChange={(e) => setNewRule({ ...newRule, logging: e.target.checked })} className="accent-[var(--accent)]" />
                <span className="text-sm">Enable Logging</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddRule}>Add Rule</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Wi-Fi ───
function WifiPage({ band, showToast }: { band: "2.4g" | "5g"; showToast: ToastFn }) {
  const [cfg, setCfg] = useState({ enabled: true, ssid: band === "2.4g" ? "Linkage-2G" : "Linkage-5G", password: "linkagepass", channel: band === "2.4g" ? 6 : 36, channelWidth: band === "2.4g" ? "20" : "80", security: "wpa2", hiddenSsid: false });
  const [clients, setClients] = useState<Array<{ mac: string; hostname: string; signal: number; connectedAt: string }>>([]);

  useEffect(() => {
    fetch(`/api/v1/wifi/${band}`).then((r) => r.json()).then((d) => {
      if (d.config) setCfg((p) => ({ ...p, ...d.config }));
      if (d.clients) setClients(d.clients);
    }).catch(() => {});
  }, [band]);

  const handleSave = async () => {
    await fetch(`/api/v1/wifi/${band}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
    showToast(`Wi-Fi ${band} settings saved`, "success");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wi-Fi {band === "2.4g" ? "2.4 GHz" : "5 GHz"}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Wireless Radio</h2>
            <div className={`toggle-switch ${cfg.enabled ? "active" : ""}`} onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })} role="switch" aria-checked={cfg.enabled} tabIndex={0} />
          </div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">SSID</label><input className="input-field" value={cfg.ssid} onChange={(e) => setCfg({ ...cfg, ssid: e.target.value })} maxLength={32} /></div>
            <div><label className="block text-sm font-medium mb-1">Password</label><input className="input-field" type="password" value={cfg.password} onChange={(e) => setCfg({ ...cfg, password: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Channel</label>
                <select className="input-field" value={cfg.channel} onChange={(e) => setCfg({ ...cfg, channel: parseInt(e.target.value) })}>
                  {(band === "2.4g" ? [1,2,3,4,5,6,7,8,9,10,11] : [36,40,44,48,52,56,60,64,100,149,153,157,161,165]).map((c) => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium mb-1">Channel Width</label>
                <select className="input-field" value={cfg.channelWidth} onChange={(e) => setCfg({ ...cfg, channelWidth: e.target.value })}>
                  {(band === "2.4g" ? ["20","40"] : ["20","40","80","160"]).map((w) => <option key={w} value={w}>{w} MHz</option>)}
                </select></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Security</label>
              <select className="input-field" value={cfg.security} onChange={(e) => setCfg({ ...cfg, security: e.target.value })}>
                <option value="open">Open</option><option value="wep">WEP</option><option value="wpa">WPA</option><option value="wpa2">WPA2</option><option value="wpa3">WPA3</option>
              </select></div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Hidden SSID</span>
              <div className={`toggle-switch ${cfg.hiddenSsid ? "active" : ""}`} onClick={() => setCfg({ ...cfg, hiddenSsid: !cfg.hiddenSsid })} role="switch" aria-checked={cfg.hiddenSsid} tabIndex={0} />
            </div>
          </div>
        </div>
        <div className="card p-5 flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold mb-4">QR Code</h2>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <svg viewBox="0 0 100 100" width="150" height="150">
              <rect width="100" height="100" fill="white" />
              <rect x="5" y="5" width="25" height="25" fill="black" rx="2" />
              <rect x="70" y="5" width="25" height="25" fill="black" rx="2" />
              <rect x="5" y="70" width="25" height="25" fill="black" rx="2" />
              <rect x="10" y="10" width="15" height="15" fill="white" rx="1" />
              <rect x="75" y="10" width="15" height="15" fill="white" rx="1" />
              <rect x="10" y="75" width="15" height="15" fill="white" rx="1" />
              <rect x="14" y="14" width="7" height="7" fill="black" />
              <rect x="79" y="14" width="7" height="7" fill="black" />
              <rect x="14" y="79" width="7" height="7" fill="black" />
              {[35,45,55,65].map((x) => [35,45,55,65].map((y) => <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" fill={((x+y)%10<5)?"black":"white"} />))}
            </svg>
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: "var(--text-muted)" }}>Scan to connect to <strong>{cfg.ssid}</strong></p>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 pt-5 pb-3"><h2 className="text-lg font-semibold">Connected Clients ({clients.length})</h2></div>
        <table className="data-table">
          <thead><tr><th>MAC</th><th>Hostname</th><th>Signal</th><th>Connected</th></tr></thead>
          <tbody>{clients.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-6" style={{ color: "var(--text-muted)" }}>No clients connected</td></tr>
          ) : clients.map((c, i) => (
            <tr key={i}>
              <td className="font-mono text-sm">{c.mac}</td><td>{c.hostname}</td>
              <td><div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (100+c.signal)*2)}%`, background: c.signal > -50 ? "#10B981" : c.signal > -70 ? "#F59E0B" : "#EF4444" }} />
                </div><span className="text-xs font-mono">{c.signal} dBm</span>
              </div></td>
              <td className="text-sm">{new Date(c.connectedAt).toLocaleTimeString()}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="sticky-apply"><button className="btn btn-primary" onClick={handleSave}>Apply Changes</button></div>
    </div>
  );
}

// ─── Guest ───
function GuestPage({ showToast }: { showToast: ToastFn }) {
  const [cfg, setCfg] = useState({ enabled: false, ssid: "Linkage-Guest", password: "", isolation: true, speedLimitMbps: 10, lanAccess: false });

  useEffect(() => {
    fetch("/api/v1/guest").then((r) => r.json()).then((d) => setCfg((p) => ({ ...p, ...d }))).catch(() => {});
  }, []);

  const handleSave = async () => {
    await fetch("/api/v1/guest", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
    showToast("Guest network settings saved", "success");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Guest Network</h1>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Guest Wi-Fi</h2>
          <div className={`toggle-switch ${cfg.enabled ? "active" : ""}`} onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })} role="switch" aria-checked={cfg.enabled} tabIndex={0} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">SSID</label><input className="input-field" value={cfg.ssid} onChange={(e) => setCfg({ ...cfg, ssid: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">Password</label><input className="input-field" type="password" value={cfg.password} onChange={(e) => setCfg({ ...cfg, password: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">Speed Limit (Mbps)</label><input className="input-field" type="number" value={cfg.speedLimitMbps} onChange={(e) => setCfg({ ...cfg, speedLimitMbps: parseInt(e.target.value) || 0 })} /></div>
          <div className="space-y-3 pt-6">
            <div className="flex items-center justify-between"><span className="text-sm">Client Isolation</span>
              <div className={`toggle-switch ${cfg.isolation ? "active" : ""}`} onClick={() => setCfg({ ...cfg, isolation: !cfg.isolation })} role="switch" aria-checked={cfg.isolation} tabIndex={0} /></div>
            <div className="flex items-center justify-between"><span className="text-sm">LAN Access</span>
              <div className={`toggle-switch ${cfg.lanAccess ? "active" : ""}`} onClick={() => setCfg({ ...cfg, lanAccess: !cfg.lanAccess })} role="switch" aria-checked={cfg.lanAccess} tabIndex={0} /></div>
          </div>
        </div>
      </div>
      <div className="sticky-apply"><button className="btn btn-primary" onClick={handleSave}>Apply Changes</button></div>
    </div>
  );
}

// ─── VPN ───
function VpnPage({ showToast }: { showToast: ToastFn }) {
  const [profiles, setProfiles] = useState<VpnProfile[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newP, setNewP] = useState({ name: "", type: "openvpn", server: "", port: 1194, username: "" });

  const load = () => {
    fetch("/api/v1/vpn").then((r) => r.json()).then((d) => { if (d.profiles) setProfiles(d.profiles); }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const toggleConnect = async (id: number, currentStatus: string) => {
    const action = currentStatus === "connected" ? "disconnect" : "connect";
    await fetch("/api/v1/vpn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }) });
    load();
    showToast(`VPN ${action}ed (simulated)`, action === "connect" ? "success" : "info");
  };

  const handleAdd = async () => {
    await fetch("/api/v1/vpn", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newP) });
    setShowAdd(false);
    setNewP({ name: "", type: "openvpn", server: "", port: 1194, username: "" });
    load();
    showToast("VPN profile added", "success");
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/v1/vpn?id=${id}`, { method: "DELETE" });
    load();
    showToast("VPN profile deleted", "info");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">VPN Profiles</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Profile</button>
      </div>
      {profiles.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p style={{ color: "var(--text-muted)" }}>No VPN profiles configured</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Add a profile to emulate VPN tunnel connections</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => (
            <div key={p.id} className="card p-5 flex items-center justify-between">
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>{p.type.toUpperCase()} → {p.server}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${p.status === "connected" ? "badge-success" : "badge-warning"}`}>
                  {p.status === "connected" ? "● Connected" : "○ Disconnected"}
                </span>
                <button className="btn btn-secondary text-xs" onClick={() => toggleConnect(p.id, p.status)}>
                  {p.status === "connected" ? "Disconnect" : "Connect"}
                </button>
                <button className="text-red-500 hover:text-red-700 text-sm" onClick={() => handleDelete(p.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAdd && (
        <Modal title="Add VPN Profile" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Name</label><input className="input-field" value={newP.name} onChange={(e) => setNewP({ ...newP, name: e.target.value })} placeholder="Office VPN" /></div>
            <div><label className="block text-sm font-medium mb-1">Type</label>
              <select className="input-field" value={newP.type} onChange={(e) => setNewP({ ...newP, type: e.target.value })}>
                <option value="openvpn">OpenVPN</option><option value="ipsec">IPsec</option><option value="wireguard">WireGuard</option>
              </select></div>
            <div><label className="block text-sm font-medium mb-1">Server</label><input className="input-field" value={newP.server} onChange={(e) => setNewP({ ...newP, server: e.target.value })} placeholder="vpn.example.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Port</label><input className="input-field" type="number" value={newP.port} onChange={(e) => setNewP({ ...newP, port: parseInt(e.target.value) || 0 })} /></div>
              <div><label className="block text-sm font-medium mb-1">Username</label><input className="input-field" value={newP.username} onChange={(e) => setNewP({ ...newP, username: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Add Profile</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── AdBlock ───
function AdblockPage({ showToast }: { showToast: ToastFn }) {
  const [cfg, setCfg] = useState({ enabled: false, blockedCount: 0, blocklists: [] as string[], allowedDomains: [] as string[] });

  useEffect(() => {
    fetch("/api/v1/adblock").then((r) => r.json()).then((d) => setCfg((p) => ({ ...p, ...d }))).catch(() => {});
  }, []);

  const handleSave = async () => {
    await fetch("/api/v1/adblock", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
    showToast("AdBlock settings saved", "success");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AdBlock (Simulation)</h1>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">DNS-based Ad Blocking</h2>
          <div className={`toggle-switch ${cfg.enabled ? "active" : ""}`} onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })} role="switch" aria-checked={cfg.enabled} tabIndex={0} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="card p-4" style={{ background: "var(--bg)" }}><div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Blocked Today</div><div className="text-2xl font-bold text-[var(--accent)]">{cfg.blockedCount}</div></div>
          <div className="card p-4" style={{ background: "var(--bg)" }}><div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Blocklists</div><div className="text-2xl font-bold">{cfg.blocklists.length}</div></div>
          <div className="card p-4" style={{ background: "var(--bg)" }}><div className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Whitelisted</div><div className="text-2xl font-bold">{cfg.allowedDomains.length}</div></div>
        </div>
      </div>
      <div className="sticky-apply"><button className="btn btn-primary" onClick={handleSave}>Apply Changes</button></div>
    </div>
  );
}

// ─── Torrent ───
function TorrentPage({ showToast }: { showToast: ToastFn }) {
  const [cfg, setCfg] = useState({ enabled: false, maxDownloadMbps: 50, maxUploadMbps: 10, maxConnections: 50 });

  useEffect(() => {
    fetch("/api/v1/torrent").then((r) => r.json()).then((d) => { if (d.config) setCfg((p) => ({ ...p, ...d.config })); }).catch(() => {});
  }, []);

  const handleSave = async () => {
    await fetch("/api/v1/torrent", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
    showToast("Torrent settings saved", "success");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Torrent Client (Simulation)</h1>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Torrent Settings</h2>
          <div className={`toggle-switch ${cfg.enabled ? "active" : ""}`} onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })} role="switch" aria-checked={cfg.enabled} tabIndex={0} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1">Max Download (Mbps)</label><input className="input-field" type="number" value={cfg.maxDownloadMbps} onChange={(e) => setCfg({ ...cfg, maxDownloadMbps: parseInt(e.target.value) || 0 })} /></div>
          <div><label className="block text-sm font-medium mb-1">Max Upload (Mbps)</label><input className="input-field" type="number" value={cfg.maxUploadMbps} onChange={(e) => setCfg({ ...cfg, maxUploadMbps: parseInt(e.target.value) || 0 })} /></div>
          <div><label className="block text-sm font-medium mb-1">Max Connections</label><input className="input-field" type="number" value={cfg.maxConnections} onChange={(e) => setCfg({ ...cfg, maxConnections: parseInt(e.target.value) || 0 })} /></div>
        </div>
      </div>
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">⬇️</div>
        <p style={{ color: "var(--text-muted)" }}>No active downloads (simulation)</p>
      </div>
      <div className="sticky-apply"><button className="btn btn-primary" onClick={handleSave}>Apply Changes</button></div>
    </div>
  );
}

// ─── System General ───
function SystemPage({ showToast }: { showToast: ToastFn }) {
  const [cfg, setCfg] = useState({ hostname: "linkage-router", timezone: "UTC", ntpServer: "pool.ntp.org", logLevel: "info" });

  useEffect(() => {
    fetch("/api/v1/system/config").then((r) => r.json()).then((d) => { if (d.system) setCfg((p) => ({ ...p, ...d.system })); }).catch(() => {});
  }, []);

  const handleSave = async () => {
    await fetch("/api/v1/system/config", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system: cfg }) });
    showToast("System settings saved", "success");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Settings</h1>
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Hostname</label><input className="input-field" value={cfg.hostname} onChange={(e) => setCfg({ ...cfg, hostname: e.target.value })} /><p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Letters, numbers, hyphens only (1–32)</p></div>
          <div><label className="block text-sm font-medium mb-1">Timezone</label>
            <select className="input-field" value={cfg.timezone} onChange={(e) => setCfg({ ...cfg, timezone: e.target.value })}>
              <option value="UTC">UTC</option><option value="Europe/Moscow">Europe/Moscow</option><option value="Europe/Berlin">Europe/Berlin</option>
              <option value="America/New_York">America/New_York</option><option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option><option value="Asia/Shanghai">Asia/Shanghai</option>
            </select></div>
          <div><label className="block text-sm font-medium mb-1">NTP Server</label><input className="input-field" value={cfg.ntpServer} onChange={(e) => setCfg({ ...cfg, ntpServer: e.target.value })} /></div>
          <div><label className="block text-sm font-medium mb-1">Log Level</label>
            <select className="input-field" value={cfg.logLevel} onChange={(e) => setCfg({ ...cfg, logLevel: e.target.value })}>
              <option value="error">Error</option><option value="warn">Warning</option><option value="info">Info</option><option value="debug">Debug</option>
            </select></div>
        </div>
      </div>
      <div className="sticky-apply"><button className="btn btn-primary" onClick={handleSave}>Apply Changes</button></div>
    </div>
  );
}

// ─── Password ───
function PasswordPage({ showToast }: { showToast: ToastFn }) {
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [conf, setConf] = useState("");

  const handleChange = async () => {
    if (pw.length < 8) { showToast("Password must be at least 8 characters", "error"); return; }
    if (pw !== conf) { showToast("Passwords do not match", "error"); return; }
    await fetch("/api/v1/system/security", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ adminPassword: pw }) });
    showToast("Password changed successfully", "success");
    setCur(""); setPw(""); setConf("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Change Password</h1>
      <div className="card p-5 max-w-md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Current Password</label><input className="input-field" type="password" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
          <div><label className="block text-sm font-medium mb-1">New Password</label><input className="input-field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /><p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Min 8 chars, letters + numbers</p></div>
          <div><label className="block text-sm font-medium mb-1">Confirm</label><input className="input-field" type="password" value={conf} onChange={(e) => setConf(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleChange}>Change Password</button>
        </div>
      </div>
    </div>
  );
}

// ─── Security ───
function SecurityPage({ showToast }: { showToast: ToastFn }) {
  const [cfg, setCfg] = useState({ twoFaEnabled: false, ipWhitelist: "", autoBackup: false, autoBackupInterval: "0 2 * * *" });

  useEffect(() => {
    fetch("/api/v1/system/security").then((r) => r.json()).then((d) => {
      setCfg((p) => ({ ...p, ...d, ipWhitelist: (d.ipWhitelist || []).join("\n") }));
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    await fetch("/api/v1/system/security", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ twoFaEnabled: cfg.twoFaEnabled, ipWhitelist: cfg.ipWhitelist.split("\n").map((s) => s.trim()).filter(Boolean), autoBackup: cfg.autoBackup, autoBackupInterval: cfg.autoBackupInterval }),
    });
    showToast("Security settings saved", "success");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Security Settings</h1>
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">Authentication</h2>
        <div className="flex items-center justify-between">
          <div><span className="text-sm font-medium">Two-Factor Authentication (2FA)</span><p className="text-xs" style={{ color: "var(--text-muted)" }}>Simulated OTP verification</p></div>
          <div className={`toggle-switch ${cfg.twoFaEnabled ? "active" : ""}`} onClick={() => setCfg({ ...cfg, twoFaEnabled: !cfg.twoFaEnabled })} role="switch" aria-checked={cfg.twoFaEnabled} tabIndex={0} />
        </div>
      </div>
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">IP Whitelist</h2>
        <label className="block text-sm font-medium mb-1">Allowed CIDRs (one per line)</label>
        <textarea className="input-field" rows={4} value={cfg.ipWhitelist} onChange={(e) => setCfg({ ...cfg, ipWhitelist: e.target.value })} placeholder="192.168.1.0/24&#10;10.0.0.0/8" />
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Leave empty to allow all IPs</p>
      </div>
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">Auto Backup</h2>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Automatic Configuration Backup</span>
          <div className={`toggle-switch ${cfg.autoBackup ? "active" : ""}`} onClick={() => setCfg({ ...cfg, autoBackup: !cfg.autoBackup })} role="switch" aria-checked={cfg.autoBackup} tabIndex={0} />
        </div>
        {cfg.autoBackup && <div><label className="block text-sm font-medium mb-1">Cron Schedule</label><input className="input-field" value={cfg.autoBackupInterval} onChange={(e) => setCfg({ ...cfg, autoBackupInterval: e.target.value })} /></div>}
      </div>
      <div className="sticky-apply"><button className="btn btn-primary" onClick={handleSave}>Apply Changes</button></div>
    </div>
  );
}

// ─── Personalization (WITH WALLPAPERS) ───
function PersonalizationPage({ theme, onThemeChange, showToast }: { theme: string; onThemeChange: (t: string) => void; showToast: ToastFn }) {
  const [lang, setLang] = useState("en");
  const [volume, setVolume] = useState(30);
  const [wallpaper, setWallpaper] = useState("default");
  const [customUrl, setCustomUrl] = useState("");

  useEffect(() => {
    fetch("/api/v1/ui").then((r) => r.json()).then((d) => {
      if (d.uiLanguage) setLang(d.uiLanguage);
      if (d.uiSoundVolume !== undefined) setVolume(d.uiSoundVolume);
      if (d.uiWallpaper) {
        const preset = WALLPAPER_PRESETS.find((p) => p.css === d.uiWallpaper || p.id === d.uiWallpaper);
        if (preset) setWallpaper(preset.id);
        else { setWallpaper("custom"); setCustomUrl(d.uiWallpaper); }
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    const wpValue = wallpaper === "default" ? null : wallpaper === "custom" ? customUrl : WALLPAPER_PRESETS.find((p) => p.id === wallpaper)?.css || null;
    await fetch("/api/v1/ui", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uiLanguage: lang, uiTheme: theme, uiSoundVolume: volume, uiWallpaper: wpValue }),
    });
    // Apply wallpaper to background immediately
    const appBg = document.getElementById("app-bg");
    if (appBg) {
      if (wpValue && wpValue !== "none") {
        appBg.style.background = wpValue.startsWith("http") || wpValue.startsWith("/") ? `url(${wpValue}) center/cover no-repeat` : wpValue;
      } else {
        appBg.style.background = "";
      }
    }
    showToast("Personalization saved", "success");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Personalization</h1>
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">Appearance</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <div className="flex gap-3 flex-wrap">
              {["light", "dark", "auto"].map((t) => (
                <button key={t} className={`btn ${theme === t ? "btn-primary" : "btn-secondary"} capitalize`} onClick={() => onThemeChange(t)}>
                  {t === "light" ? "☀️" : t === "dark" ? "🌙" : "🔄"} {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select className="input-field max-w-xs" value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="en">English</option><option value="ru">Русский</option><option value="de">Deutsch</option><option value="es">Español</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">UI Sound Volume: {volume}%</label>
            <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(parseInt(e.target.value))} className="w-full max-w-xs accent-[var(--accent)]" />
          </div>
        </div>
      </div>
      <div className="card p-5">
        <h2 className="text-lg font-semibold mb-4">🖼️ Background Wallpaper</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {WALLPAPER_PRESETS.map((wp) => (
            <button
              key={wp.id}
              className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-video ${wallpaper === wp.id ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30" : "border-transparent hover:border-[var(--border)]"}`}
              onClick={() => setWallpaper(wp.id)}
            >
              {wp.id === "custom" ? (
                <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: "var(--bg)" }}>📎</div>
              ) : wp.id === "default" ? (
                <div className="w-full h-full flex items-center justify-center text-xs font-medium" style={{ background: "#F5F7FA", color: "#6B7280" }}>Default</div>
              ) : (
                <div className="w-full h-full" style={{ background: wp.css }} />
              )}
              <div className="absolute bottom-0 left-0 right-0 text-[10px] text-center py-0.5 bg-black/50 text-white">{wp.label}</div>
            </button>
          ))}
        </div>
        {wallpaper === "custom" && (
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Image URL</label>
            <input className="input-field" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://example.com/wallpaper.jpg" />
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Enter a direct image URL (jpg, png, webp)</p>
          </div>
        )}
        {wallpaper !== "custom" && wallpaper !== "default" && (
          <div className="mt-4 rounded-lg overflow-hidden h-32" style={{ background: WALLPAPER_PRESETS.find((p) => p.id === wallpaper)?.css }} />
        )}
      </div>
      <div className="sticky-apply"><button className="btn btn-primary" onClick={handleSave}>Apply Changes</button></div>
    </div>
  );
}

// ─── Update ───
function UpdatePage({ showToast }: { showToast: ToastFn }) {
  const [checking, setChecking] = useState(false);
  const handleCheck = () => {
    setChecking(true);
    setTimeout(() => { setChecking(false); showToast("System is up to date — version 1.0.0", "success"); }, 2000);
  };
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Update</h1>
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="badge badge-success">Up to date</span>
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>Current version: 1.0.0</span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>This is a simulated update checker.</p>
        <button className="btn btn-secondary mt-4" onClick={handleCheck} disabled={checking}>
          {checking ? "⏳ Checking..." : "🔄 Check for Updates"}
        </button>
      </div>
    </div>
  );
}

// ─── Backup ───
function BackupPage({ showToast }: { showToast: ToastFn }) {
  const [snapshots, setSnapshots] = useState<Array<{ id: number; name: string; description: string; createdAt: string; configData: unknown }>>([]);
  const [importing, setImporting] = useState(false);

  const load = () => {
    fetch("/api/v1/backup").then((r) => r.json()).then((d) => { if (d.snapshots) setSnapshots(d.snapshots); }).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const createSnapshot = async () => {
    await fetch("/api/v1/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: `backup-${new Date().toISOString().slice(0, 10)}`, description: "Manual snapshot" }) });
    load();
    showToast("Snapshot created", "success");
  };

  const restoreSnapshot = async (id: number) => {
    await fetch("/api/v1/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "restore", snapshotId: id }) });
    showToast("Restore initiated (simulated)", "info");
  };

  const deleteSnapshot = async (id: number) => {
    await fetch("/api/v1/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", snapshotId: id }) });
    load();
    showToast("Snapshot deleted", "info");
  };

  const handleExport = (snapshot: typeof snapshots[0]) => {
    const blob = new Blob([JSON.stringify(snapshot.configData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${snapshot.name}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast("Config exported", "success");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json,.yaml,.yml";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      const text = await file.text();
      try {
        JSON.parse(text); // Validate JSON
        await fetch("/api/v1/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: `import-${file.name}`, description: "Imported config", configData: JSON.parse(text) }) });
        load();
        showToast("Config imported successfully", "success");
      } catch { showToast("Invalid config file", "error"); }
      setImporting(false);
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Backup & Restore</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={createSnapshot}>💾 Create Snapshot</button>
          <button className="btn btn-primary" onClick={handleImport} disabled={importing}>{importing ? "⏳ Importing..." : "📥 Import Config"}</button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="px-5 pt-5 pb-3"><h2 className="text-lg font-semibold">Snapshots</h2></div>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Description</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>{snapshots.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-8" style={{ color: "var(--text-muted)" }}>No snapshots yet</td></tr>
          ) : snapshots.map((s) => (
            <tr key={s.id}>
              <td className="font-medium">{s.name}</td>
              <td className="text-sm">{s.description || "—"}</td>
              <td className="text-sm">{new Date(s.createdAt).toLocaleString()}</td>
              <td>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn btn-secondary text-xs" onClick={() => restoreSnapshot(s.id)}>Restore</button>
                  <button className="btn btn-secondary text-xs" onClick={() => handleExport(s)}>📥 Export</button>
                  <button className="text-red-500 hover:text-red-700 text-sm" onClick={() => deleteSnapshot(s.id)}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Logs ───
function LogsPage({ showToast }: { showToast: ToastFn }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState("");

  useEffect(() => {
    const url = levelFilter ? `/api/v1/logs?level=${levelFilter}` : "/api/v1/logs";
    fetch(url).then((r) => r.json()).then((d) => { if (d.logs) setLogs(d.logs); }).catch(() => {});
  }, [levelFilter]);

  const handleExport = () => {
    const csv = "timestamp,level,source,message\n" + logs.map((l) => `${l.timestamp},${l.level},${l.source},"${l.message}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "linkage-logs.csv"; a.click();
    URL.revokeObjectURL(url);
    showToast("Logs exported", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">System Logs</h1>
        <div className="flex gap-2 items-center">
          <select className="input-field w-32 text-sm" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
            <option value="">All Levels</option><option value="error">Error</option><option value="warn">Warning</option><option value="info">Info</option>
          </select>
          <button className="btn btn-secondary text-sm" onClick={handleExport}>📥 Export CSV</button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead><tr><th>Timestamp</th><th>Level</th><th>Source</th><th>Message</th></tr></thead>
          <tbody>{logs.map((l) => (
            <tr key={l.id}>
              <td className="font-mono text-xs whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
              <td><span className={`badge ${l.level === "error" ? "badge-error" : l.level === "warn" ? "badge-warning" : "badge-info"}`}>{l.level}</span></td>
              <td className="capitalize text-sm">{l.source}</td>
              <td className="text-sm">{l.message}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Diagnostics ───
function DiagnosticsPage() {
  const [target, setTarget] = useState("8.8.8.8");
  const [pingResult, setPingResult] = useState<{ results: Array<{ seq: number; time: number; status: string }>; summary: { transmitted: number; received: number; loss: number; avgRtt: number } } | null>(null);
  const [traceResult, setTraceResult] = useState<{ hops: Array<{ hop: number; ip: string; hostname: string; rtt1: number; rtt2: number; rtt3: number }> } | null>(null);
  const [speedResult, setSpeedResult] = useState<{ downloadMbps: number; uploadMbps: number; pingMs: number; jitterMs: number } | null>(null);
  const [arpTable, setArpTable] = useState<Array<{ ip: string; mac: string; interface: string; type: string; age: number }>>([]);
  const [tab, setTab] = useState<"ping" | "traceroute" | "speedtest" | "tables">("ping");

  const post = (action: string, extra: Record<string, unknown> = {}) =>
    fetch("/api/v1/diagnostics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) }).then((r) => r.json());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Diagnostics</h1>
      <div className="flex gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        {(["ping", "traceroute", "speedtest", "tables"] as const).map((t) => (
          <button key={t} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? "border-[var(--accent)] text-[var(--accent)]" : "border-transparent"}`}
            style={{ color: tab === t ? undefined : "var(--text-muted)" }}
            onClick={() => { setTab(t); if (t === "tables") post("arp").then((d) => setArpTable(d.entries || [])); }}>
            {t === "speedtest" ? "Speed Test" : t}
          </button>
        ))}
      </div>
      {tab === "ping" && (
        <div className="card p-5">
          <div className="flex gap-3 mb-4">
            <input className="input-field" placeholder="Target host or IP" value={target} onChange={(e) => setTarget(e.target.value)} />
            <button className="btn btn-primary" onClick={() => post("ping", { target }).then(setPingResult)}>Ping</button>
          </div>
          {pingResult && (<div className="space-y-2">
            {pingResult.results.map((r) => <div key={r.seq} className="font-mono text-sm">{r.status === "ok" ? `Reply from ${target}: icmp_seq=${r.seq} time=${r.time}ms` : `Request timeout icmp_seq=${r.seq}`}</div>)}
            <div className="font-mono text-sm font-semibold mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              {pingResult.summary.transmitted} sent, {pingResult.summary.received} received, {pingResult.summary.loss}% loss, avg {pingResult.summary.avgRtt}ms
            </div>
          </div>)}
        </div>
      )}
      {tab === "traceroute" && (
        <div className="card p-5">
          <div className="flex gap-3 mb-4">
            <input className="input-field" placeholder="Target" value={target} onChange={(e) => setTarget(e.target.value)} />
            <button className="btn btn-primary" onClick={() => post("traceroute", { target }).then(setTraceResult)}>Traceroute</button>
          </div>
          {traceResult && (<table className="data-table">
            <thead><tr><th>Hop</th><th>IP</th><th>Hostname</th><th>RTT 1</th><th>RTT 2</th><th>RTT 3</th></tr></thead>
            <tbody>{traceResult.hops.map((h) => <tr key={h.hop}><td>{h.hop}</td><td className="font-mono text-sm">{h.ip}</td><td className="text-sm">{h.hostname}</td><td className="font-mono text-sm">{h.rtt1}ms</td><td className="font-mono text-sm">{h.rtt2}ms</td><td className="font-mono text-sm">{h.rtt3}ms</td></tr>)}</tbody>
          </table>)}
        </div>
      )}
      {tab === "speedtest" && (
        <div className="card p-5">
          <button className="btn btn-primary mb-4" onClick={() => post("speedtest").then(setSpeedResult)}>Run Speed Test</button>
          {speedResult && (<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[{ l: "Download", v: speedResult.downloadMbps, u: "Mbps", c: "text-[var(--accent)]" }, { l: "Upload", v: speedResult.uploadMbps, u: "Mbps", c: "text-emerald-500" }, { l: "Ping", v: speedResult.pingMs, u: "ms", c: "text-amber-500" }, { l: "Jitter", v: speedResult.jitterMs, u: "ms", c: "text-purple-500" }].map((s) => (
              <div key={s.l} className="card p-4 text-center" style={{ background: "var(--bg)" }}>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.l}</div>
                <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.u}</div>
              </div>
            ))}
          </div>)}
        </div>
      )}
      {tab === "tables" && (
        <div className="card overflow-hidden">
          <div className="px-5 pt-5 pb-3"><h2 className="text-lg font-semibold">ARP Table</h2></div>
          <table className="data-table">
            <thead><tr><th>IP</th><th>MAC</th><th>Interface</th><th>Type</th><th>Age</th></tr></thead>
            <tbody>{arpTable.map((e, i) => <tr key={i}><td className="font-mono text-sm">{e.ip}</td><td className="font-mono text-sm">{e.mac}</td><td>{e.interface}</td><td><span className={`badge ${e.type === "static" ? "badge-info" : "badge-success"}`}>{e.type}</span></td><td className="font-mono text-sm">{e.age}s</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── MAIN APP ───
// ═══════════════════════════════════════════════════════════════
export default function LinkageApp() {
  const [page, setPage] = useState<Page>("dashboard");
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState("light");
  const [wallpaperCss, setWallpaperCss] = useState("");
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" }>>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const tid = useRef(0);

  // Theme + wallpaper
  useEffect(() => {
    const saved = localStorage.getItem("linkage_theme") || "light";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
    const wp = localStorage.getItem("linkage_wallpaper") || "";
    setWallpaperCss(wp);
  }, []);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("linkage_theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, [theme]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info") => {
    const id = ++tid.current;
    setToasts((p) => [...p, { id, message, type }]);
  }, []);
  const removeToast = useCallback((id: number) => { setToasts((p) => p.filter((t) => t.id !== id)); }, []);

  // Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/v1/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: loginUser, password: loginPass }) });
      const data = await res.json();
      if (res.ok) { setIsLoggedIn(true); localStorage.setItem("linkage_user", JSON.stringify(data.user)); }
      else setLoginError(data.error || "Login failed");
    } catch { setLoginError("Connection error"); }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("linkage_user");
    fetch("/api/v1/auth", { method: "DELETE" });
    setLoginUser(""); setLoginPass("");
    showToast("Signed out", "info");
  };

  useEffect(() => { if (localStorage.getItem("linkage_user")) setIsLoggedIn(true); }, []);

  // Data loading
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch("/api/v1/system/status").then((r) => r.json()).then(setMetrics).catch(() => {});
    const t = setTimeout(() => {
      fetch("/api/v1/logs?limit=20").then((r) => r.json()).then((d) => { if (d.logs) setLogs(d.logs); }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [isLoggedIn]);

  // SSE
  useEffect(() => {
    if (!isLoggedIn) return;
    const es = new EventSource("/api/v1/live");
    es.onmessage = (ev) => { try { const { data } = JSON.parse(ev.data); if (data) setMetrics(data); } catch {} };
    es.onerror = () => es.close();
    return () => es.close();
  }, [isLoggedIn]);

  const handleReboot = async () => {
    showToast("System reboot initiated (simulated)", "info");
    await fetch("/api/v1/system/reboot", { method: "POST" });
  };

  // ─── Login Screen ───
  if (!isLoggedIn) return (
    <div className="login-container">
      <div className="login-card">
        <div className="text-center mb-6">
          <div className="text-[var(--accent)] inline-block mb-3"><LinkageLogo /></div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Software Framework Imitation Device</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Username</label><input className="input-field" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} placeholder="admin" autoFocus /></div>
          <div><label className="block text-sm font-medium mb-1">Password</label><input className="input-field" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="admin123" /></div>
          {loginError && <p className="text-sm text-red-500">{loginError}</p>}
          <button type="submit" className="btn btn-primary w-full">Sign In</button>
          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>Demo: admin / admin123 or viewer / viewer123</p>
        </form>
      </div>
    </div>
  );

  // ─── Main App ───
  const ts: ToastFn = showToast;
  const renderPage = () => {
    switch (page) {
      case "dashboard": return <DashboardPage metrics={metrics} logs={logs} />;
      case "interfaces": return <InterfacesPage metrics={metrics} showToast={ts} />;
      case "dhcp": return <DhcpPage showToast={ts} />;
      case "firewall": return <FirewallPage showToast={ts} />;
      case "wifi24": return <WifiPage band="2.4g" showToast={ts} />;
      case "wifi5": return <WifiPage band="5g" showToast={ts} />;
      case "guest": return <GuestPage showToast={ts} />;
      case "vpn": return <VpnPage showToast={ts} />;
      case "adblock": return <AdblockPage showToast={ts} />;
      case "torrent": return <TorrentPage showToast={ts} />;
      case "system": return <SystemPage showToast={ts} />;
      case "password": return <PasswordPage showToast={ts} />;
      case "security": return <SecurityPage showToast={ts} />;
      case "personalization": return <PersonalizationPage theme={theme} onThemeChange={(t) => { setTheme(t); localStorage.setItem("linkage_theme", t); document.documentElement.classList.toggle("dark", t === "dark"); }} showToast={ts} />;
      case "update": return <UpdatePage showToast={ts} />;
      case "backup": return <BackupPage showToast={ts} />;
      case "logs": return <LogsPage showToast={ts} />;
      case "diagnostics": return <DiagnosticsPage />;
      default: return <DashboardPage metrics={metrics} logs={logs} />;
    }
  };

  return (
    <div className="min-h-screen" id="app-bg" style={wallpaperCss ? { background: wallpaperCss.startsWith("url") ? wallpaperCss : wallpaperCss, backgroundSize: "cover", backgroundAttachment: "fixed" } : undefined}>
      <Header metrics={metrics} onReboot={handleReboot} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} theme={theme} onToggleTheme={toggleTheme} onLogout={handleLogout} />
      <Sidebar currentPage={page} onNavigate={(p) => { setPage(p); setSearchQuery(""); }} collapsed={!sidebarOpen} searchQuery={searchQuery} onSearchChange={setSearchQuery} onCollapse={() => setSidebarOpen(true)} />
      <main className="pt-[var(--header-height)] min-h-screen transition-all duration-200" style={{ marginLeft: sidebarOpen ? "var(--sidebar-width)" : 0 }} role="main">
        <div className="p-4 sm:p-6 max-w-[1400px]">{renderPage()}</div>
      </main>
      <div className="fixed bottom-4 right-4 z-[100] space-y-2" id="app-toast">
        {toasts.map((t) => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
      </div>
    </div>
  );
}
