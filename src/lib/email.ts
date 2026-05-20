import { Resend } from 'resend';
import { render } from '@react-email/render';
import VerificationEmail from '../emails/VerificationEmail';

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

  await resend.emails.send({
    from: 'CityChain <onboarding@resend.dev>',
    to: user.email,
    subject: 'Verify your CityChain email',
    html
  });
}
