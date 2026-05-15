import {
  Characteristic,
  CharacteristicValue,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { MastClient } from './mastClient';
import { MastPlatform } from './platform';
import { MastAccessoryContext, MastStatus, OverrideMode } from './types';

export class MastFlagAccessory {
  private readonly Service: typeof Service;
  private readonly Characteristic: typeof Characteristic;
  private readonly statusService: Service;
  private readonly overrideServices: Record<OverrideMode, Service>;
  private readonly client?: MastClient;
  private apiStatus?: MastStatus;
  private apiFault = false;
  private pollTimer?: NodeJS.Timeout;

  public constructor(
    private readonly platform: MastPlatform,
    private readonly accessory: PlatformAccessory<MastAccessoryContext>,
  ) {
    this.Service = this.platform.api.hap.Service;
    this.Characteristic = this.platform.api.hap.Characteristic;

    if (!this.accessory.context.overrideMode) {
      this.accessory.context.overrideMode = 'auto';
    }

    if (this.platform.config.apiKey) {
      this.client = new MastClient(
        this.platform.config.baseUrl,
        this.platform.config.apiKey,
        this.platform.config.countryCode,
        this.platform.config.stateCode,
      );
    }

    this.accessory.getService(this.Service.AccessoryInformation)
      ?.setCharacteristic(this.Characteristic.Manufacturer, 'Mast')
      .setCharacteristic(this.Characteristic.Model, 'Flag Status API')
      .setCharacteristic(this.Characteristic.SerialNumber, this.accessory.context.deviceId);

    this.statusService = this.accessory.getService(this.Service.ContactSensor)
      ?? this.accessory.addService(this.Service.ContactSensor, this.platform.config.name);

    this.statusService
      .setCharacteristic(this.Characteristic.Name, this.platform.config.name)
      .getCharacteristic(this.Characteristic.ContactSensorState)
      .onGet(() => this.getContactState());

    this.overrideServices = {
      auto: this.getOverrideService('auto', 'Auto'),
      on: this.getOverrideService('on', 'On'),
      off: this.getOverrideService('off', 'Off'),
    };

    this.syncHomeKitState();
    this.refreshFromApi();
    this.startPolling();
  }

  private getOverrideService(mode: OverrideMode, label: string): Service {
    const service = this.accessory.getServiceById(this.Service.Switch, mode)
      ?? this.accessory.addService(this.Service.Switch, `${this.platform.config.name} Override ${label}`, mode);

    service
      .setCharacteristic(this.Characteristic.Name, `${this.platform.config.name} Override ${label}`)
      .getCharacteristic(this.Characteristic.On)
      .onGet(() => this.getOverrideMode() === mode)
      .onSet(value => this.setOverrideMode(mode, value));

    return service;
  }

  private getContactState(): CharacteristicValue {
    return this.getEffectiveHalfMast()
      ? this.Characteristic.ContactSensorState.CONTACT_DETECTED
      : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
  }

  private async setOverrideMode(mode: OverrideMode, value: CharacteristicValue): Promise<void> {
    if (value !== true) {
      this.syncOverrideSwitches();
      return;
    }

    this.accessory.context.overrideMode = mode;
    this.platform.log.info(`Mast override mode set to ${mode}.`);
    this.syncHomeKitState();

    if (mode === 'auto') {
      await this.refreshFromApi();
    }
  }

  private getOverrideMode(): OverrideMode {
    return this.accessory.context.overrideMode ?? 'auto';
  }

  private getEffectiveHalfMast(): boolean {
    const mode = this.getOverrideMode();

    if (mode === 'on') {
      return true;
    }

    if (mode === 'off') {
      return false;
    }

    return this.apiStatus?.isHalfMast ?? false;
  }

  private startPolling(): void {
    this.pollTimer = setInterval(
      () => void this.refreshFromApi(),
      this.platform.config.pollIntervalSeconds * 1000,
    );
    this.pollTimer.unref();
  }

  private async refreshFromApi(): Promise<void> {
    if (!this.client) {
      this.apiFault = true;
      this.platform.log.warn('Mast API key is missing; Auto mode cannot refresh status.');
      this.syncHomeKitState();
      return;
    }

    try {
      this.apiStatus = await this.client.getStatus();
      this.apiFault = false;
      this.platform.log.debug(
        `Mast API status: isHalfMast=${this.apiStatus.isHalfMast}, title=${this.apiStatus.title ?? 'unknown'}`,
      );
    } catch (error) {
      this.apiFault = true;
      this.platform.log.error(`Failed to refresh Mast flag status: ${error instanceof Error ? error.message : error}`);
    }

    this.syncHomeKitState();
  }

  private syncHomeKitState(): void {
    this.statusService.updateCharacteristic(this.Characteristic.ContactSensorState, this.getContactState());
    this.statusService.updateCharacteristic(
      this.Characteristic.StatusFault,
      this.apiFault && this.getOverrideMode() === 'auto'
        ? this.Characteristic.StatusFault.GENERAL_FAULT
        : this.Characteristic.StatusFault.NO_FAULT,
    );
    this.syncOverrideSwitches();
  }

  private syncOverrideSwitches(): void {
    const mode = this.getOverrideMode();

    for (const [candidateMode, service] of Object.entries(this.overrideServices) as [OverrideMode, Service][]) {
      service.updateCharacteristic(this.Characteristic.On, candidateMode === mode);
    }
  }
}
