# KUSICHAT 2.0 · MVP para DESPEGA CLEIN 2026

KUSICHAT conecta a los olivicultores de Achanizo (Cháparra, Caravelí, Arequipa) con especialistas y organizaciones locales.
El agricultor solo necesita comunicarse. KUSICHAT lleva su información a quien puede ayudarlo, conserva el seguimiento y ayuda a entender las necesidades de su comunidad.

Todas las personas, parcelas, avisos y cifras de esta demo son ficticios. Las reglas no tienen validación profesional.

## Cómo correr

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # motor de reglas y escenario
npm run build   # sitio estático en dist/
```

## Guía de demostración (máximo 3 minutos)

La demo abre lista: el aviso ya salió a 40 parcelas y Rosa tiene el mensaje esperando. La franja bajo los perfiles indica siempre qué mirar después.

| Tiempo | Pantalla | Qué hacer | Qué decir |
|---|---|---|---|
| 0:00 | **Rosa** | Muestra el mensaje. Pulsa **Todavía no** y luego **No**. | "Rosa solo responde dos preguntas, como en WhatsApp." |
| 0:40 | **Rosa** | Señala el panel de la derecha: caso nuevo, 8 → 9 y 8 → 7. | "Nadie hizo nada más. Esa conversación ya llegó a quien puede ayudar." |
| 1:00 | **Diego** | Muestra que Rosa va primero. Abre su caso y pulsa **Marcar En revisión**. | "Rosa va primero porque riega antes. Diego ve quién es, qué pasó y qué falta, sin reconstruir la conversación." |
| 1:30 | **Rosa** | Muestra "Tu caso: En revisión". | "Rosa sabe que la atienden sin tener que llamar." |
| 1:45 | **Diego** | Pulsa **Enviar y programar**. Abre **Historial del caso**. | "La respuesta y el seguimiento quedan registrados." |
| 2:05 | **Lucía** | Muestra 9 sin alternativa y 7 sin respuesta. Abre las necesidades y pulsa **Anotar para coordinar**. | "Lucía no lee chats. Ve que 5 tienen el reservorio vacío y 4 no tienen reservorio, y decide qué coordinar." |
| 2:35 | **Diego** | Abre **6 reportes relacionados** y pulsa **Proponer visita a la cooperativa**. | "No es solo agua. Al superar el umbral, KUSICHAT sugiere una visita y Diego decide. No diagnostica." |

Cierre: "Una llamada ayuda a una persona. KUSICHAT permite entender a muchas y organizar su atención."

Pulsa **Reiniciar** antes de cada presentación.

### Prueba de comprensión

- **¿Qué recibe Rosa?** Un aviso sobre su sector, dos preguntas y el estado de su caso.
- **¿Qué hace Diego?** Recibe casos ordenados con contexto, los toma, responde y programa el seguimiento.
- **¿Qué comprende Lucía?** Cuántas parcelas necesitan atención, por qué motivo y qué sigue sin respuesta, sin ver datos privados.
- **¿Por qué es mejor que las llamadas?** Porque cada respuesta queda ordenada y sirve a la vez a la persona, a quien la atiende y a la comunidad.

## Arquitectura compartida

No hay tres aplicaciones. Hay un solo estado y tres lecturas de él.

```
Respuesta de Rosa → motor de reglas (src/engine/engine.ts) → estado compartido (casos, mensajes, auditoría)
                                                                 ├─ estadoSolicitud      → Rosa
                                                                 ├─ bandejaEspecialista  → Diego
                                                                 └─ vistaOrganizacion    → Lucía
