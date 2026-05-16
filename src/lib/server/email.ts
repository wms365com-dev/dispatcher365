import nodemailer from "nodemailer";

import { PRODUCT_NAME } from "@/lib/branding";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrl } from "@/lib/server/billing";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !from) {
    return null;
  }

  return {
    host,
    port,
    secure,
    from,
    auth: user && pass ? { user, pass } : undefined
  };
}

export function emailTransportConfigured() {
  return Boolean(getSmtpConfig());
}

function createTransporter() {
  const config = getSmtpConfig();

  if (!config) {
    return null;
  }

  return {
    config,
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    })
  };
}

interface SystemEmailInput {
  toEmail: string;
  subject: string;
  htmlBody: string;
}

export async function sendSystemEmail(input: SystemEmailInput) {
  const transport = createTransporter();

  if (!transport) {
    return {
      ok: false as const,
      error: "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_USER, and SMTP_PASS."
    };
  }

  try {
    await transport.transporter.sendMail({
      from: transport.config.from,
      to: input.toEmail,
      subject: input.subject,
      html: input.htmlBody
    });

    return {
      ok: true as const
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

interface LoggedEmailInput {
  tenantId: string;
  userId?: string | null;
  routeRunId?: string | null;
  toEmail: string;
  subject: string;
  htmlBody: string;
}

export async function sendLoggedEmail(input: LoggedEmailInput) {
  const emailLog = await prisma.outboundEmail.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? undefined,
      routeRunId: input.routeRunId ?? undefined,
      toEmail: input.toEmail,
      subject: input.subject,
      htmlBody: input.htmlBody,
      status: "PENDING"
    }
  });

  const transport = createTransporter();

  if (!transport) {
    return prisma.outboundEmail.update({
      where: { id: emailLog.id },
      data: {
        status: "FAILED",
        errorMessage: "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_USER, and SMTP_PASS."
      }
    });
  }

  try {
    await transport.transporter.sendMail({
      from: transport.config.from,
      to: input.toEmail,
      subject: input.subject,
      html: input.htmlBody
    });

    return prisma.outboundEmail.update({
      where: { id: emailLog.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        errorMessage: null
      }
    });
  } catch (error) {
    return prisma.outboundEmail.update({
      where: { id: emailLog.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    });
  }
}

export async function sendPasswordResetEmail(input: {
  toEmail: string;
  fullName: string;
  resetToken: string;
}) {
  const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(input.resetToken)}`;

  return sendSystemEmail({
    toEmail: input.toEmail,
    subject: `Reset your ${PRODUCT_NAME} password`,
    htmlBody: `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #243746; line-height: 1.55;">
        <h2 style="margin-bottom: 8px;">Reset your password</h2>
        <p style="margin: 0 0 12px;">Hi ${input.fullName},</p>
        <p style="margin: 0 0 12px;">
          We received a request to reset your ${PRODUCT_NAME} password. This link will expire in 1 hour.
        </p>
        <p style="margin: 0 0 16px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 16px; background: #0a7fb0; color: #ffffff; text-decoration: none; border-radius: 4px;">
            Reset password
          </a>
        </p>
        <p style="margin: 0 0 8px;">If the button doesn't open, use this link:</p>
        <p style="margin: 0 0 12px;"><a href="${resetUrl}">${resetUrl}</a></p>
        <p style="margin: 0;">If you didn’t ask for this, you can safely ignore this email.</p>
      </div>
    `
  });
}
