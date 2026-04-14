import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Car, Clock, Wrench, CheckCircle, User } from 'lucide-react';

const getBorderColor = (estado) => {
  switch(estado) {
      case 'EN_ESPERA': return 'border-l-4 border-l-slate-400';
      case 'EN_REVISION': return 'border-l-4 border-l-blue-500';
      case 'ESPERANDO_REPUESTOS': return 'border-l-4 border-l-orange-500';
      case 'LISTO': return 'border-l-4 border-l-green-500';
      default: return 'border-l-4 border-l-slate-300';
  }
};

const IconState = ({estado}) => {
  switch(estado) {
      case 'EN_ESPERA': return <Clock size={16} className="text-slate-400" />;
      case 'EN_REVISION': return <Wrench size={16} className="text-blue-500" />;
      case 'ESPERANDO_REPUESTOS': return <Clock size={16} className="text-orange-500" />;
      case 'LISTO': return <CheckCircle size={16} className="text-green-500" />;
      default: return null;
  }
}

function KanbanTask({ task, index, onOpen }) {
  return (
    <Draggable draggableId={task.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(task.id)}
          className={`bg-white rounded-md shadow-sm mb-3 p-3 select-none flex flex-col gap-2 cursor-pointer border border-transparent hover:border-slate-300
            ${getBorderColor(task.estado)}
            ${snapshot.isDragging ? 'shadow-lg rotate-2 z-50 ring-2 ring-blue-500' : ''}`}
          style={provided.draggableProps.style}
        >
          <div className="flex justify-between items-center text-xs text-slate-500 font-semibold uppercase">
              <span>{task.vehiculo?.placa || 'S/N'}</span>
              <IconState estado={task.estado} />
          </div>
          <div className="text-sm font-bold text-slate-800">
            {task.vehiculo?.marca || 'Vehículo'} {task.vehiculo?.modelo || 'Sin Modelo'}
          </div>
          <div className="text-xs text-slate-600 line-clamp-2">
            {task.cita?.servicio?.nombre || 'Diagnóstico General'}
          </div>
          
          <div className="mt-2 flex items-center gap-1.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
             <User size={14} className="text-slate-400" />
             <span>{task.mecanico_asignado ? task.mecanico_asignado.first_name : 'No Asignado'}</span>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default KanbanTask;
