import { Injectable } from '@nestjs/common';
import { Appointment } from '@/modules/scheduling/domain/appointment';

@Injectable()
export class GreetingService {
  greet(appointment: Appointment): string {
    return `Welcome, ${appointment.requester.name}`;
  }
}
