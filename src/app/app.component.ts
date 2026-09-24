import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { LinkService, SnipLink } from './link.service';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './snip.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly linkService = inject(LinkService);

  readonly links = signal<SnipLink[]>([]);
  readonly latestLink = signal<SnipLink | null>(null);
  readonly error = signal('');
  readonly loading = signal(true);
  readonly submitting = signal(false);

  ngOnInit() {
    this.loadLinks();
  }

  submit(event: Event, input: HTMLInputElement) {
    event.preventDefault();
    const url = input.value.trim();

    if (!this.isHttpUrl(url)) {
      this.error.set('Enter a valid URL beginning with http:// or https://.');
      this.latestLink.set(null);
      return;
    }

    this.error.set('');
    this.submitting.set(true);

    this.linkService
      .createLink(url)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (link) => {
          this.latestLink.set(link);
          this.links.update((links) => [...links, link]);
          input.value = '';
        },
        error: (error: HttpErrorResponse) => {
          this.latestLink.set(null);
          this.error.set(this.errorMessage(error));
        },
      });
  }

  private loadLinks() {
    this.linkService
      .getLinks()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (links) => this.links.set(links),
        error: (error: HttpErrorResponse) => this.error.set(this.errorMessage(error)),
      });
  }

  private isHttpUrl(value: string) {
    try {
      return ['http:', 'https:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }

  private errorMessage(error: HttpErrorResponse) {
    if (error.status === 0) {
      return 'Could not reach the Snip backend at localhost:3000.';
    }

    return error.error?.error || 'Something went wrong. Please try again.';
  }
}
