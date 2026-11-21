export const API_DEMO_MOCK_HEADER = 'x-api-demo-mock';

export const apiDemoMocksEnabled =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_API_MOCKING === 'true';
