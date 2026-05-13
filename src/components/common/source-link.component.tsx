const REPO_URL = 'https://github.com/YifanYes/covenant'

export default function SourceLink() {
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA
  const href = sha ? `${REPO_URL}/tree/${sha}` : REPO_URL
  const label = sha ? `Source (${sha.slice(0, 7)})` : 'Source'

  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label='View source code on GitHub (AGPL-3.0)'
      className='fixed bottom-2 right-2 z-50 rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white/70 backdrop-blur-sm hover:text-white'
    >
      {label}
    </a>
  )
}
