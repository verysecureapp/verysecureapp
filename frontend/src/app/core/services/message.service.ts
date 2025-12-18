import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Message {
    id?: number;
    sender_email?: string;
    subject?: string;
    ciphertext_hex?: string;
    otp_key_hex?: string;
    message?: string;
    time_received?: string;
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

    sendMessage(recipient_email: string, message: string, subject: string): Observable<SendMessageResponse> {
        return this.http.post<SendMessageResponse>(`${this.apiUrl}/messages/`, {
            recipient_email,
            message,
            subject
        });
    }

    getInbox(): Observable<Message[]> {
        return this.http.get<Message[]>(`${this.apiUrl}/messages/inbox`);
    }

    deleteMessage(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/messages/${id}`);
    }
}
