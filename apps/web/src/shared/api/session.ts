'use client';

import { type LoginRequest, LoginResponseSchema } from '@app/contracts';
import { createStore } from 'zustand/vanilla';
import { authLogin } from './generated/api';
import { setAccessTokenProvider } from './http-client';

interface SessionState {
  accessToken: string | undefined;
}

export const sessionStore = createStore<SessionState>()(() => ({ accessToken: undefined }));

export async function signIn(credentials: LoginRequest): Promise<void> {
  const { accessToken } = LoginResponseSchema.parse(await authLogin(credentials));
  setAccessTokenProvider(() => sessionStore.getState().accessToken);
  sessionStore.setState({ accessToken });
}
