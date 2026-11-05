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

## Contraste entre perfiles

La pestaña **Comparar** del panel corre el mismo motivo con los tres perfiles usando el motor real, sin enviar mensajes. Cambia si suspendes una regla o mueves el reservorio de Rosa.

| | Rosa | Juan | Elena |
|---|---|---|---|
| Ficha | Sector Bajo, reservorio con agua y plan | Sector Alto, sin reservorio | Sector Alto, reservorio con agua, sin plan |
| Corte de agua | Paso del plan y seguimiento | Agrónomo: no tiene reservorio | Agrónomo: no hay plan aprobado |
| Daño en la chacra | Puede reportar su reservorio; el plan queda en revisión | No ve esa opción | Puede reportar su reservorio |
| Cuota de agua | Recordatorio 3 días antes | Recordatorio 1 día antes | Nada: no registró fecha |
| Plaga o menos agua | Caso para el agrónomo | Dos reportes en el sector suben a prioridad alta | Dos reportes en el sector suben a prioridad alta |

Para verlo en vivo: **2. Menos caudal** avisa a Juan y a Elena, no a Rosa. Con **3. Revisar cuotas** Rosa y Juan reciben textos distintos y Elena nada. El botón **MENÚ** del teléfono abre las consultas del productor.

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
- **Elena.** Es un tercer perfil ficticio, en el sector Alto, para que el corte del sector Bajo siga llegando solo a Rosa.
- **Motivos nuevos.** Plaga, daño, menos agua y cuota salen del informe (funciones B y E1). El aviso fitosanitario estacional (A2) quedó fuera porque el informe lo deja para la Fase 2.
- **Fotos y audio.** El reporte de plaga va con botones; la foto y el audio quedan para el piloto.
- **Dos reportes iguales en un sector.** Suben a prioridad alta. Solo cuenta casos: no es un diagnóstico.
- **Reservorio dañado.** Retira el plan de la parcela, así que el siguiente corte va al agrónomo.
- **Cuotas.** Se revisan con el botón, no al adelantar el tiempo, para no mezclar mensajes en el guion del agua.
- **Avisos repetidos.** "Enviar aviso vencido" y "sin fuente" usan un id fijo: la segunda pulsación registra "Evento duplicado ignorado".
