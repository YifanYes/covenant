import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text
} from '@react-email/components'
import LogoEmail from './components/logo-email'

export interface TransactionalEmailProps {
  url: string
  preview: string
  heading: string
  body: string
  cta: string
  footer: string
  logoSvg: string
}

export default function TransactionalEmail({
  url,
  preview,
  heading,
  body,
  cta,
  footer,
  logoSvg
}: TransactionalEmailProps) {
  return (
    <Html>
      <Head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=EB+Garamond:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: '#0f0f13',
          margin: '0',
          padding: '24px 0',
          fontFamily: "'EB Garamond', Georgia, serif"
        }}
      >
        <Container
          style={{
            backgroundColor: '#1a1a21',
            borderRadius: '8px',
            maxWidth: '600px',
            margin: '0 auto',
            padding: '0'
          }}
        >
          <LogoEmail svgContent={logoSvg} />

          <Section style={{ padding: '0 40px 32px' }}>
            <Text
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: '28px',
                fontWeight: 700,
                color: '#c2b29a',
                textAlign: 'center',
                margin: '0 0 16px',
                lineHeight: '1.3'
              }}
            >
              {heading}
            </Text>

            <Text
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: '16px',
                color: '#c2b29a',
                opacity: 0.8,
                textAlign: 'center',
                margin: '0 0 32px',
                lineHeight: '1.6'
              }}
            >
              {body}
            </Text>

            <Section style={{ textAlign: 'center', margin: '0 0 24px' }}>
              <Button
                href={url}
                style={{
                  backgroundColor: '#b0a36a',
                  color: '#0f0f13',
                  fontFamily: "'Cinzel', Georgia, serif",
                  fontSize: '16px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  borderRadius: '6px',
                  padding: '16px 32px',
                  display: 'inline-block'
                }}
              >
                {cta}
              </Button>
            </Section>

            <Text
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: '14px',
                color: '#c2b29a',
                opacity: 0.6,
                textAlign: 'center',
                margin: '0',
                lineHeight: '1.5'
              }}
            >
              {footer}
            </Text>
          </Section>

          <Section
            style={{
              borderTop: '1px solid rgba(194, 178, 154, 0.15)',
              padding: '20px 40px',
              textAlign: 'center'
            }}
          >
            <Text
              style={{
                fontFamily: "'EB Garamond', Georgia, serif",
                fontSize: '12px',
                color: '#c2b29a',
                opacity: 0.4,
                margin: '0',
                textAlign: 'center'
              }}
            >
              Covenant — Complete tasks. Kill demons.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
