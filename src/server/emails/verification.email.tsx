import TransactionalEmail from './transactional-email-layout'

interface VerificationEmailProps {
  url: string
  preview: string
  heading: string
  body: string
  cta: string
  footer: string
  logoSvg: string
}

export default function VerificationEmail(props: VerificationEmailProps) {
  return <TransactionalEmail {...props} />
}
