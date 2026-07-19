import RemoveButton from './RemoveButton'

export default function TasksWidget({ tasks, newTaskText, newTaskTime, onSetNewTaskText, onSetNewTaskTime, onAddTask, onToggleTask, onDeleteTask, onClearAll, onRemove }) {
  return (
    <section style={{ order: 4 }} className="col-span-2 md:col-span-3 glass-surface rounded-lg p-4 relative flex flex-col h-[280px]">
      <RemoveButton onClick={onRemove} />
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
          <h3 className="font-label-caps text-label-caps text-primary tracking-widest uppercase">DAY_TASKS</h3>
          {tasks.length > 0 && (
            <button onClick={onClearAll} className="text-[8px] font-bold text-error border border-error/20 bg-error/5 hover:bg-error/20 px-2 py-0.5 rounded transition-all z-10 mr-5">
              WIPE ALL TASKS
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-36 overflow-y-auto scroll-container pr-1">
          {tasks.map((task) => (
            <div key={task.id} onClick={() => onToggleTask(task.id)}
              className={`p-2 rounded border-l-2 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between ${
                task.done ? 'bg-black/45 border-outline-variant/30 opacity-40 line-through' : 'bg-white/5 border-primary-fixed-dim/30 hover:bg-white/10'
              }`}>
              <div className="min-w-0 flex-1">
                <p className={`font-mono-data text-[10px] font-bold uppercase truncate ${task.done ? 'text-on-surface-variant' : 'text-white'}`}>{task.text}</p>
                <p className="text-[8px] text-on-surface-variant font-mono-data mt-0.5">{task.time}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-sm ${task.done ? 'text-green-400' : 'text-on-surface-variant/30'}`}>
                  {task.done ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <button onClick={(e) => onDeleteTask(task.id, e)} className="text-on-surface-variant/30 hover:text-error transition-colors">
                  <span className="material-symbols-outlined text-xs">delete</span>
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="py-8 text-center text-on-surface-variant/40 italic font-mono-data text-[9px] uppercase border border-dashed border-outline-variant/20 rounded">
              NO DAY DIRECTIVES ACTIVE // AWAITING CRITICAL ASSIGNMENTS
            </div>
          )}
        </div>

        <form onSubmit={onAddTask} className="border-t border-white/5 pt-3 space-y-2 mt-auto">
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={newTaskText} onChange={e => onSetNewTaskText(e.target.value)} placeholder="NEW TASK SCHEMATIC..."
              className="bg-black/40 border border-outline-variant/30 rounded px-2 py-1 text-[9.5px] font-mono-data text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim placeholder:text-on-surface-variant/30" />
            <input type="datetime-local" value={newTaskTime} onChange={e => onSetNewTaskTime(e.target.value)}
              className="bg-black/40 border border-outline-variant/30 rounded px-2 py-1 text-[9.5px] font-mono-data text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim placeholder:text-on-surface-variant/30" />
          </div>
          <button type="submit" className="w-full py-1.5 bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[9px] font-bold rounded hover:bg-primary-fixed-dim/30 transition-all active:scale-[0.98]">
            ESTABLISH TASK DIRECTIVE
          </button>
        </form>
      </div>
    </section>
  )
}
