import React, { useState, useEffect, useContext } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import KanbanColumn from '../components/KanbanColumn';
import OrderSlideOver from '../components/OrderSlideOver';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { RefreshCw, Hammer, Loader2 } from 'lucide-react';

function KanbanBoard() {
  const { authTokens, logoutUser } = useContext(AuthContext);
  const { isDark } = useTheme();
  const [data, setData] = useState({ tasks: {}, columns: {}, columnOrder: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorToast, setErrorToast] = useState(null);
  
  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    fetchBoard();
  }, []);

  const fetchBoard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await axios.get('http://localhost:8000/api/v1/taller/kanban/', {
        headers: { 'Authorization': `Bearer ${authTokens.access}` }
      });
      setData(response.data);
    } catch (error) {
      console.error('Error fetching board', error);
      if (error.response?.status === 401) logoutUser();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (message) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 4000);
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    // Mover dentro de misma columna
    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);
      setData({ ...data, columns: { ...data.columns, [startColumn.id]: { ...startColumn, taskIds: newTaskIds } } });
      return;
    }

    // Mover a otra columna - OPTIMISTIC UPDATE
    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...startColumn, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finishColumn, taskIds: finishTaskIds };

    const previousState = { ...data };

    setData({
      ...data,
      columns: { ...data.columns, [newStart.id]: newStart, [newFinish.id]: newFinish }
    });

    try {
      await axios.patch(
        `http://localhost:8000/api/v1/taller/orden/${draggableId}/mover/`, 
        { nuevo_estado: finishColumn.id },
        { headers: { 'Authorization': `Bearer ${authTokens.access}` } }
      );
      // Refresh board after successful drag — ensures auto-assigned mechanic shows immediately
      fetchBoard(false);
    } catch (error) {
      // ROLLBACK si falla
      setData(previousState);
      const errorMsg = error.response?.data?.error || "Error de red moviendo la tarjeta";
      showToast(errorMsg);
    }
  };

  // Total active orders
  const totalOrdenes = Object.values(data.tasks || {}).length;

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-blue-500" />
          <p className="text-slate-400 font-medium">Cargando tablero en vivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isDark ? 'bg-[#0a0f1e]' : 'bg-slate-100'}`}>
      
      {/* Toast */}
      {errorToast && (
        <div className="fixed top-5 right-5 bg-red-600 text-white px-5 py-3.5 rounded-xl shadow-2xl z-[100] flex items-center gap-3 border border-red-500/50">
          <span className="font-bold">Error:</span> {errorToast}
        </div>
      )}

      {/* Header — no backdrop-filter: it creates a stacking context that traps position:fixed DnD elements */}
      <div className={`shrink-0 px-6 py-5 flex items-center justify-between border-b ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/15' : 'bg-blue-100'}`}>
            <Hammer size={22} className="text-blue-500" />
          </div>
          <div>
            <h1 className={`text-2xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Tablero de Órdenes
            </h1>
            <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {totalOrdenes} orden{totalOrdenes !== 1 ? 'es' : ''} activa{totalOrdenes !== 1 ? 's' : ''} · Arrastra para cambiar estado
            </p>
          </div>
        </div>
        <button 
          onClick={() => fetchBoard(true)} 
          disabled={refreshing}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
            isDark 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10' 
              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-sm'
          } disabled:opacity-50`}
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Actualizando...' : 'Refrescar'}
        </button>
      </div>

      {/* Board — overflow-x:auto for horizontal scroll, NOT overflow-y:hidden so drag clone isn't clipped */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'visible' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: 'flex', gap: 16, padding: 20, minWidth: 'max-content', alignItems: 'flex-start' }}>
            {data.columnOrder.map(columnId => {
              const column = data.columns[columnId];
              if (!column) return null;
              const tasks = column.taskIds.map(taskId => data.tasks[taskId]).filter(t => t);
              return (
                <KanbanColumn 
                  key={column.id}
                  column={column} 
                  tasks={tasks} 
                  onOpen={(id) => { setSelectedOrderId(id); setIsSlideOpen(true); }}
                />
              );
            })}
          </div>
        </DragDropContext>
      </div>

      <OrderSlideOver 
        isOpen={isSlideOpen}
        orderId={selectedOrderId}
        onClose={() => setIsSlideOpen(false)}
        onUpdate={() => fetchBoard(true)}
      />
    </div>
  );
}

export default KanbanBoard;
