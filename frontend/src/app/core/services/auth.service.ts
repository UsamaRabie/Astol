import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { User, AuthResponse } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = 'http://127.0.0.1:8000/api';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const userJson = localStorage.getItem('astol_user');
    const token = localStorage.getItem('astol_access_token');
    if (userJson && token) {
      try {
        const user: User = JSON.parse(userJson);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } catch (e) {
        this.logout();
      }
    }
  }

  login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login/`, credentials).pipe(
      tap(res => {
        localStorage.setItem('astol_access_token', res.access);
        localStorage.setItem('astol_refresh_token', res.refresh);
        localStorage.setItem('astol_user', JSON.stringify(res.user));
        this.currentUserSubject.next(res.user);
        this.isAuthenticatedSubject.next(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('astol_access_token');
    localStorage.removeItem('astol_refresh_token');
    localStorage.removeItem('astol_user');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('astol_access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('astol_refresh_token');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAdmin(): boolean {
    const u = this.getCurrentUser();
    return u ? u.role === 'ADMIN' : false;
  }

  isOperator(): boolean {
    const u = this.getCurrentUser();
    return u ? u.role === 'OPERATOR' : false;
  }

  isReporter(): boolean {
    const u = this.getCurrentUser();
    return u ? u.role === 'REPORTER' : false;
  }

  canWrite(): boolean {
    const u = this.getCurrentUser();
    return u ? (u.role === 'ADMIN' || u.role === 'OPERATOR') : false;
  }

  refreshToken(): Observable<{ access: string }> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }
    return this.http.post<{ access: string }>(`${this.apiUrl}/auth/refresh/`, { refresh }).pipe(
      tap(res => {
        localStorage.setItem('astol_access_token', res.access);
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }
}
