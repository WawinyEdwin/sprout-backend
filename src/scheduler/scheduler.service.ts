// // src/scheduler/scheduler.service.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { IntegrationsService } from 'src/integrations/integrations.service';

// @Injectable()
// export class SchedulerService {
//   private readonly logger = new Logger(SchedulerService.name);

//   // A simple in-memory set to track currently running syncs.
//   // This is a crucial MVP-friendly concurrency safeguard.
//   private readonly runningSyncs = new Set<string>();

//   constructor(
//     private readonly integrationsService: IntegrationsService,
//     private readonly dataPipelineService: DataPipelineService,
//   ) {}

//   @Cron(CronExpression.EVERY_MINUTE, {
//     name: 'sync-scheduler',
//   })
//   async handleCron() {
//     this.logger.log('Running master sync scheduler...');

//     // 1. Find all integrations that need to be synced
//     const integrationsToSync =
//       await this.integrationsService.findDueIntegrations();

//     if (integrationsToSync.length === 0) {
//       this.logger.log('No integrations are due for a sync.');
//       return;
//     }

//     this.logger.log(`Found ${integrationsToSync.length} integrations to sync.`);

//     // 2. Iterate and process each due integration
//     for (const integration of integrationsToSync) {
//       // Check if a sync is already running for this integration.
//       if (this.runningSyncs.has(integration.id)) {
//         this.logger.warn(
//           `Sync for integration ${integration.id} is already in progress. Skipping.`,
//         );
//         continue;
//       }

//       // Use an async function to process in the background,
//       // without blocking the main cron job loop.
//       this.processIntegration(
//         integration.id,
//         integration.integration.key,
//         integration.workspace.id,
//       );
//     }
//   }

//   private async processIntegration(
//     workspaceIntegrationId: string,
//     integrationKey: string,
//     workspaceId: string,
//   ): Promise<void> {
//     // Add the integration to the running set before starting.
//     this.runningSyncs.add(workspaceIntegrationId);

//     try {
//       this.logger.log(
//         `Starting sync for integration ${workspaceIntegrationId}...`,
//       );

//       // Execute the sync and transform logic directly.
//       // This is the key difference from the over-engineered queue approach.
//       await this.dataPipelineService.processRawData(
//         integrationKey,
//         workspaceId,
//       );

//       // Update the lastSynced timestamp after a successful sync.
//       await this.integrationsService.updateWorkspaceIntegration(
//         workspaceIntegrationId,
//         {
//           lastSynced: new Date().toString(),
//         },
//       );

//       this.logger.log(
//         `Successfully completed sync for integration ${workspaceIntegrationId}.`,
//       );
//     } catch (error) {
//       this.logger.error(
//         `Failed to sync integration ${workspaceIntegrationId}:`,
//         error,
//       );
//       // Log the error but don't rethrow it. This ensures a single failure
//       // doesn't crash the entire cron job or block other syncs.
//     } finally {
//       // Always remove the integration from the running set when done.
//       this.runningSyncs.delete(workspaceIntegrationId);
//     }
//   }
// }
