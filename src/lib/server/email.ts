import nodemailer from "nodemailer";

import { prisma } from "@/lib/prisma";

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

  const config = getSmtpConfig();

  if (!config) {
    return prisma.outboundEmail.update({
      where: { id: emailLog.id },
      data: {
        status: "FAILED",
        errorMessage: "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_USER, and SMTP_PASS."
      }
    });
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });

  try {
    await transporter.sendMail({
      from: config.from,
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
