// Origen de una inscripción (columna `enrollments.origen`, sin cambios en
// la base) — acá solo se define cómo se ETIQUETA en pantalla:
//  - 'masivo' (el staff la carga, uno o varios a la vez, desde el panel) → "Manual"
//  - 'manual' (histórico: alta directa sin pago) → "Online"
//  - 'compra' (Mercado Pago, a futuro)
//  - 'cupo'   (cortesía / cupo asignado)
export const ORIGEN_LABEL: Record<string, string> = {
  compra: "Mercado Pago",
  manual: "Online",
  masivo: "Manual",
  cupo: "Cupo",
};

export const ORIGEN_CLASS: Record<string, string> = {
  compra: "valid",
  manual: "t",
  masivo: "muted",
  cupo: "warn",
};
