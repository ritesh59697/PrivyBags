// src/app/tip/[creatorSlug]/page.tsx

import { PrivateTipForm } from "@/components/tip/PrivateTipForm";

interface TipPageProps {
  params: Promise<{ creatorSlug: string }>;
}

// Next.js 15: params is a Promise
export default async function TipPage({ params }: TipPageProps) {
  const { creatorSlug } = await params;

  return (
    <div className="max-w-lg mx-auto px-4 py-14">
      <PrivateTipForm creatorSlug={creatorSlug} />
    </div>
  );
}
