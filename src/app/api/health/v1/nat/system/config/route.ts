import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { systemConfig, interfaces, dhcpConfig, dnsConfig, natConfig, firewallDefaults, qosConfig, wifiConfig, guestWifiConfig, adblockConfig, torrentConfig, vpnProfiles, firewallRules, portForwardRules, dnsRecords, routes } from "@/db/schema";
import { DEFAULT_CONFIG } from "@/lib/defaults";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const [config] = await db.select().from(systemConfig).limit(1);
    const ifaces = await db.select().from(interfaces);
    const [dhcp] = await db.select().from(dhcpConfig).limit(1);
    const [dns] = await db.select().from(dnsConfig).limit(1);
    const [nat] = await db.select().from(natConfig).limit(1);
    const [fwDefaults] = await db.select().from(firewallDefaults).limit(1);
    const [qos] = await db.select().from(qosConfig).limit(1);
    const wifiConfigs = await db.select().from(wifiConfig);
    const [guest] = await db.select().from(guestWifiConfig).limit(1);
    const [adblock] = await db.select().from(adblockConfig).limit(1);
    const [torrent] = await db.select().from(torrentConfig).limit(1);
    const vpns = await db.select().from(vpnProfiles);
    const fwRules = await db.select().from(firewallRules);
    const pfRules = await db.select().from(portForwardRules);
    const staticRoutes = await db.select().from(routes);
    const dnsRecs = await db.select().from(dnsRecords);

    const fullConfig = {
      schemaVersion: config?.schemaVersion || 1,
      system: {
        hostname: config?.hostname || DEFAULT_CONFIG.system.hostname,
        timezone: config?.timezone || DEFAULT_CONFIG.system.timezone,
        ntpServer: config?.ntpServer || DEFAULT_CONFIG.system.ntpServer,
        logLevel: config?.logLevel || DEFAULT_CONFIG.system.logLevel,
        uiLanguage: config?.uiLanguage || DEFAULT_CONFIG.system.uiLanguage,
        uiTheme: config?.uiTheme || DEFAULT_CONFIG.system.uiTheme,
        uiSoundVolume: config?.uiSoundVolume ?? DEFAULT_CONFIG.system.uiSoundVolume,
        uiWallpaper: config?.uiWallpaper || DEFAULT_CONFIG.system.uiWallpaper,
      },
      security: {
        twoFaEnabled: config?.twoFaEnabled || false,
        ipWhitelist: (config?.ipWhitelist as string[]) || [],
        autoBackup: config?.autoBackup || false,
        autoBackupInterval: config?.autoBackupInterval || DEFAULT_CONFIG.security.autoBackupInterval,
      },
      interfaces: ifaces.map((i) => ({
        name: i.name,
        type: i.type,
        role: i.role,
        mode: i.mode,
        ipAddress: i.ipAddress,
        netmask: i.netmask,
        gateway: i.gateway,
        macAddress: i.macAddress,
        mtu: i.mtu,
        enabled: i.enabled,
        status: i.status,
      })),
      routes: staticRoutes.map((r) => ({
        id: r.id,
        destination: r.destination,
        prefix: r.prefix,
        gateway: r.gateway,
        interface: r.interfaceName,
        metric: r.metric,
        enabled: r.enabled,
      })),
      dhcp: dhcp ? {
        enabled: dhcp.enabled,
        interfaceName: dhcp.interfaceName,
        poolStart: dhcp.poolStart,
        poolEnd: dhcp.poolEnd,
        leaseTime: dhcp.leaseTime,
        dnsServers: dhcp.dnsServers,
        gateway: dhcp.gateway,
        domain: dhcp.domain,
      } : DEFAULT_CONFIG.dhcp,
      dns: dns ? {
        upstreamServers: dns.upstreamServers,
        cacheEnabled: dns.cacheEnabled,
        cacheSize: dns.cacheSize,
        records: dnsRecs.map((r) => ({
          id: r.id,
          name: r.name,
          type: r.type,
          value: r.value,
          ttl: r.ttl,
          enabled: r.enabled,
        })),
      } : DEFAULT_CONFIG.dns,
      nat: {
        masqueradeEnabled: nat?.masqueradeEnabled ?? DEFAULT_CONFIG.nat.masqueradeEnabled,
        portForwardRules: pfRules.map((r) => ({
          id: r.id,
          name: r.name,
          protocol: r.protocol,
          externalPort: r.externalPort,
          internalIp: r.internalIp,
          internalPort: r.internalPort,
          enabled: r.enabled,
        })),
      },
      firewall: {
        wanDefaultPolicy: fwDefaults?.wanDefaultPolicy || DEFAULT_CONFIG.firewall.wanDefaultPolicy,
        lanDefaultPolicy: fwDefaults?.lanDefaultPolicy || DEFAULT_CONFIG.firewall.lanDefaultPolicy,
        rules: fwRules.map((r) => ({
          id: r.id,
          name: r.name,
          order: r.order,
          sourceZone: r.sourceZone,
          destZone: r.destZone,
          sourceAddress: r.sourceAddress,
          destAddress: r.destAddress,
          protocol: r.protocol,
          destPort: r.destPort,
          action: r.action,
          logging: r.logging,
          enabled: r.enabled,
          temporary: r.temporary,
          expiresAt: r.expiresAt,
        })),
      },
      qos: qos ? {
        enabled: qos.enabled,
        downloadMbps: qos.downloadMbps,
        uploadMbps: qos.uploadMbps,
      } : DEFAULT_CONFIG.qos,
      wifi: {
        "2.4g": wifiConfigs.find((w) => w.band === "2.4g") || DEFAULT_CONFIG.wifi["2.4g"],
        "5g": wifiConfigs.find((w) => w.band === "5g") || DEFAULT_CONFIG.wifi["5g"],
        guest: guest ? {
          enabled: guest.enabled,
          ssid: guest.ssid,
          password: guest.password,
          isolation: guest.isolation,
          speedLimitMbps: guest.speedLimitMbps,
          lanAccess: guest.lanAccess,
        } : DEFAULT_CONFIG.wifi.guest,
      },
      vpn: {
        profiles: vpns.map((v) => ({
          id: v.id,
          name: v.name,
          type: v.type,
          server: v.server,
          port: v.port,
          username: v.username,
          status: v.status,
          enabled: v.enabled,
        })),
      },
      adblock: adblock ? {
        enabled: adblock.enabled,
        blocklists: adblock.blocklists,
        blockedCount: adblock.blockedCount,
        allowedDomains: adblock.allowedDomains,
      } : DEFAULT_CONFIG.adblock,
      torrent: torrent ? {
        enabled: torrent.enabled,
        downloadPath: torrent.downloadPath,
        maxDownloadMbps: torrent.maxDownloadMbps,
        maxUploadMbps: torrent.maxUploadMbps,
        maxConnections: torrent.maxConnections,
      } : DEFAULT_CONFIG.torrent,
    };

    return NextResponse.json(fullConfig);
  } catch (error) {
    console.error("Failed to load config:", error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    
    // Update system config
    if (body.system || body.security || body.ui) {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (body.system) {
        if (body.system.hostname !== undefined) updateData.hostname = body.system.hostname;
        if (body.system.timezone !== undefined) updateData.timezone = body.system.timezone;
        if (body.system.ntpServer !== undefined) updateData.ntpServer = body.system.ntpServer;
        if (body.system.logLevel !== undefined) updateData.logLevel = body.system.logLevel;
        if (body.system.uiLanguage !== undefined) updateData.uiLanguage = body.system.uiLanguage;
        if (body.system.uiTheme !== undefined) updateData.uiTheme = body.system.uiTheme;
        if (body.system.uiSoundVolume !== undefined) updateData.uiSoundVolume = body.system.uiSoundVolume;
        if (body.system.uiWallpaper !== undefined) updateData.uiWallpaper = body.system.uiWallpaper;
      }
      if (body.security) {
        if (body.security.twoFaEnabled !== undefined) updateData.twoFaEnabled = body.security.twoFaEnabled;
        if (body.security.ipWhitelist !== undefined) updateData.ipWhitelist = body.security.ipWhitelist;
        if (body.security.autoBackup !== undefined) updateData.autoBackup = body.security.autoBackup;
        if (body.security.autoBackupInterval !== undefined) updateData.autoBackupInterval = body.security.autoBackupInterval;
      }
      const [existing] = await db.select().from(systemConfig).limit(1);
      if (existing) {
        await db.update(systemConfig).set(updateData).where(eq(systemConfig.id, existing.id));
      } else {
        await db.insert(systemConfig).values(updateData);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (msg.includes("Unauthorized") || msg.includes("Forbidden")) {
      return NextResponse.json({ error: msg }, { status: msg.includes("Unauthorized") ? 401 : 403 });
    }
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
