import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { VisitsService } from '../../modules/front-desk/application/visits.service';

@Injectable()
export class QueueHeaderInterceptor implements NestInterceptor {
  constructor(private readonly visits: VisitsService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    void this.visits.waitingQueue();
    return next.handle();
  }
}
