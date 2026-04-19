import { useState } from 'react';
import Icon from '@/components/ui/icon';

const NAV_ITEMS = ['Главная', 'О клубе', 'Участники', 'События'];

const MEMBERS = [
  { name: 'Артём Волков', role: 'Гитара / Вокал', since: '2018' },
  { name: 'Денис Краев', role: 'Бас-гитара', since: '2019' },
  { name: 'Марина Соболь', role: 'Ударные', since: '2020' },
  { name: 'Иван Щербак', role: 'Гитара', since: '2021' },
  { name: 'Светлана Орлова', role: 'Клавишные', since: '2022' },
  { name: 'Никита Рев', role: 'Вокал', since: '2023' },
];

const EVENTS = [
  {
    date: '24 МАЯ',
    year: '2026',
    title: 'Открытая репетиция',
    place: 'Клуб «Подвал», Москва',
    type: 'Открыто для всех',
  },
  {
    date: '07 ИЮНЯ',
    year: '2026',
    title: 'Концерт — Весенний сезон',
    place: 'Арт-пространство «Гараж»',
    type: 'Билеты',
  },
  {
    date: '19 ИЮЛЯ',
    year: '2026',
    title: 'Мастер-класс: звукозапись',
    place: 'Студия «Северная», СПб',
    type: 'Регистрация',
  },
];

