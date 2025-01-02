import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axiosRetry from 'axios-retry';
import * as moment from 'moment';

import { formatApiError } from '../../domain/model/api-error';
import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;
  constructor(private httpService: HttpService, config: ConfigService) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');

    axiosRetry(this.httpService.axiosRef, {
      retries: 3,
      retryDelay: (retryCount) => {
        console.log(`Reintentando solicitud: intento #${retryCount}`);
        return retryCount * 1000;
      },
      retryCondition: (error) => {
        return error.response?.status === 500 || !error.response;
      },
    });
  }

  async getClubs(placeId: string): Promise<Club[]> {
    try {
      const response = await this.httpService.axiosRef.get('clubs', {
        baseURL: this.base_url,
        params: { placeId },
        timeout: 5000,
      });
      return response.data;
    } catch (error) {
      const formattedError = formatApiError(error);
      console.error('Error al obtener clubes:', formattedError.message);
      return [];
    }
  }

  async getCourts(clubId: number): Promise<Court[]> {
    try {
      const response = await this.httpService.axiosRef.get(
        `/clubs/${clubId}/courts`,
        {
          baseURL: this.base_url,
          timeout: 5000,
        },
      );
      return response.data;
    } catch (error) {
      const formattedError = formatApiError(error);
      console.error(
        `Error al obtener canchas del club ${clubId}:`,
        formattedError.message,
      );
      return [];
    }
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    try {
      const response = await this.httpService.axiosRef.get(
        `/clubs/${clubId}/courts/${courtId}/slots`,
        {
          baseURL: this.base_url,
          params: { date: moment(date).format('YYYY-MM-DD') },
          timeout: 5000,
        },
      );
      return response.data;
    } catch (error) {
      const formattedError = formatApiError(error);
      console.error(
        `Error al obtener slots para la cancha ${courtId}:`,
        formattedError.message,
      );
      return [];
    }
  }
}
