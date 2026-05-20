import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from '@react-email/components';

type Props = {
  name: string;
  verificationUrl: string;
};

export default function VerificationEmail({ name, verificationUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Verify your CityChain email address</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <Text style={logoText}>🔗 CityChain</Text>
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>Verify your email</Heading>
            <Text style={paragraph}>Hey {name},</Text>
            <Text style={paragraph}>
              Welcome to CityChain! Click the button below to verify your email
              address and unlock your full explorer profile.
            </Text>

            <Section style={buttonContainer}>
              <Button href={verificationUrl} style={button}>
                Verify Email Address
              </Button>
            </Section>

            <Text style={paragraph}>
              This link expires in 24 hours. If you didn't create a CityChain
              account, you can safely ignore this email.
            </Text>

            <Hr style={hr} />

            <Text style={footer}>
              Or copy and paste this URL into your browser:{' '}
              <Link href={verificationUrl} style={link}>
                {verificationUrl}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: '#0d1117',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '520px'
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '32px'
};

const logoText = {
  fontSize: '22px',
  fontWeight: '700',
  color: '#e2e8f0',
  letterSpacing: '-0.5px',
  margin: '0'
};

const contentSection = {
  backgroundColor: '#161b27',
  border: '1px solid #1e2a3a',
  borderRadius: '12px',
  padding: '40px 36px'
};

const heading = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#e2e8f0',
  margin: '0 0 24px'
};

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#94a3b8',
  margin: '0 0 16px'
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0'
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  padding: '13px 28px',
  textDecoration: 'none',
  display: 'inline-block'
};

const hr = {
  borderColor: '#1e2a3a',
  margin: '28px 0'
};

const footer = {
  fontSize: '12px',
  color: '#475569',
  lineHeight: '1.5',
  margin: '0'
};

const link = {
  color: '#3b82f6',
  wordBreak: 'break-all' as const
};
