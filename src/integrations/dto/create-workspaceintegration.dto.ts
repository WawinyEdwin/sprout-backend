import { IsEnum, IsString } from 'class-validator';
import { DataSyncFrequencyEnum, HistoricalDataEnum } from '../integration.enum';

export class CreateWorkspaceIntegrationDto {
  @IsEnum(DataSyncFrequencyEnum)
  syncFrequency: DataSyncFrequencyEnum;

  @IsString()
  @IsEnum(HistoricalDataEnum)
  historicalData: HistoricalDataEnum;
}
