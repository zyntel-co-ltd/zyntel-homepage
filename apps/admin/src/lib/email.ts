import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = String(import.meta.env.RESEND_API_KEY ?? '').trim();
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY must be set' };
  }
  const from = String(import.meta.env.EMAIL_FROM ?? '').trim() || 'onboarding@resend.dev';
  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    if (error) {
      return { ok: false, error: error.message ?? 'Resend error' };
    }
    return { ok: true, messageId: data?.id };
  } catch (e) {
    const err = e as Error;
    return { ok: false, error: err?.message ?? 'Unknown error' };
  }
}
