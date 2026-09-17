import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAME_CATALOG, getGameMeta } from "@/lib/assessments/catalog";
import { GamePlayer } from "@/components/assessments/game-player";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GAME_CATALOG.map((g) => ({ slug: g.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const meta = getGameMeta(slug);
  return { title: meta ? `${meta.title} · HQ` : "Assessments · HQ" };
}

export default async function AssessmentGamePage({ params }: Params) {
  const { slug } = await params;
  const meta = getGameMeta(slug);
  if (!meta) notFound();

  return <GamePlayer gameId={meta.id} />;
}
