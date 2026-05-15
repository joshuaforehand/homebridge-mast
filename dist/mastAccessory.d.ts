import { PlatformAccessory } from 'homebridge';
import { MastPlatform } from './platform';
import { MastAccessoryContext } from './types';
export declare class MastFlagAccessory {
    private readonly platform;
    private readonly accessory;
    private readonly Service;
    private readonly Characteristic;
    private readonly statusService;
    private readonly overrideServices;
    private readonly client?;
    private apiStatus?;
    private apiFault;
    private pollTimer?;
    constructor(platform: MastPlatform, accessory: PlatformAccessory<MastAccessoryContext>);
    private getOverrideService;
    private getContactState;
    private setOverrideMode;
    private getOverrideMode;
    private getEffectiveHalfMast;
    private startPolling;
    private refreshFromApi;
    private syncHomeKitState;
    private syncOverrideSwitches;
}
