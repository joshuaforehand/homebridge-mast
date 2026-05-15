export type OverrideMode = 'auto' | 'on' | 'off';

export interface MastPlatformConfig {
  name: string;
  apiKey?: string;
  countryCode: string;
  stateCode?: string;
  pollIntervalSeconds: number;
  baseUrl: string;
}

export interface MastStatus {
  isHalfMast: boolean;
  title?: string;
  authority?: string;
  reason?: string;
  source?: string;
  scope?: string;
}

export interface MastAccessoryContext {
  deviceId: string;
  overrideMode?: OverrideMode;
}
