import React from 'react';
import { Calendar, ClipboardList, Package, FileText, BarChart3, Users, Check } from 'lucide-react';
import { useReveal } from './useReveal';

const services = [
  {
    icon: Calendar,
    color: 'linear-gradient(to bottom right, #f59e0b, #d97706)',
    title: 'Gestion de Citas y Recepciones',
    desc: 'Agenda digital con calendario visual. Recepciona vehiculos con checklist fotografico y genera boletas automaticas.',
    items: [
      'Calendario interactivo con drag & drop',
      'Recepcion vehicular con fotos y firmas digitales',
      'Notificaciones automaticas al cliente',
    ],
  },
  {
    icon: ClipboardList,
    color: 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)',
    title: 'Tablero Kanban de Ordenes de Trabajo',
    desc: 'Visualiza el flujo completo de cada vehiculo en tu taller, desde la recepcion hasta la entrega.',
    items: [
      'Columnas personalizables: Pendiente, En Proceso, Completado',
      'Asignacion de mecanicos y seguimiento por orden',
      'Historial completo por vehiculo y cliente',
    ],
  },
  {
    icon: Package,
    color: 'linear-gradient(to bottom right, #22c55e, #16a34a)',
    title: 'Inventario Inteligente y Compras',
    desc: 'Control total de repuestos e insumos. Alertas de stock bajo, ordenes de compra y gestion de proveedores.',
    items: [
      'Catalogo de productos con categorias y stock minimo',
      'Ordenes de compra a proveedores integradas',
      'Movimientos de inventario con trazabilidad',
    ],
  },
  {
    icon: FileText,
    color: 'linear-gradient(to bottom right, #8b5cf6, #7c3aed)',
    title: 'Facturacion Electronica FEL',
    desc: 'Genera facturas electronicas (FEL) certificadas directamente desde las ordenes de trabajo.',
    items: [
      'Emision FEL integrada con la SAT de Guatemala',
      'Factura desde la orden de trabajo en un clic',
      'Historial de facturas con filtros avanzados',
    ],
  },
  {
    icon: BarChart3,
    color: 'linear-gradient(to bottom right, #ec4899, #db2777)',
    title: 'Reportes y Metricas en Tiempo Real',
    desc: 'Dashboard ejecutivo con indicadores clave: ingresos, utilidades, ordenes completadas y mas.',
    items: [
      'Reporte de utilidades por periodo',
      'Metricas de eficiencia por mecanico',
      'Dashboard con graficos interactivos',
    ],
  },
  {
    icon: Users,
    color: 'linear-gradient(to bottom right, #06b6d4, #0891b2)',
    title: 'Multi-usuario con Roles y Permisos',
    desc: 'Controla quien ve y hace que en tu taller. Desde el administrador hasta el mecanico.',
    items: [
      'Roles personalizables con permisos granulares',
      'Gestion de usuarios con activacion por email',
      'Perfil de usuario con foto y datos de contacto',
    ],
  },
];

export default function LandingServices() {
  return (
    <section id="servicios" style={{ padding: '6rem 0', position: 'relative' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1rem' }}>
        <SectionHeader />
        <div className="landing-services-grid" style={{ marginTop: '3.5rem' }}>
          {services.map((s, i) => (
            <ServiceCard key={i} service={s} index={i} />
          ))}
        </div>
      </div>
      <style>{`
        .landing-services-grid { display: grid; grid-template-columns: 1fr; gap: 1.5rem; }
        @media (min-width: 768px) { .landing-services-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .landing-services-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </section>
  );
}

function SectionHeader() {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        textAlign: 'center', maxWidth: '40rem', margin: '0 auto',
        transition: 'all 0.7s',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(2rem)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', color: '#fbbf24', marginBottom: '1rem' }}>
        <span style={{ width: '2rem', height: '1px', background: '#f59e0b' }} /> FUNCIONALIDADES
      </span>
      <h2 className="landing-gradient-text" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)', fontWeight: 700, marginBottom: '1rem' }}>
        Todo lo que tu Taller Necesita
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>
        Seis modulos integrados para digitalizar cada aspecto de tu operacion
      </p>
    </div>
  );
}

function ServiceCard({ service, index }) {
  const [ref, visible] = useReveal(0.1);
  const Icon = service.icon;

  return (
    <div
      ref={ref}
      className="landing-glass-card"
      style={{
        borderRadius: '1rem', padding: '2rem',
        transition: 'all 0.7s',
        transitionDelay: `${index * 100}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(2.5rem)',
      }}
    >
      <div style={{
        width: '3rem', height: '3rem', background: service.color,
        borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)', marginBottom: '1.25rem',
      }}>
        <Icon style={{ width: '1.5rem', height: '1.5rem', color: '#fff' }} />
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>{service.title}</h3>
      <p style={{ color: '#94a3b8', marginBottom: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6 }}>{service.desc}</p>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', listStyle: 'none', padding: 0, margin: 0 }}>
        {service.items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
            <Check style={{ width: '1rem', height: '1rem', color: '#fbbf24', flexShrink: 0, marginTop: '0.125rem' }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
