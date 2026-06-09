import Link from 'next/link';
import BackButton from './_components/BackButton';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8] px-4">
      <div className="text-center max-w-md">
        {/* Ícone */}
        <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
            />
          </svg>
        </div>

        <p className="text-5xl font-extrabold text-gray-200 mb-4 leading-none">404</p>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Esta página não existe
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          O endereço que você acessou não foi encontrado.<br />
          Verifique o link ou volte para o início.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition"
          >
            Ir para o início
          </Link>
          <BackButton />
        </div>
      </div>
    </div>
  );
}
