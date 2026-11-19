# Especificación Funcional y de UX: App de Gestión de Ventas para Ferias

## 1. Arquitectura y Principios Core

* **Despliegue Estático en GitHub Pages (PWA):** La aplicación será 100% estática (**Vite + React + TypeScript + Tailwind CSS**) para alojarse gratuitamente en GitHub Pages sin necesidad de servidores ni bases de datos externas. Incluirá `manifest.json` y *Service Worker* (configurando el `base` path del repositorio) para instalarse en la pantalla de inicio como una app nativa y funcionar sin conexión.
* **Enfoque Local-First / Offline:** Toda la información se persiste localmente en el dispositivo (`localStorage` / `IndexedDB`) para garantizar respuesta instantánea sin depender de señal o datos móviles en predios o parques, incluyendo **Exportar / Importar JSON** para respaldo manual.
* **Diseño Full Responsive (Móvil y PC):** Interfaz *Mobile-First* que se adapta fluidamente a cualquier resolución:
  * **Versión Móvil:** Optimizada para operarse con una sola mano y botones táctiles grandes en el stand.
  * **Versión PC / Tablet:** Aprovecha el ancho de pantalla mediante vistas divididas en columnas, ideal para cargar catálogos y precios cómodamente desde la computadora antes del evento o usar una tablet/notebook como caja.
* **Sistema de Entidades (Dueños):** Distingue entre **Participantes Individuales** (ej. *Cristian*, *Novia*) y **Entidades Compartidas** (ej. *Marca Conjunta*), a las cuales se les asigna un porcentaje de reparto (ej. `50% / 50%`) y un código de color identificatorio.
* **Prorrateo Inteligente (Mix & Match):** Las promociones no son botones aislados, sino reglas vinculadas a una **Familia de Productos** (ej. *Stickers*). Cada ítem conserva la etiqueta de su dueño al entrar al carrito, permitiendo que la app divida el valor promocional de forma exacta entre los participantes involucrados.

---

## 2. Mapa de Pantallas y Disposición de UI

### Pantalla 1: Inicio (Selector y Creador de Eventos)

Pantalla de entrada minimalista enfocada en retomar una feria activa o preparar la próxima. En móvil muestra una lista vertical de tarjetas; en PC organiza los eventos en una grilla de 2 o 3 columnas.

```text
+------------------------------------------+
|  [Logo App]        [Backup JSON (↑ / ↓)] |
+------------------------------------------+
|  +------------------------------------+  |
|  |      + CREAR NUEVO EVENTO          |  |
|  +------------------------------------+  |
|                                          |
|  EVENTOS ACTIVOS / RECIENTES             |
|  +------------------------------------+  |
|  | Feria Diseño Mendoza      [EN VIVO]|  |
|  | 18 Nov 2026 • 2 Participantes      |  |
|  | Total recaudado: $45.500           |  |
|  | [ Ir a Vender ]    [ Resultados ]  |  |
|  +------------------------------------+  |
|  +------------------------------------+  |
|  | Feria Parque Central    [FINALIZADO]|  |
|  | 02 Nov 2026 • Total: $82.000       |  |
|  | [ Ver Resultados ]   [ Duplicar ]  |  |
|  +------------------------------------+  |
+------------------------------------------+
```

* **Componentes clave:**
  * **Botón `+ Crear Nuevo Evento`:** Inicia la configuración desde cero.
  * **Backup JSON (Exportar / Importar):** Permite descargar o restaurar todos los eventos en un archivo `.json` para evitar pérdida de datos al cambiar de dispositivo o limpiar el navegador.
  * **Tarjetas de Evento:** Muestran nombre, fecha, estado (`En vivo` / `Finalizado`), recaudación rápida y accesos directos a **Vender**, **Resultados** o **Duplicar** (ideal para repetir ferias sin recargar precios ni participantes).

---

### Pantalla 2: Configuración del Evento (Setup)

Organizada en 3 pestañas superiores (`1. Participantes` | `2. Artículos y Promos` | `3. Gastos`) en móvil, o en paneles paralelos en pantallas de escritorio para editar y previsualizar los botones al mismo tiempo.

1. **Pestaña Participantes y Cuentas Compartidas:**
   * **Lista de Artistas:** Input de nombre + selector de color (ej. Azul, Violeta, Naranja).
   * **Modo de Cobro por Transferencia:** Selector al configurar el evento:
     * *Cuentas individuales:* Cada participante recibe transferencias en su propia cuenta (en caja se elige quién recibió el pago).
     * *Cuenta única centralizada:* Se elige un participante/cuenta que recibe todas las transferencias del evento y se liquida al cierre junto al efectivo.
   * **Bloque "Cuentas Compartidas":** Botón `+ Agregar cuenta conjunta`. Permite nombrar la marca compartida (ej. *Conjunto*), elegir un color (ej. Verde) y definir con sliders/inputs qué porcentaje corresponde a cada artista (validando que sume `100%`).
