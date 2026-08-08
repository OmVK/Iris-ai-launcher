import React from 'react'
import LetterFilterBar from './LetterFilterBar'
import useDrawerMeshEngine from '../../hooks/useDrawerMeshEngine'

function DrawerMesh({ filteredApps, showAppLabels, drawerIconSize = 100, drawerTextSize = 100, activeLetter, setActiveLetter, onAppClick, onContextMenu }) {
  const { canvasRef, handlers } = useDrawerMeshEngine({ filteredApps, showAppLabels, drawerIconSize, onAppClick, onContextMenu })

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col overflow-hidden select-none pointer-events-auto pb-20"
      onTouchStart={handlers.handleTouchStart}
      onTouchMove={handlers.handleTouchMove}
      onTouchEnd={handlers.handleTouchEnd}
      onMouseDown={handlers.handleMouseDown}
      onMouseMove={handlers.handleMouseMove}
      onMouseUp={handlers.handleMouseUp}
      onMouseLeave={handlers.handleMouseUp}
      onWheel={handlers.handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="w-full flex-1 min-h-0"
        style={{ touchAction: 'none', cursor: 'grab' }}
      />
      <LetterFilterBar activeLetter={activeLetter} setActiveLetter={setActiveLetter} />
    </div>
  )
}

export default React.memo(DrawerMesh)
