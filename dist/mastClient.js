"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastClient = void 0;
class MastClient {
    baseUrl;
    apiKey;
    countryCode;
    stateCode;
    timeoutMs;
    constructor(baseUrl, apiKey, countryCode, stateCode, timeoutMs = 10_000) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.countryCode = countryCode;
        this.stateCode = stateCode;
        this.timeoutMs = timeoutMs;
    }
    async getStatus() {
        const url = new URL('/api/v1/status', this.baseUrl);
        url.searchParams.set('countryCode', this.countryCode);
        if (this.stateCode) {
            url.searchParams.set('stateCode', this.stateCode);
        }
        const response = await fetch(url, {
            signal: AbortSignal.timeout(this.timeoutMs),
            headers: {
                'accept': 'application/json',
                'x-mast-license-key': this.apiKey,
            },
        });
        if (!response.ok) {
            throw new Error(`Mast API returned ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.ok || typeof data.status?.isHalfMast !== 'boolean') {
            throw new Error('Mast API response did not include status.isHalfMast');
        }
        return {
            isHalfMast: data.status.isHalfMast,
            title: data.status.title,
            authority: data.status.authority,
            reason: data.status.reason,
            source: data.status.source,
            scope: data.status.scope,
        };
    }
}
exports.MastClient = MastClient;
