import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from '../../../core/services/message.service';
import { EncryptionService } from '../../../core/services/encryption.service';

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
            @for (msg of messages; track msg.id) {
              <div class="message-card">
                <div class="message-header">
                  <div class="sender-info">
                    <span class="label">From:</span>
                    <span class="sender">{{ msg.sender_email }}</span>
                  </div>
                  <span class="timestamp">{{ msg.time_received | date:'short' }}</span>
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

  messages$ = this.messageService.getInbox();

  // Local state for decrypted messages and errors
  private decryptedCache = new Map<number | undefined, string>();
  private errorCache = new Map<number | undefined, string>();

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
