import { Component, inject, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AiAssistantService, ChatMessage } from '../../core/services/ai-assistant.service';
import { ToastService } from '../../core/services/toast.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="ai-page-container">
      <!-- Top Header -->
      <div class="ai-header card">
        <div class="ai-header-info">
          <div class="ai-avatar-badge">
            <app-icon name="sparkles" [size]="24"></app-icon>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <h1 class="ai-title">المساعد الذكي للأسطول</h1>
              <span class="ai-model-pill">
                <span class="pulse-dot"></span>
                Google Gemini Flash Live
              </span>
            </div>
            <p class="ai-subtitle">
              محلل ذكي لحظي لقاعدة بيانات الأسطول: استفسر عن أي مركبة، استهلاك الوقود، الصيانة، قطع الغيار، أداء السائقين والرحلات
            </p>
          </div>
        </div>

        <div class="ai-header-actions">
          <button *ngIf="messages.length > 0"
                  (click)="clearChat()"
                  class="btn btn-outline btn-sm"
                  title="مسح المحادثة وبدء جلسة جديدة"
                  style="display: inline-flex; align-items: center; gap: 6px; border-radius: 8px;">
            <app-icon name="trash" [size]="14"></app-icon>
            <span>محادثة جديدة</span>
          </button>
        </div>
      </div>

      <!-- Chat Body Area -->
      <div class="ai-chat-body" #chatScrollContainer>
        <!-- Welcome Screen (When empty) -->
        <div *ngIf="messages.length === 0" class="ai-welcome-box">
          <div class="welcome-icon-glow">
            <app-icon name="bot" [size]="42"></app-icon>
          </div>
          <h2 style="font-weight: 800; font-size: 1.35rem; color: #0f172a; margin-bottom: 8px;">
            مرحباً بك! أنا مساعدك الذكي في نظام أسطول
          </h2>
          <p style="color: #64748b; font-size: 0.92rem; max-width: 600px; margin: 0 auto 1.5rem auto; line-height: 1.6;">
            يمكنك سؤالي عن أي إحصائية أو استعلام دقيق حول المركبات، السائقين، أذونات التشغيل، سجلات الوقود أو فواصل قطع الغيار.
          </p>

          <div class="quick-prompts-grid">
            <button *ngFor="let prompt of starterPrompts"
                    (click)="sendQuickPrompt(prompt.query)"
                    class="prompt-card">
              <div class="prompt-icon" [style.background]="prompt.bg" [style.color]="prompt.color">
                <app-icon [name]="prompt.icon" [size]="18"></app-icon>
              </div>
              <div class="prompt-text">
                <strong style="color: #1e293b; font-size: 13px; display: block; margin-bottom: 2px;">{{ prompt.title }}</strong>
                <span style="color: #64748b; font-size: 12px;">{{ prompt.query }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Messages Stream -->
        <div *ngFor="let msg of messages; let i = index" class="message-wrapper" [class.user-msg]="msg.role === 'user'" [class.assistant-msg]="msg.role === 'assistant'">
          <!-- Avatar -->
          <div class="msg-avatar">
            <span *ngIf="msg.role === 'user'">أنت</span>
            <app-icon *ngIf="msg.role === 'assistant'" name="sparkles" [size]="16"></app-icon>
          </div>

          <!-- Bubble -->
          <div class="msg-bubble">
            <div class="msg-meta">
              <span class="sender-name">{{ msg.role === 'user' ? 'استفسارك' : 'المساعد الذكي (Gemini Flash)' }}</span>
              <span class="msg-time">{{ msg.timestamp | date:'shortTime' }}</span>
              <button *ngIf="msg.role === 'assistant'"
                      (click)="copyMessage(msg.text)"
                      class="copy-btn"
                      title="نسخ النص">
                <app-icon name="copy" [size]="12"></app-icon>
                <span>نسخ</span>
              </button>
            </div>

            <div class="msg-content" [innerHTML]="formatMarkdown(msg.text)"></div>

            <!-- Follow-up suggestions -->
            <div *ngIf="msg.suggestions && msg.suggestions.length > 0 && i === messages.length - 1" class="msg-suggestions">
              <span style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 4px; display: block;">أسئلة مقترحة للمتابعة:</span>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                <button *ngFor="let s of msg.suggestions"
                        (click)="sendQuickPrompt(s)"
                        class="suggestion-chip">
                  <app-icon name="sparkles" [size]="12"></app-icon>
                  <span>{{ s }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Thinking Loading Indicator -->
        <div *ngIf="isLoading" class="message-wrapper assistant-msg">
          <div class="msg-avatar">
            <app-icon name="sparkles" [size]="16"></app-icon>
          </div>
          <div class="msg-bubble thinking-bubble">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 13px; color: #0284c7; font-weight: 600;">جاري استخراج البيانات الحية من قاعدة البيانات والتحليل عبر Gemini Flash...</span>
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chat Input Dock (Fixed Bottom) -->
      <div class="ai-input-dock card">
        <form (ngSubmit)="sendMessage()" style="display: flex; gap: 0.75rem; align-items: flex-end;">
          <div style="flex: 1; position: relative;">
            <textarea [(ngModel)]="currentInput"
                      name="chatInput"
                      (keydown.enter)="onEnterPress($event)"
                      [disabled]="isLoading"
                      rows="2"
                      placeholder="اسأل المساعد الذكي عن أي شيء في الأسطول (مثال: ما هي أكثر مركبة استهلكت بنزين؟ أو عن السائق فلان)..."
                      class="form-control ai-textarea"></textarea>
          </div>

          <button type="submit"
                  [disabled]="!currentInput.trim() || isLoading"
                  class="btn btn-primary send-btn"
                  style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 52px; padding: 0 20px; border-radius: 10px; font-weight: 700;">
            <app-icon name="send" [size]="18"></app-icon>
            <span style="display: inline-block;">إرسال</span>
          </button>
        </form>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 11px; color: #94a3b8;">
          <span>اضغط <strong>Enter</strong> للإرسال، أو <strong>Shift + Enter</strong> لسطر جديد</span>
          <span>⚡ تحليل مباشر لحظي لقاعدة بيانات الأسطول عبر Google Gemini Flash</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ai-page-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 110px);
      max-height: calc(100vh - 110px);
      gap: 0.75rem;
    }
    .ai-header {
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      border-radius: 12px;
      flex-shrink: 0;
    }
    .ai-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .ai-avatar-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7, #6366f1);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
      flex-shrink: 0;
    }
    .ai-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .ai-model-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      background: #eff6ff;
      color: #0284c7;
      border: 1px solid #bfdbfe;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 700;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .ai-subtitle {
      font-size: 0.8rem;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    /* Chat Body */
    .ai-chat-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      scroll-behavior: smooth;
    }
    .ai-welcome-box {
      text-align: center;
      padding: 2.5rem 1rem;
      margin: auto;
      max-width: 800px;
    }
    .welcome-icon-glow {
      width: 76px;
      height: 76px;
      border-radius: 20px;
      background: linear-gradient(135deg, #e0f2fe, #ede9fe);
      color: #0284c7;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      box-shadow: 0 10px 25px rgba(2, 132, 199, 0.2);
    }
    .quick-prompts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 0.85rem;
      text-align: right;
    }
    .prompt-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: right;
    }
    .prompt-card:hover {
      border-color: #0284c7;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.12);
      transform: translateY(-2px);
    }
    .prompt-icon {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* Message Bubbles */
    .message-wrapper {
      display: flex;
      gap: 12px;
      max-width: 88%;
      animation: fadeIn 0.2s ease;
    }
    .message-wrapper.user-msg {
      align-self: flex-start;
      flex-direction: row;
    }
    .message-wrapper.assistant-msg {
      align-self: flex-start;
      flex-direction: row;
      max-width: 95%;
    }
    .msg-avatar {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-weight: 700;
      font-size: 12px;
    }
    .user-msg .msg-avatar {
      background: #0f172a;
      color: #ffffff;
    }
    .assistant-msg .msg-avatar {
      background: linear-gradient(135deg, #0284c7, #6366f1);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
    }

    .msg-bubble {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px 18px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      flex: 1;
    }
    .user-msg .msg-bubble {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #14532d;
    }
    .assistant-msg .msg-bubble {
      background: #ffffff;
      border-color: #e2e8f0;
    }
    .thinking-bubble {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
    }
    .msg-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 11.5px;
      color: #64748b;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      padding-bottom: 4px;
    }
    .sender-name {
      font-weight: 700;
      color: #334155;
    }
    .copy-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .copy-btn:hover {
      background: #f1f5f9;
      color: #0284c7;
    }
    .msg-content {
      font-size: 13.5px;
      line-height: 1.65;
      color: #1e293b;
      word-break: break-word;
    }
    .msg-content h3, .msg-content h4 {
      margin-top: 10px;
      margin-bottom: 6px;
      color: #0f172a;
      font-weight: 700;
    }
    .msg-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 12.5px;
    }
    .msg-content th, .msg-content td {
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      text-align: right;
    }
    .msg-content th {
      background: #f8fafc;
      font-weight: 700;
    }
    .msg-content ul {
      padding-right: 18px;
      margin: 6px 0;
    }
    .msg-content li {
      margin-bottom: 4px;
    }

    .msg-suggestions {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed #e2e8f0;
    }
    .suggestion-chip {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0369a1;
      padding: 5px 11px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s ease;
    }
    .suggestion-chip:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    /* Typing Dots */
    .typing-indicator {
      display: inline-flex;
      gap: 4px;
    }
    .typing-indicator span {
      width: 6px;
      height: 6px;
      background: #0284c7;
      border-radius: 50%;
      display: inline-block;
      animation: bounce 1.2s infinite ease-in-out;
    }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    /* Input Dock */
    .ai-input-dock {
      padding: 0.85rem 1.25rem;
      border-radius: 12px;
      flex-shrink: 0;
      background: #ffffff;
      box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.03);
    }
    .ai-textarea {
      resize: none;
      font-size: 13.5px;
      border-radius: 10px;
      padding: 10px 14px;
      line-height: 1.5;
    }
    .ai-textarea:focus {
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    @media (max-width: 768px) {
      .ai-page-container {
        height: calc(100vh - 85px);
      }
      .message-wrapper {
        max-width: 95%;
      }
      .quick-prompts-grid {
        grid-template-columns: 1fr;
      }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AiAssistantComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatScrollContainer') private chatScrollContainer!: ElementRef;

  private aiService = inject(AiAssistantService);
  private toastService = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  messages: ChatMessage[] = [];
  currentInput = '';
  isLoading = false;
  private shouldScrollBottom = false;

  starterPrompts = [
    {
      title: 'أكثر سيارة عملت رحلات',
      query: 'ما هي أكثر مركبة نفذت رحلات في الأسطول وإجمالي المسافات المقطوعة؟',
      icon: 'truck',
      bg: '#eff6ff',
      color: '#2563eb'
    },
    {
      title: 'أعلى استهلاك وتكلفة وقود',
      query: 'ما هي أكثر سيارة استهلكت بنزين أو وقود وما هو إجمالي تكلفتها؟',
      icon: 'fuel',
      bg: '#fff7ed',
      color: '#ea580c'
    },
    {
      title: 'فحص قطع الغيار والزيوت',
      query: 'هل توجد أي مركبات تحتاج صيانة أو تغيير زيوت أو قطع غيار عاجلة؟',
      icon: 'wrench',
      bg: '#fef2f2',
      color: '#dc2626'
    },
    {
      title: 'أداء السائقين والكوادر',
      query: 'من هم أكثر السائقين نشاطاً في تنفيذ الرحلات؟ وهل توجد رخص منتهية؟',
      icon: 'users',
      bg: '#faf5ff',
      color: '#7c3aed'
    }
  ];

  ngOnInit(): void {
    // Check if there is stored chat in sessionStorage
    const saved = sessionStorage.getItem('astol_ai_chat');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.messages = parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        this.messages = [];
      }
    }
    this.cdr.detectChanges();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  scrollToBottom(): void {
    try {
      if (this.chatScrollContainer) {
        this.chatScrollContainer.nativeElement.scrollTop = this.chatScrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  onEnterPress(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      keyEvent.preventDefault();
      this.sendMessage();
    }
  }

  sendQuickPrompt(text: string): void {
    this.currentInput = text;
    this.sendMessage();
  }

  sendMessage(): void {
    const text = this.currentInput.trim();
    if (!text || this.isLoading) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date()
    };
    this.messages.push(userMsg);
    this.currentInput = '';
    this.isLoading = true;
    this.shouldScrollBottom = true;
    this.cdr.detectChanges();
    setTimeout(() => this.scrollToBottom(), 20);

    // Build history for backend
    const historyPayload = this.messages.slice(-8).map(m => ({
      role: m.role,
      text: m.text
    }));

    this.aiService.sendMessage(text, historyPayload).subscribe({
      next: (res) => {
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: res.reply,
          timestamp: new Date(res.timestamp || Date.now()),
          suggestions: res.suggestions
        };
        this.messages.push(assistantMsg);
        this.isLoading = false;
        this.shouldScrollBottom = true;
        this.saveChat();
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 30);
      },
      error: (err) => {
        this.isLoading = false;
        const errMsg = err.error?.error || 'حدث خطأ في الاتصال بالمساعد الذكي';
        this.toastService.error(errMsg);
        const failMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: `⚠️ **عذراً، حدث خطأ أثناء المعالجة:**\n${errMsg}\n\nيرجى المحاولة مرة أخرى أو التحقق من اتصال الشبكة.`,
          timestamp: new Date()
        };
        this.messages.push(failMsg);
        this.shouldScrollBottom = true;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 30);
      }
    });
  }

  clearChat(): void {
    this.messages = [];
    sessionStorage.removeItem('astol_ai_chat');
    this.cdr.detectChanges();
    this.toastService.info('تم بدء محادثة جديدة');
  }

  copyMessage(text: string): void {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.toastService.success('تم نسخ النص إلى الحافظة');
      });
    }
  }

  private saveChat(): void {
    try {
      sessionStorage.setItem('astol_ai_chat', JSON.stringify(this.messages.slice(-20)));
    } catch (e) {}
  }

  formatMarkdown(content: string): SafeHtml {
    if (!content) return '';

    let html = content
      // Escape HTML tags to prevent XSS
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.*$)/gim, '<h4 style="font-weight:700; color:#0f172a; margin: 10px 0 4px 0;">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 style="font-weight:800; color:#0f172a; margin: 12px 0 6px 0;">$1</h3>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#0f172a; font-weight:700;">$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Horizontal Rule
      .replace(/^---$/gim, '<hr style="border:0; border-top:1px solid #e2e8f0; margin:10px 0;">')
      // Tables: lines with pipes
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim().length > 0);
        if (cells.some(c => c.includes('---'))) {
          return ''; // separator row
        }
        const row = cells.map(c => `<td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${c.trim()}</td>`).join('');
        return `<table style="width:100%; border-collapse:collapse; margin:8px 0; background:#f8fafc; border-radius:6px; overflow:hidden;"><tr>${row}</tr></table>`;
      })
      // Bullet points
      .replace(/^\s*[\*\-]\s+(.*$)/gim, '<li style="margin-bottom:3px;">$1</li>')
      // Line breaks
      .replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
