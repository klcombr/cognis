import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DonationModal } from '../components/DonationModal';
import ThemeToggle from '../components/ThemeToggle';

const FEATURES = [
  {
    icon: 'M4 5h16v11H4zm0 4h16M7 13h4',
    title: 'Decomposição automática',
    desc: 'Cole qualquer tema — de uma matéria da faculdade a um assunto de concurso — e a IA quebra em conceitos, com pré-requisitos e ordem de estudo.',
  },
  {
    icon: 'M12 3c3 2 5 5 5 9a5 5 0 01-10 0c0-1 .2-2 .6-2.8M12 3v4',
    title: 'Sempre adaptativo',
    desc: 'Errou? O nível cai e muda a técnica. Acertou? Avança. Cada sessão é montada para o seu momento, com 7 técnicas de retenção.',
  },
  {
    icon: 'M4 12c0-4.5 3.5-8 8-8s8 3.5 8 8-3.5 8-8 8H9l-3 2v-3',
    title: 'Revisão espaçada',
    desc: 'Fila de revisão inteligente no momento certo. O que está fraco volta, o que está forte descansa.',
  },
  {
    icon: 'M7 7l10 10M7 17L17 7',
    title: 'Análise de erros',
    desc: 'Cada erro é classificado por tipo — conceitual, procedimental, descuido. Você vê o padrão e ataca a causa, não o sintoma.',
  },
  {
    icon: 'M9 3v18M15 3v18M3 9h18M3 15h18',
    title: 'Metas semanais',
    desc: 'Defina o quanto quer dominar por semana e acompanhe a barra de progresso. Estudo com direção.',
  },
  {
    icon: 'M12 16a4 4 0 100-8 4 4 0 000 8zM16.8 11H21M3 11h4.2',
    title: 'Seus dados, suas regras',
    desc: 'Sem anúncios, sem venda de dados. Todo o seu progresso pode ser exportado em um clique, a qualquer momento.',
  },
];

const TECHNIQUES = [
  ['EXEMPLO RESOLVIDO', 'Aprenda vendo um exemplo completo, passo a passo.'],
  ['PRÁTICA ATIVA', 'Recuperar da memória sem ajuda, no jeito certo.'],
  ['APLICAÇÃO', 'Resolver problemas reais sobre o conceito.'],
  ['TRANSFERÊNCIA', 'Usar o conceito em contextos novos.'],
  ['VARIAÇÃO', 'O mesmo conceito, mil formas de ver.'],
  ['COMPRESSÃO', 'Resumir e compactar o essencial.'],
  ['EXPLICAÇÃO', 'Ensinar como se fosse outra pessoa.'],
] as const;

const FAQ = [
  {
    q: 'O Cognis é gratuito mesmo?',
    a: 'Sim. Criar tópicos, praticar, revisar e acompanhar seu progresso é gratuito e sem limite de uso. Sem cartão, sem anúncios.',
  },
  {
    q: 'Como a IA decompõe o meu tema?',
    a: 'Você descreve o tema e a meta. A IA gera uma lista de conceitos com dependências entre eles (o que precisa vir antes) e uma ordem de estudo. Depois você pode editar, renomear, mover pré-requisitos e regenerar quando quiser.',
  },
  {
    q: 'Funciona para qualquer assunto?',
    a: 'O Cognis foi desenhado para estudos acadêmicos, concursos, carreiras técnicas e idiomas. Se for conteúdo que pode ser quebrado em conceitos, funciona.',
  },
  {
    q: 'Meus dados são usados para treinar IA?',
    a: 'Não. Seus tópicos, respostas e progresso ficam no seu ambiente. A IA apenas gera conteúdo de estudo sob demanda, e você pode exportar tudo em JSON a qualquer momento.',
  },
  {
    q: 'Preciso instalar alguma coisa?',
    a: 'Não. O Cognis roda inteiro no navegador — no computador, tablet ou celular.',
  },
  {
    q: 'Como sei que estou evoluindo?',
    a: 'Cada conceito tem nível de conhecimento e confiança, com uma linha do tempo por conceito. Você vê erros por tipo, padrão de resposta, meta semanal e um gráfico de domínio geral do tópico.',
  },
];

