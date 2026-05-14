import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

import { sendPasswordResetEmail } from "./email";

const PASSWORD_RESET_WINDOW_MS = 1000 * 60 * 60;

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePasswordResetToken(input: {
  userId: string;
  email: string;
  fullName: string;
}) {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_WINDOW_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: input.userId,
      tokenHash,
      expiresAt
    }
  });

  const emailResult = await sendPasswordResetEmail({
    toEmail: input.email,
    fullName: input.fullName,
    resetToken: rawToken
  });

  return {
    ok: emailResult.ok,
    error: emailResult.ok ? null : emailResult.error
  };
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashResetToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: {
      tokenHash
    },
    include: {
      user: true
    }
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return record;
}
