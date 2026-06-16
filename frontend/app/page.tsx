"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Calendar, Users, Scissors, BarChart2, Bell,
  CheckCircle, ChevronDown, ChevronRight, ArrowRight, Menu, X,
  Smartphone, Clock, Shield, TrendingUp, Star, Zap,
  Sparkles, Crown, Globe, CreditCard,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function Fade({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Dados ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Calendar,
    title: "Agendamento Online 24h",
    desc: "Seus clientes agendam a qualquer hora, pelo celular. Sem ligações perdidas, sem mensagens no WhatsApp tarde da noite.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Users,
    title: "Gestão de Profissionais",
    desc: "Cadastre toda a equipe, defina serviços por profissional, horários e disponibilidade com total controle.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Bell,
    title: "Lembretes Automáticos",
    desc: "O sistema envia lembretes automáticos antes de cada agendamento, ajudando a reduzir ausências.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: BarChart2,
    title: "Relatórios Detalhados",
    desc: "Acompanhe faturamento, serviços mais procurados e desempenho de cada profissional em tempo real.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: Smartphone,
    title: "Link de Agendamento",
    desc: "Cada estabelecimento recebe um link único para compartilhar nas redes sociais e no Instagram.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: Shield,
    title: "Dados Seguros",
    desc: "Seus dados e dos seus clientes protegidos com criptografia e backup automático na nuvem.",
    color: "bg-teal-50 text-teal-600",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Crie sua conta",
    desc: "Cadastre seu estabelecimento em minutos. Sem cartão de crédito necessário para começar.",
    icon: Sparkles,
  },
  {
    number: "02",
    title: "Configure seus serviços",
    desc: "Adicione seus profissionais, serviços, preços e horários de atendimento.",
    icon: Scissors,
  },
  {
    number: "03",
    title: "Compartilhe e receba agendamentos",
    desc: "Envie seu link e comece a receber reservas online. Seus clientes agendam sem precisar baixar nenhum app.",
    icon: Globe,
  },
];

// Funcionalidades idênticas nos dois planos
const SHARED_FEATURES = [
  "Agendamento online 24h",
  "Link de agendamento próprio",
  "Lembretes automáticos",
  "Relatórios de desempenho",
  "Histórico de clientes",
  "Suporte por e-mail",
];

const PLANS = [
  {
    id: "basico",
    name: "Básico",
    price: "29,90",
    period: "/mês",
    tagline: "Para quem está começando",
    icon: Zap,
    color: "border-[#E5E5E5]",
    btnClass: "bg-[#1B1B1B] text-white hover:bg-[#2d2d2d]",
    limits: [
      "Até 2 profissionais ativos",
      "Até 10 serviços cadastrados",
    ],
    highlight: false,
  },
  {
    id: "profissional",
    name: "Profissional",
    price: "49,90",
    period: "/mês",
    tagline: "Para equipes em crescimento",
    icon: Crown,
    color: "border-[#EF9F27]",
    btnClass: "bg-[#EF9F27] text-[#1B1B1B] hover:bg-[#d48a1a]",
    limits: [
      "Profissionais ativos ilimitados",
      "Serviços cadastrados ilimitados",
    ],
    highlight: true,
  },
];

const FAQS = [
  {
    q: "Preciso instalar algum aplicativo?",
    a: "Não. O AgendaEstilo funciona totalmente no navegador, tanto para você quanto para seus clientes. Nenhum download necessário.",
  },
  {
    q: "Como meus clientes agendam?",
    a: "Você recebe um link exclusivo (ex: agendaestilo.com.br/seu-salao) que pode compartilhar no Instagram, WhatsApp ou onde preferir. O cliente acessa pelo celular e escolhe o serviço, o profissional e o horário.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Não há fidelidade ou multa. Você pode cancelar quando quiser, sem burocracia.",
  },
  {
    q: "O sistema envia lembretes automáticos?",
    a: "Sim. O AgendaEstilo envia lembretes automáticos antes de cada agendamento, ajudando a reduzir ausências.",
  },
  {
    q: "Funciona para barbearia, salão de beleza e esmalteria?",
    a: "Sim. A plataforma foi desenvolvida para salões de beleza, barbearias, esmalterias, estéticas, spas e qualquer estabelecimento de beleza e cuidados pessoais.",
  },
  {
    q: "Quantos profissionais posso cadastrar?",
    a: "No plano Básico você pode ter até 2 profissionais ativos. No plano Profissional não há limite — você cadastra quantos precisar.",
  },
  {
    q: "Meus dados ficam seguros?",
    a: "Sim. Todos os dados são armazenados com criptografia e backup na nuvem. Seguimos as boas práticas de segurança e estamos em conformidade com a LGPD.",
  },
  {
    q: "Posso começar sem pagar nada?",
    a: "Sim. Crie sua conta agora sem cartão de crédito. Explore a plataforma gratuitamente e ative o plano quando estiver pronto.",
  },
];