export default function Landing() {
  const [donationOpen, setDonationOpen] = useState(false);
  return (
    <div className="min-h-screen bg-bg">
      <DonationModal isOpen={donationOpen} onClose={() => setDonationOpen(false)} />
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-bg focus:border-2 focus:border-text focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-text">Pular para o conteúdo</a>

      <header className="sticky top-0 z-40 bg-bg border-b-2 border-text">
        <nav className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-4" aria-label="Principal">
          <Link to="/" className="flex items-center gap-2 mr-auto" aria-label="Cognis — início">
            <div className="w-7 h-7 bg-text rounded-sm flex items-center justify-center shadow-[2px_2px_0_#555]">
              <span className="text-xs font-extrabold text-white">C</span>
            </div>
            <span className="text-sm font-extrabold text-text tracking-wide">COGNIS</span>
          </Link>
          <a href="#como-funciona" className="hidden sm:block text-xs font-bold text-text-secondary hover:text-text transition-colors">Como funciona</a>
          <a href="#recursos" className="hidden sm:block text-xs font-bold text-text-secondary hover:text-text transition-colors">Recursos</a>
          <a href="#faq" className="hidden sm:block text-xs font-bold text-text-secondary hover:text-text transition-colors">FAQ</a>
          <div className="hidden sm:flex"><ThemeToggle /></div>
          <Link to="/start" className="btn btn-primary px-4 py-2 text-xs font-extrabold rounded-sm">Começar grátis</Link>
        </nav>
      </header>

      <main id="conteudo">
        <section className="border-b-2 border-text bg-bg" aria-labelledby="hero-titulo">
          <div className="max-w-5xl mx-auto px-5 py-16 md:py-24 grid md:grid-cols-[1.05fr_1fr] gap-12 items-center">
            <div className="space-y-6">
              <p className="text-[10px] font-extrabold tracking-[0.2em] text-text-muted uppercase font-mono">Plataforma de estudos adaptativa</p>
              <h1 id="hero-titulo" className="text-4xl md:text-5xl font-extrabold text-text leading-[1.05] tracking-tight">
                Conhecimento que não escapa.
              </h1>
              <p className="text-sm md:text-base font-semibold text-text-secondary leading-relaxed max-w-md">
                O Cognis transforma qualquer assunto em um plano de estudo sob medida: a IA decompõe o tema em conceitos,
                monta a ordem certa e ajusta a prática ao seu nível — em tempo real.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/start" className="btn btn-primary px-6 py-3 text-sm font-extrabold rounded-sm">Começar a estudar →</Link>
                <a href="#como-funciona" className="btn btn-ghost px-6 py-3 text-sm font-extrabold text-text rounded-sm">Ver como funciona</a>
              </div>
              <p className="text-[11px] font-bold text-text-muted font-mono">GRÁTIS · SEM CARTÃO · SEM ANÚNCIOS</p>
            </div>

            <div className="relative" aria-hidden="true">
              <div className="absolute -inset-3 bg-text/5 rounded-sm" />
              <div className="relative card rounded-sm p-4 bg-white shadow-[8px_8px_0_#111] border-2 border-text">
                <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-text">
                  <span className="text-[10px] font-extrabold text-text font-mono">COGNIS · PAINEL</span>
                  <span className="text-[10px] font-extrabold text-text-muted font-mono">SEG 09/09</span>
                </div>
                <div className="grid grid-cols-[1fr_1.2fr] gap-3">
                  <div className="space-y-3">
                    <div className="border-2 border-text rounded-sm p-3 bg-surface-alt">
                      <div className="text-[9px] font-extrabold text-text-muted font-mono mb-1">TOPICO ATIVO</div>
                      <div className="text-xs font-extrabold text-text">Sistemas Distribuídos</div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[8px] font-extrabold bg-text text-white px-1.5 py-0.5 rounded-sm">9 CONCEITOS</span>
                        <span className="text-[8px] font-extrabold bg-text text-white px-1.5 py-0.5 rounded-sm">3/9</span>
                      </div>
                    </div>
                    <div className="border-2 border-text rounded-sm p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-extrabold text-text-muted font-mono">META SEMANAL</span>
                        <span className="text-[9px] font-extrabold text-text">6/8</span>
                      </div>
                      <div className="h-2 border border-text bg-surface-alt rounded-sm overflow-hidden">
                        <div className="h-full bg-text" style={{ width: '75%' }} />
                      </div>
                    </div>
                    <div className="border-2 border-text rounded-sm p-3 bg-text text-white shadow-[3px_3px_0_#555]">
                      <div className="text-[9px] font-extrabold font-mono opacity-70 mb-0.5">REVISAR AGORA</div>
                      <div className="text-[10px] font-extrabold leading-tight">3 conceitos prontos para revisão</div>
                    </div>
                  </div>
                  <div className="border-2 border-text rounded-sm p-3">
                    <div className="text-[9px] font-extrabold text-text-muted font-mono mb-2">PROGRESSO</div>
                    {[
                      ['Replicação e RPC', 'TRANSFERRED', 'w-full'],
                      ['Consistência e CAP', 'APPLIED', 'w-4/5'],
                      ['Eleição de líder', 'UNDERSTOOD', 'w-3/5'],
                      ['Particionamento', 'EXPOSED', 'w-2/5'],
                    ].map(([n, s, w]) => (
                      <div key={n as string} className="mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-extrabold text-text truncate">{n}</span>
                          <span className="text-[8px] font-extrabold text-text-muted font-mono ml-2">{s}</span>
                        </div>
                        <div className="h-1.5 bg-surface-alt border border-text rounded-sm overflow-hidden">
                          <div className={`h-full bg-text ${w}`} />
                        </div>
                      </div>
                    ))}
                    <div className="border-t-2 border-text mt-2 pt-2 flex items-center justify-between">
                      <span className="text-[9px] font-extrabold text-text-muted font-mono">ACURACIA DA SEMANA</span>
                      <span className="text-[10px] font-extrabold text-text">78%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="border-b-2 border-text bg-surface" aria-labelledby="como-titulo">
          <div className="max-w-5xl mx-auto px-5 py-16 md:py-20">
            <p className="text-[10px] font-extrabold tracking-[0.2em] text-text-muted uppercase font-mono">COMO FUNCIONA</p>
            <h2 id="como-titulo" className="text-3xl md:text-4xl font-extrabold text-text tracking-tight mt-2 mb-10">Do zero ao domínio em 3 passos</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                ['01', 'Descreva o tema', '“Quero dominar Sistemas Distribuídos — o que cai em entrevista.” O Cognis entende o assunto e o objetivo.'],
                ['02', 'A IA decompõe', 'Você recebe os conceitos organizados em grafo: o que vem antes, o que vem depois, e por onde começar. Edite até ficar do seu jeito.'],
                ['03', 'Pratique e evolua', 'Sessões adaptativas, revisão espaçada e relatórios de erro. Cada resposta molda o próximo exercício.'],
              ].map(([n, t, d], i) => (
                <div key={n} className="card rounded-sm p-6 bg-white border-2 border-text shadow-[5px_5px_0_#111]">
                  <div className="w-10 h-10 bg-text text-white text-sm font-extrabold rounded-sm flex items-center justify-center mb-4 font-mono">{n}</div>
                  <h3 className="text-base font-extrabold text-text mb-1.5">{t}</h3>
                  <p className="text-xs font-semibold text-text-secondary leading-relaxed">{d}</p>
                  {i < 2 && <div className="hidden md:block absolute" />}
                </div>
              ))}
            </div>
            <p className="mt-8 text-center">
              <Link to="/start" className="btn btn-primary px-6 py-3 text-sm font-extrabold rounded-sm">Quero ver o meu tema decomposto →</Link>
            </p>
          </div>
        </section>

        <section id="recursos" className="border-b-2 border-text bg-bg" aria-labelledby="recursos-titulo">
          <div className="max-w-5xl mx-auto px-5 py-16 md:py-20">
            <p className="text-[10px] font-extrabold tracking-[0.2em] text-text-muted uppercase font-mono">RECURSOS</p>
            <h2 id="recursos-titulo" className="text-3xl md:text-4xl font-extrabold text-text tracking-tight mt-2 mb-4">
              Um sistema, não só um quiz
            </h2>
            <p className="text-sm font-semibold text-text-secondary leading-relaxed max-w-xl mb-10">
              O que separa quem decora de quem domina é a forma de praticar. Cada recurso do Cognis existe para uma coisa: fazer o conhecimento durar.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="card rounded-sm p-5 bg-white border-2 border-text shadow-[4px_4px_0_#111] hover:shadow-[6px_6px_0_#111] hover:-translate-y-0.5 transition-all">
                  <div className="w-9 h-9 border-2 border-text rounded-sm flex items-center justify-center mb-3 bg-surface-alt">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text">
                      <path d={f.icon} />
                    </svg>
                  </div>
                  <h3 className="text-sm font-extrabold text-text mb-1">{f.title}</h3>
                  <p className="text-xs font-semibold text-text-secondary leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-12">
              <p className="text-[10px] font-extrabold tracking-[0.2em] text-text-muted uppercase font-mono mb-3">7 TÉCNICAS DE RETENÇÃO EM CADA SESSÃO</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TECHNIQUES.map(([name, desc]) => (
                  <div key={name} className="border-2 border-text rounded-sm px-4 py-3 bg-surface flex gap-3 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-text mt-1.5 shrink-0" />
                    <div>
                      <div className="text-[11px] font-extrabold text-text font-mono">{name}</div>
                      <div className="text-[11px] font-semibold text-text-secondary mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b-2 border-text bg-text text-white" aria-labelledby="cta-titulo">
          <div className="max-w-3xl mx-auto px-5 py-16 text-center space-y-5">
            <h2 id="cta-titulo" className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Pronto para construir conhecimento que fica?
            </h2>
            <p className="text-sm font-semibold text-white/80 leading-relaxed">
              Leva menos de um minuto para criar seu primeiro tópico. A decomposição é instantânea.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/start" className="btn bg-white text-text border-2 border-white px-6 py-3 text-sm font-extrabold rounded-sm shadow-[4px_4px_0_#000]">Começar grátis →</Link>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-bg" aria-labelledby="faq-titulo">
          <div className="max-w-3xl mx-auto px-5 py-16 md:py-20">
            <p className="text-[10px] font-extrabold tracking-[0.2em] text-text-muted uppercase font-mono">PERGUNTAS FREQUENTES</p>
            <h2 id="faq-titulo" className="text-3xl md:text-4xl font-extrabold text-text tracking-tight mt-2 mb-8">Dúvidas comuns</h2>
            <div className="space-y-3">
              {FAQ.map((item) => (
                <details key={item.q} className="card rounded-sm bg-white border-2 border-text overflow-hidden group">
                  <summary className="px-5 py-4 cursor-pointer list-none flex items-center justify-between gap-4 text-sm font-extrabold text-text select-none">
                    {item.q}
                    <span className="text-text-muted font-mono group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="px-5 pb-4 text-xs font-semibold text-text-secondary leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-text bg-surface">
        <div className="max-w-5xl mx-auto px-5 py-10 grid sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-text rounded-sm flex items-center justify-center shadow-[2px_2px_0_#555]">
                <span className="text-[10px] font-extrabold text-white">C</span>
              </div>
              <span className="text-xs font-extrabold text-text tracking-wide">COGNIS</span>
            </div>
            <p className="text-[11px] font-semibold text-text-muted leading-relaxed">
              Plataforma de estudos adaptativa. Decompõe, pratica, revisa e evolui com você.
            </p>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-text-muted uppercase font-mono mb-3">Plataforma</p>
            <ul className="space-y-2 text-xs font-bold text-text">
              <li><a href="#como-funciona" className="hover:underline">Como funciona</a></li>
              <li><a href="#recursos" className="hover:underline">Recursos</a></li>
              <li><a href="#faq" className="hover:underline">Perguntas frequentes</a></li>
              <li><Link to="/start" className="hover:underline">Começar a estudar</Link></li>
              <li>
                <button onClick={() => setDonationOpen(true)} className="hover:underline">Apoie o projeto</button>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-extrabold text-text-muted uppercase font-mono mb-3">Transparência</p>
            <ul className="space-y-2 text-xs font-bold text-text">
              <li><a href="/llms.txt" className="hover:underline">llms.txt — resumo do produto para IA</a></li>
              <li><a href="/sitemap.xml" className="hover:underline">sitemap.xml</a></li>
              <li><a href="/robots.txt" className="hover:underline">robots.txt</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t-2 border-text">
          <div className="max-w-5xl mx-auto px-5 py-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold text-text-muted font-mono">© 2026 COGNIS · FEITO PARA QUEM ESTUDA PARA VALER</p>
            <p className="text-[10px] font-bold text-text-muted font-mono">APRENDER É O META</p>
          </div>
        </div>
      </footer>
    </div>
  );
}