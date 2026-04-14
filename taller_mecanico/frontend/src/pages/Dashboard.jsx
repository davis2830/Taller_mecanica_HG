import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Wrench, Calendar, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

function Dashboard() {
    const { user } = useContext(AuthContext);

    return (
        <div className="bg-slate-50 min-h-full p-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Bienvenido a AutoServi Pro</h1>
            <p className="text-slate-600 mb-8">Selecciona un módulo en el menú lateral para comenzar a trabajar.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Enlace Citas */}
                <Link to="/citas" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow group cursor-pointer block">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-blue-100 text-blue-600 p-3 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Calendar size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Recepción y Citas</h2>
                    </div>
                    <p className="text-slate-600 text-sm">Gestiona la agenda, coordina ingresos de clientes y administra el horario del taller.</p>
                </Link>

                {/* Enlace Kanban */}
                <Link to="/kanban" className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow group cursor-pointer block">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-indigo-100 text-indigo-600 p-3 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Wrench size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Tablero Kanban</h2>
                    </div>
                    <p className="text-slate-600 text-sm">Control visual interactivo del estado de las reparaciones en tiempo real.</p>
                </Link>

                {/* Enlace Facturacion (Proximo) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 opacity-60">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-emerald-100 text-emerald-600 p-3 rounded-lg">
                            <FileText size={24} />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Facturación & Cajas</h2>
                    </div>
                    <p className="text-slate-600 text-sm">Próximamente disponible. Generación de cobros.</p>
                </div>
                
            </div>
        </div>
    );
}

export default Dashboard;
