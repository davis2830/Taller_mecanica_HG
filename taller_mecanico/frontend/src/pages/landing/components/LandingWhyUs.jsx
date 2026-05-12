import React from 'react';
import { useReveal } from './useReveal';

export default function LandingWhyUs() {
  const [ref, visible] = useReveal(0.1);

  const stats = [
    { value: '99.9%', label: 'Disponibilidad' },
    { value: '< 2h', label: 'Soporte' },
    { value: 'SaaS', label: 'Multi-tenant' },
    { value: '5/5', label: 'Satisfaccion' },
  ];

  return (
    <section id="porque" style={{ padding: '6rem 0', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(245,158,11,0.02), rgba(245,158,11,0.05), transparent)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1rem', position: 'relative', zIndex: 10 }}>
        <div
          ref={ref}
          className="landing-glass-card"
          style={{
            borderRadius: '1.5rem', padding: 'clamp(2.5rem, 5vw, 4rem)', position: 'relative', overflow: 'hidden',
            transition: 'all 0.7s',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(2rem)',
          }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: '18rem', height: '18rem', background: 'linear-gradient(to bottom right, rgba(245,158,11,0.1), rgba(234,88,12,0.1))', borderRadius: '50%', filter: 'blur(100px)' }} />

          <div style={{ position: 'relative' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', color: '#fbbf24', marginBottom: '1rem' }}>
              <span style={{ width: '2rem', height: '1px', background: '#f59e0b' }} /> POR QUE GC TORQUE?
            </span>

            <h2 className="landing-gradient-text" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)', fontWeight: 700, marginBottom: '2rem' }}>
              Por que elegirnos?
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '1.125rem', color: '#cbd5e1', lineHeight: 1.7, maxWidth: '40rem' }}>
              <p style={{ margin: 0 }}>
                No somos solo un software generico. <span style={{ color: '#fbbf24', fontWeight: 600 }}>GC Torque fue disenado especificamente para talleres mecanicos</span> en Guatemala y Centroamerica.
              </p>
              <p style={{ margin: 0 }}>
                Integramos facturacion electronica FEL de forma nativa, tablero Kanban para flujo de trabajo visual, y un sistema multi-tenant que permite <span style={{ color: '#f97316', fontWeight: 600 }}>gestionar multiples sucursales desde una sola plataforma</span>.
              </p>
              <p style={{ margin: 0 }}>
                Nuestro equipo de <span style={{ color: '#fbbf24', fontWeight: 600 }}>TechOps</span> respalda la infraestructura con monitoreo 24/7, deploys automatizados y soporte tecnico real.
              </p>
            </div>

            <div className="landing-whyus-grid" style={{ marginTop: '3rem' }}>
              {stats.map((s) => (
                <div key={s.label} style={{
                  background: 'rgba(30,41,59,0.4)', border: '1px solid rgba(51,65,85,0.5)',
                  borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center',
                }}>
                  <div className="landing-gradient-text" style={{ fontSize: 'clamp(1.5rem, 3vw, 1.875rem)', fontWeight: 700, marginBottom: '0.25rem' }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .landing-whyus-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        @media (min-width: 640px) { .landing-whyus-grid { grid-template-columns: repeat(4, 1fr); } }
      `}</style>
    </section>
  );
}
