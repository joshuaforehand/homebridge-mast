"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastPlatform = void 0;
const mastAccessory_1 = require("./mastAccessory");
const settings_1 = require("./settings");
class MastPlatform {
    log;
    api;
    accessories = [];
    config;
    constructor(log, rawConfig, api) {
        this.log = log;
        this.api = api;
        this.config = this.normalizeConfig(rawConfig);
        this.api.on('didFinishLaunching', () => {
            this.discoverAccessory();
        });
    }
    configureAccessory(accessory) {
        this.accessories.push(accessory);
    }
    discoverAccessory() {
        const uuid = this.api.hap.uuid.generate(this.deviceId);
        const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
        if (existingAccessory) {
            this.log.debug('Restoring existing Mast accessory from cache.');
            existingAccessory.context.deviceId = this.deviceId;
            new mastAccessory_1.MastFlagAccessory(this, existingAccessory);
            return;
        }
        this.log.info('Adding Mast flag status accessory.');
        const accessory = new this.api.platformAccessory(this.config.name, uuid, 10 /* this.api.hap.Categories.SENSOR */);
        accessory.context.deviceId = this.deviceId;
        new mastAccessory_1.MastFlagAccessory(this, accessory);
        this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
    }
    get deviceId() {
        const countryCode = this.config.countryCode.toUpperCase();
        const stateCode = this.config.stateCode?.toUpperCase() ?? 'national';
        return `mast-flag-status-${countryCode}-${stateCode}`;
    }
    normalizeConfig(config) {
        const name = typeof config.name === 'string' && config.name.trim()
            ? config.name.trim()
            : 'Mast Flag Status';
        const countryCode = typeof config.countryCode === 'string' && config.countryCode.trim()
            ? config.countryCode.trim().toUpperCase()
            : settings_1.DEFAULT_COUNTRY_CODE;
        const stateCode = typeof config.stateCode === 'string' && config.stateCode.trim()
            ? config.stateCode.trim().toUpperCase()
            : undefined;
        const pollIntervalSeconds = Number.isFinite(config.pollIntervalSeconds)
            ? Math.max(60, Number(config.pollIntervalSeconds))
            : settings_1.DEFAULT_POLL_INTERVAL_SECONDS;
        const baseUrl = typeof config.baseUrl === 'string' && config.baseUrl.trim()
            ? config.baseUrl.trim()
            : settings_1.DEFAULT_BASE_URL;
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
exports.MastPlatform = MastPlatform;
