export default function PanelLoading({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <div className="panel-loading">
      <div className="spinner" />
      <span>{texto}</span>
    </div>
  );
}
