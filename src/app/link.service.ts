import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

export interface SnipLink {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class LinkService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = window.location.port === '4200'
    ? 'http://localhost:3000/api/links'
    : '/api/links';

  getLinks() {
    return this.http.get<SnipLink[]>(this.apiUrl);
  }

  createLink(url: string) {
    return this.http.post<SnipLink>(this.apiUrl, { url });
  }
}