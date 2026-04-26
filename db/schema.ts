import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  varchar,
  serial,
  index,
} from "drizzle-orm/pg-core";

/* ── System config (25 settings stored as JSON + key fields) ── */
export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  hostname: varchar("hostname", { length: 32 }).notNull().default("linkage-router"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("UTC"),
  ntpServer: text("ntp_server").notNull().default("pool.ntp.org"),
  logLevel: varchar("log_level", { length: 16 }).notNull().default("info"),
  adminPassword: text("admin_password").notNull().default("$2b$10$placeholder"),
  twoFaEnabled: boolean("two_fa_enabled").notNull().default(false),
  twoFaSecret: text("two_fa_secret"),
  uiLanguage: varchar("ui_language", { length: 8 }).notNull().default("en"),
  uiTheme: varchar("ui_theme", { length: 16 }).notNull().default("auto"),
  uiSoundVolume: integer("ui_sound_volume").notNull().default(30),
  uiWallpaper: text("ui_wallpaper"),
  ipWhitelist: jsonb("ip_whitelist").$type<string[]>().default([]),
  autoBackup: boolean("auto_backup").notNull().default(false),
  autoBackupInterval: varchar("auto_backup_interval", { length: 32 }).default("0 2 * * *"),
  schemaVersion: integer("schema_version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Network Interfaces ── */
export const interfaces = pgTable("interfaces", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 32 }).notNull().unique(),
  type: varchar("type", { length: 16 }).notNull().default("ethernet"), // ethernet, wifi, vlan, loopback
  role: varchar("role", { length: 8 }).notNull().default("lan"), // wan, lan
  mode: varchar("mode", { length: 16 }).notNull().default("dhcp"), // static, dhcp, pppoe
  ipAddress: varchar("ip_address", { length: 45 }),
  netmask: varchar("netmask", { length: 45 }),
  gateway: varchar("gateway", { length: 45 }),
  macAddress: varchar("mac_address", { length: 17 }).notNull(),
  mtu: integer("mtu").notNull().default(1500),
  enabled: boolean("enabled").notNull().default(true),
  status: varchar("status", { length: 16 }).notNull().default("up"), // up, down
  rxBytes: integer("rx_bytes").notNull().default(0),
  txBytes: integer("tx_bytes").notNull().default(0),
  rxPackets: integer("rx_packets").notNull().default(0),
  txPackets: integer("tx_packets").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Static Routes ── */
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  destination: varchar("destination", { length: 45 }).notNull(),
  prefix: integer("prefix").notNull().default(24),
  gateway: varchar("gateway", { length: 45 }),
  interfaceName: varchar("interface_name", { length: 32 }),
  metric: integer("metric").notNull().default(1),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── DHCP ── */
export const dhcpConfig = pgTable("dhcp_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  interfaceName: varchar("interface_name", { length: 32 }).notNull().default("eth1"),
  poolStart: varchar("pool_start", { length: 45 }).notNull().default("192.168.1.100"),
  poolEnd: varchar("pool_end", { length: 45 }).notNull().default("192.168.1.199"),
  leaseTime: varchar("lease_time", { length: 16 }).notNull().default("24h"),
  dnsServers: jsonb("dns_servers").$type<string[]>().default(["1.1.1.1", "8.8.8.8"]),
  gateway: varchar("gateway", { length: 45 }).default("192.168.1.1"),
  domain: varchar("domain", { length: 64 }).default("local"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── DHCP Leases ── */
export const dhcpLeases = pgTable("dhcp_leases", {
  id: serial("id").primaryKey(),
  macAddress: varchar("mac_address", { length: 17 }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }).notNull(),
  hostname: varchar("hostname", { length: 64 }),
  leaseExpiry: timestamp("lease_expiry", { withTimezone: true }),
  isReserved: boolean("is_reserved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── DNS Config ── */
export const dnsConfig = pgTable("dns_config", {
  id: serial("id").primaryKey(),
  upstreamServers: jsonb("upstream_servers").$type<string[]>().default(["1.1.1.1", "8.8.8.8"]),
  cacheEnabled: boolean("cache_enabled").notNull().default(true),
  cacheSize: integer("cache_size").notNull().default(1000),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Static DNS Records ── */
export const dnsRecords = pgTable("dns_records", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  type: varchar("type", { length: 8 }).notNull().default("A"), // A, AAAA, CNAME
  value: varchar("value", { length: 256 }).notNull(),
  ttl: integer("ttl").notNull().default(3600),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── NAT Config ── */
export const natConfig = pgTable("nat_config", {
  id: serial("id").primaryKey(),
  masqueradeEnabled: boolean("masquerade_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Port Forwarding Rules ── */
export const portForwardRules = pgTable("port_forward_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }),
  protocol: varchar("protocol", { length: 8 }).notNull().default("tcp"),
  externalPort: integer("external_port").notNull(),
  internalIp: varchar("internal_ip", { length: 45 }).notNull(),
  internalPort: integer("internal_port").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Firewall Rules ── */
export const firewallRules = pgTable("firewall_rules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }),
  order: integer("order").notNull().default(0),
  sourceZone: varchar("source_zone", { length: 16 }).notNull().default("any"),
  destZone: varchar("dest_zone", { length: 16 }).notNull().default("any"),
  sourceAddress: varchar("source_address", { length: 45 }),
  destAddress: varchar("dest_address", { length: 45 }),
  protocol: varchar("protocol", { length: 8 }).notNull().default("any"),
  destPort: varchar("dest_port", { length: 32 }),
  action: varchar("action", { length: 16 }).notNull().default("deny"), // allow, deny, reject
  logging: boolean("logging").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  temporary: boolean("temporary").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Firewall Defaults ── */
export const firewallDefaults = pgTable("firewall_defaults", {
  id: serial("id").primaryKey(),
  wanDefaultPolicy: varchar("wan_default_policy", { length: 16 }).notNull().default("deny"),
  lanDefaultPolicy: varchar("lan_default_policy", { length: 16 }).notNull().default("allow"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── QoS Config ── */
export const qosConfig = pgTable("qos_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  downloadMbps: integer("download_mbps").notNull().default(100),
  uploadMbps: integer("upload_mbps").notNull().default(100),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── WiFi Config ── */
export const wifiConfig = pgTable("wifi_config", {
  id: serial("id").primaryKey(),
  band: varchar("band", { length: 8 }).notNull(), // 2.4g, 5g
  enabled: boolean("enabled").notNull().default(true),
  ssid: varchar("ssid", { length: 32 }).notNull().default("Linkage"),
  password: varchar("password", { length: 64 }),
  channel: integer("channel").notNull().default(6),
  channelWidth: varchar("channel_width", { length: 8 }).notNull().default("20"),
  security: varchar("security", { length: 16 }).notNull().default("wpa2"),
  hiddenSsid: boolean("hidden_ssid").notNull().default(false),
  schedule: jsonb("schedule"),
  clientCount: integer("client_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Guest WiFi Config ── */
export const guestWifiConfig = pgTable("guest_wifi_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  ssid: varchar("ssid", { length: 32 }).notNull().default("Linkage-Guest"),
  password: varchar("password", { length: 64 }),
  isolation: boolean("isolation").notNull().default(true),
  speedLimitMbps: integer("speed_limit_mbps").notNull().default(10),
  lanAccess: boolean("lan_access").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── VPN Profiles ── */
export const vpnProfiles = pgTable("vpn_profiles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  type: varchar("type", { length: 16 }).notNull().default("openvpn"), // openvpn, ipsec, wireguard
  server: varchar("server", { length: 256 }),
  port: integer("port"),
  username: varchar("username", { length: 64 }),
  password: text("password"),
  privateKey: text("private_key"),
  publicKey: text("public_key"),
  status: varchar("status", { length: 16 }).notNull().default("disconnected"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── AdBlock Config ── */
export const adblockConfig = pgTable("adblock_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  blocklists: jsonb("blocklists").$type<string[]>().default([
    "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
  ]),
  blockedCount: integer("blocked_count").notNull().default(0),
  allowedDomains: jsonb("allowed_domains").$type<string[]>().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Torrent Config ── */
export const torrentConfig = pgTable("torrent_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  downloadPath: varchar("download_path", { length: 256 }).default("/downloads"),
  maxDownloadMbps: integer("max_download_mbps").notNull().default(50),
  maxUploadMbps: integer("max_upload_mbps").notNull().default(10),
  maxConnections: integer("max_connections").notNull().default(50),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Torrent Downloads (simulated) ── */
export const torrentDownloads = pgTable("torrent_downloads", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  downloadedBytes: integer("downloaded_bytes").notNull().default(0),
  status: varchar("status", { length: 16 }).notNull().default("queued"),
  progress: real("progress").notNull().default(0),
  downloadSpeed: integer("download_speed").notNull().default(0),
  uploadSpeed: integer("upload_speed").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── System Logs ── */
export const systemLogs = pgTable(
  "system_logs",
  {
    id: serial("id").primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    level: varchar("level", { length: 8 }).notNull().default("info"),
    source: varchar("source", { length: 32 }).notNull().default("system"),
    message: text("message").notNull(),
    details: jsonb("details"),
  },
  (table) => [index("logs_timestamp_idx").on(table.timestamp)],
);

/* ── Audit Log ── */
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    user: varchar("user", { length: 64 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    target: varchar("target", { length: 128 }),
    details: jsonb("details"),
    ipAddress: varchar("ip_address", { length: 45 }),
  },
  (table) => [index("audit_timestamp_idx").on(table.timestamp)],
);

/* ── Snapshots / Backups ── */
export const snapshots = pgTable("snapshots", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  configData: jsonb("config_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Playbooks ── */
export const playbooks = pgTable("playbooks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  yaml: text("yaml").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  lastRun: timestamp("last_run", { withTimezone: true }),
  status: varchar("status", { length: 16 }).default("idle"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Sessions (for auth) ── */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: varchar("user_id", { length: 64 }).notNull().default("admin"),
  role: varchar("role", { length: 16 }).notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
