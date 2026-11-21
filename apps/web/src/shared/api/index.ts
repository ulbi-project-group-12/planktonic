export {
  type CatchUpTask,
  getConnectionState,
  registerCatchUp,
  syncWith,
  useConnectionStore,
  type ConnectionState,
} from './connection';
export { getSocket, type AppSocket } from './socket';
export { ApiError, apiFetch, type ApiRequestOptions } from './http-client';
export {
  useAuthRegister,
  useHealthLive,
  useHealthReady,
  useMessagesCreate,
  useMessagesList,
} from './generated/api';
export type * from './generated/models';
export { startApiMocks, startDemoApiMocks } from './mocks/browser';
export { API_DEMO_MOCK_HEADER, apiDemoMocksEnabled } from './mocks/demo-config';
