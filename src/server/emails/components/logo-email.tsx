import { Section, Text } from '@react-email/components'

interface LogoEmailProps {
  svgContent: string
}

export default function LogoEmail({ svgContent }: LogoEmailProps) {
  return (
    <Section style={{ textAlign: 'center', padding: '24px 0 16px' }}>
      <div
        dangerouslySetInnerHTML={{ __html: svgContent }}
        style={{
          display: 'inline-block',
          width: '120px',
          height: '88px'
        }}
      />
      <Text
        style={{
          fontFamily: "'Cinzel', Georgia, serif",
          fontSize: '14px',
          color: '#c2b29a',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          margin: '8px 0 0',
          textAlign: 'center'
        }}
      >
        Covenant
      </Text>
    </Section>
  )
}
