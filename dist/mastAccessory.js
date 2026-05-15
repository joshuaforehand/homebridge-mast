"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastFlagAccessory = void 0;
const mastClient_1 = require("./mastClient");
class MastFlagAccessory {
    platform;
    accessory;
    Service;
    Characteristic;
    statusService;
    overrideServices;
    client;
    apiStatus;
    apiFault = false;
    pollTimer;
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        this.Service = this.platform.api.hap.Service;
        this.Characteristic = this.platform.api.hap.Characteristic;
        if (!this.accessory.context.overrideMode) {
            this.accessory.context.overrideMode = 'auto';
        }
        if (this.platform.config.apiKey) {
            this.client = new mastClient_1.MastClient(this.platform.config.baseUrl, this.platform.config.apiKey, this.platform.config.countryCode, this.platform.config.stateCode);
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
    getOverrideService(mode, label) {
        const service = this.accessory.getServiceById(this.Service.Switch, mode)
            ?? this.accessory.addService(this.Service.Switch, `${this.platform.config.name} Override ${label}`, mode);
        service
            .setCharacteristic(this.Characteristic.Name, `${this.platform.config.name} Override ${label}`)
            .getCharacteristic(this.Characteristic.On)
            .onGet(() => this.getOverrideMode() === mode)
            .onSet(value => this.setOverrideMode(mode, value));
        return service;
    }
    getContactState() {
        return this.getEffectiveHalfMast()
            ? this.Characteristic.ContactSensorState.CONTACT_DETECTED
            : this.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
    }
    async setOverrideMode(mode, value) {
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
    getOverrideMode() {
        return this.accessory.context.overrideMode ?? 'auto';
    }
    getEffectiveHalfMast() {
        const mode = this.getOverrideMode();
        if (mode === 'on') {
            return true;
        }
        if (mode === 'off') {
            return false;
        }
        return this.apiStatus?.isHalfMast ?? false;
    }
    startPolling() {
        this.pollTimer = setInterval(() => void this.refreshFromApi(), this.platform.config.pollIntervalSeconds * 1000);
        this.pollTimer.unref();
    }
    async refreshFromApi() {
        if (!this.client) {
            this.apiFault = true;
            this.platform.log.warn('Mast API key is missing; Auto mode cannot refresh status.');
            this.syncHomeKitState();
            return;
        }
        try {
            this.apiStatus = await this.client.getStatus();
            this.apiFault = false;
            this.platform.log.debug(`Mast API status: isHalfMast=${this.apiStatus.isHalfMast}, title=${this.apiStatus.title ?? 'unknown'}`);
        }
        catch (error) {
            this.apiFault = true;
            this.platform.log.error(`Failed to refresh Mast flag status: ${error instanceof Error ? error.message : error}`);
        }
        this.syncHomeKitState();
    }
    syncHomeKitState() {
        this.statusService.updateCharacteristic(this.Characteristic.ContactSensorState, this.getContactState());
        this.statusService.updateCharacteristic(this.Characteristic.StatusFault, this.apiFault && this.getOverrideMode() === 'auto'
            ? this.Characteristic.StatusFault.GENERAL_FAULT
            : this.Characteristic.StatusFault.NO_FAULT);
        this.syncOverrideSwitches();
    }
    syncOverrideSwitches() {
        const mode = this.getOverrideMode();
        for (const [candidateMode, service] of Object.entries(this.overrideServices)) {
            service.updateCharacteristic(this.Characteristic.On, candidateMode === mode);
        }
    }
}
exports.MastFlagAccessory = MastFlagAccessory;
