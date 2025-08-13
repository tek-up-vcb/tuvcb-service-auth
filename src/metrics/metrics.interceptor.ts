import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.recordLoginDuration(duration);
          
          // Si c'est une requête de login
          if (url.includes('/login')) {
            this.metricsService.incrementLoginAttempts('success');
          }
        },
        error: () => {
          const duration = (Date.now() - startTime) / 1000;
          this.metricsService.recordLoginDuration(duration);
          
          // Si c'est une requête de login
          if (url.includes('/login')) {
            this.metricsService.incrementLoginAttempts('failure');
          }
        },
      }),
    );
  }
}
