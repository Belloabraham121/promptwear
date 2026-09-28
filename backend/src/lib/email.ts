import { Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const logger = new Logger('Email');

/**
 * Single email entry point for every Better Auth callback
 * (`sendResetPassword`, `sendVerificationEmail`, `sendInvitationEmail`).
 *
 * - Prod (`RESEND_API_KEY` set): sends via Resend from `EMAIL_FROM`.
 * - Local dev (no key): logs instead of sending, so password-reset,
 *   verification and invite flows stay testable with zero config.
 *
 * Never throws — delivery failure is logged loudly. Better Auth callbacks
 * invoke this with `void sendEmail(...)` (fire-and-forget, per upstream
 * guidance to avoid timing attacks), so a throw would surface as an
 * unhandled rejection. TODO(better-auth-phase-3): dead-letter / alerting
 * on repeated Resend failures.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    logger.warn(
      `[dev-fallback] email NOT sent (RESEND_API_KEY unset) ` +
        `to=${input.to} subject=${JSON.stringify(input.subject)}\n${input.text}`,
    );
    return;
  }

  try {
    const resend = new Resend(apiKey);
    const from =
      process.env.EMAIL_FROM?.trim() ?? 'Promptwear <noreply@promptwear.app>';
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html ?? `<pre>${input.text}</pre>`,
    });

    if (error) {
      logger.error(`Resend rejected email to=${input.to}: ${error.message}`);
      return;
    }

    logger.log(`Email sent to=${input.to} subject=${JSON.stringify(input.subject)}`);
  } catch (err) {
    logger.error(
      `Email send failed to=${input.to}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
