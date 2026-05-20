import { Resend } from 'resend';
import { render } from '@react-email/render';
import VerificationEmail from '../emails/VerificationEmail';
import ResetPasswordEmail from '../emails/ResetPasswordEmail';

const resend = new Resend(process.env.RESEND_KEY);

export async function sendVerificationEmail({
  user,
  url
}: {
  user: { name: string; email: string };
  url: string;
}) {
  const html = await render(
    VerificationEmail({ name: user.name, verificationUrl: url })
  );

  const result = await resend.emails.send({
    from: 'CityChain <onboarding@resend.dev>',
    to: user.email,
    subject: 'Verify your CityChain email',
    html
  });

  if (result.error) {
    console.error('[sendVerificationEmail] Resend error:', result.error);
  }
}

export async function sendResetPasswordEmail({
  user,
  url
}: {
  user: { name: string; email: string };
  url: string;
}) {
  const html = await render(
    ResetPasswordEmail({ name: user.name, resetUrl: url })
  );

  const result = await resend.emails.send({
    from: 'CityChain <onboarding@resend.dev>',
    to: user.email,
    subject: 'Reset your CityChain password',
    html
  });

  if (result.error) {
    console.error('[sendResetPasswordEmail] Resend error:', result.error);
  }
}
