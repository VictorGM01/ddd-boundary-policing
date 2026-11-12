export class Patient {
  constructor(readonly personId: string, readonly medicalRecordNumber: string) {}
}

export interface FollowUpBooking {
  patient: Patient;
  reasonForReturn: string;
  startsAt: Date;
}
