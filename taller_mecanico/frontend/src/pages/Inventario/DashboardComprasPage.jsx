import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Truck, ShoppingCart, DollarSign, LineChart, Target } from 'lucide-react';

import TabProveedores from './TabsCompras/TabProveedores';
import TabOrdenesCompra from './TabsCompras/TabOrdenesCompra';
import TabCuentasPagar from './TabsCompras/TabCuentasPagar';
import TabCatalogoPrecios from './TabsCompras/TabCatalogoPrecios';

export default function DashboardComprasPage() {
    const { isDark } = useTheme();
    const [activeTab, setActiveTab] = useState('proveedores');

    const pageBg   = isDark ? 'bg-[#0a0f1e]' : 'bg-slate-100';
    const borderC  = isDark ? 'border-slate-700' : 'border-slate-200';
    const txt      = isDark ? 'text-slate-100' : 'text-slate-900';
    const sub      = isDark ? 'text-slate-400' : 'text-slate-500';

    const tabs = [
        { id: 'proveedores', label: 'Directorio', icon: Truck },
        { id: 'ordenes', label: 'Órdenes de Compra', icon: ShoppingCart },
        { id: 'cuentas', label: 'Cuentas por Pagar', icon: DollarSign },
        { id: 'precios', label: 'Catálogo de Precios', icon: Target }
    ];

    return (
        <div className={`flex flex-col h-full ${pageBg}`}>
            <div className={`shrink-0 px-6 py-5 border-b ${borderC} ${isDark ? 'bg-slate-900' : 'bg-white'} flex flex-col gap-5`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-teal-500/15' : 'bg-teal-100'}`}>
                        <ShoppingCart size={21} className="text-teal-500" />
                    </div>
                    <div>
                        <h1 className={`text-xl font-extrabold tracking-tight ${txt}`}>Compras y Proveedores</h1>
                        <p className={`text-sm mt-0.5 ${sub}`}>Gestión integral de abastecimiento y cuentas por pagar</p>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1">
                    {tabs.map(t => {
                        const Icon = t.icon;
                        const active = activeTab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                                    active 
                                    ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20' 
                                    : isDark 
                                        ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200' 
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                                }`}
                            >
                                <Icon size={16} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-transparent relative">
                {activeTab === 'proveedores' && <TabProveedores />}
                {activeTab === 'ordenes' && <TabOrdenesCompra />}
                {activeTab === 'cuentas' && <TabCuentasPagar />}
                {activeTab === 'precios' && <TabCatalogoPrecios />}
            </div>
        </div>
    );
}
