import { MastStatus } from './types';
export declare class MastClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly countryCode;
    private readonly stateCode?;
    private readonly timeoutMs;
    constructor(baseUrl: string, apiKey: string, countryCode: string, stateCode?: string | undefined, timeoutMs?: number);
    getStatus(): Promise<MastStatus>;
}
