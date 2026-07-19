export default function RemoveButton({ onClick }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick() }} className="absolute top-2.5 right-2.5 text-on-surface-variant/30 hover:text-error transition-colors z-20">
      <span className="material-symbols-outlined text-xs">close</span>
    </button>
  )
}