2. **Pestaña Artículos y Reglas de Promo:**
   * **Sección Familias de Promo:** Permite crear reglas por cantidad (ej. Familia *Stickers*: `1 = $1.000`, `2 = $1.500`, `3 = $2.000`).
   * **Sección Botones de Venta:** Formulario rápido para crear cada botón:
     * *Nombre del artículo* (ej. `Sticker`)
     * *Precio unitario* (ej. `$1.000`)
     * *Dueño* (Selector entre los artistas o cuentas compartidas)
     * *Familia de promo* (Opcional: vincular a *Stickers*)
     * *Stock inicial* (Opcional: contador decreciente)
3. **Pestaña Gastos del Stand (Opcional):**
   * Carga de costos fijos (ej. *Canon de feria*, *Flete*), monto, quién lo abonó y cómo se reparte (en partes iguales por defecto, o seleccionando participantes específicos / porcentajes personalizados).

---

### Pantalla 3: Caja / Pantalla de Venta (Core POS)

Diseñada para operarse en menos de 3 segundos por cliente. Adapta su estructura según el dispositivo:
* **En Móvil (Apilado vertical):** Grilla de productos arriba (2 columnas), Carrito activo fijo abajo y Tira de últimas ventas al pie.
* **En PC / Tablet horizontal (Pantalla dividida 60% / 40%):** Panel izquierdo con la grilla amplia de botones (3 o 4 columnas) y panel derecho fijo con el Carrito activo + Tira de últimas ventas sin necesidad de hacer scroll.

```text
DISPOSICIÓN MÓVIL                          DISPOSICIÓN PC / TABLET
+----------------------------------+       +---------------------------------------------------+
| <- Eventos  Feria   [Resultados] |       | <- Eventos      Feria Diseño         [Resultados] |
+----------------------------------+       +---------------------------------------------------+
| [Todos] [Stickers] [Prints]      |       | [Todos] [Stickers] [Prints] [Pins]                |
+----------------------------------+       +-----------------------------+---------------------+
| +--------------+ +-------------+ |       | +--------+ +--------+ +---+ | CARRITO ACTUAL  [X] |
| | 🔵 Sticker   | | 🟣 Sticker  | |       | | 🔵 Stk | | 🟣 Stk | |🟢 | | • 1x Sticker (Cris) |
| | $1000 • Cris | | $1000 • Nov | |       | | $1000  | | $1000  | |Stk| | • 1x Sticker (Nov)  |
| +--------------+ +-------------+ |       | +--------+ +--------+ +---+ | • 1x Sticker (Conj) |
| +--------------+ +-------------+ |       | +--------+ +--------+ +---+ |   └─ Promo 3x$2000  |
| | 🟢 Sticker   | | 🔵 Print A4 | |       | | 🔵 Prt | | 🟣 Pin | |...| |                     |
| | $1000 • Conj | | $4000 • Cris| |       | | $4000  | | $1500  | |   | | TOTAL: $2.000   [✎] |
| +--------------+ +-------------+ |       | +--------+ +--------+ +---+ | [💵 Efec] [📱 Trans]|
+----------------------------------+       |                             +---------------------+
| CARRITO (3 ítems)     [Vaciar X] |       |                             | ÚLTIMAS VENTAS      |
| • 1x Sticker (Cris)  ─┐          |       |                             | #14 • $2000     [↩] |
| • 1x Sticker (Novia) ─┼─ 3x$2000 |       |                             | #13 • $4000     [↩] |
| • 1x Sticker (Conj.) ─┘          |       +-----------------------------+---------------------+
| TOTAL: $2.000 [✎ Regateo]        |
| [ 💵 Efectivo ] [ 📱 Transf. ]   |
+----------------------------------+
| ÚLTIMAS VENTAS                   |
| #14 • 16:42 • $2.000 (Cris)  [↩] |
+----------------------------------+
```

