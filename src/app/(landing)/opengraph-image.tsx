import { ImageResponse } from 'next/og'
import fs from 'node:fs'
import path from 'node:path'

export const alt = 'Covenant - Transform Your Productivity Into Real Power'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  const svg = fs
    .readFileSync(path.join(process.cwd(), 'public/covenant-logo.svg'), 'utf-8')
    .replace(/fill="#000000"/g, 'fill="#c2b29a"')

  const logoDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1c1a17'
        }}
      >
        <img src={logoDataUrl} width={700} height={512} alt="" />
      </div>
    ),
    { ...size }
  )
}
