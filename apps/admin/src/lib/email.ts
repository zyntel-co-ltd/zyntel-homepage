import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const user = String(import.meta.env.GMAIL_USER ?? '').trim();
  const pass = String(import.meta.env.GMAIL_APP_PASSWORD ?? '').trim();
  if (!user || !pass) {
    return { ok: false, error: 'GMAIL_USER and GMAIL_APP_PASSWORD must be set (separate env vars)' };
  }
  const from = import.meta.env.EMAIL_FROM ?? `Zyntel <${user}>`;
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    const err = e as Error & { code?: string; response?: string };
    let msg = err?.message ?? 'Unknown error';
    if (err?.code === 'EAUTH') msg = 'Invalid Gmail credentials. Check GMAIL_USER and GMAIL_APP_PASSWORD.';
    if (err?.code === 'ESOCKET' || msg.includes('403')) msg = 'Gmail blocked. Use App Password (myaccount.google.com/apppasswords), enable 2FA, and ensure GMAIL_USER matches the account.';
    return { ok: false, error: msg };
  }
}
