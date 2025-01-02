export interface ApiError {
  message: string;
  statusCode?: number;
  details?: any;
}

export function formatApiError(error: any): ApiError {
  if (error.response) {
    return {
      message:
        error.response.data?.message || 'Error en la respuesta de la API',
      statusCode: error.response.status,
      details: error.response.data,
    };
  }

  if (error.request) {
    return {
      message: 'No se recibió respuesta de la API',
    };
  }

  return {
    message: error.message || 'Error al procesar la solicitud',
  };
}
