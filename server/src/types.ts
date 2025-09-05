import { Role } from './utils/role';

export interface JwtPayload {
  sub: number;      // user id
  role: Role;
}

export interface User {
  id: number;
  email: string;
  passwordHash: string;
}
