import { MastStatus } from './types';
export declare class MastClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly countryCode;
    private readonly stateCode?;
    constructor(baseUrl: string, apiKey: string, countryCode: string, stateCode?: string | undefined);
    getStatus(): Promise<MastStatus>;
}
