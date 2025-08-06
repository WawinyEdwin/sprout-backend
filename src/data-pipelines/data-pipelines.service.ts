// import { Injectable, Logger } from '@nestjs/common';
// import { Metric, ProcessedIntegrationData } from 'src/integrations/entities/integration.entity';
// import { IntegrationType } from 'src/integrations/integration.types';
// import { IntegrationsService } from 'src/integrations/integrations.service';
// import { GoogleAnalyticsTransformerService } from '../integrations/ga/googleanalytics.transfomer';

// @Injectable()
// export class DataPipelineService {
//   private readonly logger = new Logger(DataPipelineService.name);

//   constructor(
//     private readonly gaTransformer: GoogleAnalyticsTransformerService,
//     private readonly integrationsService: IntegrationsService,
//   ) {}

//   async processRawData(
//     integrationKey: IntegrationType,
//     workspaceId: string,
//   ): Promise<void> {
//     this.logger.log(
//       `Starting transformation for integration: ${integrationKey} and workspace: ${workspaceId}`,
//     );

//     // 1. Fetch raw data to be processed
//     // You'll need to implement this method to get a batch of unprocessed data.
//     const rawDataEvents = await this.integrationsService.getRawDataEvents(
//       workspaceId,
//       integrationKey,
//     );

//     if (rawDataEvents.length === 0) {
//       this.logger.log('No new raw data to process.');
//       return;
//     }

//     // 2. Fetch a map of all unified metrics
//     const allMetrics = await this.integrationsService.getAllMetrics();
//     const metricsMap = new Map<string, Metric>(
//       allMetrics.map((metric) => [metric.key, metric]),
//     );

//     let processedData: ProcessedIntegrationData[] = [];

//     // 3. Call the correct transformer based on the integration type
//     switch (integrationKey) {
//       case 'google_analytics':
//         processedData = await this.gaTransformer.transform(
//           rawDataEvents,
//           metricsMap,
//         );
//         break;
//       case 'quick_books':
//         // processedData = await this.quickbooksTransformer.transform(rawDataEvents, metricsMap);
//         break;
//       case 'facebook_ads':
//         // processedData = await this.facebookAdsTransformer.transform(rawDataEvents, metricsMap);
//         break;
//       default:
//         this.logger.warn(
//           `No transformer found for integration: ${integrationKey}`,
//         );
//         return;
//     }

//     // 4. Save the transformed data to the database
//     // await this.processedMetricsRepository.saveMany(processedData);

//     // 5. Mark the raw data events as processed (optional, depending on your needs)
//     // await this.integrationsService.markRawEventsAsProcessed(rawDataEvents);

//     this.logger.log(`Successfully processed ${processedData.length} records.`);
//   }
// }
