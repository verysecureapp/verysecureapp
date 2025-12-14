import { Component, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LoginButtonComponent } from './components/login-button.component';
import { LogoutButtonComponent } from './components/logout-button.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, LoginButtonComponent, LogoutButtonComponent],
  template: `
    <div class="app-layout">
      <!-- Loading State -->
      @if (auth.isLoading$ | async) {
        <div class="loading-overlay">
          <div class="spinner"></div>
        </div>
      }

      <!-- Header / Nav -->
      <header class="navbar" *ngIf="(auth.isAuthenticated$ | async)">
        <div class="nav-container">
          <a routerLink="/" class="brand">
            <span>Secure</span>Messenger
          </a>

          <!-- Desktop Nav -->
          <nav class="nav-links">
            <a routerLink="/inbox" routerLinkActive="active-link" class="nav-link">Inbox</a>
            <a routerLink="/send" routerLinkActive="active-link" class="nav-link">Send Message</a>
            <a routerLink="/profile" routerLinkActive="active-link" class="nav-link">Profile</a>
            <div class="nav-separator"></div>
            <app-logout-button />
          </nav>

          <!-- Mobile Toggle -->
          <button class="mobile-toggle" (click)="toggleMobileMenu()">
            <span class="material-symbols-outlined">menu</span>
          </button>
        </div>

        <!-- Mobile Menu -->
        <div class="mobile-menu" [class.open]="isMobileMenuOpen">
          <a routerLink="/inbox" routerLinkActive="active-link" class="nav-link" (click)="closeMobileMenu()">Inbox</a>
          <a routerLink="/send" routerLinkActive="active-link" class="nav-link" (click)="closeMobileMenu()">Send Message</a>
          <a routerLink="/profile" routerLinkActive="active-link" class="nav-link" (click)="closeMobileMenu()">Profile</a>
          <div class="nav-separator"></div>
          <app-logout-button />
        </div>
      </header>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Error Banner -->
        @if (auth.error$ | async; as error) {
          <div class="error-banner">
            <strong>Error:</strong> {{ error.message }}
          </div>
        }

        <!-- Unauthenticated View -->
        @if (!(auth.isLoading$ | async) && !(auth.isAuthenticated$ | async)) {
          <div class="auth-container">
            <div class="auth-card">
              <h1 class="main-title">Secure Messenger</h1>
              <p class="auth-subtitle">End-to-end encrypted messaging for everyone.</p>
              <br>
              <app-login-button />
            </div>
          </div>
        }

        <!-- Authenticated Content -->
        @if (auth.isAuthenticated$ | async) {
          <router-outlet></router-outlet>
        }
      </main>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: var(--bg-color);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 200;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      border-top-color: var(--accent-color);
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    .error-banner {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid var(--danger-color);
      color: #fca5a5;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }

    .main-title {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }
    .auth-subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
      line-height: 1.5;
    }
    
    /* Styles for hamburger icon - creating it with CSS assuming no icon lib */
    .mobile-toggle {
      width: 40px;
      height: 40px;
      display: none; /* Hidden by default, shown in global media query */
      flex-direction: column;
      justify-content: center;
      gap: 6px;
      background: transparent;
      border: none;
      cursor: pointer;
    }
    
    /* Override Material Symbols if not loaded */
    .mobile-toggle span {
        display: block;
        width: 100%;
        height: 2px;
        background-color: var(--text-primary);
    }
    
    @media (max-width: 768px) {
        .mobile-toggle {
            display: flex;
        }
    }
  `]
})
export class App {
  protected auth = inject(AuthService);
  isMobileMenuOpen = false;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }
}
