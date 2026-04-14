import React, { useState, useEffect, useContext, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Save, Search, PlusCircle, Package } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

export default function OrderSlideOver({ orderId, isOpen, onClose, onUpdate }) {
  const { authTokens, logoutUser } = useContext(AuthContext);
  const [orderData, setOrderData] = useState(null);
  const [diagText, setDiagText] = useState('');
  const [savingDiag, setSavingDiag] = useState(false);
  const [inventario, setInventario] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if(orderId) { setLoading(true); fetchOrderDetails(); }
      fetchFullInventory();
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/taller/orden/${orderId}/`, {
        headers: { Authorization: `Bearer ${authTokens.access}` }
      });
      setOrderData(res.data);
      setDiagText(res.data.diagnostico || '');
      setLoading(false);
    } catch (e) {
      if (e.response?.status === 401) logoutUser();
      console.error(e);
      onClose(); // Auto close on fatal fetch error
    }
  };

  const fetchFullInventory = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/taller/inventario/buscar/`, {
        headers: { Authorization: `Bearer ${authTokens.access}` }
      });
      setInventario(res.data);
    } catch (e) { console.error(e); }
  };

  const saveDiagnosis = async () => {
    setSavingDiag(true);
    try {
      await axios.patch(`http://localhost:8000/api/v1/taller/orden/${orderId}/diagnostico/`, 
        { diagnostico: diagText },
        { headers: { Authorization: `Bearer ${authTokens.access}` } }
      );
      onUpdate();
    } catch (e) { console.error(e); }
    setSavingDiag(false);
  };

  const addSelectedPart = async () => {
    if(!selectedProductId) return;
    try {
      await axios.post(`http://localhost:8000/api/v1/taller/orden/${orderId}/repuesto/`,
        { producto_id: selectedProductId, cantidad: 1 },
        { headers: { Authorization: `Bearer ${authTokens.access}` } }
      );
      setSelectedProductId('');
      fetchOrderDetails(); // Refresh to show part
      fetchFullInventory(); // Refresh stock
      onUpdate(); // Tell Kanban a price/status changed potentially
    } catch (e) {
       alert(e.response?.data?.error || "Error agregando repuesto");
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300 sm:duration-500"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300 sm:duration-500"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-lg">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-2xl">
                    
                    {/* Header */}
                    <div className="bg-slate-800 px-4 py-6 sm:px-6">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-xl font-semibold leading-6 text-white uppercase tracking-wider">
                           {loading ? 'Cargando...' : `${orderData?.vehiculo?.placa || 'ORDEN'}`}
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-md text-slate-300 hover:text-white focus:outline-none"
                          onClick={onClose}
                        >
                          <X className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="mt-2 text-sm text-slate-300 flex items-center gap-2">
                        <span>{orderData?.vehiculo?.marca} {orderData?.vehiculo?.modelo}</span>
                        <span className="bg-blue-600/30 text-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold uppercase">{orderData?.estado}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative flex-1 px-4 py-6 sm:px-6 bg-slate-50">
                      
                      {/* Diagnostico Section */}
                      <div className="mb-8">
                         <h3 className="text-sm font-semibold text-slate-700 uppercase mb-2">Diagnóstico de Taller</h3>
                         <textarea 
                            className="w-full rounded-md border-0 py-2.5 px-3 text-sm text-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600"
                            rows={4}
                            value={diagText}
                            onChange={(e) => setDiagText(e.target.value)}
                            placeholder="Escribe el diagnóstico inicial y observaciones..."
                         />
                         <button 
                            onClick={saveDiagnosis}
                            disabled={savingDiag}
                            className="mt-2 w-full flex items-center justify-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
                          >
                           <Save size={16} /> {savingDiag ? 'Guardando...' : 'Guardar Diagnóstico'}
                         </button>
                      </div>

                      {/* Repuestos Usados Section */}
                      <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-slate-200">
                          <h3 className="text-sm font-semibold text-slate-700 uppercase mb-4 flex items-center gap-2">
                             <Package size={16} className="text-blue-500" /> Repuestos Agregados
                          </h3>

                          {orderData?.repuestos?.length === 0 ? (
                              <p className="text-sm text-slate-500 italic text-center py-4">No hay repuestos en esta orden.</p>
                          ) : (
                              <ul className="divide-y divide-slate-100 mb-4">
                                  {orderData?.repuestos?.map(rep => (
                                      <li key={rep.id} className="py-2.5 flex justify-between text-sm">
                                          <div>
                                             <span className="font-medium text-slate-800">{rep.producto.nombre}</span>
                                             <div className="text-xs text-slate-500">Ud: Q{rep.precio_unitario}</div>
                                          </div>
                                          <div className="font-semibold text-slate-700">Q{rep.subtotal}</div>
                                      </li>
                                  ))}
                                  <li className="py-3 flex justify-between font-bold text-slate-800 border-t border-slate-200 mt-2">
                                      <span>Total de Partes:</span>
                                      <span>Q{orderData?.repuestos?.reduce((acc, curr) => acc + parseFloat(curr.subtotal), 0).toFixed(2)}</span>
                                  </li>
                              </ul>
                          )}
                      </div>

                      {/* Selector Add Repuesto */}
                      <div className="relative border-t border-slate-200 pt-6 mt-4">
                          <label className="text-sm font-semibold text-slate-700 uppercase mb-2 flex items-center gap-1">
                             <Search size={14} /> Refacciones en Almacén
                          </label>
                          <div className="flex gap-2">
                             <select 
                                 className="flex-1 rounded-md border-0 py-2.5 px-3 text-sm text-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-blue-600 bg-white"
                                 value={selectedProductId}
                                 onChange={(e) => setSelectedProductId(e.target.value)}
                             >
                                 <option value="">-- Seleccionar pieza --</option>
                                 {inventario.map(item => (
                                     <option key={item.id} value={item.id} disabled={item.stock_actual <= 0}>
                                        {item.nombre} (Stock: {item.stock_actual}) - Q{item.precio_venta}
                                     </option>
                                 ))}
                             </select>
                             
                             <button 
                                onClick={addSelectedPart}
                                disabled={!selectedProductId}
                                className={`flex items-center gap-1 px-4 py-2 rounded shadow-sm text-sm font-bold text-white transition-colors
                                  ${selectedProductId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}
                                `}
                             >
                                 <PlusCircle size={16} /> <span>Añadir</span>
                             </button>
                          </div>
                      </div>

                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