// ── Componentes ───────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E5E5E5] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
      >
        <span className="text-[#1B1B1B] font-medium text-sm md:text-base">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#9B9B9B] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-48" : "max-h-0"
        }`}
      >
        <p className="text-[#6B6B6B] text-sm pb-5 leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const navLinks = [
    { label: "Funcionalidades", href: "#features" },
    { label: "Como funciona", href: "#how-it-works" },
    { label: "Planos", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#EF9F27] flex items-center justify-center">
              <Scissors size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-[#1B1B1B] tracking-tight">
              AgendaEstilo
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="text-sm text-[#6B6B6B] hover:text-[#1B1B1B] transition-colors font-medium"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[#6B6B6B] hover:text-[#1B1B1B] font-medium px-4 py-2 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-[#EF9F27] text-[#1B1B1B] px-5 py-2.5 rounded-xl hover:bg-[#d48a1a] transition-colors shadow-sm"
            >
              Começar grátis
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-[#F5F5F5] transition-colors"
          >
            <Menu size={22} className="text-[#1B1B1B]" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white md:hidden">
          <div className="flex items-center justify-between px-4 h-16 border-b border-[#E5E5E5]">
            <span className="font-bold text-lg text-[#1B1B1B]">AgendaEstilo</span>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-xl hover:bg-[#F5F5F5]"
            >
              <X size={22} />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navLinks.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between py-3 border-b border-[#F5F5F5] text-[#1B1B1B] font-medium"
              >
                {label}
                <ChevronRight size={16} className="text-[#9B9B9B]" />
              </a>
            ))}
          </nav>
          <div className="p-4 space-y-3 border-t border-[#E5E5E5]">
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center w-full py-3.5 rounded-xl bg-[#EF9F27] text-[#1B1B1B] font-semibold text-sm shadow-sm"
            >
              Começar grátis
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center w-full py-3.5 rounded-xl bg-[#F5F5F5] text-[#1B1B1B] font-medium text-sm"
            >
              Entrar na minha conta
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-[#FAFAF8] text-[#1B1B1B] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B1B1B] via-[#252525] to-[#1a1408] z-0" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#EF9F27]/10 blur-[120px] z-0 pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-[#EF9F27]/5 blur-[100px] z-0 pointer-events-none" />
        <div
          className="absolute inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-20 md:py-32 w-full text-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#EF9F27]/15 border border-[#EF9F27]/30 text-[#EF9F27] px-4 py-2 rounded-full text-xs font-semibold tracking-wide mb-6 md:mb-8">
              <Sparkles size={12} />
              PLATAFORMA DE AGENDAMENTO ONLINE
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6">
              Seu salão recebendo{" "}
              <span className="text-[#EF9F27] relative inline-block">
                clientes
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 300 12"
                  fill="none"
                >
                  <path
                    d="M2 10 C50 2, 150 2, 298 8"
                    stroke="#EF9F27"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                </svg>
              </span>{" "}
              24h por dia
            </h1>

            <p className="text-lg sm:text-xl text-white/60 leading-relaxed mb-8 md:mb-10 max-w-xl mx-auto">
              Agendamento online para salões de beleza, barbearias e esmalterias.
              Seus clientes marcam pelo celular a qualquer hora — você só abre o painel e atende.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10 md:mb-14 justify-center">
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-[#EF9F27] text-[#1B1B1B] font-bold text-base shadow-lg shadow-[#EF9F27]/25 hover:bg-[#ffb340] transition-all active:scale-95"
              >
                Começar grátis agora
                <ArrowRight
                  size={18}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl border border-white/20 text-white font-medium text-base hover:bg-white/10 transition-all"
              >
                Ver como funciona
              </a>
            </div>

            <div className="flex flex-wrap gap-4 md:gap-6 justify-center">
              {[
                { icon: CheckCircle, text: "Sem cartão de crédito" },
                { icon: CheckCircle, text: "Sem instalação" },
                { icon: CheckCircle, text: "Cancele quando quiser" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 text-white/50 text-sm"
                >
                  <Icon size={15} className="text-[#EF9F27] shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            className="w-full h-16 md:h-20"
          >
            <path
              d="M0,80 L0,40 Q360,0 720,40 Q1080,80 1440,40 L1440,80 Z"
              fill="#FAFAF8"
            />
          </svg>
        </div>
      </section>

      {/* ── PROBLEMA / SOLUÇÃO ───────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-[#FAFAF8]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Fade>
            <p className="text-[#9B9B9B] text-sm font-semibold tracking-widest uppercase mb-4">
              Reconhece essa situação?
            </p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1B1B1B] leading-tight">
              Chega de perder clientes por não conseguir responder a tempo.
            </h2>
            <p className="mt-4 text-[#6B6B6B] text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Com o AgendaEstilo, seus clientes agendam sozinhos — a qualquer hora, pelo
              celular — enquanto você foca no que faz de melhor.
            </p>
          </Fade>

          <Fade delay={150} className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                emoji: "😤",
                before: "Agenda bagunçada e confusa",
                after: "Agenda organizada e automática",
              },
              {
                emoji: "📱",
                before: "Clientes no WhatsApp a toda hora",
                after: "Agendamento online sem esforço",
              },
              {
                emoji: "📅",
                before: "Horários vagos difíceis de controlar",
                after: "Visão clara de toda a disponibilidade",
              },
            ].map(({ emoji, before, after }) => (
              <div
                key={before}
                className="bg-white rounded-2xl p-5 border border-[#E5E5E5] text-left shadow-sm"
              >
                <span className="text-3xl">{emoji}</span>
                <div className="mt-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <X size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-[#9B9B9B] line-through">{before}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle
                      size={14}
                      className="text-emerald-500 mt-0.5 shrink-0"
                    />
                    <p className="text-sm text-[#1B1B1B] font-medium">{after}</p>
                  </div>
                </div>
              </div>
            ))}
          </Fade>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ──────────────────────────────────────────────────── */}
      <section id="features" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <Fade className="text-center mb-12 md:mb-16">
            <p className="text-[#EF9F27] text-sm font-semibold tracking-widest uppercase mb-3">
              Funcionalidades
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B1B1B]">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="mt-4 text-[#6B6B6B] text-base md:text-lg max-w-2xl mx-auto">
              Desenvolvido para salões, barbearias, esmalterias e estéticas.
            </p>
          </Fade>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Fade key={f.title} delay={i * 80}>
                  <div className="group bg-[#FAFAF8] rounded-2xl p-6 border border-[#E5E5E5] hover:border-[#EF9F27]/30 hover:shadow-md transition-all duration-300 h-full">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}
                    >
                      <Icon size={20} />
                    </div>
                    <h3 className="font-bold text-[#1B1B1B] text-base mb-2">
                      {f.title}
                    </h3>
                    <p className="text-[#6B6B6B] text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </Fade>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DETALHES DAS FUNCIONALIDADES ─────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20 md:space-y-28">

          {/* Agendamento do cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            <Fade>
              <div>
                <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <Calendar size={12} /> Link de agendamento
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-[#1B1B1B] leading-tight mb-4">
                  Seu cliente agenda em poucos cliques
                </h2>
                <p className="text-[#6B6B6B] leading-relaxed mb-6">
                  Cada estabelecimento recebe um link único e personalizado. Cole no
                  Instagram, WhatsApp ou onde preferir. O cliente escolhe o serviço,
                  profissional e horário disponível — direto pelo celular, sem precisar
                  baixar nenhum aplicativo.
                </p>
                <ul className="space-y-3">
                  {[
                    "Disponível 24h, 7 dias por semana",
                    "Funciona no navegador, sem download",
                    "Confirmação imediata do agendamento",
                    "Perfil completo do estabelecimento",
                  ].map((t) => (
                    <li
                      key={t}
                      className="flex items-center gap-3 text-sm text-[#1B1B1B]"
                    >
                      <CheckCircle
                        size={17}
                        className="text-[#EF9F27] shrink-0"
                      />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Fade>

            <Fade delay={150}>
              <div className="relative">
                <div className="absolute -inset-4 bg-[#EF9F27]/5 rounded-3xl blur-xl" />
                <div className="relative bg-white rounded-3xl border border-[#E5E5E5] shadow-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#1B1B1B] to-[#2d2d2d] px-5 py-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#EF9F27] flex items-center justify-center">
                        <Scissors size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">Seu Estabelecimento</p>
                        <p className="text-white/50 text-xs">agendaestilo.com.br/seu-salao</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5 text-xs text-white/70">
                        <Clock size={11} /> Seg–Sáb, 9h–19h
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <p className="text-xs font-semibold text-[#9B9B9B] uppercase tracking-wider">
                      Escolha o serviço
                    </p>
                    {[
                      { name: "Corte Masculino", price: "R$ 35,00", time: "30 min" },
                      { name: "Barba Completa", price: "R$ 25,00", time: "20 min" },
                      { name: "Corte + Barba", price: "R$ 55,00", time: "50 min" },
                    ].map((s, idx) => (
                      <div
                        key={s.name}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          idx === 0
                            ? "border-[#EF9F27] bg-[#FAEEDA]"
                            : "border-[#E5E5E5] bg-[#F5F5F5]"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-[#1B1B1B]">
                            {s.name}
                          </p>
                          <p className="text-xs text-[#9B9B9B] mt-0.5">{s.time}</p>
                        </div>
                        <p className="text-sm font-bold text-[#1B1B1B]">{s.price}</p>
                      </div>
                    ))}
                    <button className="w-full py-3.5 rounded-xl bg-[#1B1B1B] text-white font-semibold text-sm mt-2">
                      Confirmar agendamento →
                    </button>
                  </div>
                </div>
              </div>
            </Fade>
          </div>

          {/* Painel de gestão */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            <Fade delay={100} className="md:order-2">
              <div>
                <span className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <BarChart2 size={12} /> Painel de gestão
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-[#1B1B1B] leading-tight mb-4">
                  Controle total do seu negócio na palma da mão
                </h2>
                <p className="text-[#6B6B6B] leading-relaxed mb-6">
                  Painel completo para visualizar a agenda do dia, gerenciar a equipe,
                  acompanhar o faturamento e entender melhor o seu negócio com base em
                  dados reais.
                </p>
                <ul className="space-y-3">
                  {[
                    "Agenda do dia por profissional",
                    "Faturamento e receita em tempo real",
                    "Histórico completo de clientes",
                    "Relatórios por serviço e profissional",
                  ].map((t) => (
                    <li
                      key={t}
                      className="flex items-center gap-3 text-sm text-[#1B1B1B]"
                    >
                      <CheckCircle
                        size={17}
                        className="text-[#EF9F27] shrink-0"
                      />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Fade>

            <Fade className="md:order-1">
              <div className="relative">
                <div className="absolute -inset-4 bg-purple-500/5 rounded-3xl blur-xl" />
                <div className="relative bg-white rounded-3xl border border-[#E5E5E5] shadow-xl overflow-hidden p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-xs text-[#9B9B9B]">Hoje, segunda-feira</p>
                      <p className="font-bold text-[#1B1B1B]">Visão geral</p>
                    </div>
                    <div className="w-8 h-8 bg-[#EF9F27] rounded-lg flex items-center justify-center">
                      <TrendingUp size={15} className="text-white" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "Agendamentos", val: "—", color: "bg-blue-50 text-blue-700" },
                      { label: "Previsto", val: "R$—", color: "bg-emerald-50 text-emerald-700" },
                      { label: "Concluídos", val: "—", color: "bg-purple-50 text-purple-700" },
                      { label: "Cancelados", val: "—", color: "bg-red-50 text-red-600" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className={`rounded-xl p-3 ${color}`}>
                        <p className="text-[10px] font-medium opacity-70">{label}</p>
                        <p className="text-xl font-bold mt-0.5">{val}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold text-[#9B9B9B] uppercase tracking-wider mb-2">
                    Próximos agendamentos
                  </p>
                  <div className="flex flex-col gap-0">
                    {[
                      { time: "14:30", service: "Corte Masculino", status: "Confirmado" },
                      { time: "15:00", service: "Barba Completa", status: "Pendente" },
                    ].map((b) => (
                      <div
                        key={b.time}
                        className="flex items-center gap-3 py-2.5 border-b border-[#F5F5F5] last:border-0"
                      >
                        <span className="text-xs font-mono font-bold text-[#EF9F27] w-12">
                          {b.time}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-[#1B1B1B]">
                            {b.service}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            b.status === "Confirmado"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Fade>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ─────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="py-16 md:py-24 bg-[#1B1B1B] relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#EF9F27]/8 blur-[100px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
          <Fade className="text-center mb-12 md:mb-16">
            <p className="text-[#EF9F27] text-sm font-semibold tracking-widest uppercase mb-3">
              Como funciona
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              Configure em 3 passos simples
            </h2>
            <p className="mt-4 text-white/50 text-base md:text-lg max-w-xl mx-auto">
              Do cadastro ao primeiro agendamento recebido, sem complicação.
            </p>
          </Fade>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Fade key={step.number} delay={i * 120} className="h-full">
                  <div className="relative h-full">
                    {i < STEPS.length - 1 && (
                      <div className="hidden md:block absolute top-10 left-[calc(100%+16px)] w-8 h-px bg-white/10 z-10" />
                    )}
                    <div className="h-full bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition-all flex flex-col">
                      <div className="flex items-start gap-4 mb-4">
                        <span className="text-4xl font-black text-white/10 leading-none select-none">
                          {step.number}
                        </span>
                        <div className="w-11 h-11 rounded-xl bg-[#EF9F27]/15 flex items-center justify-center border border-[#EF9F27]/20 shrink-0">
                          <Icon size={20} className="text-[#EF9F27]" />
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-lg mb-2">
                        {step.title}
                      </h3>
                      <p className="text-white/50 text-sm leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </Fade>
              );
            })}
          </div>

          <Fade delay={400} className="mt-10 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[#EF9F27] text-[#1B1B1B] font-bold px-8 py-4 rounded-xl hover:bg-[#ffb340] transition-all shadow-lg shadow-[#EF9F27]/20 text-sm"
            >
              Criar minha conta grátis
              <ArrowRight size={16} />
            </Link>
          </Fade>
        </div>
      </section>

      {/* ── PLANOS ───────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 md:py-24 bg-[#FAFAF8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <Fade className="text-center mb-12">
            <p className="text-[#EF9F27] text-sm font-semibold tracking-widest uppercase mb-3">
              Planos e preços
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1B1B1B]">
              Simples e sem surpresas
            </h2>
            <p className="mt-4 text-[#6B6B6B] text-base md:text-lg">
              Escolha o plano que combina com o seu estabelecimento.
            </p>
          </Fade>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {PLANS.map((plan, i) => {
              const Icon = plan.icon;
              return (
                <Fade key={plan.id} delay={i * 120}>
                  <div
                    className={`relative bg-white rounded-3xl border-2 ${plan.color} p-7 shadow-sm flex flex-col ${
                      plan.highlight ? "shadow-[#EF9F27]/20 shadow-xl" : ""
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1.5 bg-[#EF9F27] text-[#1B1B1B] text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
                          <Star size={11} className="fill-current" />
                          MAIS COMPLETO
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          plan.highlight ? "bg-[#EF9F27]" : "bg-[#F5F5F5]"
                        }`}
                      >
                        <Icon
                          size={18}
                          className={
                            plan.highlight ? "text-[#1B1B1B]" : "text-[#6B6B6B]"
                          }
                        />
                      </div>
                      <div>
                        <p className="font-bold text-[#1B1B1B] text-lg">{plan.name}</p>
                        <p className="text-[#9B9B9B] text-xs">{plan.tagline}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-[#6B6B6B] font-medium">R$</span>
                        <span className="text-5xl font-black text-[#1B1B1B] tracking-tight">
                          {plan.price}
                        </span>
                        <span className="text-[#9B9B9B] text-sm">{plan.period}</span>
                      </div>
                      <p className="text-xs text-[#9B9B9B] mt-1">
                        Cobrado mensalmente · Cancele quando quiser
                      </p>
                    </div>

                    <Link
                      href="/register"
                      className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm mb-6 transition-all hover:opacity-90 ${plan.btnClass}`}
                    >
                      Começar com {plan.name}
                      <ArrowRight size={15} />
                    </Link>

                    <div className="space-y-3 flex-1">
                      {/* Limites — únicos diferenciais entre os planos */}
                      {plan.limits.map((f) => (
                        <div key={f} className="flex items-start gap-2.5">
                          <CheckCircle
                            size={15}
                            className="text-[#EF9F27] mt-0.5 shrink-0"
                          />
                          <span className="text-sm font-semibold text-[#1B1B1B]">{f}</span>
                        </div>
                      ))}

                      {/* Separador */}
                      <div className="border-t border-[#E5E5E5] my-1" />

                      {/* Funcionalidades idênticas nos dois planos */}
                      {SHARED_FEATURES.map((f) => (
                        <div key={f} className="flex items-start gap-2.5">
                          <CheckCircle
                            size={15}
                            className="text-[#EF9F27] mt-0.5 shrink-0"
                          />
                          <span className="text-sm text-[#1B1B1B]">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Fade>
              );
            })}
          </div>

          <Fade delay={250} className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-[#6B6B6B] text-sm">
              <Shield size={16} className="text-[#EF9F27]" />
              Sem fidelidade. Cancele a qualquer momento, sem multa e sem burocracia.
            </div>
          </Fade>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 md:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <Fade className="text-center mb-10 md:mb-12">
            <p className="text-[#EF9F27] text-sm font-semibold tracking-widest uppercase mb-3">
              Dúvidas frequentes
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1B1B1B]">
              Perguntas que a gente mais recebe
            </h2>
          </Fade>

          <Fade delay={100}>
            <div className="bg-[#FAFAF8] rounded-2xl border border-[#E5E5E5] px-6">
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </Fade>

          <Fade delay={200} className="mt-8 text-center">
            <p className="text-[#9B9B9B] text-sm">
              Ainda tem dúvidas?{" "}
              <a
                href="mailto:contato@agendaestilo.com.br"
                className="text-[#EF9F27] hover:underline font-medium"
              >
                Entre em contato conosco
              </a>
            </p>
          </Fade>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-[#1B1B1B] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#EF9F27]/8 blur-[120px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <Fade>
            <div className="inline-flex items-center gap-2 bg-[#EF9F27]/15 border border-[#EF9F27]/30 text-[#EF9F27] px-4 py-2 rounded-full text-xs font-semibold tracking-wide mb-6">
              <Sparkles size={12} />
              COMECE AINDA HOJE
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
              Sua agenda organizada começa{" "}
              <span className="text-[#EF9F27]">agora</span>
            </h2>
            <p className="text-white/50 text-base md:text-lg mb-8 max-w-xl mx-auto">
              Crie sua conta, configure seu estabelecimento e comece a receber
              agendamentos online — tudo sem precisar instalar nada.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#EF9F27] text-[#1B1B1B] font-bold text-base shadow-lg shadow-[#EF9F27]/20 hover:bg-[#ffb340] transition-all"
              >
                Criar conta grátis
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/20 text-white font-medium text-base hover:bg-white/10 transition-all"
              >
                Já tenho conta → Entrar
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 mt-8">
              {[
                { icon: CheckCircle, text: "Grátis para começar" },
                { icon: CreditCard, text: "Sem cartão de crédito" },
                { icon: Shield, text: "Sem fidelidade" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 text-white/40 text-sm"
                >
                  <Icon size={14} className="text-[#EF9F27]" />
                  {text}
                </div>
              ))}
            </div>
          </Fade>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#111] py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#EF9F27] flex items-center justify-center">
                  <Scissors size={16} className="text-white" />
                </div>
                <span className="font-bold text-white tracking-tight">
                  AgendaEstilo
                </span>
              </div>
              <p className="text-[#555] text-sm leading-relaxed">
                Plataforma de agendamento online para salões de beleza, barbearias e
                esmalterias.
              </p>
            </div>

            <div>
              <p className="text-white font-semibold text-sm mb-4">Produto</p>
              <ul className="space-y-2.5">
                {[
                  { label: "Funcionalidades", href: "#features" },
                  { label: "Como funciona", href: "#how-it-works" },
                  { label: "Planos", href: "#pricing" },
                  { label: "FAQ", href: "#faq" },
                ].map(({ label, href }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="text-[#555] text-sm hover:text-white transition-colors"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white font-semibold text-sm mb-4">Conta</p>
              <ul className="space-y-2.5">
                {[
                  { label: "Criar conta grátis", href: "/register" },
                  { label: "Entrar", href: "/login" },
                ].map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-[#555] text-sm hover:text-white transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-white font-semibold text-sm mb-4">Contato</p>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="mailto:contato@agendaestilo.com.br"
                    className="text-[#555] text-sm hover:text-white transition-colors"
                  >
                    contato@agendaestilo.com.br
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[#444] text-xs">
              © 2025 AgendaEstilo. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="text-[#444] text-xs hover:text-white transition-colors"
              >
                Privacidade
              </a>
              <a
                href="#"
                className="text-[#444] text-xs hover:text-white transition-colors"
              >
                Termos de uso
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
