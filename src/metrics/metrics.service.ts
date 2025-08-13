import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, register } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly loginAttemptsCounter: Counter<string>;
  private readonly loginDurationHistogram: Histogram<string>;
  private readonly activeSessionsGauge: Gauge<string>;

  constructor() {
    // Initialisation des métriques
    this.loginAttemptsCounter = new Counter({
      name: 'tuvcb_auth_login_attempts_total',
      help: 'Total number of login attempts',
      labelNames: ['status'],
    });

    this.loginDurationHistogram = new Histogram({
      name: 'tuvcb_auth_login_duration_seconds',
      help: 'Duration of login requests in seconds',
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.activeSessionsGauge = new Gauge({
      name: 'tuvcb_auth_active_sessions',
      help: 'Number of active user sessions',
    });

    // Enregistrement des métriques
    register.registerMetric(this.loginAttemptsCounter);
    register.registerMetric(this.loginDurationHistogram);
    register.registerMetric(this.activeSessionsGauge);
  }

  // Méthodes pour incrémenter les métriques
  incrementLoginAttempts(status: 'success' | 'failure') {
    this.loginAttemptsCounter.labels({ status }).inc();
  }

  recordLoginDuration(duration: number) {
    this.loginDurationHistogram.observe(duration);
  }

  setActiveSessions(count: number) {
    this.activeSessionsGauge.set(count);
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
