/* ─────────────────────────────────────────────────────────────
   SFID Simulation Engine
   Deterministic virtual router: interfaces, routing, NAT, DHCP,
   DNS, firewall, QoS, Wi-Fi, VPN, AdBlock, Torrent emulation.
   ───────────────────────────────────────────────────────────── */

export interface SimMetrics {
  cpu: number;
  ram: number;
  uptime: number; // seconds
  uptimeFormatted: string;
  temperature: number;
  totalRxBytes: number;
  totalTxBytes: number;
  totalRxPackets: number;
  totalTxPackets: number;
  activeConnections: number;
  dhcpLeases: number;
  dnsQueries: number;
  firewallHits: number;
  adblockBlocked: number;
  timestamp: number;
}

export interface SimInterface {
  name: string;
  type: "ethernet" | "wifi" | "vlan" | "loopback";
  role: "wan" | "lan";
  status: "up" | "down";
  ipAddress: string;
  netmask: string;
  macAddress: string;
  mtu: number;
  rxBytesPerSec: number;
  txBytesPerSec: number;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  sparkline: number[];
}

export interface SimArpEntry {
  ip: string;
  mac: string;
  interface: string;
  type: "dynamic" | "static";
  age: number;
}

export interface SimRouteEntry {
  destination: string;
  gateway: string;
  interface: string;
  metric: number;
  type: "connected" | "static" | "default";
}

export interface SimNatEntry {
  protocol: string;
  srcIp: string;
  srcPort: number;
  natIp: string;
  natPort: number;
  dstIp: string;
  dstPort: number;
  state: string;
  bytes: number;
}

const startTime = Date.now();

// Deterministic pseudo-random based on seed
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

let sparklineSeed = 42;
const sparklineData: Record<string, number[]> = {
  eth0: [],
  eth1: [],
  wlan0: [],
};

function getSparkline(key: string, maxPoints = 60): number[] {
  if (sparklineData[key].length === 0) {
    const rng = seededRandom(sparklineSeed + key.charCodeAt(0));
    for (let i = 0; i < maxPoints; i++) {
      sparklineData[key].push(Math.round(rng() * 100));
    }
  }
  // Shift and add new point
  const rng = seededRandom(Date.now() / 10000 + key.charCodeAt(0));
  sparklineData[key].push(Math.round(rng() * 100));
  if (sparklineData[key].length > maxPoints) {
    sparklineData[key].shift();
  }
  return [...sparklineData[key]];
}

export function getSimulatedMetrics(): SimMetrics {
  const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
  const days = Math.floor(uptimeSec / 86400);
  const hours = Math.floor((uptimeSec % 86400) / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);

  const rng = seededRandom(Math.floor(Date.now() / 5000));
  const cpu = Math.round(8 + rng() * 25);
  const ram = Math.round(35 + rng() * 20);

  return {
    cpu,
    ram,
    uptime: uptimeSec,
    uptimeFormatted: `${days}d ${hours}h ${minutes}m`,
    temperature: Math.round(42 + rng() * 15),
    totalRxBytes: Math.floor(rng() * 100000000),
    totalTxBytes: Math.floor(rng() * 50000000),
    totalRxPackets: Math.floor(rng() * 500000),
    totalTxPackets: Math.floor(rng() * 300000),
    activeConnections: Math.floor(5 + rng() * 50),
    dhcpLeases: Math.floor(3 + rng() * 15),
    dnsQueries: Math.floor(100 + rng() * 900),
    firewallHits: Math.floor(rng() * 20),
    adblockBlocked: Math.floor(rng() * 500),
    timestamp: Date.now(),
  };
}

const defaultInterfaces: SimInterface[] = [
  {
    name: "eth0",
    type: "ethernet",
    role: "wan",
    status: "up",
    ipAddress: "203.0.113.10",
    netmask: "255.255.255.0",
    macAddress: "00:1A:2B:3C:4D:00",
    mtu: 1500,
    rxBytesPerSec: 0,
    txBytesPerSec: 0,
    rxBytes: 0,
    txBytes: 0,
    rxPackets: 0,
    txPackets: 0,
    sparkline: [],
  },
  {
    name: "eth1",
    type: "ethernet",
    role: "lan",
    status: "up",
    ipAddress: "192.168.1.1",
    netmask: "255.255.255.0",
    macAddress: "00:1A:2B:3C:4D:01",
    mtu: 1500,
    rxBytesPerSec: 0,
    txBytesPerSec: 0,
    rxBytes: 0,
    txBytes: 0,
    rxPackets: 0,
    txPackets: 0,
    sparkline: [],
  },
  {
    name: "wlan0",
    type: "wifi",
    role: "lan",
    status: "up",
    ipAddress: "192.168.1.1",
    netmask: "255.255.255.0",
    macAddress: "00:1A:2B:3C:4D:02",
    mtu: 1500,
    rxBytesPerSec: 0,
    txBytesPerSec: 0,
    rxBytes: 0,
    txBytes: 0,
    rxPackets: 0,
    txPackets: 0,
    sparkline: [],
  },
];

