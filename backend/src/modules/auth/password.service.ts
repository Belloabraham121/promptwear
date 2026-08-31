import { Injectable } from '@nestjs/common';
import { hash, verify, Algorithm } from '@node-rs/argon2';

const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
  algorithm: Algorithm.Argon2id,
};

@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return hash(plain, ARGON2_OPTIONS);
  }

  async verify(plain: string, hashed: string): Promise<boolean> {
    return verify(hashed, plain, ARGON2_OPTIONS);
  }
}
