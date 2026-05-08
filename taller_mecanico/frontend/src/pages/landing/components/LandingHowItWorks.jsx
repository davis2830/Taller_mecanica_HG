import React from 'react';
import { UserPlus, Settings, Rocket } from 'lucide-react';
import { useReveal } from './useReveal';

const steps = [
  {
    icon: UserPlus,
    number: '01',
    title: 'Registrate y configura',
    desc: 'Crea tu cuenta, configura tu taller (nombre, logo, datos fiscales) y agrega tus mecanicos y servicios.',
  },
  {
    icon: Settings,
    number: '02',
    title: 'Importa tu operacion',
    desc: 'Carga tu catalogo de servicios, inventario de repuestos y base de clientes. Nosotros te ayudamos con la migracion.',
  },
  {
    icon: Rocket,
    number: '03',
    title: 'Opera y crece',
    desc: 'Empieza a recibir citas, gestiona ordenes en el Kanban, factura con FEL y analiza tus metricas para crecer.',
  },
];

export default function LandingHowItWorks() {
  const [ref, visible] = useReveal(0.1);

  return (
    <section id="como-funciona" style={{ padding: '6rem 0', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(245,158,11,0.03), transparent)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1rem', position: 'relative', zIndex: 10 }}>
        <div
          ref={ref}
          style={{
            textAlign: 'center', maxWidth: '40rem', margin: '0 auto', marginBottom: '3.5rem',
            transition: 'all 0.7s',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(2rem)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', color: '#fbbf24', marginBottom: '1rem' }}>
            <span style={{ width: '2rem', height: '1px', background: '#f59e0b' }} /> COMO FUNCIONA
          </span>
          <h2 className="landing-gradient-text" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)', fontWeight: 700, marginBottom: '1rem' }}>
            En 3 Pasos Simples
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
            De taller tradicional a taller digital en menos de una semana
          </p>
        </div>

        <div className="landing-steps-grid">
          {steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>
      </div>

      <style>{`
        .landing-steps-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 768px) { .landing-steps-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </section>
  );
}

function StepCard({ step, index }) {
  const [ref, visible] = useReveal(0.15);
  const Icon = step.icon;

  return (
    <div
      ref={ref}
      className="landing-glass-card"
      style={{
        borderRadius: '1.5rem', padding: '2.5rem 2rem', textAlign: 'center',
        transition: 'all 0.7s',
        transitionDelay: `${index * 150}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(2.5rem)',
      }}
    >
      <div style={{ position: 'relative', marginBottom: '1.5rem', display: 'inline-block' }}>
        <div style={{
          width: '4rem', height: '4rem',
          background: 'linear-gradient(to bottom right, #f59e0b, #ea580c)',
          borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(245,158,11,0.25)',
        }}>
          <Icon style={{ width: '1.75rem', height: '1.75rem', color: '#fff' }} />
        </div>
        <span style={{
          position: 'absolute', top: '-0.5rem', right: '-0.75rem',
          background: '#020617', border: '2px solid #f59e0b',
          borderRadius: '9999px', width: '1.75rem', height: '1.75rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.625rem', fontWeight: 700, color: '#fbbf24',
        }}>
          {step.number}
        </span>
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>{step.title}</h3>
      <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.7 }}>{step.desc}</p>
    </div>
  );
}