```

- **`src/engine/`** es puro: no importa React ni el navegador. En un piloto se mueve al servidor sin cambios.
- **`src/engine/vistas.ts`** contiene las lecturas por perfil. Ninguna cifra está escrita en una pantalla.
- **`src/engine/permisos.ts`** define qué puede hacer cada perfil. Un intento ajeno no cambia nada y queda en la auditoría.
- **`src/data/seed.ts`** arma las 40 parcelas pasando por el motor real, con las mismas funciones que usa Rosa.

## Funciones anteriores conservadas

Están fuera del recorrido principal:

- **Teléfono:** *Otras consultas* (olivos, daño, menos agua, cuota y comparador de ofertas de venta).
- **Diego:** pestañas *Comparar*, *Reglas* (interruptor por regla) y *Auditoría*.
- **Rosa → Más herramientas de la demo:** teléfonos de Juan y Elena, primer registro con consentimiento (*Número nuevo*), reservorio de Rosa, menos caudal, cuotas, avisos vencidos o sin fuente y *Adelantar 24 h*.
- BAJA, PERSONA y el texto libre siguen funcionando en el chat.

La versión anterior está en la rama `respaldo-mvp-1.0`.

## Implementado, simulado y futuro

| Implementado | Simulado | Futuras etapas (no implementado) |
|---|---|---|
| Motor de reglas y derivación | WhatsApp | WhatsApp Cloud API con plantillas aprobadas |
| Tres perfiles sobre el mismo estado | Inicio de sesión: se cambia de perfil con un clic | Autenticación por roles, backend y base de datos |
| Bandeja, En revisión, respuesta y seguimiento | Avisos de la organización | Fuentes meteorológicas y otras fuentes externas |
| Indicadores calculados desde los casos | Las 40 parcelas y sus respuestas | Investigar modelos de riesgo, con datos suficientes y validación agronómica |
| Reportes relacionados, sin diagnóstico | Paso del tiempo | Protocolo firmado por un agrónomo real |
| Historial, antecedentes y auditoría | Aprobación de reglas y planes | Consentimiento según la Ley 29733 |

Tres niveles de valor de los datos: memoria individual (implementada), inteligencia operativa colectiva (implementada en versión básica) y capacidad predictiva (futura). Esta versión no predice nada ni muestra indicadores de precisión o resultados económicos.

## Decisiones tomadas sin preguntar

**KUSICHAT 2.0**

- **La demo abre con el aviso ya enviado.** Rosa debe estar entre las 8 sin respuesta al empezar, así que el aviso se envió a las 7:00 a. m. y los demás ya contestaron.
- **Cómo se cuenta cada parcela.** Cada caso guarda lo que el productor dijo. Sin ese dato, cuenta como "Sin respuesta", aunque haya respondido a medias, pedido una persona o el caso venza.
- **"No sé" dos veces.** Va al especialista y cuenta como "Sin alternativa", con la barrera "Sin confirmar". KUSI no afirma que no tenga agua.
- **Tiene agua y no hay plan.** Cuenta como "Con alternativa", pero el caso va al especialista porque no hay un paso aprobado.
- **Seguimiento que termina en "Sí pude".** La parcela pasa a "Ya regaron". Si dice "No pude", pasa a "Sin alternativa".
- **Aviso más corto.** El texto del prompt reemplaza al anterior. La fuente y la vigencia siguen disponibles para Diego.
- **"No apliques productos".** Se quitó ese mensaje del reporte de olivos porque era una indicación técnica sin validar. "Vi una plaga" pasó a "Veo algo raro en mis olivos".
- **Acción de Lucía.** *Anotar para coordinar* guarda un pendiente en el sistema. No envía nada, no reasigna agua y no lo marca como hecho.
- **Sectores nuevos.** Se añadieron Medio y Cabecera para que los seis reportes sean tres del sector Alto y uno de cada otro sector. El registro sigue ofreciendo Bajo y Alto.
- **Número nuevo.** Si alguien se registra en el sector Bajo con el aviso vigente, recibe el aviso y el total pasa a 41, porque es una parcela afectada más.
- **Orden de la bandeja.** Prioridad y turno de riego más próximo. Sin alternativa y con turno hoy o mañana es prioridad alta; con turno posterior, media. Sin turno confirmado va como alta. Es una regla operativa, no agronómica.
- **Respuestas escritas.** KUSI reconoce frases cortas de agua y seguimiento, sin IA, como "no tengo agua" o "ya regué". "No tengo agua" contesta las dos preguntas a la vez. Si no hay certeza, no adivina y pide usar los botones.
- **Visita a la cooperativa (R-VIS-01).** Se sugiere con 5 o más reportes parecidos abiertos en 7 días, o 3 o más en un sector. Es un umbral inicial, por ajustar con el especialista. Diego propone para el día siguiente a las 9:00 a. m. y Lucía confirma. No avisa a los productores ni da la visita por realizada.
- **Borrador de Diego.** Trae un texto neutro para ganar tiempo en la demo. No sugiere ninguna solución.
- **Corrida de otro día.** Al abrir la demo en un día distinto, arranca de nuevo, para que "mañana" no apunte a una fecha pasada.

**Heredadas del MVP**

- **Reloj simulado.** Arranca a las 8:30 a. m. del día real y avanza un segundo por segundo.
- **Interruptor del reservorio.** Si figura "Vacío" y Rosa responde que sí tiene agua, KUSI no da el paso del plan y lo deriva: ante datos contradictorios elige el camino seguro.
- **Plazo de un caso sin respuesta.** Es la hora del turno de riego. Por eso "Adelantar 24 h" lo deja vencido.
- **"Adelantar 24 h" con seguimiento pendiente.** El reloj llega hasta la hora prometida, aunque sean más de 24 h.
- **"Sí recibió" y "No recibió".** Equivalen a "Sí, ya regué" y "Todavía no".
- **Regla suspendida.** El caso va al especialista con prioridad alta.
- **Dos reportes iguales en un sector.** Suben a prioridad alta. Solo cuenta casos: no es un diagnóstico.
- **Reservorio dañado.** Retira el plan de la parcela.
- **Cuotas.** Se revisan con el botón, no al adelantar el tiempo.
- **Registro.** Admite un número nuevo por demo. Tras una BAJA no hay reactivación.
- **Fotos y audio.** Quedan para un piloto.
- **Avisos repetidos.** La segunda pulsación registra "Evento duplicado ignorado".
