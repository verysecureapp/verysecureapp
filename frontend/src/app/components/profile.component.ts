import { Component, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (auth.isLoading$ | async) {
      <div class="loading-text">Loading profile...</div>
    }

    @if ((auth.isAuthenticated$ | async) && (auth.user$ | async); as user) {
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        @if (user.picture) {
          <img
            [src]="user.picture"
            [alt]="user.name || 'User'"
            class="profile-picture"
            style="
              width: 110px;
              height: 110px;
              border-radius: 50%;
              object-fit: cover;
              border: 3px solid #63b3ed;
            "
          />
        }
        <div style="text-align: center;">
          <div
            class="profile-name"
            style="
              font-size: 2rem;
              font-weight: 600;
              color: #f7fafc;
              margin-bottom: 0.5rem;
            "
          >
            {{ user.name }}
          </div>
          <div
            class="profile-email"
            style="
              font-size: 1.15rem;
              color: #a0aec0;
            "
          >
            {{ user.email }}
          </div>
        </div>
      </div>
    }
  `
})
export class ProfileComponent {
  protected auth = inject(AuthService);
}
