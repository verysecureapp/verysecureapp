import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from '../../../core/services/message.service';
import { Router } from '@angular/router';
import { EncryptionService } from '../../../core/services/encryption.service';

@Component({
  selector: 'app-send-message',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="send-container">
      <h2 class="page-title">Send Secure Message</h2>
      
      <form [formGroup]="messageForm" (ngSubmit)="onSubmit()" class="message-form">
        <div class="form-group">
          <label for="recipient">Recipient Email</label>
          <input 
            id="recipient" 
            type="email" 
            formControlName="recipient_email" 
            placeholder="user@example.com"
            [class.error]="isFieldInvalid('recipient_email')"
          >
          @if (isFieldInvalid('recipient_email')) {
            <div class="error-msg">Please enter a valid email address.</div>
          }
        </div>

        <div class="form-group">
          <label for="subject">Subject (Public)</label>
          <input 
            id="subject" 
            type="text" 
            formControlName="subject" 
            placeholder="Brief subject or note..."
          >
        </div>

        <div class="form-group">
          <label for="plaintext">Message (Encrypted)</label>
          <textarea 
            id="plaintext" 
            formControlName="plaintext" 
            rows="6" 
            placeholder="Type your secret message here..."
            [class.error]="isFieldInvalid('plaintext')"
          ></textarea>
           @if (isFieldInvalid('plaintext')) {
            <div class="error-msg">Message must be at least 1 character.</div>
          }
        </div>

        <div class="actions">
          <button type="submit" [disabled]="messageForm.invalid || isSubmitting" class="btn-send">
            @if (isSubmitting) {
              Encrypting & Sending...
            } @else {
              Send Secure Message
            }
          </button>
        </div>

        @if (statusMessage) {
          <div class="status-message" [class.success]="!isError" [class.error]="isError">
            {{ statusMessage }}
          </div>
        }

        @if (generatedKey) {
            <div class="key-display">
                <h3>Encryption Key Generated!</h3>
                <p>Please share this key securely with the recipient. It will NOT be stored and cannot be recovered.</p>
                <div class="key-box">
                    <code>{{ generatedKey }}</code>
                    <button type="button" (click)="copyKey()" class="btn-copy">Copy</button>
                </div>
            </div>
        }
      </form>
    </div>
  `,
  styles: [`
    .send-container {
      max-width: 600px;
      margin: 0 auto;
    }
    .message-form {
      background: var(--bg-card);
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-primary);
      font-weight: 500;
      font-size: 0.95rem;
    }
    input, textarea {
      width: 100%;
      padding: 0.875rem;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: var(--text-primary);
      font-family: inherit;
      transition: all 0.2s;
      box-sizing: border-box;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
      background: rgba(0, 0, 0, 0.4);
    }
    input.error, textarea.error {
      border-color: var(--danger-color);
    }
    .error-msg {
      color: var(--danger-color);
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }
    .actions {
      margin-top: 2rem;
    }
    .btn-send {
      width: 100%;
      padding: 1rem;
      background: var(--accent-color);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-send:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: translateY(-1px);
    }
    .btn-send:disabled {
      background: #475569;
      cursor: not-allowed;
      opacity: 0.7;
    }
    /* Status Messages */
    .status-message {
      margin-top: 1.5rem;
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
      font-weight: 500;
    }
    .status-message.success {
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
      border: 1px solid rgba(5, 150, 105, 0.2);
    }
    .status-message.error {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(220, 38, 38, 0.2);
    }
    .key-display {
        margin-top: 2rem;
        background: rgba(99, 102, 241, 0.1);
        border: 1px solid rgba(99, 102, 241, 0.3);
        padding: 1.5rem;
        border-radius: 8px;
    }
    .key-display h3 {
        margin: 0 0 0.5rem 0;
        color: var(--accent-color);
    }
    .key-display p {
        margin: 0 0 1rem 0;
        font-size: 0.9rem;
        color: var(--text-secondary);
    }
    .key-box {
        display: flex;
        gap: 0.5rem;
        background: rgba(0,0,0,0.3);
        padding: 0.75rem;
        border-radius: 6px;
        align-items: center;
    }
    .key-box code {
        flex: 1;
        font-family: monospace;
        word-break: break-all;
        color: var(--text-primary);
    }
    .btn-copy {
        background: rgba(255,255,255,0.1);
        border: none;
        color: var(--text-primary);
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
    }
    .btn-copy:hover {
        background: rgba(255,255,255,0.2);
    }
  `]
})
export class SendMessageComponent {
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private encryptionService = inject(EncryptionService);
  private router = inject(Router);

  messageForm = this.fb.group({
    recipient_email: ['', [Validators.required, Validators.email]],
    subject: [''],
    plaintext: ['', [Validators.required, Validators.minLength(1)]]
  });

  isSubmitting = false;
  statusMessage = '';
  isError = false;
  generatedKey = '';

  isFieldInvalid(fieldName: string): boolean {
    const field = this.messageForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  onSubmit() {
    if (this.messageForm.invalid) return;

    this.isSubmitting = true;
    this.statusMessage = '';
    this.isError = false;
    this.generatedKey = '';

    const { recipient_email, plaintext, subject } = this.messageForm.value;

    try {
      // 1. Generate Key
      // Calculate length of plaintext in bytes for correct key length
      const textBytes = new TextEncoder().encode(plaintext!);
      const keyHex = this.encryptionService.generateKey(textBytes.length);

      // 2. Encrypt
      const cipherHex = this.encryptionService.encrypt(plaintext!, keyHex);

      // 3. Send
      this.messageService.sendMessage(recipient_email!, cipherHex, subject || '').subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.statusMessage = 'Message sent successfully!';
          this.generatedKey = keyHex;
          this.messageForm.reset();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.isError = true;
          this.statusMessage = 'Failed to send message: ' + (err.error?.detail || err.message);
        }
      });
    } catch (e: any) {
      this.isSubmitting = false;
      this.isError = true;
      this.statusMessage = 'Encryption failed: ' + e.message;
    }
  }

  copyKey() {
    navigator.clipboard.writeText(this.generatedKey);
    // Could add a toast here
  }
}
