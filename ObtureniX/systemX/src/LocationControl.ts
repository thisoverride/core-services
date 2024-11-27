import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  speed?: number;
  timestamp: number;
  provider: 'gps' | 'network' | 'bluetooth' | 'wifi';
}

export interface LocationConfig {
  updateInterval: number;
  minAccuracy: number;
  enableGPS: boolean;
  enableNetwork: boolean;
  enableBluetooth: boolean;
  enableWifi: boolean;
  historyRetention: number; // jours
  knownLocations?: { [name: string]: LocationData };
  geofences?: {
    name: string;
    center: { lat: number; lng: number };
    radius: number; // mètres
  }[];
}

export default class LocationControl {
  private static execAsync = promisify(exec);
  private static readonly CONFIG_PATH = '/etc/location/config.json';
  private static readonly HISTORY_PATH = '/var/log/location/history';
  private static readonly DEFAULT_CONFIG: LocationConfig = {
    updateInterval: 60000, // 1 minute
    minAccuracy: 50, // 50 mètres
    enableGPS: true,
    enableNetwork: true,
    enableBluetooth: false,
    enableWifi: true,
    historyRetention: 30 // 30 jours
  };

  private static config: LocationConfig = { ...LocationControl.DEFAULT_CONFIG };
  private static locationHistory: LocationData[] = [];
  private static activeGeofences = new Set<string>();
  private static updateInterval?: NodeJS.Timeout;

  public static async initialize(): Promise<void> {
    await this.loadConfig();
    await this.loadHistory();
    this.startTracking();
  }

  public static async getCurrentLocation(): Promise<LocationData | null> {
    const locations: LocationData[] = [];

    if (this.config.enableGPS) {
      try {
        const gpsLocation = await this.getGPSLocation();
        if (gpsLocation && gpsLocation.accuracy <= this.config.minAccuracy) {
          locations.push(gpsLocation);
        }
      } catch (error) {
        console.error('GPS location failed:', error);
      }
    }

    if (this.config.enableNetwork) {
      try {
        const networkLocation = await this.getNetworkLocation();
        if (networkLocation && networkLocation.accuracy <= this.config.minAccuracy) {
          locations.push(networkLocation);
        }
      } catch (error) {
        console.error('Network location failed:', error);
      }
    }

    // Choisir la localisation la plus précise
    return locations.sort((a, b) => a.accuracy - b.accuracy)[0] || null;
  }

  public static async addGeofence(
    name: string,
    center: { lat: number; lng: number },
    radius: number
  ): Promise<void> {
    if (!this.config.geofences) {
      this.config.geofences = [];
    }

    this.config.geofences.push({ name, center, radius });
    await this.saveConfig();
  }

  public static async checkGeofences(location: LocationData): Promise<string[]> {
    if (!this.config.geofences) return [];

    const triggeredGeofences = this.config.geofences.filter(fence => {
      const distance = this.calculateDistance(
        location.latitude,
        location.longitude,
        fence.center.lat,
        fence.center.lng
      );
      return distance <= fence.radius;
    });

    // Vérifier les changements de geofence
    const newGeofences = triggeredGeofences
      .filter(fence => !this.activeGeofences.has(fence.name))
      .map(fence => fence.name);

    const exitedGeofences = Array.from(this.activeGeofences)
      .filter(name => !triggeredGeofences.find(fence => fence.name === name));

    // Mettre à jour les geofences actifs
    this.activeGeofences.clear();
    triggeredGeofences.forEach(fence => this.activeGeofences.add(fence.name));

    return [...newGeofences, ...exitedGeofences];
  }

  public static async getLocationHistory(
    startTime: number,
    endTime: number
  ): Promise<LocationData[]> {
    return this.locationHistory.filter(
      loc => loc.timestamp >= startTime && loc.timestamp <= endTime
    );
  }

