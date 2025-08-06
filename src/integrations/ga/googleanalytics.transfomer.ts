import { Injectable, Logger } from '@nestjs/common';
import {
  Metric,
  ProcessedIntegrationData,
  RawIntegrationDataEvent,
} from '../entities/integration.entity';

@Injectable()
export class GoogleAnalyticsTransformerService {
  private readonly logger = new Logger(GoogleAnalyticsTransformerService.name);

  async transform(
    rawDataEvents: RawIntegrationDataEvent[],
    metricsMap: Map<string, Metric>,
  ): Promise<any> {
    const processedData: ProcessedIntegrationData[] = [];

    // Create a mapping for raw data dimensions and metrics to a unified format.
    // This is the core "T" logic.
    const unifiedMetrics = {
      totalUsers: 'users',
      newUsers: 'newUsers',
      sessions: 'sessions',
      screenPageViews: 'pageViews',
      // ... more mappings
    };

    for (const rawEvent of rawDataEvents) {
      // Logic to transform the rawPayload into the ProcessedIntegrationData structure
      // Example:
      const payload = rawEvent.rawPayload;

      const dimensions = {
        date: payload.date,
        trafficSource: payload.trafficSource,
        trafficMedium: payload.trafficMedium,
      };

      // Map raw metrics to your unified metric keys
      const metricKey = this.getUnifiedMetricKey(rawEvent.metric.key);
      const unifiedMetric = metricsMap.get(metricKey);

      if (!unifiedMetric) {
        this.logger.warn(
          `Unified metric not found for raw key: ${rawEvent.metric.key}`,
        );
        continue;
      }

      //   processedData.push({
      //     workspace: rawEvent.workspace,
      //     integration: rawEvent.integration,
      //     metric: unifiedMetric,
      //     dimensions: dimensions,
      //     processedAt: new Date(),
      //     eventTimestamp: rawEvent.eventTimestamp,
      //   });
      // }

      // return processedData;
    }
  }

  private getUnifiedMetricKey(rawKey: string): string {
    // This is where you would map raw metric keys to your standardized keys.
    // e.g., 'screenPageViews' -> 'page_views'
    switch (rawKey) {
      case 'screenPageViews':
        return 'page_views';
      case 'totalUsers':
        return 'users';
      case 'sessions':
        return 'sessions';
      // ... more cases for GA metrics
      default:
        return rawKey; // Fallback for metrics that don't need transformation
    }
  }
}
