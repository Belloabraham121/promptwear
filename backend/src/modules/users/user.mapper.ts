import { User } from '@prisma/client';

export type SafeUser = Pick<
  User,
  'id' | 'email' | 'name' | 'role' | 'guest' | 'createdAt' | 'updatedAt'
>;

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    guest: user.guest,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
