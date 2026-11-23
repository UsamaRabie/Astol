import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  suggestions?: string[];
}

export interface ChatResponse {
  success: boolean;
  reply: string;
  suggestions?: string[];
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiAssistantService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ai-assistant`;

  sendMessage(message: string, history: Array<{ role: string; text: string }>): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/chat/`, {
      message,
      history
    });
  }

  getSuggestions(): Observable<{ success: boolean; suggestions: string[] }> {
    return this.http.get<{ success: boolean; suggestions: string[] }>(`${this.apiUrl}/suggestions/`);
  }
}
