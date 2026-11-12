import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ClinicalEvents, EncounterCompleted } from '@/contracts/clinical.events';
import { InvoicingService } from '../application/invoicing.service';

@Injectable()
export class ClinicalEventsListener {
  constructor(private readonly invoicing: InvoicingService) {}

  @OnEvent(ClinicalEvents.EncounterCompleted)
  async onEncounterCompleted(event: EncounterCompleted): Promise<number> {
    const invoice = await this.invoicing.invoiceEncounter({
      encounterId: event.encounterId,
      payerId: event.personId,
      procedureCodes: event.procedureCodes,
    });
    return invoice.totalCents;
  }
}