* **Disposición y comportamiento de botones:**
  * **Botones de Artículo:** Tarjetas grandes con borde o fondo tintado según el color del dueño. Muestran: **Nombre**, **Precio base**, **Nombre del dueño** y (si se configuró) un badge discreto con el stock restante. Si el stock llega a `0` o negativo muestra una advertencia visual, pero **no bloquea la venta** en el stand. Al tocarlo, suma +1 unidad al carrito con feedback háptico/visual.
  * **Zona de Carrito:**
    * Agrupa visualmente los ítems que entraron en promoción mostrando el ahorro aplicado.
    * Permite restar/eliminar un ítem individual tocándolo/haciendo clic si hubo un error.
    * **Botón `Vaciar (X)`:** Limpia todo el carrito en un toque si el cliente desiste de la compra.
    * **Botón `Editar / Regateo`:** Permite pisar el total final (ej. bajar de `$2.300` a `$2.000`) prorrateando el descuento entre los ítems cargados.
  * **Botones de Cierre (`Efectivo` / `Transferencia`):**
    * Al tocar **Efectivo**, guarda la venta directamente en el pozo común de efectivo y resetea el carrito.
    * Al tocar **Transferencia**: si el evento usa *Cuenta única centralizada* (o hay 1 solo participante), guarda la venta directamente en 1 toque; si usa *Cuentas individuales* con más de 1 participante, despliega un mini-selector inmediato (`¿A qué cuenta entró? -> [Cris] [Novia]`) antes de resetear el carrito.
  * **Tira de Últimas Ventas:** Muestra las últimas transacciones con hora, monto, medio de pago y un botón `[↩]` para anular/deshacer en caso de error sin salir de la pantalla de venta (restaurando automáticamente el stock descontado).

---

### Pantalla 4: Resultados y Cierre de Caja

Accesible en cualquier momento desde la barra superior para controlar cómo va el día o hacer las cuentas al desmontar el stand. En PC organiza los bloques de métricas, liquidación y ranking en una grilla de tarjetas lado a lado.

```text
+------------------------------------------+
| <- Volver a Caja        Cierre de Evento |
+------------------------------------------+
|  RECAUDACIÓN TOTAL: $45.500 (18 ventas)  |
|  Efectivo: $20.000 | Transf: $25.500     |
+------------------------------------------+
|  GANANCIA REAL POR ARTISTA               |
|  🔵 Cristian:  $24.000                   |
|  🟣 Novia:     $21.500                   |
+------------------------------------------+
|  ⚖️ LIQUIDACIÓN DE CAJA (Quién debe qué) |
|  • Cristian cobró $18.000 por transf.    |
|  • Novia cobró $7.500 por transf.        |
|  -> Cristian debe transferir $3.250 a    |
|     Novia para equilibrar cuentas.       |
+------------------------------------------+
|  🏆 LO MÁS VENDIDO                       |
|  1. Sticker (Conjunto) — 24 unid.        |
|  2. Print A4 (Cristian) — 5 unid.        |
+------------------------------------------+
|  [ 📋 Copiar Resumen para WhatsApp ]     |
+------------------------------------------+
```

---

## 3. Flujo Completo de la Aplicación (End-to-End)

1. **Preparación (Previo a la feria, desde PC o Móvil):**
   * El usuario abre la web app en GitHub Pages y toca **`+ Crear Nuevo Evento`** (ej. *"Feria Primavera"*).
   * Carga los participantes (*Cristian*, *Novia*) y crea la cuenta compartida (*Conjunto: 50% / 50%*).
   * Define la regla de promo para *Stickers* (`1=$1000`, `2=$1500`, `3=$2000`) y crea los 3 botones de sticker asignando un dueño a cada uno.
2. **Operación en el Stand (Durante la feria, 100% Offline):**
   * Un cliente pide 1 sticker de Cristian, 1 de la Novia y 1 del Conjunto.
   * El usuario toca 1 vez cada botón correspondiente en la grilla.
   * El carrito muestra los 3 ítems, detecta la regla `3x$2000` y fija el total en **`$2.000`**.
   * El cliente paga con QR a la cuenta de Cristian. El usuario toca **`Transferencia`** -> **`Cristian`**.
   * La venta se guarda localmente en el dispositivo, aparece en la tira de *Últimas Ventas* y el carrito vuelve a `$0`.
3. **Cierre y Reparto (Al finalizar):**
   * El usuario entra a **`Resultados`**.
   * La app muestra cuánto generó cada uno (desdoblando automáticamente la parte del emprendimiento conjunto) y calcula la transferencia exacta necesaria para saldar lo cobrado por medios digitales y gastos del stand.
   * Toca **`Copiar Resumen`** y lo envía por WhatsApp para dejar constancia.

---

## 4. Lógica de Prorrateo, Moneda y Liquidación (Reglas para el Desarrollo)

Para que los cálculos nunca fallen ante combinaciones complejas:

