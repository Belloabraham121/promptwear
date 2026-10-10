import {
  betterAuth,
  type Auth,
  type BetterAuthOptions,
} from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, organization } from 'better-auth/plugins';
import { Logger } from '@nestjs/common';
import { prisma } from './prisma';
import {
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './email';

const logger = new Logger('BetterAuth');

/** Slugify a workspace name; falls back to a user-id suffix (always unique). */
function toOrgSlug(name: string, userId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30);
  const suffix = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toLowerCase();
  return `${base || 'workspace'}-${suffix}`;
}

interface CreateOrganizationBody {
  name: string;
  slug: string;
  userId: string;
  keepCurrentActiveOrganization?: boolean;
}

/**
 * Better Auth instance — mounted at `/api/v1/auth/*` (Goal 1 cutover, live).
 *
 * One verified email = one user: `accountLinking` with Google trusted, so a
 * verified Google email links to an existing password account instead of
 * conflicting (see docs/BETTER_AUTH_MIGRATION.md §4). Every new user also
 * gets a personal workspace (databaseHooks below) for org invitations (§5).
 */
const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
const clientUrl = process.env.CLIENT_URL?.trim();
// User-facing pages live on the WEB origin (local :3002, prod same-origin).
// Emailed links must point there — never at the API baseURL, which has no
// pages and 404s (e.g. /reset-password?token=...).
const webOrigin =
  clientUrl && clientUrl !== appUrl ? clientUrl : appUrl;
const trustedOrigins = [
  appUrl,
  ...(clientUrl && clientUrl !== appUrl ? [clientUrl] : []),
];

// NOTE: options are explicitly typed as BetterAuthOptions (instead of relying
// on full generic inference) because `declaration: true` in tsconfig requires
// the exported `auth` type to be portable — the fully-inferred plugin context
// references zod internals that can't be named in .d.ts (TS2742). Plugin
// field inference ($Infer.Session etc.) can be re-enabled at cutover if needed.
const options: BetterAuthOptions = {
  baseURL: process.env.BETTER_AUTH_URL ?? appUrl,
  // Nest serves everything under the global `/api/v1` prefix, so Better Auth
  // lives at `/api/v1/auth/*` (default would be `/api/auth/*`).
  basePath: '/api/v1/auth',
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 600, // 10 minutes
    // Forgot-password is a MAGIC LINK (not OTP): Better Auth stores a token
    // in `verification` and calls this. We email a link to the WEB
    // reset page (the /reset-password page completes it via
    // authClient.resetPassword()). Never email BA's own `url` — it points
    // at the API origin, which has no pages.
    // Fire-and-forget per upstream guidance (avoid timing attacks).
    sendResetPassword: async ({ user, url, token }) => {
      void sendPasswordResetEmail({
        to: user.email,
        url: `${webOrigin}/reset-password?token=${token}`,
      });
    },
  },

  // Verification sender (link-based, not OTP). Login is NOT gated on
  // verification yet — this just makes `sendVerificationEmail` usable.
  // TODO(better-auth-phase-5): decide on requireEmailVerification.
  emailVerification: {
    // Welcome email on every signup (login stays ungated until
    // requireEmailVerification is ever enabled).
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      void sendVerificationEmail({
        to: user.email,
        name: user.name,
        url: `${webOrigin}/verify-email?token=${token}`,
      });
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      prompt: 'select_account',
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      // Google only issues verified emails, so same-email Google sign-in
      // safely links to an existing password account (one email = one user).
      trustedProviders: ['google'],
      requireLocalEmailVerified: false,
      allowDifferentEmails: false,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7d — matches legacy JWT_REFRESH_TTL
    updateAge: 60 * 60 * 24, // 1d sliding refresh
    // NOTE: cookieCache intentionally OFF — it serves sessions from a signed
    // cookie without DB lookup, so sign-out/revoke wouldn't take effect for
    // up to maxAge. DB lookup per request keeps logout immediate.
  },

  user: {
    additionalFields: {
      // Legacy `User.guest` flag survives as a custom field.
      // NOTE: `role` is intentionally NOT declared here — the admin plugin
      // below owns it (defaultRole "customer" preserves our role strings).
      guest: { type: 'boolean', defaultValue: false, required: false },
    },
  },

  databaseHooks: {
    user: {
      create: {
        // Personal workspace: every new user (password, Google, admin-made)
        // gets an org they own, so "log in → invite others by email" works
        // with zero setup. Never allowed to break signup — failures log.
        after: async (user) => {
          const name =
            user.name?.trim() || user.email.split('@')[0] || 'My';
          try {
            await (
              auth.api as unknown as {
                createOrganization: (args: {
                  body: CreateOrganizationBody;
                }) => Promise<unknown>;
              }
            ).createOrganization({
              body: {
                name: `${name}'s workspace`,
                slug: toOrgSlug(name, user.id),
                userId: user.id,
              },
            });
          } catch (error) {
            logger.warn(
              `Personal workspace creation failed for user ${user.id}: ` +
                `${error instanceof Error ? error.message : String(error)}`,
            );
          }
        },
      },
    },
  },

  plugins: [
    // Preserves our `customer | admin` role strings (decision (a) in migration doc).
    admin({ defaultRole: 'customer', adminRoles: ['admin'] }),
    // Multitenancy foundation. Invitations are LINK-based (not OTP):
    // this callback emails the accept link; the client accept page is Phase 5.
    // Flip requireEmailVerificationOnInvitation to true once real addresses
    // are enforced (needs requireEmailVerification or verified Google users).
    organization({
      allowUserToCreateOrganization: true,
      requireEmailVerificationOnInvitation: false, // TODO(better-auth-phase-5): true + verify flow
      async sendInvitationEmail(data) {
        const inviteLink = `${webOrigin}/accept-invitation/${data.id}`;
        void sendInvitationEmail({
          to: data.email,
          organizationName: data.organization.name,
          inviterName: data.inviter.user.name,
          inviterEmail: data.inviter.user.email,
          url: inviteLink,
        });
      },
    }),
  ],

  advanced: {
    cookiePrefix: 'promptwear',
  },
};

export const auth: Auth = betterAuth(options);
