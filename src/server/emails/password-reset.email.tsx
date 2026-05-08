import TransactionalEmail from './transactional-email-layout'

interface PasswordResetEmailProps {
  url: string
  preview: string
  heading: string
  body: string
  cta: string
  footer: string
  logoSvg: string
}

export default function PasswordResetEmail(props: PasswordResetEmailProps) {
  return <TransactionalEmail {...props} />
}
