import React, { useState, useEffect, useContext } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import KanbanColumn from '../components/KanbanColumn';
import OrderSlideOver from '../components/OrderSlideOver';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

function KanbanBoard() {
  const { authTokens, logoutUser } = useContext(AuthContext);
  const [data, setData] = useState({ tasks: {}, columns: {}, columnOrder: [] });
  const [loading, setLoading] = useState(true);
  const [errorToast, setErrorToast] = useState(null);
  
  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  useEffect(() => {
    fetchBoard();
  }, []);

  const fetchBoard = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/taller/kanban/', {
        headers: { 'Authorization': `Bearer ${authTokens.access}` }
      });
      setData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching board', error);
      if (error.response?.status === 401) logoutUser();
    }
  };

  const showToast = (message) => {
    setErrorToast(message);
    setTimeout(() => setErrorToast(null), 4000);
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return;
    }

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    // Mover misma columna
    if (startColumn === finishColumn) {
      const newTaskIds = Array.from(startColumn.taskIds);
      newTaskIds.splice(source.index, 1);
      newTaskIds.splice(destination.index, 0, draggableId);

      const newColumn = { ...startColumn, taskIds: newTaskIds };
      setData({
        ...data,
        columns: { ...data.columns, [newColumn.id]: newColumn }
      });
      return; // No backend update needed for same column yet unless we persist explicit internal order
    }

    // Mover a otra columna - OPTIMISTIC UPDATE
    const startTaskIds = Array.from(startColumn.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStart = { ...startColumn, taskIds: startTaskIds };

    const finishTaskIds = Array.from(finishColumn.taskIds);
    finishTaskIds.splice(destination.index, 0, draggableId);
    const newFinish = { ...finishColumn, taskIds: finishTaskIds };

    // Guardado anterior para hacer rollback sí falla
    const previousState = { ...data };

    setData({
      ...data,
      columns: {
        ...data.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      }
    });

    try {
      await axios.patch(`http://localhost:8000/api/v1/taller/orden/${draggableId}/mover/`, 
        { nuevo_estado: finishColumn.id },
        { headers: { 'Authorization': `Bearer ${authTokens.access}` } }
      );
      // Notificó éxitosamente a Django Celery
    } catch (error) {
      // Rollback
      setData(previousState);
      const errorMsg = error.response?.data?.error || "Error de red moviendo la tarjeta";
      showToast(errorMsg);
    }
  };

  if (loading) return <div className="p-8 text-slate-500">Cargando Tablero en vivo...</div>;

  return (
    <div className="flex-1 w-full bg-white pt-4 pb-12 overflow-x-hidden">
      
      {/* Toast Notification */}
      {errorToast && (
        <div className="fixed top-5 right-5 bg-red-600 text-white px-4 py-3 rounded-lg shadow-xl z-50 animate-bounce">
            <b>Error Bloqueo:</b> {errorToast}
        </div>
      )}

      {/* Main Board */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tablero Kanban</h2>
              <p className="text-sm text-slate-600">Arrastra las tarjetas para cambiar su estado. Celery notificará al cliente en background.</p>
            </div>
            <button onClick={fetchBoard} className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded">
                Refrescar BD
            </button>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 overflow-x-auto pb-4">
            {data.columnOrder.map(columnId => {
                const column = data.columns[columnId];
                if(!column) return null;
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

        <OrderSlideOver 
            isOpen={isSlideOpen}
            orderId={selectedOrderId}
            onClose={() => setIsSlideOpen(false)}
            onUpdate={fetchBoard}
        />
      </div>
    </div>
  );
}

export default KanbanBoard;
