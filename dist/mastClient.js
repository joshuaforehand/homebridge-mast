"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastClient = void 0;
class MastClient {
    baseUrl;
    apiKey;
    countryCode;
    stateCode;
    constructor(baseUrl, apiKey, countryCode, stateCode) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.countryCode = countryCode;
        this.stateCode = stateCode;
    }
    async getStatus() {
        const url = new URL('/api/v1/status', this.baseUrl);
        url.searchParams.set('countryCode', this.countryCode);
        if (this.stateCode) {
            url.searchParams.set('stateCode', this.stateCode);
        }
        const response = await fetch(url, {
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
