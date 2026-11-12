import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Global()
@Module({
  providers: [
    {
      provide: 'INVOICING',
      inject: [ModuleRef],
      useFactory: (ref: ModuleRef) => ref.get('InvoicingService', { strict: false }),
    },
  ],
  exports: ['INVOICING'],
})
export class ContextBridgeModule {}
