import type { ErrorType, ApiResponse } from '../types';

// Safe error handler that ensures type safety
export const handleError = (error: unknown): ErrorType => {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  return new Error('An unknown error occurred');
};

// Type-safe API response handler
export const handleApiResponse = async <T>(
  promise: Promise<ApiResponse<T>>
): Promise<T> => {
  try {
    const { data, error } = await promise;
    if (error) throw error;
    if (!data) throw new Error('No data returned');
    return data;
  } catch (error) {
    throw handleError(error);
  }
};

// Type-safe event handler
export const preventDefault = <T extends { preventDefault: () => void }>(
  handler: (event: T) => void | Promise<void>
) => {
  return (event: T) => {
    event.preventDefault();
    return handler(event);
  };
};

// Type-safe debounce function
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};