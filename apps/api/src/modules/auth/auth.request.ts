export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  tz: string;
}

export interface AuthRequest {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}
