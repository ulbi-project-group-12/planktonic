export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthRequest {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}
