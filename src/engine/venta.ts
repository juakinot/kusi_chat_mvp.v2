export interface Oferta {
  precioKg: number;
  kg: number;
  flete: number;
  descuentos: number;
}

export function ingresoNeto(o: Oferta): number {
  return o.precioKg * o.kg - o.flete - o.descuentos;
}

/** Diferencia en soles y qué oferta deja más. */
export function compararOfertas(a: Oferta, b: Oferta): { ganadora: 'a' | 'b' | 'empate'; diferencia: number } {
  const diferencia = Math.round((ingresoNeto(a) - ingresoNeto(b)) * 100) / 100;
  if (diferencia === 0) return { ganadora: 'empate', diferencia: 0 };
  return { ganadora: diferencia > 0 ? 'a' : 'b', diferencia: Math.abs(diferencia) };
}
