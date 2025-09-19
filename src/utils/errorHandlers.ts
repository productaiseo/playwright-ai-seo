import { AppError } from '@/utils/errors';
import logger from '@/utils/logger';

/**
 * Hataları loglamak ve standart bir hata nesnesi döndürmek için merkezi bir fonksiyon.
 * @param error - Yakalanan hata.
 * @param serviceName - Hatanın oluştuğu servisin adı.
 * @returns Standart bir hata nesnesi.
 */
export function handleServiceError(error: unknown, serviceName: string): { error: string } {
  let errorMessage: string;

  if (error instanceof AppError) {
    errorMessage = error.message;
    logger.warn(`[${serviceName}] AppError: ${errorMessage}`, JSON.stringify({
      errorDetails: error.details.contextData,
    }));
  } else if (error instanceof Error) {
    errorMessage = error.message;
    logger.error(`[${serviceName}] Unexpected Error: ${errorMessage}`, JSON.stringify({
      stack: error.stack,
    }));
  } else {
    errorMessage = 'An unknown error occurred.';
    logger.error(`[${serviceName}] Unknown error:`, JSON.stringify({ error }));
  }

  return { error: errorMessage };
}
