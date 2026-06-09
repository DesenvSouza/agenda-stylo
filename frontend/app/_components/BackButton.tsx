'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center justify-center gap-2 border hover:bg-gray-50 text-gray-700 rounded-lg px-5 py-2.5 text-sm font-medium transition"
    >
      <ArrowLeft size={16} />
      Voltar
    </button>
  );
}
