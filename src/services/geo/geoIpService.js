import logger from '../../shared/logger/logger.js';

const geoCache = new Map();

export class GeoIpService {
  static async lookup(ipAddress) {
    const cleanIp = ipAddress.trim().replace(/^::ffff:/, '');

    if (geoCache.has(cleanIp)) {
      return geoCache.get(cleanIp);
    }

    const isLocal = cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.toLowerCase() === 'localhost' || cleanIp === 'unknown' || cleanIp === '';
    if (isLocal) {
      const localData = {
        country: 'India',
        countryCode: 'IN',
        stateRegion: 'Karnataka',
        city: 'Bengaluru',
        timezone: 'Asia/Kolkata',
        latitude: 12.9716,
        longitude: 77.5946,
        isp: 'Local Loopback Dev'
      };
      geoCache.set(cleanIp, localData);
      return localData;
    }

    try {
      logger.info('GeoIP looking up public IP: ' + cleanIp);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch('http://ip-api.com/json/' + cleanIp, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('GeoIP service returned status code ' + response.status);
      }

      const body = await response.json();
      if (body && body.status === 'success') {
        const data = {
          country: body.country || 'Unknown',
          countryCode: body.countryCode || 'Unknown',
          stateRegion: body.regionName || 'Unknown',
          city: body.city || 'Unknown',
          timezone: body.timezone || 'Unknown',
          latitude: typeof body.lat === 'number' ? body.lat : null,
          longitude: typeof body.lon === 'number' ? body.lon : null,
          isp: body.isp || 'Unknown'
        };
        geoCache.set(cleanIp, data);
        return data;
      } else {
        throw new Error(body?.message || 'Failed payload status check');
      }
    } catch (e) {
      logger.error('GeoIP Lookup failed for IP ' + cleanIp + ': ' + e.message + '. Using Unknown fallbacks.');
      return {
        country: 'Unknown',
        countryCode: 'Unknown',
        stateRegion: 'Unknown',
        city: 'Unknown',
        timezone: 'Unknown',
        latitude: null,
        longitude: null,
        isp: 'Unknown'
      };
    }
  }
}
