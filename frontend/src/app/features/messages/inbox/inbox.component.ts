import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MessageService } from '../../../core/services/message.service';
import { EncryptionService } from '../../../core/services/encryption.service';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="inbox-container">
      <div class="page-header">
        <h2 class="page-title">Inbox</h2>
        <button (click)="onRefresh()" class="refresh-btn" title="Refresh Messages">
            &#x21bb; Refresh
        </button>
      </div>
      @if (messages$ | async; as messages) {
        @if (messages.length === 0) {
          <div class="empty-state">
            <p>No messages found.</p>
          </div>
        } @else {
          <div class="message-grid">
            @for (msg of messages; track msg.id) {
              <div class="message-card">
                <div class="message-header">
                  <div class="sender-info">
                    <span class="label">From:</span>
                    <span class="sender">{{ msg.sender_email }}</span>
                  </div>
                  <div class="header-right">
                    <span class="timestamp">{{ msg.time_received | date:'short' }}</span>
                    <button class="delete-btn" (click)="onDelete(msg.id)" title="Delete Message">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                            <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                        </svg>
                    </button>
                  </div>
                </div>
                <div class="message-body">
                  <div class="note-section">
                    <span class="label">Subject:</span>
                    <span class="note-text">{{ msg.subject || 'No subject' }}</span>
                  </div>
                  <div class="content-section">
                    <span class="label block-label">Encrypted Message:</span>
                    <div class="content">{{ msg.message }}</div>
                    
                    @if (isDecrypted(msg.id)) {
                        <div class="decrypted-result">
                            <span class="label success block-label">Decrypted Content:</span>
                            <div class="plaintext">{{ getDecryptedContent(msg.id) }}</div>
                        </div>
                    } @else {
                        <div class="decrypt-controls">
                            <input #keyInput 
                                type="text" 
                                placeholder="Paste One-Time Pad Key here..."
                                class="key-input"
                                (keyup.enter)="onDecrypt(msg.id, msg.message, keyInput.value)"
                            >
                            <button (click)="onDecrypt(msg.id, msg.message, keyInput.value)" class="btn-decrypt">
                                Decrypt
                            </button>
                        </div>
                        @if (getError(msg.id); as error) {
                            <div class="error-msg">{{ error }}</div>
                        }
                    }
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
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .page-title {
      font-size: 1.8rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    .refresh-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: var(--text-primary);
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
      font-size: 0.9rem;
    }
    .refresh-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }
    .refresh-btn:active {
      transform: translateY(0);
    }
    .message-grid {
      display: grid;
      gap: 1.5rem;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    }
    .message-card {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .message-card:hover {
      box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
      border-color: rgba(99, 102, 241, 0.3);
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .header-right {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .delete-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-secondary);
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 6px;
        line-height: 0;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .delete-btn:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border-color: rgba(239, 68, 68, 0.3);
    }
    .sender-info {
      display: flex;
      gap: 0.5rem;
      align-items: baseline;
    }
    .label {
      color: var(--text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 500;
    }
    .block-label {
      display: block;
      margin-bottom: 0.5rem;
    }
    .label.success {
        color: #34d399;
    }
    .sender {
      color: var(--text-primary);
      font-weight: 600;
      font-size: 0.95rem; /* Matched to look consistent */
      word-break: break-all;
    }
    .timestamp {
      color: var(--text-secondary);
      font-size: 0.75rem;
      white-space: nowrap;
    }
    .note-section {
      margin-bottom: 1.25rem;
      display: flex;
      gap: 0.5rem;
      align-items: baseline;
    }
    .note-text {
      color: var(--text-primary);
      font-size: 0.95rem;
    }
    .content {
      background: rgba(0, 0, 0, 0.3);
      color: var(--text-secondary);
      font-family: 'Courier New', monospace;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.85rem;
      word-break: break-all;
      border: 1px dashed rgba(255, 255, 255, 0.1);
      margin-bottom: 1rem;
      max-height: 100px;
      overflow-y: auto;
    }
    .decrypt-controls {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }
    .key-input {
        flex: 1;
        padding: 0.5rem;
        border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(0,0,0,0.2);
        color: white;
        font-family: monospace;
    }
    .btn-decrypt {
        padding: 0.5rem 1rem;
        background: var(--accent-color);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s;
    }
    .btn-decrypt:hover {
        background: var(--accent-hover);
    }
    .decrypted-result {
        animation: fadeIn 0.3s ease-out;
    }
    .plaintext {
        background: rgba(16, 185, 129, 0.1);
        color: #34d399;
        padding: 1rem;
        border-radius: 6px;
        border: 1px solid rgba(5, 150, 105, 0.3);
        word-break: break-word;
        font-weight: 500;
    }
    .error-msg {
        color: #f87171;
        font-size: 0.85rem;
        margin-top: 0.5rem;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class InboxComponent {
  private messageService = inject(MessageService);
  private encryptionService = inject(EncryptionService);

  private refreshTrigger = new BehaviorSubject<void>(undefined);

  messages$ = this.refreshTrigger.pipe(
    switchMap(() => timer(0, 30000).pipe(
      switchMap(() => this.messageService.getInbox())
    ))
  );

  // Local state for decrypted messages and errors
  private decryptedCache = new Map<number | undefined, string>();
  private errorCache = new Map<number | undefined, string>();

  onRefresh() {
    this.refreshTrigger.next();
  }

  onDelete(id: number | undefined) {
    if (!id) return;

    // In a real app, we might want to show a confirmation dialog here
    if (confirm('Are you sure you want to delete this message?')) {
      this.messageService.deleteMessage(id).subscribe({
        next: () => {
          this.onRefresh();
        },
        error: (err) => {
          console.error('Failed to delete message', err);
          alert('Failed to delete message');
        }
      });
    }
  }

  onDecrypt(id: number | undefined, ciphertext: string | undefined, key: string) {
    if (!id || !ciphertext) return;

    this.errorCache.delete(id);

    if (!key || !key.trim()) {
      this.errorCache.set(id, 'Please enter a key.');
      return;
    }

    try {
      const plaintext = this.encryptionService.decrypt(ciphertext, key.trim());
      this.decryptedCache.set(id, plaintext);
    } catch (e: any) {
      this.errorCache.set(id, 'Decryption failed: ' + e.message);
    }
  }

  isDecrypted(id: number | undefined): boolean {
    return this.decryptedCache.has(id);
  }

  getDecryptedContent(id: number | undefined): string {
    return this.decryptedCache.get(id) || '';
  }

  getError(id: number | undefined): string | undefined {
    return this.errorCache.get(id);
  }
}
