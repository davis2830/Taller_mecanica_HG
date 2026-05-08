import React, { useState } from 'react';
import { ChevronRight, Send } from 'lucide-react';
import { useReveal } from './useReveal';

export default function LandingContact() {
  const [ref, visible] = useReveal(0.1);
  const [formData, setFormData] = useState({ nombre: '', taller: '', email: '', telefono: '', plan: '', mensaje: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <section id="contacto" style={{ padding: '6rem 0', position: 'relative' }}>
      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '0 1rem' }}>
        <div
          ref={ref}
          style={{
            transition: 'all 0.7s',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(2rem)',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', color: '#fbbf24', marginBottom: '1rem' }}>
              <span style={{ width: '2rem', height: '1px', background: '#f59e0b' }} /> CONTACTO
            </span>
            <h2 className="landing-gradient-text" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)', fontWeight: 700, marginBottom: '1rem' }}>
              Listo para digitalizar tu taller?
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.125rem', maxWidth: '36rem', margin: '0 auto' }}>
              Dejanos un mensaje y te contactaremos para agendar una demo personalizada de GC Torque.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="landing-glass-card" style={{ borderRadius: '1rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="landing-form-row">
              <InputField label="Nombre" value={formData.nombre} onChange={(v) => setFormData({ ...formData, nombre: v })} placeholder="Tu nombre" required />
              <InputField label="Nombre del Taller" value={formData.taller} onChange={(v) => setFormData({ ...formData, taller: v })} placeholder="Ej: Taller San Jose" required />
            </div>
            <div className="landing-form-row">
              <InputField label="Email" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} placeholder="tu@email.com" required />
              <InputField label="Telefono" type="tel" value={formData.telefono} onChange={(v) => setFormData({ ...formData, telefono: v })} placeholder="+502 1234-5678" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.5rem' }}>Plan de interes</label>
              <select
                required
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.6)',
                  borderRadius: '0.75rem', color: '#fff', fontSize: '0.875rem',
                  outline: 'none', transition: 'all 0.2s',
                }}
              >
                <option value="">Selecciona un plan</option>
                <option value="starter">Starter</option>
                <option value="profesional">Profesional</option>
                <option value="enterprise">Enterprise</option>
                <option value="demo">Solo quiero una demo</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.5rem' }}>Mensaje</label>
              <textarea
                rows={4}
                value={formData.mensaje}
                onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                placeholder="Cuentanos sobre tu taller..."
                style={{
                  width: '100%', padding: '0.75rem 1rem',
                  background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.6)',
                  borderRadius: '0.75rem', color: '#fff', fontSize: '0.875rem',
                  outline: 'none', resize: 'none', transition: 'all 0.2s',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {sent && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: '#4ade80', fontSize: '0.875rem',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                borderRadius: '0.75rem', padding: '0.75rem 1rem',
              }}>
                Mensaje enviado! Te contactaremos pronto.
              </div>
            )}

            <button type="submit" className="landing-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}>
              <Send style={{ width: '1rem', height: '1rem' }} />
              Enviar Solicitud
              <ChevronRight style={{ width: '1rem', height: '1rem' }} />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .landing-form-row { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
        @media (min-width: 640px) { .landing-form-row { grid-template-columns: repeat(2, 1fr); } }
      `}</style>
    </section>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, required }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.5rem' }}>{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '0.75rem 1rem',
          background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.6)',
          borderRadius: '0.75rem', color: '#fff', fontSize: '0.875rem',
          outline: 'none', transition: 'all 0.2s',
        }}
      />
    </div>
  );
}
