'use client'

import Button from '@/components/ui/button.component'
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.component'
import Separator from '@/components/ui/separator.component'
import {
  BookOpen,
  Bullseye,
  Calendar,
  Flag,
  Gamepad,
  Heart,
  List,
  Repeat,
  Shield,
  Sliders,
  Trophy,
  User,
  Users,
  Zap
} from '@nsmr/pixelart-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

function HeroSection() {
  const { t } = useTranslation()

  return (
    <section className="relative grid min-h-screen snap-start lg:grid-cols-2">
      <div className="absolute inset-0 bg-linear-to-b from-secondary/10 to-transparent" />
      <div className="relative z-10 flex flex-col justify-center gap-6 px-4 py-16 lg:pl-[max(1rem,calc((100vw-72rem)/2+1rem))]">
        <div className="flex flex-col gap-2">
          <h1 className="text-primary text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">Covenant</h1>
          <div className="bg-primary/20 h-1 w-24 rounded-full" />
        </div>

        <h2 className="font-title text-foreground text-3xl font-bold md:text-4xl lg:text-5xl">
          {t('landing.hero.title')}
        </h2>

        <p className="text-accent text-xl font-semibold md:text-2xl">{t('landing.hero.subtitle')}</p>

        <p className="text-muted-foreground max-w-xl text-lg">{t('landing.hero.body')}</p>

        <Button asChild size="lg" className="mt-4 w-fit text-lg font-bold uppercase tracking-wider">
          <Link href="/sign-up">{t('landing.hero.cta')}</Link>
        </Button>
      </div>

      <div className="relative z-10 hidden lg:block">
        <div className="bg-muted/30 border-primary/20 absolute inset-0 border-l-2 border-dashed" />
      </div>
    </section>
  )
}

function ValuePropositionSection() {
  const { t } = useTranslation()

  return (
    <section className="bg-card/50 flex min-h-screen snap-start flex-col justify-center px-4 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-title text-foreground mb-6 text-3xl font-bold md:text-4xl">
          {t('landing.value_proposition.title')}
        </h2>
        <p className="text-muted-foreground text-lg md:text-xl">{t('landing.value_proposition.body')}</p>
      </div>
    </section>
  )
}

