import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from '../../../core/services/message.service';

@Component({
    selector: 'app-inbox',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="inbox-container">
      <h2 class="page-title">Inbox</h2>
      @if (messages$ | async; as messages) {
        @if (messages.length === 0) {
          <div class="empty-state">
            <p>No messages found.</p>
          </div>
        } @else {
          <div class="message-grid">
            @for (msg of messages; track $index) {
              <div class="message-card">
                <div class="message-header">
                  <span class="label">From:</span>
                  <span class="sender">{{ msg.sender_email }}</span>
                </div>
                <div class="message-body">
                  <div class="note-section">
                    <span class="label">Note:</span>
                    <span class="note-text">{{ msg.note || 'No note' }}</span>
                  </div>
                  <div class="content-section">
                    <span class="label">Message:</span>
                    <div class="content">{{ decrypt(msg.ciphertext_hex, msg.otp_key_hex) }}</div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
    styles: [`
    .message-grid {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    }
    .message-card {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .message-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
      border-color: rgba(99, 102, 241, 0.3);
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .label {
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sender {
      color: var(--text-primary);
      font-weight: 600;
    }
    .note-section {
      margin-bottom: 1rem;
    }
    .note-text {
      color: var(--text-secondary);
      font-style: italic;
    }
    .content {
      background: rgba(0, 0, 0, 0.3);
      color: #10b981;
      font-family: 'Courier New', monospace;
      padding: 1rem;
      border-radius: 6px;
      margin-top: 0.5rem;
      word-break: break-all;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
  `]
})
export class InboxComponent {
    private messageService = inject(MessageService);
    messages$ = this.messageService.getInbox();

    decrypt(cipher: string, key: string): string {
        try {
            return this.messageService.decryptMessage(cipher, key);
        } catch (e) {
            console.error('Decryption failed', e);
            return 'Error decrypting message';
        }
    }
}
