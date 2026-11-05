# KUSICHAT · MVP para jurado

KUSICHAT acompaña por WhatsApp a olivicultores de Achanizo (Cháparra, Caravelí, Arequipa).
Cruza un aviso de agua con cada parcela, hace la pregunta mínima y aplica una regla aprobada: da un paso seguro o abre un caso para el agrónomo.
Esta demo muestra una idea: cuando cambia un dato, la decisión cambia, y todo queda registrado.

## Cómo correr

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # motor de reglas
npm run build   # sitio estático en dist/
```

Para publicar, sube `dist/` a Vercel o Netlify (`npx vercel dist --prod`, o arrastra la carpeta a Netlify Drop).

## Guion de demo

1. **Reiniciar demo** → **1. Llega aviso de corte**. Rosa recibe el mensaje. Cambia a Juan: su chat está vacío. En Auditoría: "Parcela de Juan no afectada (sector Alto)".
2. En el chat de Rosa: **Todavía no** → **Sí, tiene agua**. Recibe el paso de su plan.
3. **Reiniciar demo** → aviso → interruptor **Vacío** → **Todavía no** → **Está vacío**. Aparece un caso prioritario con cuenta regresiva. Ábrelo y responde como agrónomo.
4. **Reiniciar demo** → aviso → en **Reglas** suspende R-AGUA-02 → **Todavía no** → **Sí, tiene agua**. Va a revisión técnica con motivo "Regla suspendida". El reinicio es necesario porque cada aviso abre un solo caso y "Reiniciar" también reactiva las reglas: suspende la regla después de reiniciar.
5. **Enviar aviso vencido**. Nadie recibe nada y la Auditoría muestra el bloqueo en ámbar.

6. Opcional: pestaña **Venta** en el teléfono. Con el ejemplo cargado, "En chacra" deja S/ 50,00 más.

## Implementado, simulado y pendiente

| Implementado | Simulado | Pendiente para el piloto |
|---|---|---|
| Motor de reglas | WhatsApp | WhatsApp Cloud API con plantillas aprobadas |
| Cruce por parcela | Avisos de la comisión | Backend y base de datos PostgreSQL |
| Estados de caso | Aprobación del agrónomo | Autenticación por roles |
| Auditoría | Paso del tiempo | Transcripción de audio con IA |
| Interruptor de reglas | | Protocolo firmado por un agrónomo real |
| Bloqueo de avisos vencidos o no verificados | | Consentimiento según Ley 29733 |

`src/engine/` no importa React ni el navegador: en el piloto se mueve al servidor sin cambios.

## Decisiones tomadas sin preguntar

- **Reloj simulado.** La demo arranca a las 8:30 a. m. del día real, a cualquier hora que se abra, para que el plazo de las 7:00 p. m. siempre quede por delante. Avanza un segundo por segundo.
- **Interruptor del reservorio.** Si figura "Vacío" y Rosa responde "Sí, tiene agua", KUSI no da el paso del plan y lo pasa al agrónomo (R-AGUA-03): ante datos contradictorios elige el camino seguro. Si Rosa responde "Está vacío", el interruptor se actualiza solo.
- **Plazo de un caso sin respuesta.** Es la hora del turno de riego (mañana 6:00 a. m.), no el fin de la vigencia. Por eso "Adelantar 24 h" lo deja vencido.
- **"Adelantar 24 h" con seguimiento pendiente.** El reloj llega hasta las 7:00 p. m. de mañana, aunque sean más de 24 h, para que KUSI pregunte a la hora que prometió.
- **Estados de seguimiento.** `accion_sugerida` significa que el plan fue recordado y el seguimiento está programado. `seguimiento_pendiente` empieza cuando KUSI envía la pregunta.
- **"Sí recibió" y "No recibió".** Equivalen a "Ya regué" y "Todavía no".
- **"No sé" sobre el reservorio.** La primera vez KUSI repregunta. Los "No sé" se suman en todo el caso: al segundo pasa a R-AGUA-03.
- **Regla suspendida.** El caso va a revisión técnica con prioridad alta y el plazo de las 7:00 p. m.
- **PERSONA sin caso abierto.** Crea un caso sin evento asociado, de prioridad media.
- **Respuesta del agrónomo.** El caso sigue abierto y el plazo se da por cumplido, hasta que pulse "Cerrar caso".
- **Textos añadidos.** El guion no definía los acuses de "Sí pude", "No pude" y PERSONA, ni la repregunta del reservorio. Son breves y no dan instrucciones técnicas.
- **Comparador de ofertas.** Un campo vacío no se cuenta como cero: el resultado espera a que estén todos los datos.
- **Avisos repetidos.** "Enviar aviso vencido" y "sin fuente" usan un id fijo: la segunda pulsación registra "Evento duplicado ignorado".
