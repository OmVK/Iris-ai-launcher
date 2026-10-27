import React, { useState } from 'react'
import HapticFeedback from '../../utils/HapticFeedback'

export default function TasksWidget({
  tasks,
  newTaskText,
  _newTaskTime,
  onSetNewTaskText,
  onSetNewTaskTime,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onClearAll,
}) {
  const [selectedQuickTime, setSelectedQuickTime] = useState('ALL-DAY')

  const applyQuickTime = (label) => {
    HapticFeedback.light()
    setSelectedQuickTime(label)
    const now = new Date()
    if (label === 'ALL-DAY') {
      onSetNewTaskTime('')
    } else if (label === '+1 HR') {
      now.setHours(now.getHours() + 1)
      onSetNewTaskTime(now.toISOString().slice(0, 16))
    } else if (label === 'TODAY 18:00') {
      now.setHours(18, 0, 0, 0)
      onSetNewTaskTime(now.toISOString().slice(0, 16))
    } else if (label === 'TOMORROW') {
      now.setDate(now.getDate() + 1)
      now.setHours(9, 0, 0, 0)
      onSetNewTaskTime(now.toISOString().slice(0, 16))
    }
  }

  return (
    <section className="glass-surface border border-white/10 rounded-2xl p-4 relative flex flex-col justify-between w-full h-full min-h-[250px] overflow-hidden hover:border-primary-fixed-dim/40 transition-all bg-[#080d16]/85 backdrop-blur-xl">
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex justify-between items-center border-b border-white/10 pb-2">
          <div>
            <h3 className="font-label-caps text-[10px] text-primary-fixed-dim tracking-widest uppercase font-bold">
              TASK PROTOCOL
            </h3>
            <p className="text-[8px] font-mono-data text-on-surface-variant/70 uppercase">
              ACTIVE DIRECTIVES: {tasks.filter((t) => !t.done).length}
            </p>
          </div>
          {tasks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                HapticFeedback.light()
                onClearAll()
              }}
              className="text-[8px] font-bold text-error border border-error/25 bg-error/10 hover:bg-error/20 px-2 py-0.5 rounded-lg transition-all"
            >
              CLEAR ALL
            </button>
          )}
        </div>

        <div className="space-y-1.5 max-h-36 overflow-y-auto scroll-container pr-1 my-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => {
                HapticFeedback.light()
                onToggleTask(task.id)
              }}
              className={`p-2 rounded-xl border-l-2 cursor-pointer transition-all active:scale-[0.98] flex items-center justify-between ${
                task.done
                  ? 'bg-black/50 border-outline-variant/30 opacity-40 line-through'
                  : 'bg-black/40 border-primary-fixed-dim/50 hover:bg-white/5'
              }`}
            >
              <div className="min-w-0 flex-1 pr-2">
                <p
                  className={`font-mono-data text-[10px] font-bold uppercase truncate ${
                    task.done ? 'text-on-surface-variant' : 'text-white'
                  }`}
                >
                  {task.text}
                </p>
                <p className="text-[8px] text-primary-fixed-dim/70 font-mono-data mt-0.5 truncate">
                  {task.time || 'ALL-DAY // DIRECTIVE'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`material-symbols-outlined text-base ${
                    task.done ? 'text-green-400' : 'text-primary-fixed-dim/60'
                  }`}
                >
                  {task.done ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    HapticFeedback.light()
                    onDeleteTask(task.id, e)
                  }}
                  className="text-on-surface-variant/40 hover:text-error p-0.5"
                >
                  <span className="material-symbols-outlined text-xs">delete</span>
                </button>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="py-5 text-center text-on-surface-variant/40 font-mono-data text-[8.5px] uppercase border border-dashed border-white/10 rounded-xl bg-black/20">
              ALL PROTOCOLS SATISFIED // 0 DIRECTIVES
            </div>
          )}
        </div>

        <form onSubmit={onAddTask} className="border-t border-white/10 pt-2 space-y-2 mt-auto">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => onSetNewTaskText(e.target.value)}
            placeholder="ENTER DIRECTIVE..."
            className="w-full bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-[9.5px] font-mono-data text-primary-fixed-dim focus:outline-none focus:border-primary-fixed-dim placeholder:text-on-surface-variant/40"
          />

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {['ALL-DAY', '+1 HR', 'TODAY 18:00', 'TOMORROW'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyQuickTime(p)}
                className={`px-1.5 py-0.5 text-[7.5px] font-mono rounded border transition-all whitespace-nowrap ${
                  selectedQuickTime === p
                    ? 'border-primary-fixed-dim/50 bg-primary-fixed-dim/20 text-primary-fixed-dim font-bold'
                    : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-1.5 bg-primary-fixed-dim/20 border border-primary-fixed-dim/40 text-primary-fixed-dim text-[9px] font-bold rounded-lg hover:bg-primary-fixed-dim/30 transition-all active:scale-[0.98] uppercase tracking-wider"
          >
            ESTABLISH TASK DIRECTIVE
          </button>
        </form>
      </div>
    </section>
  )
}
