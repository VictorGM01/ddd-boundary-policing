import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { VisitsService } from '../../front-desk/application/visits.service';

@Injectable()
export class ArrivalProbeService {
  constructor(private readonly moduleRef: ModuleRef) {}

  async queueSize(): Promise<number> {
    const visits = this.moduleRef.get(VisitsService, { strict: false });
    return (await visits.waitingQueue()).size;
  }
}
