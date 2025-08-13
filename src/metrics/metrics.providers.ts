import { makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';

export const AUTH_METRICS_PROVIDERS = [
  makeCounterProvider({
    name: 'tuvcb_auth_login_attempts_total',
    help: 'Total number of login attempts',
    labelNames: ['status'],
  }),
  makeHistogramProvider({
    name: 'tuvcb_auth_login_duration_seconds',
    help: 'Duration of login requests in seconds',
    buckets: [0.1, 0.5, 1, 2, 5],
  }),
  makeGaugeProvider({
    name: 'tuvcb_auth_active_sessions',
    help: 'Number of active user sessions',
  }),
];
