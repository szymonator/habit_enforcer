import { NativeModule, requireNativeModule } from 'expo';

declare class HabitBlockerModule extends NativeModule {
  isOverlayPermissionGranted(): boolean;
  requestOverlayPermission(): void;
  isUsageStatsPermissionGranted(): boolean;
  requestUsageStatsPermission(): void;
  isAlarmPermissionGranted(): boolean;
  requestAlarmPermission(): void;
  startBlockService(targetPackageName: string, durationSeconds: number, isTest: boolean): void;
  stopBlockService(): void;
  scheduleDailyBlock(id: number, hour: number, minute: number, targetPackage: string, durationSeconds: number): void;
  cancelDailyBlock(id: number): void;
  getInstalledApps(): Promise<Array<{ packageName: string; label: string }>>;
}

export default requireNativeModule<HabitBlockerModule>('HabitBlocker');
