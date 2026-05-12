import React from 'react';
import { ArrowRight, Wrench, Calendar, ClipboardList, BarChart3 } from 'lucide-react';

export default function LandingHero() {
  return (
    <section className="landing-grid-bg" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '5rem', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="landing-animate-pulse" style={{ position: 'absolute', top: '25%', left: '-5rem', width: '500px', height: '500px', background: 'rgba(245,158,11,0.06)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div className="landing-animate-pulse" style={{ position: 'absolute', bottom: '25%', right: '-5rem', width: '600px', height: '600px', background: 'rgba(234,88,12,0.06)', borderRadius: '50%', filter: 'blur(120px)', animationDelay: '2s' }} />
        <div className="landing-animate-float" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '400px', height: '400px', background: 'rgba(245,158,11,0.04)', borderRadius: '50%', filter: 'blur(100px)' }} />
      </div>

      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem', position: 'relative', zIndex: 10, width: '100%' }}>
        <div className="landing-hero-grid">
          {/* Left: text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="landing-glass landing-animate-fadeIn" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '9999px',
              border: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24',
              fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', width: 'fit-content',
            }}>
              <Wrench style={{ width: '0.875rem', height: '0.875rem' }} />
              ERP INTEGRAL PARA TALLERES MECANICOS
            </div>

            <h1 style={{ fontSize: 'clamp(2.25rem, 5vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0 }}>
              <span className="landing-gradient-text">Digitaliza tu</span>
              <br />
              <span className="landing-gradient-text">Taller.</span>
              <br />
              <span style={{ color: '#fff' }}>Automatiza</span>
              <br />
              <span style={{ color: '#fbbf24' }}>tu Exito.</span>
            </h1>

            <p style={{ fontSize: '1.125rem', color: '#94a3b8', lineHeight: 1.7, maxWidth: '32rem', margin: 0 }}>
              GC Torque transforma la operacion de tu taller mecanico con gestion de citas, tablero Kanban, inventario inteligente, facturacion electronica FEL y reportes en tiempo real.
            </p>

            <div className="landing-hero-buttons">
              <a href="#contacto" className="landing-btn-primary" style={{ fontSize: '1rem' }}>
                Solicitar Demo Gratuita
                <ArrowRight style={{ width: '1rem', height: '1rem' }} />
              </a>
              <a href="#servicios" className="landing-btn-outline">
                Ver Funcionalidades
              </a>
            </div>
          </div>

          {/* Right: dashboard mockup */}
          <div className="landing-hero-visual landing-animate-fadeIn" style={{ animationDelay: '0.3s' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top right, rgba(245,158,11,0.1), rgba(234,88,12,0.1))', borderRadius: '1rem', filter: 'blur(48px)' }} />
            <div className="landing-glass-card landing-animate-glowPulse" style={{ position: 'relative', borderRadius: '1rem', padding: '4px' }}>
              <div style={{ background: 'rgba(2,6,23,0.8)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                {/* Terminal header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid rgba(30,41,59,0.8)' }}>
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: 'rgba(239,68,68,0.8)' }} />
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: 'rgba(234,179,8,0.8)' }} />
                  <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: 'rgba(34,197,94,0.8)' }} />
                  <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#475569', fontFamily: "'JetBrains Mono', monospace" }}>
                    torque-dashboard
                  </span>
                </div>
                {/* Content */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="landing-animate-pulse-dot" style={{ width: '0.5rem', height: '0.5rem', background: '#fbbf24', borderRadius: '50%' }} />
                    <span style={{ color: '#fbbf24' }}>Ordenes Hoy:</span>
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>24 activas</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', color: '#94a3b8' }}>
                    {[
                      { icon: Calendar, label: 'Citas Agendadas', status: '12 pendientes', color: '#fbbf24' },
                      { icon: ClipboardList, label: 'Kanban Board', status: 'En proceso: 8', color: '#3b82f6' },
                      { icon: BarChart3, label: 'Inventario', status: '142 productos', color: '#22c55e' },
                      { icon: Wrench, label: 'Facturacion FEL', status: 'Conectada', color: '#22c55e' },
                    ].map((item) => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(30,41,59,0.4)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                          <item.icon style={{ width: '0.875rem', height: '0.875rem', color: item.color }} />
                          {item.label}
                        </span>
                        <span style={{ color: item.color, fontWeight: 500 }}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ paddingTop: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid rgba(30,41,59,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#475569' }}>Eficiencia</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>94.5%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .landing-hero-grid { display: grid; grid-template-columns: 1fr; gap: 3rem; align-items: center; }
        .landing-hero-visual { display: none; position: relative; }
        .landing-hero-buttons { display: flex; flex-direction: column; gap: 1rem; }
        @media (min-width: 1024px) {
          .landing-hero-grid { grid-template-columns: 1fr 1fr; gap: 4rem; }
          .landing-hero-visual { display: block; }
          .landing-hero-buttons { flex-direction: row; }
        }
        @media (min-width: 640px) {
          .landing-hero-buttons { flex-direction: row; }
        }
      `}</style>
    </section>
  );
}
