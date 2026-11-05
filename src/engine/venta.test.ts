import { describe, expect, it } from 'vitest';
import { compararOfertas, ingresoNeto } from './venta';

const chacra = { precioKg: 3, kg: 1000, flete: 0, descuentos: 0 };
const planta = { precioKg: 3.2, kg: 1000, flete: 250, descuentos: 0 };

describe('comparador de ofertas', () => {
  it('ingreso neto = precio × kg − flete − descuentos', () => {
    expect(ingresoNeto({ ...planta, descuentos: 50 })).toBeCloseTo(2900);
  });

  it('S/ 3,00 en chacra deja S/ 50 más que S/ 3,20 en planta con flete S/ 250', () => {
    expect(compararOfertas(chacra, planta)).toEqual({ ganadora: 'a', diferencia: 50 });
  });

  it('reconoce el empate', () => {
    expect(compararOfertas(chacra, chacra).ganadora).toBe('empate');
  });
});
