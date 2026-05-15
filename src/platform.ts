import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';

import { MastFlagAccessory } from './mastAccessory';
import {
  DEFAULT_BASE_URL,
  DEFAULT_COUNTRY_CODE,
  DEFAULT_POLL_INTERVAL_SECONDS,
  PLATFORM_NAME,
  PLUGIN_NAME,
} from './settings';
import { MastAccessoryContext, MastPlatformConfig } from './types';

export class MastPlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory<MastAccessoryContext>[] = [];
  public readonly config: MastPlatformConfig;

  public constructor(
    public readonly log: Logger,
    rawConfig: PlatformConfig,
    public readonly api: API,
  ) {
    this.config = this.normalizeConfig(rawConfig);

    this.api.on('didFinishLaunching', () => {
      this.discoverAccessory();
    });
  }

  public configureAccessory(accessory: PlatformAccessory): void {
    this.accessories.push(accessory as PlatformAccessory<MastAccessoryContext>);
  }

  private discoverAccessory(): void {
    const uuid = this.api.hap.uuid.generate(this.deviceId);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

    if (existingAccessory) {
      this.log.debug('Restoring existing Mast accessory from cache.');
      existingAccessory.context.deviceId = this.deviceId;
      new MastFlagAccessory(this, existingAccessory);
      return;
    }

    this.log.info('Adding Mast flag status accessory.');
    const accessory = new this.api.platformAccessory<MastAccessoryContext>(
      this.config.name,
      uuid,
      this.api.hap.Categories.SENSOR,
    );

    accessory.context.deviceId = this.deviceId;
    new MastFlagAccessory(this, accessory);
    this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
  }

  private get deviceId(): string {
    const countryCode = this.config.countryCode.toUpperCase();
    const stateCode = this.config.stateCode?.toUpperCase() ?? 'national';
    return `mast-flag-status-${countryCode}-${stateCode}`;
  }

  private normalizeConfig(config: PlatformConfig): MastPlatformConfig {
    const name = typeof config.name === 'string' && config.name.trim()
      ? config.name.trim()
      : 'Mast Flag Status';
    const countryCode = typeof config.countryCode === 'string' && config.countryCode.trim()
      ? config.countryCode.trim().toUpperCase()
      : DEFAULT_COUNTRY_CODE;
    const stateCode = typeof config.stateCode === 'string' && config.stateCode.trim()
      ? config.stateCode.trim().toUpperCase()
      : undefined;
    const pollIntervalSeconds = Number.isFinite(config.pollIntervalSeconds)
      ? Math.max(60, Number(config.pollIntervalSeconds))
      : DEFAULT_POLL_INTERVAL_SECONDS;
    const baseUrl = typeof config.baseUrl === 'string' && config.baseUrl.trim()
      ? config.baseUrl.trim()
      : DEFAULT_BASE_URL;

    return {
      name,
      apiKey: typeof config.apiKey === 'string' ? config.apiKey.trim() : undefined,
      countryCode,
      stateCode,
      pollIntervalSeconds,
      baseUrl,
    };
  }
}
