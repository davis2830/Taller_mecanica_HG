import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { useReveal } from './useReveal';

const plans = [
  {
    name: 'Starter',
    price: 'Q ---',
    period: '/mes',
    desc: 'Ideal para talleres pequenos que inician su digitalizacion.',
    features: [
      'Hasta 3 usuarios',
      'Gestion de citas',
      'Ordenes de trabajo',
      'Inventario basico',
      'Soporte por email',
    ],
    cta: 'Comenzar',
    accent: false,
  },
  {
    name: 'Profesional',
    price: 'Q ---',
    period: '/mes',
    desc: 'Para talleres en crecimiento que necesitan control total.',
    features: [
      'Hasta 10 usuarios',
      'Todo de Starter',
      'Tablero Kanban avanzado',
      'Facturacion electronica FEL',
      'Reportes y metricas',
      'Inventario inteligente',
      'Soporte prioritario',
    ],
    cta: 'Elegir Plan',
    accent: true,
    badge: 'Mas Popular',
  },
  {
    name: 'Enterprise',
    price: 'Q ---',
    period: '/mes',
    desc: 'Para cadenas de talleres con operaciones complejas.',
    features: [
      'Usuarios ilimitados',
      'Todo de Profesional',
      'Multi-sucursal',
      'API & integraciones',
      'Dashboard ejecutivo',
      'Gerente de cuenta dedicado',
      'SLA garantizado',
    ],
    cta: 'Contactar Ventas',
    accent: false,
  },
];

export default function LandingPricing() {
  const [ref, visible] = useReveal(0.1);

  return (
    <section id="precios" style={{ padding: '6rem 0', position: 'relative' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem' }}>
        {/* Header */}
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
            <span style={{ width: '2rem', height: '1px', background: '#f59e0b' }} /> PLANES
          </span>
          <h2 className="landing-gradient-text" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)', fontWeight: 700, marginBottom: '1rem' }}>
            Planes y Precios
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
            Elige el plan perfecto para tu taller. Precios proximamente.
          </p>
        </div>

        {/* Cards */}
        <div className="landing-pricing-grid">
          {plans.map((plan, i) => (
            <PlanCard key={plan.name} plan={plan} index={i} />
          ))}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ color: '#64748b', marginBottom: '1rem' }}>No estas seguro? Prueba antes de decidir.</p>
          <a href="#contacto" className="landing-btn-outline" style={{ color: '#fbbf24', borderColor: 'rgba(245,158,11,0.3)' }}>
            Solicitar Demo Gratuita
            <ArrowRight style={{ width: '1rem', height: '1rem' }} />
          </a>
        </div>
      </div>

      <style>{`
        .landing-pricing-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 768px) { .landing-pricing-grid { grid-template-columns: repeat(3, 1fr); gap: 2rem; } }
      `}</style>
    </section>
  );
}

function PlanCard({ plan, index }) {
  const [ref, visible] = useReveal(0.15);

  return (
    <div
      ref={ref}
      className="landing-glass-card"
      style={{
        position: 'relative', borderRadius: '1rem', padding: '2rem',
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.7s',
        transitionDelay: `${index * 120}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(2.5rem)',
        ...(plan.accent ? { borderColor: 'rgba(245,158,11,0.3)', boxShadow: '0 0 0 1px rgba(245,158,11,0.1)' } : {}),
      }}
    >
      {plan.badge && (
        <div style={{
          position: 'absolute', top: '-0.75rem', left: '50%', transform: 'translateX(-50%)',
          padding: '0.25rem 1rem',
          background: 'linear-gradient(to right, #f59e0b, #ea580c)',
          color: '#fff', fontSize: '0.75rem', fontWeight: 700, borderRadius: '9999px',
          boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
        }}>
          {plan.badge}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.25rem', color: plan.accent ? '#fbbf24' : '#fff' }}>
          {plan.name}
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{plan.desc}</p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2.25rem', fontWeight: 800, color: plan.accent ? '#fbbf24' : '#fff' }}>
          {plan.price}
        </span>
        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{plan.period}</span>
      </div>

      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, listStyle: 'none', padding: 0, margin: '0 0 2rem 0' }}>
        {plan.features.map((f) => (
          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', color: '#94a3b8' }}>
            <Check style={{ width: '1rem', height: '1rem', flexShrink: 0, marginTop: '0.125rem', color: plan.accent ? '#fbbf24' : '#22d3ee' }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        style={{
          width: '100%', padding: '0.75rem', borderRadius: '0.75rem',
          fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
          transition: 'all 0.3s', border: 'none',
          ...(plan.accent
            ? { background: 'linear-gradient(to right, #f59e0b, #ea580c)', color: '#fff', boxShadow: '0 10px 25px rgba(217,119,6,0.2)' }
            : { background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155' }
          ),
        }}
        onMouseEnter={e => {
          if (plan.accent) {
            e.target.style.transform = 'translateY(-2px)';
          } else {
            e.target.style.background = '#334155';
            e.target.style.color = '#fff';
          }
        }}
        onMouseLeave={e => {
          if (plan.accent) {
            e.target.style.transform = 'translateY(0)';
          } else {
            e.target.style.background = '#1e293b';
            e.target.style.color = '#cbd5e1';
          }
        }}
      >
        {plan.cta}
      </button>
    </div>
  );
}
