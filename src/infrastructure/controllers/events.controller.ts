import { Body, Controller, Post } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { UseZodGuard } from 'nestjs-zod';
import { z } from 'nestjs-zod/z';

import { ClubUpdatedEvent } from '../../domain/events/club-updated.event';
import { CourtUpdatedEvent } from '../../domain/events/court-updated.event';
import { SlotBookedEvent } from '../../domain/events/slot-booked.event';
import { SlotAvailableEvent } from '../../domain/events/slot-cancelled.event';
import { memoryCache } from '../../infrastructure/cache/memory-cache';

const SlotSchema = z.object({
  price: z.number(),
  duration: z.number(),
  datetime: z.string(),
  start: z.string(),
  end: z.string(),
  _priority: z.number(),
});

export const ExternalEventSchema = z.union([
  z.object({
    type: z.enum(['booking_cancelled', 'booking_created']),
    clubId: z.number().int(),
    courtId: z.number().int(),
    slot: SlotSchema,
  }),
  z.object({
    type: z.literal('club_updated'),
    clubId: z.number().int(),
    fields: z.array(
      z.enum(['attributes', 'openhours', 'logo_url', 'background_url']),
    ),
  }),
  z.object({
    type: z.literal('court_updated'),
    clubId: z.number().int(),
    courtId: z.number().int(),
    fields: z.array(z.enum(['attributes', 'name'])),
  }),
]);

export type ExternalEventDTO = z.infer<typeof ExternalEventSchema>;

@Controller('events')
export class EventsController {
  constructor(private eventBus: EventBus) {}

  @Post()
  @UseZodGuard('body', ExternalEventSchema)
  async receiveEvent(@Body() externalEvent: ExternalEventDTO) {
    switch (externalEvent.type) {
      case 'booking_created':
        this.eventBus.publish(
          new SlotBookedEvent(
            externalEvent.clubId,
            externalEvent.courtId,
            externalEvent.slot,
          ),
        );
        this.invalidateCacheByClubAndDate(
          externalEvent.clubId,
          externalEvent.slot.datetime,
        );
        break;

      case 'booking_cancelled':
        this.eventBus.publish(
          new SlotAvailableEvent(
            externalEvent.clubId,
            externalEvent.courtId,
            externalEvent.slot,
          ),
        );
        this.invalidateCacheByClubAndDate(
          externalEvent.clubId,
          externalEvent.slot.datetime,
        );
        break;

      case 'club_updated':
        this.eventBus.publish(
          new ClubUpdatedEvent(externalEvent.clubId, externalEvent.fields),
        );
        this.invalidateCacheByClub(externalEvent.clubId);
        break;

      case 'court_updated':
        this.eventBus.publish(
          new CourtUpdatedEvent(
            externalEvent.clubId,
            externalEvent.courtId,
            externalEvent.fields,
          ),
        );
        this.invalidateCacheByClub(externalEvent.clubId);
        break;
    }
  }

  private invalidateCacheByClubAndDate(clubId: number, date: string) {
    const keys = Array.from(memoryCache['cache'].keys());
    keys.forEach((key) => {
      if (key.startsWith(`${clubId}-${date}`)) {
        memoryCache.delete(key);
        console.log(`Caché invalidado: ${key}`);
      }
    });
  }

  private invalidateCacheByClub(clubId: number) {
    const keys = Array.from(memoryCache['cache'].keys());
    keys.forEach((key) => {
      if (key.startsWith(`${clubId}-`)) {
        memoryCache.delete(key);
        console.log(`Caché invalidado: ${key}`);
      }
    });
  }
}
