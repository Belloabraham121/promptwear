/**
 * Backfill legacy auth users into Better Auth tables (migration §6.3).
 *
 * - Google users (`googleId` set): create the `account` row
 *   (`providerId="google"`, `accountId=<google sub>`) and mark the email
 *   verified, so Google sign-in works immediately. Idempotent.
 * - Password users: argon2 hashes CANNOT migrate to Better Auth's scrypt
 *   credentials — they are reported and must use the password-reset flow.
 * - Users with no org membership get a personal workspace (mirrors the
 *   signup `databaseHooks` in `src/lib/auth.ts`).
 *
 * Usage:
 *   set -a; source .env; set +a   # provide DATABASE_URL
 *   npx ts-node --transpile-only prisma/backfill-better-auth.ts       # dry run
 *   npx ts-node --transpile-only prisma/backfill-better-auth.ts --live  # write
 */
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const LIVE = process.argv.includes('--live');

function slugFor(userId: string): string {
  const suffix = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toLowerCase();
  return `personal-${suffix || randomUUID().slice(0, 6)}`;
}

async function main(): Promise<void> {
  console.log(`Better Auth backfill (${LIVE ? 'LIVE' : 'dry run'})\n`);

  const users = await prisma.user.findMany({
    orderBy: { email: 'asc' },
  });

  let googleLinked = 0;
  let workspacesCreated = 0;
  const needsReset: string[] = [];

  for (const user of users) {
    // 1. Google account rows.
    if (user.googleId) {
      const existing = await prisma.account.findFirst({
        where: { providerId: 'google', accountId: user.googleId },
      });
      if (!existing) {
        console.log(`[google] ${user.email}: link account ${user.googleId}`);
        if (LIVE) {
          await prisma.account.create({
            data: {
              id: randomUUID(),
              accountId: user.googleId,
              providerId: 'google',
              userId: user.id,
            },
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          });
        }
        googleLinked += 1;
      } else {
        console.log(`[google] ${user.email}: already linked, skip`);
      }
    }

    // 2. Password users cannot migrate hashes.
    if (user.passwordHash) {
      const credential = await prisma.account.findFirst({
        where: { providerId: 'credential', userId: user.id },
      });
      if (!credential) {
        console.log(`[password] ${user.email}: NEEDS password reset`);
        needsReset.push(user.email);
      } else {
        console.log(`[password] ${user.email}: credential exists, skip`);
      }
    }

    // 3. Personal workspace for users with no membership.
    const memberships = await prisma.member.count({
      where: { userId: user.id },
    });
    if (memberships === 0) {
      let slug = slugFor(user.id);
      const taken = await prisma.organization.findUnique({ where: { slug } });
      if (taken) slug = `${slug}-${randomUUID().slice(0, 4)}`;
      const name = `${user.name?.trim() || user.email.split('@')[0]}'s workspace`;
      console.log(`[workspace] ${user.email}: create "${name}" (${slug})`);
      if (LIVE) {
        const org = await prisma.organization.create({
          data: {
            id: randomUUID(),
            name,
            slug,
            createdAt: new Date(),
          },
        });
        await prisma.member.create({
          data: {
            id: randomUUID(),
            organizationId: org.id,
            userId: user.id,
            role: 'owner',
            createdAt: new Date(),
          },
        });
      }
      workspacesCreated += 1;
    }
  }

  console.log(
    `\nDone: ${googleLinked} google link(s), ${workspacesCreated} workspace(s)` +
      (needsReset.length
        ? `\nNeeds password reset (${needsReset.length}):\n- ${needsReset.join('\n- ')}`
        : '\nNo password resets needed.'),
  );
  if (!LIVE) console.log('Dry run — rerun with --live to write.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