export function getSimulatedInterfaces(): SimInterface[] {
  const rng = seededRandom(Math.floor(Date.now() / 3000));
  return defaultInterfaces.map((iface) => ({
    ...iface,
    rxBytesPerSec: Math.floor(rng() * 500000),
    txBytesPerSec: Math.floor(rng() * 200000),
    rxBytes: Math.floor(rng() * 10000000),
    txBytes: Math.floor(rng() * 5000000),
    rxPackets: Math.floor(rng() * 100000),
    txPackets: Math.floor(rng() * 50000),
    sparkline: getSparkline(iface.name),
  }));
}

export function getSimulatedArpTable(): SimArpEntry[] {
  const rng = seededRandom(Math.floor(Date.now() / 10000));
  const entries: SimArpEntry[] = [
    { ip: "192.168.1.1", mac: "00:1A:2B:3C:4D:01", interface: "eth1", type: "static", age: 0 },
    { ip: "192.168.1.100", mac: "AA:BB:CC:DD:EE:01", interface: "eth1", type: "dynamic", age: Math.floor(rng() * 300) },
    { ip: "192.168.1.101", mac: "AA:BB:CC:DD:EE:02", interface: "wlan0", type: "dynamic", age: Math.floor(rng() * 200) },
    { ip: "192.168.1.102", mac: "AA:BB:CC:DD:EE:03", interface: "eth1", type: "dynamic", age: Math.floor(rng() * 150) },
    { ip: "203.0.113.1", mac: "00:FF:11:22:33:44", interface: "eth0", type: "dynamic", age: Math.floor(rng() * 60) },
  ];
  return entries;
}

export function getSimulatedRouteTable(): SimRouteEntry[] {
  return [
    { destination: "192.168.1.0/24", gateway: "0.0.0.0", interface: "eth1", metric: 0, type: "connected" },
    { destination: "203.0.113.0/24", gateway: "0.0.0.0", interface: "eth0", metric: 0, type: "connected" },
    { destination: "0.0.0.0/0", gateway: "203.0.113.1", interface: "eth0", metric: 1, type: "default" },
  ];
}

export function getSimulatedNatTable(): SimNatEntry[] {
  const rng = seededRandom(Math.floor(Date.now() / 8000));
  return [
    {
      protocol: "tcp",
      srcIp: "192.168.1.100",
      srcPort: 52341,
      natIp: "203.0.113.10",
      natPort: 40001,
      dstIp: "93.184.216.34",
      dstPort: 443,
      state: "ESTABLISHED",
      bytes: Math.floor(rng() * 1000000),
    },
    {
      protocol: "udp",
      srcIp: "192.168.1.101",
      srcPort: 60123,
      natIp: "203.0.113.10",
      natPort: 40002,
      dstIp: "1.1.1.1",
      dstPort: 53,
      state: "UDP",
      bytes: Math.floor(rng() * 50000),
    },
    {
      protocol: "tcp",
      srcIp: "192.168.1.102",
      srcPort: 55432,
      natIp: "203.0.113.10",
      natPort: 40003,
      dstIp: "142.250.80.46",
      dstPort: 80,
      state: "ESTABLISHED",
      bytes: Math.floor(rng() * 500000),
    },
  ];
}

export function getSimulatedDhcpLeases() {
  const rng = seededRandom(Math.floor(Date.now() / 15000));
  const now = Date.now();
  return [
    { mac: "AA:BB:CC:DD:EE:01", ip: "192.168.1.100", hostname: "laptop-john", expiry: new Date(now + 43200000).toISOString(), reserved: false },
    { mac: "AA:BB:CC:DD:EE:02", ip: "192.168.1.101", hostname: "iphone-sarah", expiry: new Date(now + 36000000).toISOString(), reserved: false },
    { mac: "AA:BB:CC:DD:EE:03", ip: "192.168.1.102", hostname: "desktop-pc", expiry: new Date(now + 86400000).toISOString(), reserved: true },
    { mac: "AA:BB:CC:DD:EE:04", ip: "192.168.1.103", hostname: "smart-tv", expiry: new Date(now + 28800000).toISOString(), reserved: false },
    { mac: "AA:BB:CC:DD:EE:05", ip: "192.168.1.104", hostname: "raspberry-pi", expiry: new Date(now + 72000000).toISOString(), reserved: true },
  ];
}

