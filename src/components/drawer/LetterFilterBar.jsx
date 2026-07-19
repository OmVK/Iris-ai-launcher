import React from 'react'

export default function LetterFilterBar({ activeLetter, setActiveLetter }) {
  const letters = ['ALL', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')]
  return (
    <div
      className="flex-shrink-0 flex justify-center gap-0 px-1 pb-1 pt-1 bg-black/30 backdrop-blur-sm"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      {letters.map(letter => (
        <button
          key={letter}
          onPointerDown={(e) => { e.stopPropagation(); setActiveLetter(letter === 'ALL' ? null : activeLetter === letter ? null : letter) }}
          className={`flex-1 text-center py-1.5 font-mono-data font-bold transition-all select-none ${
            (letter === 'ALL' && !activeLetter) || activeLetter === letter
              ? 'text-primary-fixed-dim text-[9px]'
              : 'text-on-surface-variant/40 text-[7px]'
          }`}
          style={{ minWidth: 0 }}
        >
          {letter}
        </button>
      ))}
    </div>
  )
}
