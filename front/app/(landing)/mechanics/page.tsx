import { cookies } from 'next/headers'

export const metadata = {
  title: 'Mechanics - ARQ',
}

export default async function MechanicsPage() {
  const cookieStore = await cookies()
  const lang = cookieStore.get('i18nextLng')?.value || 'en'

  const Content = (await import(`./${lang === 'es' ? 'content.es.mdx' : 'content.en.mdx'}`)).default

  return (
    <main className="bg-background min-h-screen pt-16">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <article>
          <Content />
        </article>
      </div>
    </main>
  )
}