export function getSimulatedWifiClients() {
  const rng = seededRandom(Math.floor(Date.now() / 20000));
  return [
    { mac: "AA:BB:CC:DD:EE:02", hostname: "iphone-sarah", signal: -42, band: "2.4g", connectedAt: new Date(Date.now() - 3600000).toISOString() },
    { mac: "AA:BB:CC:DD:EE:06", hostname: "macbook-dev", signal: -55, band: "5g", connectedAt: new Date(Date.now() - 1800000).toISOString() },
    { mac: "AA:BB:CC:DD:EE:07", hostname: "android-tab", signal: -67, band: "2.4g", connectedAt: new Date(Date.now() - 7200000).toISOString() },
  ];
}

// Simulate ping with realistic delays
export function simulatePing(target: string, count: number = 4): { results: Array<{ seq: number; time: number; ttl: number; status: "ok" | "timeout" }>; summary: { transmitted: number; received: number; loss: number; avgRtt: number; minRtt: number; maxRtt: number } } {
  const rng = seededRandom(Date.now() + target.charCodeAt(0));
  const baseRtt = target.includes("192.168") ? 1 + rng() * 3 : 15 + rng() * 80;
  const lossChance = target.includes("192.168") ? 0.02 : 0.08;

  const results = [];
  let received = 0;
  let totalRtt = 0;
  let minRtt = Infinity;
  let maxRtt = 0;

  for (let i = 1; i <= count; i++) {
    const lost = rng() < lossChance;
    if (lost) {
      results.push({ seq: i, time: 0, ttl: 64, status: "timeout" as const });
    } else {
      const rtt = baseRtt + (rng() - 0.5) * 10;
      const roundedRtt = Math.round(rtt * 100) / 100;
      results.push({ seq: i, time: roundedRtt, ttl: 64, status: "ok" as const });
      received++;
      totalRtt += roundedRtt;
      minRtt = Math.min(minRtt, roundedRtt);
      maxRtt = Math.max(maxRtt, roundedRtt);
    }
  }

  return {
    results,
    summary: {
      transmitted: count,
      received,
      loss: Math.round(((count - received) / count) * 100),
      avgRtt: received > 0 ? Math.round((totalRtt / received) * 100) / 100 : 0,
      minRtt: received > 0 ? Math.round(minRtt * 100) / 100 : 0,
      maxRtt: received > 0 ? Math.round(maxRtt * 100) / 100 : 0,
    },
  };
}

// Simulate traceroute
export function simulateTraceroute(target: string): { hops: Array<{ hop: number; ip: string; hostname: string; rtt1: number; rtt2: number; rtt3: number }> } {
  const rng = seededRandom(Date.now() + target.charCodeAt(0) * 7);
  const hopCount = 3 + Math.floor(rng() * 10);
  const hops = [];

  for (let i = 1; i <= hopCount; i++) {
    const isLast = i === hopCount;
    const rtt = i * (5 + rng() * 15);
    hops.push({
      hop: i,
      ip: isLast ? target : `${10 + Math.floor(rng() * 200)}.${Math.floor(rng() * 256)}.${Math.floor(rng() * 256)}.${Math.floor(rng() * 256)}`,
      hostname: isLast ? target : `hop-${i}.isp.net`,
      rtt1: Math.round(rtt + rng() * 5),
      rtt2: Math.round(rtt + rng() * 5),
      rtt3: Math.round(rtt + rng() * 5),
    });
  }

  return { hops };
}

// Simulate speedtest
export function simulateSpeedtest(): { downloadMbps: number; uploadMbps: number; pingMs: number; jitterMs: number; server: string; timestamp: string } {
  const rng = seededRandom(Date.now());
  return {
    downloadMbps: Math.round(80 + rng() * 40),
    uploadMbps: Math.round(30 + rng() * 20),
    pingMs: Math.round(10 + rng() * 20),
    jitterMs: Math.round(1 + rng() * 5),
    server: "speedtest.linkage.local",
    timestamp: new Date().toISOString(),
  };
}
