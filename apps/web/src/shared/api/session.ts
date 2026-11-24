'use client';

import { type LoginRequest, LoginResponseSchema } from '@app/contracts';
import { createStore } from 'zustand/vanilla';
import { authLogin } from './generated/api';
import { setAccessTokenProvider } from './http-client';

interface SessionState {
  accessToken: string | undefined;
  /** The visitor left with the sign-out button, so the login screen needs no return address. */
  signedOut?: boolean;
}

export const sessionStore = createStore<SessionState>()(() => ({ accessToken: undefined }));

export async function signIn(credentials: LoginRequest): Promise<void> {
  const { accessToken } = LoginResponseSchema.parse(await authLogin(credentials));
  setAccessTokenProvider(() => sessionStore.getState().accessToken);
  sessionStore.setState({ accessToken, signedOut: false });
}

/** Forgets the access token. The caller drops cached API data and leaves the closed pages. */
export function signOut(): void {
  sessionStore.setState({ accessToken: undefined, signedOut: true });
}
