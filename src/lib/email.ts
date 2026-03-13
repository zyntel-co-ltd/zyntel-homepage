import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const user = import.meta.env.GMAIL_USER;
  const pass = import.meta.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return { ok: false, error: 'GMAIL_USER and GMAIL_APP_PASSWORD must be set' };
  }
  const from = import.meta.env.EMAIL_FROM ?? `Zyntel <${user}>`;
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
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
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error: msg };
  }
}