  private static async getGPSLocation(): Promise<LocationData | null> {
    try {
      const { stdout } = await this.execAsync('gpspipe -w -n 1');
      const gpsData = JSON.parse(stdout);

      if (!gpsData.lat || !gpsData.lon) {
        return null;
      }

      return {
        latitude: gpsData.lat,
        longitude: gpsData.lon,
        altitude: gpsData.alt,
        accuracy: gpsData.epx || 50,
        speed: gpsData.speed,
        timestamp: Date.now(),
        provider: 'gps'
      };
    } catch {
      return null;
    }
  }

  private static async getNetworkLocation(): Promise<LocationData | null> {
    try {
      // Scan WiFi networks
      const { stdout: wifiScan } = await this.execAsync('iwlist scanning');
      const networks = this.parseWifiNetworks(wifiScan);

      // Utiliser un service de géolocalisation WiFi
      const location = await this.geolocateFromWifi(networks);
      
      if (location) {
        //@ts-ignore
        return {
          ...location,
          provider: 'wifi',
          timestamp: Date.now()
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  private static async startTracking(): Promise<void> {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      const location = await this.getCurrentLocation();
      if (location) {
        this.locationHistory.push(location);
        this.pruneHistory();
        await this.saveHistory();

        const geofenceChanges = await this.checkGeofences(location);
        if (geofenceChanges.length > 0) {
          // Notifier les changements de geofence
          console.log('Geofence changes:', geofenceChanges);
        }
      }
    }, this.config.updateInterval);
  }

  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private static parseWifiNetworks(scanOutput: string): Array<{
    ssid: string;
    bssid: string;
    signal: number;
  }> {
    const networks: Array<{
      ssid: string;
      bssid: string;
      signal: number;
    }> = [];
    const lines = scanOutput.split('\n');
    let currentNetwork: Partial<{
      ssid: string;
      bssid: string;
      signal: number;
    }> = {};

    for (const line of lines) {
      if (line.includes('Cell')) {
        if (currentNetwork.ssid) {
          networks.push(currentNetwork as {
            ssid: string;
            bssid: string;
            signal: number;
          });
        }
        currentNetwork = {};
        const bssid = line.match(/([0-9A-F]{2}:){5}[0-9A-F]{2}/i)?.[0];
        if (bssid) currentNetwork.bssid = bssid;
      } else if (line.includes('ESSID')) {
        const ssid = line.match(/"([^"]*)"/)?.[1];
        if (ssid) currentNetwork.ssid = ssid;
      } else if (line.includes('Signal level')) {
        const signal = parseInt(line.match(/-\d+/)?.[0] || '0');
        if (!isNaN(signal)) currentNetwork.signal = signal;
      }
    }

    if (currentNetwork.ssid) {
      networks.push(currentNetwork as {
        ssid: string;
        bssid: string;
        signal: number;
      });
    }

    return networks;
  }

  private static async geolocateFromWifi(networks: Array<{
    ssid: string;
    bssid: string;
    signal: number;
  }>): Promise<Partial<LocationData> | null> {
    // Implémenter l'appel à un service de géolocalisation WiFi
    // Par exemple : Mozilla Location Service, Google Geolocation API, etc.
    return null;
  }

  private static async loadConfig(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.CONFIG_PATH, 'utf-8');
      this.config = { ...this.DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      await this.saveConfig();
    }
  }

  private static async saveConfig(): Promise<void> {
    await fs.promises.mkdir('/etc/location', { recursive: true });
    await fs.promises.writeFile(
      this.CONFIG_PATH,
      JSON.stringify(this.config, null, 2)
    );
  }

  private static async loadHistory(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.HISTORY_PATH, 'utf-8');
      this.locationHistory = JSON.parse(data);
    } catch {
      this.locationHistory = [];
      await this.saveHistory();
    }
  }

  private static async saveHistory(): Promise<void> {
    await fs.promises.mkdir('/var/log/location', { recursive: true });
    await fs.promises.writeFile(
      this.HISTORY_PATH,
      JSON.stringify(this.locationHistory)
    );
  }

  private static pruneHistory(): void {
    const cutoffTime = Date.now() - (this.config.historyRetention * 24 * 60 * 60 * 1000);
    this.locationHistory = this.locationHistory.filter(
      loc => loc.timestamp >= cutoffTime
    );
  }
}