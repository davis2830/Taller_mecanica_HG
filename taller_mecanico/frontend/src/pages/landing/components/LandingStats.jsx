import React from 'react';
import { useReveal, useCounter } from './useReveal';

function StatCard({ value, suffix, label }) {
  const [ref, visible] = useReveal(0.3);
  const count = useCounter(value, 1800, 0, visible);

  return (
    <div
      ref={ref}
      className="landing-glass-card"
      style={{
        borderRadius: '1rem', padding: '1.5rem', textAlign: 'center',
        transition: 'all 0.7s',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(2rem)',
      }}
    >
      <div className="landing-gradient-text" style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
        {count}{suffix}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function LandingStats() {
  return (
    <section style={{ padding: '4rem 0', position: 'relative' }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '0 1rem' }}>
        <div className="landing-stats-grid">
          <StatCard value={500} suffix="+" label="Ordenes Mensuales" />
          <StatCard value={98} suffix="%" label="Clientes Satisfechos" />
          <StatCard value={15} suffix="min" label="Tiempo Promedio Factura" />
          <StatCard value={24} suffix="/7" label="Sistema Disponible" />
        </div>
      </div>
      <style>{`
        .landing-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
        @media (min-width: 768px) { .landing-stats-grid { grid-template-columns: repeat(4, 1fr); } }
      `}</style>
    </section>
  );
}
