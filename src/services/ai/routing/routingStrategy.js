import logger from '../../../shared/logger/logger.js';

export class ScheduledRoutingStrategy {
  match(url, reqContext) {
    if (url.isScheduledRedirect && url.scheduledTargets && url.scheduledTargets.length > 0) {
      const now = new Date();
      const match = url.scheduledTargets.find((t) => now >= new Date(t.startAt) && now <= new Date(t.endAt));
      if (match) {
        logger.info('Redirect: Scheduled routing matched. Target: ' + match.url);
        return match.url;
      }
    }
    return null;
  }
}

export class DeviceRoutingStrategy {
  match(url, reqContext) {
    if (url.isDeviceRouting && url.deviceTargets && url.deviceTargets.length > 0) {
      const detectedDevice = reqContext.getDeviceType(reqContext.userAgent);
      const match = url.deviceTargets.find((t) => t.deviceType === detectedDevice);
      if (match) {
        logger.info('Redirect: Device routing matched (' + detectedDevice + '). Target: ' + match.url);
        return match.url;
      }
    }
    return null;
  }
}

export class GeoRoutingStrategy {
  match(url, reqContext) {
    if (url.isGeoRouting && url.geoTargets && url.geoTargets.length > 0 && reqContext.geo) {
      const match = url.geoTargets.find(
        (t) => t.countryCode.toUpperCase() === reqContext.geo.countryCode.toUpperCase()
      );
      if (match) {
        logger.info('Redirect: Geo routing matched (' + reqContext.geo.countryCode + '). Target: ' + match.url);
        return match.url;
      }
    }
    return null;
  }
}

export class ABTestRoutingStrategy {
  match(url, reqContext) {
    if (url.isABTest && url.abDestinations && url.abDestinations.length > 0) {
      const totalWeight = url.abDestinations.reduce((acc, curr) => acc + curr.weight, 0);
      const rand = Math.floor(Math.random() * totalWeight) + 1;
      let cumulative = 0;

      for (const dest of url.abDestinations) {
        cumulative += dest.weight;
        if (rand <= cumulative) {
          logger.info('Redirect: A/B split traffic matched. Weight: ' + dest.weight + '%. Target: ' + dest.url);
          return dest.url;
        }
      }
    }
    return null;
  }
}

export class RoutingContext {
  constructor() {
    this.strategies = [
      new ScheduledRoutingStrategy(),
      new DeviceRoutingStrategy(),
      new GeoRoutingStrategy(),
      new ABTestRoutingStrategy()
    ];
  }

  resolveTargetUrl(url, reqContext) {
    for (const strategy of this.strategies) {
      const match = strategy.match(url, reqContext);
      if (match) {
        return match;
      }
    }
    return url.originalUrl;
  }
}
