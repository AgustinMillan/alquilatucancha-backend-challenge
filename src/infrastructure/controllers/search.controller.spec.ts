import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import * as moment from 'moment';

import { GetAvailabilityQuery } from '../../domain/commands/get-availaiblity.query';
import { memoryCache } from '../cache/memory-cache';
import { SearchController } from './search.controller';

const mockQueryBus = {
  execute: jest.fn(),
};

describe('SearchController', () => {
  let controller: SearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    memoryCache.clear();
  });

  it('debería devolver datos desde la caché si existen', async () => {
    const placeId = '123';
    const date = new Date();
    const cacheKey = `${placeId}-${moment(date).format('YYYY-MM-DD')}`;
    const cachedData = [{ clubId: 1, courts: [] }];

    memoryCache.set(cacheKey, cachedData);

    const result = await controller.searchAvailability({ placeId, date });

    expect(result).toEqual(cachedData);
    expect(mockQueryBus.execute).not.toHaveBeenCalled();
  });

  it('debería ejecutar QueryBus si no hay caché', async () => {
    const placeId = '123';
    const date = new Date();
    const resultData = [{ clubId: 1, courts: [] }];

    mockQueryBus.execute.mockResolvedValue(resultData);

    const result = await controller.searchAvailability({ placeId, date });

    expect(result).toEqual(resultData);
    expect(mockQueryBus.execute).toHaveBeenCalledWith(
      new GetAvailabilityQuery(placeId, date),
    );

    const cacheKey = `${placeId}-${moment(date).format('YYYY-MM-DD')}`;
    expect(memoryCache.get(cacheKey)).toEqual(resultData);
  });
});
