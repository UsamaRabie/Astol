export const environment = {
  production: false,
  get apiUrl(): string {
    if (typeof window !== 'undefined' && window.location.port !== '4200') {
      return '/api';
    }
    return 'http://127.0.0.1:8000/api';
  }
};
