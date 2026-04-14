import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import KanbanTask from './KanbanTask';

function KanbanColumn({ column, tasks, onOpen }) {
  return (
    <div className="flex flex-col w-72 shrink-0 bg-slate-100 rounded-lg p-3">
      <h3 className="font-bold text-slate-700 mb-3 text-sm flex items-center px-2">
        {column.title} 
        <span className="ml-2 bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">
            {tasks.length}
        </span>
      </h3>
      
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 transition-colors min-h-[150px] rounded-md ${
              snapshot.isDraggingOver ? 'bg-slate-200' : ''
            }`}
          >
            {tasks.map((task, index) => (
              <KanbanTask key={task.id} task={task} index={index} onOpen={onOpen} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default KanbanColumn;
