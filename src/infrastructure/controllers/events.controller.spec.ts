import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';

import { SlotBookedEvent } from '../../domain/events/slot-booked.event';
import { memoryCache } from '../cache/memory-cache';
import { EventsController } from './events.controller';

// Mock EventBus
const mockEventBus = {
  publish: jest.fn(),
};

describe('EventsController', () => {
  let controller: EventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
    memoryCache.clear();
  });

  it('debería invalidar la caché al recibir booking_created', async () => {
    const clubId = 1;
    const courtId = 2;
    const slot = {
      datetime: '2024-06-10',
      price: 100,
      duration: 60,
      start: '10:00',
      end: '11:00',
      _priority: 1,
    };

    const cacheKey = `${clubId}-${slot.datetime}`;
    memoryCache.set(cacheKey, [{ clubId, courts: [] }]);

    await controller.receiveEvent({
      type: 'booking_created',
      clubId,
      courtId,
      slot,
    });

    expect(memoryCache.get(cacheKey)).toBeNull();
    expect(mockEventBus.publish).toHaveBeenCalledWith(
      new SlotBookedEvent(clubId, courtId, slot),
    );
  });

  it('debería invalidar caché cuando se actualiza un club', async () => {
    const clubId = 1;
    const cacheKey1 = `${clubId}-2024-06-10`;
    const cacheKey2 = `${clubId}-2024-06-11`;

    memoryCache.set(cacheKey1, [{ clubId, courts: [] }]);
    memoryCache.set(cacheKey2, [{ clubId, courts: [] }]);

    await controller.receiveEvent({
      type: 'club_updated',
      clubId,
      fields: ['attributes'],
    });

    expect(memoryCache.get(cacheKey1)).toBeNull();
    expect(memoryCache.get(cacheKey2)).toBeNull();
  });
});
