import { MastStatus } from './types';

interface MastStatusResponse {
  ok?: boolean;
  status?: {
    isHalfMast?: unknown;
    title?: string;
    authority?: string;
    reason?: string;
    source?: string;
    scope?: string;
  };
}

export class MastClient {
  public constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly countryCode: string,
    private readonly stateCode?: string,
  ) {}

  public async getStatus(): Promise<MastStatus> {
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

    const data = await response.json() as MastStatusResponse;

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
