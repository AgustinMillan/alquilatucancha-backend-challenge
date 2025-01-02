import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient: AlquilaTuCanchaClient,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    const clubs = await this.alquilaTuCanchaClient.getClubs(query.placeId);
    const courtsPromises = clubs.map((club) =>
      this.alquilaTuCanchaClient.getCourts(club.id).then((courts) => ({
        club,
        courts,
      })),
    );
    const clubsWithCourts = await Promise.all(courtsPromises);

    const clubsWithAvailabilityPromises = clubsWithCourts.map(
      ({ club, courts }) =>
        Promise.all(
          courts.map((court) =>
            this.alquilaTuCanchaClient
              .getAvailableSlots(club.id, court.id, query.date)
              .then((slots) => ({
                ...court,
                available: slots,
              })),
          ),
        ).then((courtsWithAvailability) => ({
          ...club,
          courts: courtsWithAvailability,
        })),
    );

    const clubsWithAvailability = await Promise.all(
      clubsWithAvailabilityPromises,
    );

    return clubsWithAvailability;
  }
}