function ProductivitySection() {
  const { t } = useTranslation()

  const features = [
    {
      icon: List,
      title: t('landing.productivity.tasks.title'),
      body: t('landing.productivity.tasks.body')
    },
    {
      icon: Repeat,
      title: t('landing.productivity.habits.title'),
      body: t('landing.productivity.habits.body')
    },
    {
      icon: Bullseye,
      title: t('landing.productivity.goals.title'),
      body: t('landing.productivity.goals.body')
    }
  ]

  return (
    <section className="flex min-h-screen snap-start flex-col justify-center px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-title text-foreground mb-12 text-center text-3xl font-bold md:text-4xl">
          {t('landing.productivity.title')}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <feature.icon className="text-primary h-6 w-6" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function CharacterSection() {
  const { t } = useTranslation()

  const features = [
    {
      icon: Sliders,
      title: t('landing.character.stats.title'),
      body: t('landing.character.stats.body')
    },
    {
      icon: BookOpen,
      title: t('landing.character.doctrines.title'),
      body: t('landing.character.doctrines.body')
    },
    {
      icon: User,
      title: t('landing.character.classes.title'),
      body: t('landing.character.classes.body')
    }
  ]

  return (
    <section className="bg-secondary/5 flex min-h-screen snap-start flex-col justify-center px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-title text-foreground mb-12 text-center text-3xl font-bold md:text-4xl">
          {t('landing.character.title')}
        </h2>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-4">
              <div className="bg-accent/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                <feature.icon className="text-accent h-6 w-6" />
              </div>
              <div>
                <h3 className="font-title text-foreground mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'STR', icon: Trophy },
            { label: 'MAG', icon: Zap },
            { label: 'HP', icon: Heart },
            { label: 'MP', icon: Shield }
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card flex flex-col items-center gap-2 rounded-lg border p-4 text-center"
            >
              <stat.icon className="text-primary h-8 w-8" />
              <span className="font-title text-foreground font-bold">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CombatSection() {
  const { t } = useTranslation()

  const diceTable = [
    { action: t('landing.combat.dice.table.daily_habit'), dice: '2' },
    { action: t('landing.combat.dice.table.high_impact_task'), dice: '4' },
    { action: t('landing.combat.dice.table.completed_objective'), dice: '6' },
    { action: t('landing.combat.dice.table.habit_streak'), dice: '5' }
  ]

  const combatFeatures = [
    {
      icon: Flag,
      title: t('landing.combat.missions.title'),
      body: t('landing.combat.missions.body')
    },
    {
      icon: Gamepad,
      title: t('landing.combat.reactive.title'),
      body: t('landing.combat.reactive.body')
    },
    {
      icon: Shield,
      title: t('landing.combat.equipment.title'),
      body: t('landing.combat.equipment.body')
    }
  ]

  return (
    <section className="flex min-h-screen snap-start flex-col justify-center px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-title text-foreground mb-8 text-center text-3xl font-bold md:text-4xl">
          {t('landing.combat.title')}
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-accent/30">
            <CardHeader>
              <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                <Gamepad className="text-primary h-6 w-6" />
              </div>
              <CardTitle>{t('landing.combat.dice.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-6 text-base">{t('landing.combat.dice.body')}</CardDescription>
              <div className="space-y-3">
                {diceTable.map((row, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-muted-foreground text-sm">{row.action}</span>
                    <span className="text-primary font-bold">{row.dice}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {combatFeatures.map((feature, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
                  <feature.icon className="text-primary h-6 w-6" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.body}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

function ComingSoonSection() {
  const { t } = useTranslation()

  const features = [
    {
      icon: BookOpen,
      title: t('landing.coming_soon.features.journaling.title'),
      description: t('landing.coming_soon.features.journaling.description')
    },
    {
      icon: Gamepad,
      title: t('landing.coming_soon.features.pvp.title'),
      description: t('landing.coming_soon.features.pvp.description')
    },
    {
      icon: Trophy,
      title: t('landing.coming_soon.features.leaderboards.title'),
      description: t('landing.coming_soon.features.leaderboards.description')
    },
    {
      icon: Users,
      title: t('landing.coming_soon.features.coop.title'),
      description: t('landing.coming_soon.features.coop.description')
    },
    {
      icon: Calendar,
      title: t('landing.coming_soon.features.seasonal.title'),
      description: t('landing.coming_soon.features.seasonal.description')
    },
    {
      icon: Zap,
      title: t('landing.coming_soon.features.scaling.title'),
      description: t('landing.coming_soon.features.scaling.description')
    }
  ]

  return (
    <section className="bg-card/50 flex min-h-screen snap-start flex-col justify-center px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="font-title text-foreground mb-8 text-center text-3xl font-bold md:text-4xl">
          {t('landing.coming_soon.title')}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-card flex items-start gap-4 rounded-lg border p-4 transition-colors hover:border-primary/40"
            >
              <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <feature.icon className="text-muted-foreground h-5 w-5" />
              </div>
              <div>
                <h3 className="font-title text-foreground mb-1 font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ClosingAndFooterSection() {
  const { t } = useTranslation()

  return (
    <div className="snap-start">
      <section className="bg-secondary/10 flex min-h-[calc(100vh-150px)] flex-col justify-center px-4 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-foreground mb-4 text-xl md:text-2xl">{t('landing.closing.line1')}</p>
          <p className="text-primary mb-8 text-2xl font-bold md:text-3xl">{t('landing.closing.line2')}</p>
          <p className="text-muted-foreground mb-4 text-lg">{t('landing.closing.line3')}</p>
          <p className="text-foreground mb-10 text-xl font-semibold">{t('landing.closing.line4')}</p>

          <Button asChild size="lg" className="mt-8 text-lg font-bold uppercase tracking-wider">
            <Link href="/sign-up">{t('landing.closing.cta')}</Link>
          </Button>
        </div>
      </section>
      <footer className="bg-card border-t px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-primary text-2xl font-bold">Covenant</span>
          </div>
          <Separator className="w-24" />
          <p className="text-muted-foreground text-sm">
            &copy; {new Date().getFullYear()} Covenant. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default function LandingPage() {
  return (
    <main className="bg-background h-screen overflow-y-auto scroll-smooth pt-16 snap-y snap-mandatory scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
      <HeroSection />
      <ValuePropositionSection />
      <ProductivitySection />
      <CharacterSection />
      <CombatSection />
      <ComingSoonSection />
      <ClosingAndFooterSection />
    </main>
  )
}