* **Formato Numérico:** Todos los montos operan en **números enteros sin centavos** (ej. `$2.000`). Al dividir un total entre $N$ ítems o participantes, se redondea a entero y cualquier diferencia de `$1` por resto se asigna al último ítem/participante para garantizar que la suma sea siempre exacta.
* **Paso 1 — Cálculo de Promociones (*Combinación Óptima*) y Precio Efectivo por Ítem:**
  * Si hay $N$ ítems de una misma familia con promo activa, se calcula el **costo mínimo óptimo** combinando los `tiers` definidos y el precio unitario base (por ejemplo, si hay promo `2x=$1.500` y `3x=$2.000`, llevar `5` se calcula como `3x + 2x = $3.500`, y llevar `6` como `2 × 3x = $4.000`).
  * Ese total óptimo de la familia se prorratea equitativamente entre las $N$ unidades (`TotalFamilia / N`, con ajuste de `$1` en el resto) para evitar distorsiones según el orden de toque.
  * Si se usó **Regateo / Edición de total**, se calcula un factor de ajuste $\alpha = \frac{\text{TotalFinal}}{\text{SubtotalCalculado}}$ y se ajusta proporcionalmente cada $\text{PrecioEfectivo}_i$ (garantizando que la suma final coincida con $\text{TotalFinal}$).
* **Paso 2 — Distribución por Dueño:**
  * Por cada ítem vendido en el carrito, se consulta su `ownerId`:
    * Si es un **Artista Individual**, se suma el $100\%$ de $\text{PrecioEfectivo}_i$ a su balance ganado.
    * Si es una **Entidad Compartida**, se recorre su array de participaciones y se suma $\text{PrecioEfectivo}_i \times \text{Porcentaje}_k$ a cada artista $k$.
* **Paso 3 — Liquidación Final (Transferencias + Pozo Común de Efectivo + Gastos):**
  * El neto a percibir por cada participante $i$ es:
    $$\text{Neto}_i = \text{GananciaVentas}_i - \text{ParteGastos}_i + \text{GastosPagados}_i$$
  * **Prioridad de Transferencias:** Cada participante conserva las transferencias que recibió (`receivedBy == i`, o el total si fue cuenta única). Quien haya recibido *más* que su $\text{Neto}_i$ transfiere el excedente a quienes les falte.
  * **Reparto de Pozo Común de Efectivo:** El efectivo total recaudado en caja cubre el saldo restante de cada participante hasta alcanzar su $\text{Neto}_i$ exacto.

---

## 5. Modelo de Datos Sugerido (Estructura JSON)

```json
{
  "event": {
    "id": "evt_001",
    "name": "Feria Diseño Mendoza",
    "date": "2026-11-18",
    "status": "active",
    "transferMode": "individual",
    "singleTransferOwnerId": null,
    "participants": [
      { "id": "p_1", "name": "Cristian", "color": "#3B82F6" },
      { "id": "p_2", "name": "Novia", "color": "#A855F7" }
    ],
    "sharedEntities": [
      {
        "id": "sh_1",
        "name": "Conjunto",
        "color": "#10B981",
        "splits": [
          { "participantId": "p_1", "percentage": 50 },
          { "participantId": "p_2", "percentage": 50 }
        ]
      }
    ],
    "promoFamilies": [
      {
        "id": "fam_stickers",
        "name": "Stickers",
        "tiers": { "1": 1000, "2": 1500, "3": 2000 }
      }
    ],
    "products": [
      { "id": "prod_1", "name": "Sticker", "basePrice": 1000, "ownerId": "p_1", "familyId": "fam_stickers", "stock": null },
      { "id": "prod_2", "name": "Sticker", "basePrice": 1000, "ownerId": "p_2", "familyId": "fam_stickers", "stock": null },
      { "id": "prod_3", "name": "Sticker", "basePrice": 1000, "ownerId": "sh_1", "familyId": "fam_stickers", "stock": null }
    ],
    "expenses": [
      {
        "id": "exp_1",
        "description": "Canon Stand",
        "amount": 10000,
        "paidBy": "p_1",
        "splitEqually": true,
        "splits": [
          { "participantId": "p_1", "percentage": 50 },
          { "participantId": "p_2", "percentage": 50 }
        ]
      }
    ],
    "sales": [
      {
        "id": "sale_101",
        "timestamp": "2026-11-18T16:42:00Z",
        "items": [
          { "productId": "prod_1", "ownerId": "p_1", "effectivePrice": 667 },
          { "productId": "prod_2", "ownerId": "p_2", "effectivePrice": 667 },
          { "productId": "prod_3", "ownerId": "sh_1", "effectivePrice": 666 }
        ],
        "finalTotal": 2000,
        "paymentMethod": "transfer",
        "receivedBy": "p_1"
      }
    ]
  }
}
```