export default function Index() {
  const [active, setActive] = useState('Главная');
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (section: string) => {
    setActive(section);
    setMenuOpen(false);
    const id = section === 'Главная' ? 'hero' :
      section === 'О клубе' ? 'about' :
      section === 'Участники' ? 'members' : 'events';
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[var(--metal-light)] text-[var(--metal-dark)]">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--metal-light)]/95 backdrop-blur-sm border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-oswald font-semibold text-lg tracking-widest uppercase">
            METALLICA CLUB
          </span>

          <div className="hidden md:flex items-center gap-8">
            {NAV_ITEMS.map(item => (
              <button
                key={item}
                onClick={() => scrollTo(item)}
                className={`nav-link ${active === item ? 'opacity-100' : 'opacity-50'} hover:opacity-100`}
              >
                {item}
              </button>
            ))}
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            <Icon name={menuOpen ? 'X' : 'Menu'} size={22} />
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[var(--metal-light)] border-t border-[var(--border)] px-6 py-4 flex flex-col gap-4">
            {NAV_ITEMS.map(item => (
              <button key={item} onClick={() => scrollTo(item)}
                className="nav-link text-left opacity-80 hover:opacity-100">
                {item}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* HERO */}
      <section id="hero" className="pt-14 min-h-screen flex flex-col justify-center relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 w-full py-24 md:py-32">
          <div className="animate-fade-in-up">
            <p className="font-oswald font-light text-xs tracking-[0.3em] uppercase text-[var(--metal-dark)]/50 mb-6">
              Основан в 2018 · Москва
            </p>
          </div>
          <h1 className="animate-fade-in-up delay-100 font-oswald font-semibold leading-none uppercase mb-6"
            style={{ fontSize: 'clamp(3.5rem, 12vw, 10rem)', letterSpacing: '-0.01em' }}>
            METALLICA<br />
            <span className="font-light" style={{ letterSpacing: '0.04em' }}>CLUB</span>
          </h1>

          <div className="animate-line-grow delay-200 section-divider mb-8 origin-left" />

          <p className="animate-fade-in-up delay-300 font-ibm font-light text-base md:text-lg max-w-md leading-relaxed text-[var(--metal-dark)]/70">
            Независимое сообщество музыкантов и ценителей тяжёлой музыки. Репетиции, концерты, обмен опытом.
          </p>

          <div className="animate-fade-in-up delay-400 mt-12 flex flex-wrap gap-4">
            <button
              onClick={() => scrollTo('О клубе')}
              className="font-oswald font-medium text-sm tracking-widest uppercase px-8 py-3 bg-[var(--metal-dark)] text-[var(--metal-light)] hover:opacity-80 transition-opacity"
            >
              О клубе
            </button>
            <button
              onClick={() => scrollTo('События')}
              className="font-oswald font-medium text-sm tracking-widest uppercase px-8 py-3 border border-[var(--metal-dark)] text-[var(--metal-dark)] hover:bg-[var(--metal-dark)] hover:text-[var(--metal-light)] transition-colors"
            >
              События
            </button>
          </div>
        </div>

        <div className="absolute right-0 bottom-8 pointer-events-none select-none hidden lg:block">
          <span className="font-oswald font-semibold uppercase text-[var(--metal-dark)]/5"
            style={{ fontSize: '22vw', lineHeight: 1, letterSpacing: '-0.02em' }}>
            METAL
          </span>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 md:py-32 bg-[var(--metal-dark)] text-[var(--metal-light)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <p className="font-oswald font-light text-xs tracking-[0.3em] uppercase opacity-40 mb-6">
                01 / О клубе
              </p>
              <h2 className="font-oswald font-semibold uppercase text-4xl md:text-5xl leading-tight mb-6">
                Место,<br />где живёт<br />музыка
              </h2>
              <div className="section-divider bg-[var(--metal-light)] mb-8" />
            </div>
            <div className="space-y-6 font-ibm font-light text-[var(--metal-light)]/75 leading-relaxed">
              <p>
                Клуб металлики — это открытое пространство для всех, кто связан с тяжёлой музыкой.
                Мы объединяем музыкантов, звукорежиссёров, фотографов и просто слушателей.
              </p>
              <p>
                Еженедельные репетиции, совместные записи, мастер-классы от приглашённых музыкантов
                и живые выступления — всё это часть нашей жизни.
              </p>
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-[var(--metal-light)]/10">
                {[
                  { num: '8', label: 'лет истории' },
                  { num: '120+', label: 'участников' },
                  { num: '40+', label: 'концертов' },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="font-oswald font-semibold text-3xl mb-1">{stat.num}</div>
                    <div className="font-ibm font-light text-xs uppercase tracking-wider opacity-50">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MEMBERS */}
      <section id="members" className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="font-oswald font-light text-xs tracking-[0.3em] uppercase text-[var(--metal-dark)]/40 mb-4">
              02 / Участники
            </p>
            <h2 className="font-oswald font-semibold uppercase text-4xl md:text-5xl leading-tight">
              Состав клуба
            </h2>
            <div className="section-divider mt-6" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--border)]">
            {MEMBERS.map((m, i) => (
              <div key={i} className="bg-[var(--metal-light)] p-8 hover:bg-white transition-colors group">
                <div className="font-oswald font-light text-xs tracking-widest uppercase text-[var(--metal-dark)]/30 mb-3">
                  с {m.since}
                </div>
                <div className="font-oswald font-medium text-xl uppercase mb-1 group-hover:opacity-70 transition-opacity">
                  {m.name}
                </div>
                <div className="font-ibm font-light text-sm text-[var(--metal-dark)]/55">
                  {m.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTS */}
      <section id="events" className="py-24 md:py-32 bg-[var(--metal-dark)] text-[var(--metal-light)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="font-oswald font-light text-xs tracking-[0.3em] uppercase opacity-40 mb-4">
              03 / События
            </p>
            <h2 className="font-oswald font-semibold uppercase text-4xl md:text-5xl leading-tight">
              Ближайшие<br />события
            </h2>
            <div className="section-divider bg-[var(--metal-light)] mt-6" />
          </div>

          <div className="space-y-px">
            {EVENTS.map((ev, i) => (
              <div key={i}
                className="border-t border-[var(--metal-light)]/10 py-8 grid grid-cols-[auto_1fr_auto] gap-8 items-center group hover:border-[var(--metal-light)]/30 transition-colors cursor-pointer">
                <div className="text-center min-w-[64px]">
                  <div className="font-oswald font-semibold text-xl">{ev.date}</div>
                  <div className="font-ibm font-light text-xs opacity-40">{ev.year}</div>
                </div>
                <div>
                  <div className="font-oswald font-medium text-lg md:text-2xl uppercase group-hover:opacity-70 transition-opacity">
                    {ev.title}
                  </div>
                  <div className="font-ibm font-light text-sm opacity-50 mt-1 flex items-center gap-2">
                    <Icon name="MapPin" size={12} />
                    {ev.place}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className="font-oswald font-light text-xs tracking-widest uppercase border border-[var(--metal-light)]/20 px-4 py-2 group-hover:border-[var(--metal-light)]/50 transition-colors">
                    {ev.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[var(--metal-dark)] border-t border-[var(--metal-light)]/10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-oswald font-light text-xs tracking-widest uppercase text-[var(--metal-light)]/30">
            METALLICA CLUB © 2026
          </span>
          <div className="flex gap-6">
            {['ВКонтакте', 'Telegram', 'Instagram'].map(s => (
              <button key={s}
                className="font-oswald font-light text-xs tracking-wider uppercase text-[var(--metal-light)]/30 hover:text-[var(--metal-light)]/70 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
