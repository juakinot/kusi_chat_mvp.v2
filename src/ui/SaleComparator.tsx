import { useState } from 'react';
import { compararOfertas, ingresoNeto, type Oferta } from '../engine/venta';

type Campo = keyof Oferta;
type Formulario = Record<Campo, string>;

const CAMPOS: { id: Campo; texto: string }[] = [
  { id: 'precioKg', texto: 'Precio por kg (S/)' },
  { id: 'kg', texto: 'Kg aceptados' },
  { id: 'flete', texto: 'Flete (S/)' },
  { id: 'descuentos', texto: 'Descuentos (S/)' },
];

function soles(n: number): string {
  const [entero, decimales] = Math.abs(n).toFixed(2).split('.');
  const miles = entero.replace(/\B(?=(\d{3})+$)/g, ' ');
  return `${n < 0 ? '−' : ''}S/ ${miles},${decimales}`;
}

/** Sin valores por defecto: un campo vacío no se cuenta como cero. */
function aOferta(f: Formulario): Oferta | null {
  const valores = CAMPOS.map((c) => (f[c.id].trim() === '' ? NaN : Number(f[c.id].replace(',', '.'))));
  if (valores.some((v) => !Number.isFinite(v) || v < 0)) return null;
  const [precioKg, kg, flete, descuentos] = valores;
  return { precioKg, kg, flete, descuentos };
}

function Columna({
  id,
  titulo,
  valor,
  onChange,
}: {
  id: string;
  titulo: string;
  valor: Formulario;
  onChange: (f: Formulario) => void;
}) {
  const oferta = aOferta(valor);
  return (
    <fieldset className="min-w-0 space-y-2 rounded-lg bg-white p-2.5 shadow-sm">
      <legend className="float-left mb-1 w-full font-bold text-oliva-oscuro">{titulo}</legend>
      {CAMPOS.map((c) => (
        <div key={c.id} className="clear-both">
          <label htmlFor={`${id}-${c.id}`} className="block text-sm text-stone-700">
            {c.texto}
          </label>
          <input
            id={`${id}-${c.id}`}
            inputMode="decimal"
            value={valor[c.id]}
            onChange={(e) => onChange({ ...valor, [c.id]: e.target.value })}
            className="min-h-11 w-full rounded-lg border border-stone-300 px-2 text-[15px]"
          />
        </div>
      ))}
      <p className="text-sm text-stone-700">
        Te queda: <strong className="block text-base text-stone-900">{oferta ? soles(ingresoNeto(oferta)) : '—'}</strong>
      </p>
    </fieldset>
  );
}

export function SaleComparator() {
  const [a, setA] = useState<Formulario>({ precioKg: '3,00', kg: '1000', flete: '0', descuentos: '0' });
  const [b, setB] = useState<Formulario>({ precioKg: '3,20', kg: '1000', flete: '250', descuentos: '0' });

  const ofertaA = aOferta(a);
  const ofertaB = aOferta(b);
  const resultado = ofertaA && ofertaB ? compararOfertas(ofertaA, ofertaB) : null;

  let mensaje = 'Completa los datos de las dos ofertas.';
  if (resultado?.ganadora === 'empate') mensaje = 'Las dos ofertas te dejan lo mismo.';
  else if (resultado) {
    const nombre = resultado.ganadora === 'a' ? 'En chacra' : 'En planta';
    mensaje = `${nombre} te deja ${soles(resultado.diferencia)} más.`;
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-3">
      <p className="text-sm text-stone-700">Ingreso neto = precio × kg − flete − descuentos</p>
      <div className="grid grid-cols-2 gap-2">
        <Columna id="oferta-a" titulo="En chacra" valor={a} onChange={setA} />
        <Columna id="oferta-b" titulo="En planta" valor={b} onChange={setB} />
      </div>
      <p role="status" className="rounded-lg bg-oliva px-3 py-2 text-center font-bold text-white">
        {mensaje}
      </p>
    </div>
  );
}
