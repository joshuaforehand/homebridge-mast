import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig } from 'homebridge';
import { MastAccessoryContext, MastPlatformConfig } from './types';
export declare class MastPlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly api: API;
    readonly accessories: PlatformAccessory<MastAccessoryContext>[];
    readonly config: MastPlatformConfig;
    constructor(log: Logger, rawConfig: PlatformConfig, api: API);
    configureAccessory(accessory: PlatformAccessory): void;
    private discoverAccessory;
    private get deviceId();
    private normalizeConfig;
}
