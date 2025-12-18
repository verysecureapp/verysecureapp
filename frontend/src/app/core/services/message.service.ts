import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Message {
    id?: number;
    sender_email?: string;
    note?: string;
    ciphertext_hex?: string;
    otp_key_hex?: string;
    content?: string;
    timestamp?: string;
}

export interface SendMessageResponse {
    otp_key_hex: string;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class MessageService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUri;

    sendMessage(recipient_email: string, plaintext: string, note: string): Observable<SendMessageResponse> {
        return this.http.post<SendMessageResponse>(`${this.apiUrl}/messages/`, {
            recipient_email,
            plaintext,
            note
        });
    }

    getInbox(): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.apiUrl}/messages/inbox`);
    }

    decryptMessage(cipherHex: string, keyHex: string): string {
        const cipherMatch = cipherHex.match(/.{1,2}/g);
        const keyMatch = keyHex.match(/.{1,2}/g);

        if (!cipherMatch || !keyMatch) {
            return 'Error: Invalid hex format';
        }

        const cipher = Uint8Array.from(cipherMatch.map((b) => parseInt(b, 16)));
        const key = Uint8Array.from(keyMatch.map((b) => parseInt(b, 16)));

        // XOR decryption
        const plain = cipher.map((c, i) => c ^ key[i]);
        return new TextDecoder().decode(plain);
    }
}
