import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DataSyncFrequencyEnum, HistoricalDataEnum } from '../integration.enum';

export class CreateUserIntegrationDto {
  @IsEnum(DataSyncFrequencyEnum)
  syncFrequency: DataSyncFrequencyEnum;

  @IsString()
  @IsEnum(HistoricalDataEnum)
  historicalData: HistoricalDataEnum;
}
