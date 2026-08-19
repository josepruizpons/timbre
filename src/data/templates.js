// Plantillas de muestra ya "subidas" a la biblioteca.
//
// Convenciones del cuerpo:
//   #  título del documento        §  encabezado de cláusula
//   -  regla horizontal            >  advertencia a pie de página
//   {{clave}} token · {{clave|eur}} · {{clave|letra}} · {{clave|fecha}} · {{clave|may}}
//
// `auto` enlaza un campo con un dato del expediente para que llegue precargado.

export const PLANTILLAS = [
  {
    id: 'plt-arras',
    nombre: 'Contrato de arras penitenciales',
    requisito: 'PT-05',
    autor: 'Nuria Sanchís',
    version: '3.2',
    actualizada: '2026-06-18',
    usos: 41,
    descripcion: 'Modelo estándar con plazo de firma, penalización y designación de notaría.',
    campos: [
      { clave: 'vendedor', etiqueta: 'Vendedor', tipo: 'text', grupo: 'Partes', auto: 'vendedor', requerido: true },
      { clave: 'vendedorNif', etiqueta: 'DNI / NIE del vendedor', tipo: 'nif', grupo: 'Partes', auto: 'vendedorNif', requerido: true },
      { clave: 'vendedorEstado', etiqueta: 'Estado civil y régimen', tipo: 'text', grupo: 'Partes', auto: 'vendedorEstadoCivil' },
      { clave: 'comprador', etiqueta: 'Comprador', tipo: 'text', grupo: 'Partes', auto: 'comprador', requerido: true },
      { clave: 'compradorNif', etiqueta: 'DNI / NIE del comprador', tipo: 'nif', grupo: 'Partes', auto: 'compradorNif', requerido: true },
      { clave: 'compradorEstado', etiqueta: 'Estado civil y régimen', tipo: 'text', grupo: 'Partes', auto: 'compradorEstadoCivil' },
      { clave: 'direccion', etiqueta: 'Dirección de la finca', tipo: 'text', grupo: 'Finca', auto: 'direccion', requerido: true },
      { clave: 'municipio', etiqueta: 'Municipio', tipo: 'text', grupo: 'Finca', auto: 'municipio', requerido: true },
      { clave: 'refCatastral', etiqueta: 'Referencia catastral', tipo: 'text', grupo: 'Finca', auto: 'refCatastral', requerido: true },
      { clave: 'fincaRegistral', etiqueta: 'Finca registral nº', tipo: 'text', grupo: 'Finca', auto: 'fincaRegistral' },
      { clave: 'superficie', etiqueta: 'Superficie útil (m²)', tipo: 'number', grupo: 'Finca', auto: 'superficie' },
      { clave: 'precio', etiqueta: 'Precio de compraventa', tipo: 'money', grupo: 'Condiciones', auto: 'precio', requerido: true },
      { clave: 'arras', etiqueta: 'Importe de las arras', tipo: 'money', grupo: 'Condiciones', auto: 'arras', requerido: true },
      { clave: 'cuenta', etiqueta: 'IBAN de ingreso de la señal', tipo: 'text', grupo: 'Condiciones', pista: 'ES00 0000 0000 0000 0000 0000' },
      { clave: 'fechaLimite', etiqueta: 'Fecha límite de escritura', tipo: 'date', grupo: 'Condiciones', auto: 'fechaFirma', requerido: true },
      { clave: 'notaria', etiqueta: 'Notaría designada', tipo: 'text', grupo: 'Condiciones', auto: 'notaria' },
      { clave: 'cargas', etiqueta: 'Cargas que se cancelan antes de la firma', tipo: 'textarea', grupo: 'Condiciones', pista: 'Hipoteca a favor de…, embargo…' },
      { clave: 'lugar', etiqueta: 'Lugar de firma del contrato', tipo: 'text', grupo: 'Cierre', auto: 'municipio' },
      { clave: 'fecha', etiqueta: 'Fecha del contrato', tipo: 'date', grupo: 'Cierre', auto: 'hoy', requerido: true }
    ],
    cuerpo: `# Contrato de arras penitenciales
En {{lugar}}, a {{fecha|fecha}}.

§ Reunidos
De una parte, {{vendedor|may}}, con DNI/NIE {{vendedorNif}}, {{vendedorEstado}}, en adelante LA PARTE VENDEDORA.

De otra parte, {{comprador|may}}, con DNI/NIE {{compradorNif}}, {{compradorEstado}}, en adelante LA PARTE COMPRADORA.

Ambas partes se reconocen capacidad legal suficiente para obligarse y, a tal efecto,

§ Exponen
I. Que la parte vendedora es dueña en pleno dominio de la vivienda sita en {{direccion}}, {{municipio}}, con una superficie útil de {{superficie}} m², referencia catastral {{refCatastral}}, finca registral nº {{fincaRegistral}}.

II. Que la finca se transmite libre de arrendatarios y ocupantes, y al corriente de gastos de comunidad e Impuesto sobre Bienes Inmuebles.

III. Que ambas partes han convenido la compraventa conforme a las siguientes
-
§ Estipulaciones
PRIMERA. Precio. El precio de la compraventa se fija en {{precio|letra}} ({{precio|eur}}), libre de cargas y gravámenes.

SEGUNDA. Arras. La parte compradora entrega en este acto la cantidad de {{arras|letra}} ({{arras|eur}}) en concepto de arras penitenciales del artículo 1454 del Código Civil, mediante ingreso en la cuenta {{cuenta}}. Dicho importe se descontará del precio final.

TERCERA. Desistimiento. Si desiste la parte compradora, perderá las arras entregadas. Si desiste la parte vendedora, deberá devolverlas duplicadas.

CUARTA. Plazo y notaría. La escritura pública se otorgará como fecha límite el {{fechaLimite|fecha}}, ante {{notaria}}, designada de conformidad con el derecho de elección de notario que corresponde a la parte compradora.

QUINTA. Cargas. La parte vendedora se obliga a cancelar antes o simultáneamente al otorgamiento las siguientes cargas: {{cargas}}.

SEXTA. Gastos. Los gastos e impuestos se repartirán conforme a la ley: la plusvalía municipal y la matriz de la escritura a cargo de la parte vendedora; el Impuesto sobre Transmisiones Patrimoniales, las copias y la inscripción registral a cargo de la parte compradora.
-
Y en prueba de conformidad, firman por duplicado ejemplar en el lugar y fecha indicados.

> Documento privado entre partes. No se aporta a la notaría, pero el notario lo solicita para verificar la coherencia del precio y de los medios de pago declarados.`
  },

  {
    id: 'plt-nota-simple',
    nombre: 'Solicitud de nota simple registral',
    requisito: 'IN-01',
    autor: 'Nuria Sanchís',
    version: '1.4',
    actualizada: '2026-04-02',
    usos: 96,
    descripcion: 'Petición al Registro de la Propiedad con interés legítimo acreditado.',
    campos: [
      { clave: 'registro', etiqueta: 'Registro de la Propiedad', tipo: 'text', grupo: 'Destinatario', auto: 'registro', requerido: true },
      { clave: 'solicitante', etiqueta: 'Solicitante', tipo: 'text', grupo: 'Solicitante', auto: 'agente', requerido: true },
      { clave: 'solicitanteNif', etiqueta: 'NIF del solicitante', tipo: 'nif', grupo: 'Solicitante', pista: '12.345.678-Z' },
      { clave: 'agencia', etiqueta: 'En representación de', tipo: 'text', grupo: 'Solicitante', auto: 'agencia' },
      { clave: 'direccion', etiqueta: 'Finca — dirección', tipo: 'text', grupo: 'Finca', auto: 'direccion', requerido: true },
      { clave: 'municipio', etiqueta: 'Municipio', tipo: 'text', grupo: 'Finca', auto: 'municipio', requerido: true },
      { clave: 'refCatastral', etiqueta: 'Referencia catastral', tipo: 'text', grupo: 'Finca', auto: 'refCatastral' },
      { clave: 'fincaRegistral', etiqueta: 'Finca registral nº', tipo: 'text', grupo: 'Finca', auto: 'fincaRegistral' },
      { clave: 'titular', etiqueta: 'Titular registral conocido', tipo: 'text', grupo: 'Finca', auto: 'vendedor' },
      {
        clave: 'interes', etiqueta: 'Interés legítimo', tipo: 'select', grupo: 'Motivación', requerido: true,
        opciones: [
          'Intermediación en una compraventa con encargo firmado del titular',
          'Estudio previo a la formalización de contrato de arras',
          'Comprobación de cargas por cuenta de la parte compradora'
        ]
      },
      { clave: 'fecha', etiqueta: 'Fecha de la solicitud', tipo: 'date', grupo: 'Motivación', auto: 'hoy', requerido: true }
    ],
    cuerpo: `# Solicitud de nota simple informativa
Al {{registro}}

§ Solicitante
{{solicitante|may}}, con NIF {{solicitanteNif}}, actuando en nombre de {{agencia}}, comparece y

§ Expone
Que, en relación con la finca sita en {{direccion}}, {{municipio}}, referencia catastral {{refCatastral}}, inscrita como finca registral nº {{fincaRegistral}} y cuyo titular registral consta a nombre de {{titular}}, concurre el siguiente interés legítimo:

{{interes}}.

§ Solicita
Se expida nota simple informativa comprensiva de la titularidad, la descripción de la finca y la totalidad de las cargas, gravámenes, hipotecas, embargos, afecciones fiscales y limitaciones de disponer vigentes, así como de los asientos de presentación pendientes de despacho.

Se hace constar expresamente que la información obtenida se destinará únicamente a la finalidad declarada, conforme al artículo 222 de la Ley Hipotecaria y al Reglamento (UE) 2016/679.

En {{municipio}}, a {{fecha|fecha}}.

> Vigencia operativa: 90 días. El notario solicitará además nota telemática el mismo día de la firma para verificar que no se ha presentado ningún asiento posterior.`
  },

  {
    id: 'plt-deuda-cero',
    nombre: 'Certificado de deuda cero con la comunidad',
    requisito: 'IN-05',
    autor: 'Modelo del Colegio de Administradores',
    version: '2.0',
    actualizada: '2026-01-30',
    usos: 63,
    descripcion: 'Certificación del artículo 9.1.e) LPH, con derramas aprobadas pendientes.',
    campos: [
      { clave: 'administrador', etiqueta: 'Administrador/a de fincas', tipo: 'text', grupo: 'Emisor', requerido: true, pista: 'Nombre y número de colegiado' },
      { clave: 'comunidad', etiqueta: 'Comunidad de propietarios', tipo: 'text', grupo: 'Emisor', requerido: true, pista: 'C.P. calle…' },
      { clave: 'nifComunidad', etiqueta: 'NIF de la comunidad', tipo: 'nif', grupo: 'Emisor', pista: 'H-08.123.456' },
      { clave: 'propietario', etiqueta: 'Propietario', tipo: 'text', grupo: 'Finca', auto: 'vendedor', requerido: true },
      { clave: 'direccion', etiqueta: 'Elemento privativo', tipo: 'text', grupo: 'Finca', auto: 'direccion', requerido: true },
      { clave: 'coeficiente', etiqueta: 'Coeficiente de participación (%)', tipo: 'number', grupo: 'Finca' },
      { clave: 'cuota', etiqueta: 'Cuota ordinaria mensual', tipo: 'money', grupo: 'Situación' },
      { clave: 'deuda', etiqueta: 'Deuda pendiente', tipo: 'money', grupo: 'Situación', requerido: true },
      { clave: 'derramas', etiqueta: 'Derramas aprobadas pendientes', tipo: 'textarea', grupo: 'Situación', pista: 'Acuerdo de la junta de… por importe de…, o “ninguna”' },
      { clave: 'fecha', etiqueta: 'Fecha de emisión', tipo: 'date', grupo: 'Situación', auto: 'hoy', requerido: true }
    ],
    cuerpo: `# Certificado de estado de deudas
Artículo 9.1.e) de la Ley 49/1960 de Propiedad Horizontal

§ Certifica
{{administrador|may}}, en su condición de administrador/a de la {{comunidad}}, con NIF {{nifComunidad}},

CERTIFICA que {{propietario|may}}, propietario/a del elemento privativo sito en {{direccion}}, con un coeficiente de participación del {{coeficiente}} %, presenta a fecha de hoy la siguiente situación frente a la comunidad:

§ Situación económica
Cuota ordinaria vigente: {{cuota|eur}} mensuales.

Deuda pendiente por cualquier concepto: {{deuda|letra}} ({{deuda|eur}}).

Derramas aprobadas y pendientes de repercutir: {{derramas}}.

§ Advertencia legal
El adquirente de una vivienda responde con el propio inmueble de las cantidades adeudadas a la comunidad por la parte vencida de la anualidad en curso y los tres años naturales anteriores.

Y para que conste a los efectos de su entrega a la notaría autorizante de la escritura de compraventa, se expide la presente el {{fecha|fecha}}.

> Vigencia operativa: 30 días. Si la firma se retrasa, pedir certificado nuevo con fecha del día del otorgamiento.`
  },

  {
    id: 'plt-medios-pago',
    nombre: 'Declaración de medios de pago',
    requisito: 'FS-01',
    autor: 'Nuria Sanchís',
    version: '2.1',
    actualizada: '2026-05-11',
    usos: 38,
    descripcion: 'Desglose trazable de cada entrega a cuenta para el acta notarial.',
    campos: [
      { clave: 'comprador', etiqueta: 'Comprador declarante', tipo: 'text', grupo: 'Declarante', auto: 'comprador', requerido: true },
      { clave: 'compradorNif', etiqueta: 'DNI / NIE', tipo: 'nif', grupo: 'Declarante', auto: 'compradorNif', requerido: true },
      { clave: 'direccion', etiqueta: 'Finca', tipo: 'text', grupo: 'Operación', auto: 'direccion', requerido: true },
      { clave: 'precio', etiqueta: 'Precio total', tipo: 'money', grupo: 'Operación', auto: 'precio', requerido: true },
      { clave: 'pago1', etiqueta: 'Entrega 1 — arras', tipo: 'textarea', grupo: 'Entregas', auto: 'arrasLinea', requerido: true, pista: 'Importe, fecha, medio y entidad' },
      { clave: 'pago2', etiqueta: 'Entrega 2', tipo: 'textarea', grupo: 'Entregas', pista: 'Transferencia de… el… desde la cuenta…' },
      { clave: 'pago3', etiqueta: 'Entrega 3 — acto de la firma', tipo: 'textarea', grupo: 'Entregas', pista: 'Cheque bancario nominativo nº… emitido por…' },
      {
        clave: 'origen', etiqueta: 'Origen de los fondos', tipo: 'select', grupo: 'Blanqueo', requerido: true,
        opciones: ['Ahorro procedente de rendimientos del trabajo', 'Préstamo hipotecario concedido por entidad financiera', 'Venta previa de otro inmueble', 'Donación familiar liquidada de ISD', 'Herencia liquidada de ISD']
      },
      { clave: 'fecha', etiqueta: 'Fecha de la declaración', tipo: 'date', grupo: 'Blanqueo', auto: 'hoy', requerido: true }
    ],
    cuerpo: `# Declaración de medios de pago
Ley 10/2010 de prevención del blanqueo de capitales

§ Declarante
{{comprador|may}}, con DNI/NIE {{compradorNif}}, en relación con la adquisición de la vivienda sita en {{direccion}}, por un precio de {{precio|letra}} ({{precio|eur}}), declara bajo su responsabilidad que el precio se satisface mediante las siguientes entregas:

§ Desglose de entregas
Primera. {{pago1}}

Segunda. {{pago2}}

Tercera. {{pago3}}

§ Origen de los fondos
{{origen}}.

El declarante manifiesta ser el titular real de la operación, actuar por cuenta propia y no estar incurso en ninguno de los supuestos de persona con responsabilidad pública, y autoriza la incorporación de esta información al acta notarial.

En cumplimiento del artículo 24 de la Ley 10/2010, se acompañan los justificantes bancarios de cada una de las entregas relacionadas.

Fecha: {{fecha|fecha}}.

> Sin identificación completa de los medios de pago el notario no puede autorizar la escritura ni el registrador inscribirla.`
  },

  {
    id: 'plt-encargo',
    nombre: 'Nota de encargo de intermediación',
    requisito: 'PT-06',
    autor: 'Dirección comercial',
    version: '4.0',
    actualizada: '2026-07-01',
    usos: 27,
    descripcion: 'Encargo de venta con honorarios, duración y régimen de exclusividad.',
    campos: [
      { clave: 'propietario', etiqueta: 'Propietario', tipo: 'text', grupo: 'Partes', auto: 'vendedor', requerido: true },
      { clave: 'propietarioNif', etiqueta: 'DNI / NIE', tipo: 'nif', grupo: 'Partes', auto: 'vendedorNif', requerido: true },
      { clave: 'agencia', etiqueta: 'Agencia', tipo: 'text', grupo: 'Partes', auto: 'agencia', requerido: true },
      { clave: 'agente', etiqueta: 'Agente responsable', tipo: 'text', grupo: 'Partes', auto: 'agente', requerido: true },
      { clave: 'direccion', etiqueta: 'Inmueble', tipo: 'text', grupo: 'Encargo', auto: 'direccion', requerido: true },
      { clave: 'precioSalida', etiqueta: 'Precio de salida', tipo: 'money', grupo: 'Encargo', auto: 'precio', requerido: true },
      { clave: 'honorarios', etiqueta: 'Honorarios (% sobre precio de venta)', tipo: 'number', grupo: 'Encargo', requerido: true },
      { clave: 'regimen', etiqueta: 'Régimen', tipo: 'select', grupo: 'Encargo', requerido: true, opciones: ['Exclusiva', 'Sin exclusiva', 'Exclusiva compartida en MLS'] },
      { clave: 'duracion', etiqueta: 'Duración (meses)', tipo: 'number', grupo: 'Encargo', requerido: true },
      { clave: 'fecha', etiqueta: 'Fecha del encargo', tipo: 'date', grupo: 'Encargo', auto: 'hoy', requerido: true }
    ],
    cuerpo: `# Nota de encargo de intermediación inmobiliaria
§ Partes
{{propietario|may}}, con DNI/NIE {{propietarioNif}}, en adelante EL CLIENTE, encarga a {{agencia}}, a través del agente {{agente}}, la intermediación en la venta del inmueble descrito a continuación.

§ Objeto del encargo
Inmueble: {{direccion}}.

Precio de salida: {{precioSalida|letra}} ({{precioSalida|eur}}).

Régimen: {{regimen}}. Duración: {{duracion}} meses desde la fecha de firma, prorrogable por acuerdo expreso.

§ Honorarios
Los honorarios de la agencia ascienden al {{honorarios}} % del precio final de venta, más IVA, y se devengan en el momento del otorgamiento de la escritura pública de compraventa.

§ Obligaciones de la agencia
Valorar el inmueble, difundirlo en los portales y canales acordados, filtrar y acompañar las visitas, verificar la solvencia de los interesados, reunir la documentación exigible ante notario y acompañar al cliente hasta la firma.

§ Obligaciones del cliente
Aportar la documentación de la vivienda, comunicar cualquier carga o limitación existente y no negociar directamente con los compradores presentados por la agencia durante la vigencia del encargo.

§ Protección de datos
Los datos se tratan para gestionar el encargo, con base en su ejecución contractual, y se conservan durante los plazos legales de prevención del blanqueo. El cliente puede ejercer sus derechos ante la agencia.

En {{fecha|fecha}}, las partes firman por duplicado.

> Documento interno de la agencia. No se aporta a la notaría.`
  },

  {
    id: 'plt-cee',
    nombre: 'Encargo de certificado de eficiencia energética',
    requisito: 'IN-03',
    autor: 'Nuria Sanchís',
    version: '1.1',
    actualizada: '2026-03-09',
    usos: 19,
    descripcion: 'Encargo al técnico certificador con acceso a la vivienda y registro autonómico.',
    campos: [
      { clave: 'tecnico', etiqueta: 'Técnico certificador', tipo: 'text', grupo: 'Encargo', requerido: true, pista: 'Nombre, titulación y colegiado nº' },
      { clave: 'propietario', etiqueta: 'Propietario', tipo: 'text', grupo: 'Encargo', auto: 'vendedor', requerido: true },
      { clave: 'direccion', etiqueta: 'Vivienda', tipo: 'text', grupo: 'Vivienda', auto: 'direccion', requerido: true },
      { clave: 'refCatastral', etiqueta: 'Referencia catastral', tipo: 'text', grupo: 'Vivienda', auto: 'refCatastral' },
      { clave: 'superficie', etiqueta: 'Superficie útil (m²)', tipo: 'number', grupo: 'Vivienda', auto: 'superficie' },
      { clave: 'anio', etiqueta: 'Año de construcción', tipo: 'number', grupo: 'Vivienda', auto: 'anioConstruccion' },
      { clave: 'organo', etiqueta: 'Órgano autonómico de registro', tipo: 'text', grupo: 'Registro', requerido: true, pista: 'ICAEN, FENERCOM, AVEN…' },
      { clave: 'visita', etiqueta: 'Fecha de visita para toma de datos', tipo: 'date', grupo: 'Registro', requerido: true },
      { clave: 'honorarios', etiqueta: 'Honorarios acordados', tipo: 'money', grupo: 'Registro' },
      { clave: 'fecha', etiqueta: 'Fecha del encargo', tipo: 'date', grupo: 'Registro', auto: 'hoy', requerido: true }
    ],
    cuerpo: `# Encargo de certificado de eficiencia energética
Real Decreto 390/2021

§ Encargo
{{propietario|may}} encarga a {{tecnico}} la redacción del certificado de eficiencia energética de la vivienda existente sita en {{direccion}}, referencia catastral {{refCatastral}}, de {{superficie}} m² útiles y año de construcción {{anio}}.

§ Alcance
Toma de datos in situ, elaboración del certificado mediante procedimiento reconocido, propuesta de medidas de mejora e inscripción en el registro de {{organo}}, con entrega de la etiqueta energética al propietario.

§ Visita
La toma de datos se realizará el {{visita|fecha}}. El propietario garantiza el acceso a la vivienda, a los cerramientos y a las instalaciones térmicas, y aporta las facturas de suministro disponibles.

§ Honorarios y plazo
Honorarios: {{honorarios|eur}}. El certificado registrado se entregará en un plazo máximo de siete días hábiles desde la visita.

En {{fecha|fecha}}.

> Validez del certificado: 10 años, reducida a 5 años en calificación G. Es obligatorio para anunciar la vivienda y para otorgar la escritura.`
  },

  {
    id: 'plt-minuta',
    nombre: 'Minuta de comparecencia y reparto de gastos',
    requisito: 'NT-02',
    autor: 'Nuria Sanchís',
    version: '2.3',
    actualizada: '2026-06-25',
    usos: 34,
    descripcion: 'Hoja que se envía a la notaría con comparecientes, pagos y cuadro de gastos.',
    campos: [
      { clave: 'notaria', etiqueta: 'Notaría', tipo: 'text', grupo: 'Firma', auto: 'notaria', requerido: true },
      { clave: 'fechaFirma', etiqueta: 'Fecha de firma', tipo: 'date', grupo: 'Firma', auto: 'fechaFirma', requerido: true },
      { clave: 'hora', etiqueta: 'Hora', tipo: 'text', grupo: 'Firma', pista: '11:30' },
      { clave: 'vendedor', etiqueta: 'Comparece por la venta', tipo: 'text', grupo: 'Comparecientes', auto: 'vendedor', requerido: true },
      { clave: 'comprador', etiqueta: 'Comparece por la compra', tipo: 'text', grupo: 'Comparecientes', auto: 'comprador', requerido: true },
      { clave: 'banco', etiqueta: 'Apoderado de entidad financiera', tipo: 'text', grupo: 'Comparecientes', pista: 'Entidad y nombre del apoderado, si hay hipoteca' },
      { clave: 'direccion', etiqueta: 'Finca', tipo: 'text', grupo: 'Operación', auto: 'direccion', requerido: true },
      { clave: 'precio', etiqueta: 'Precio', tipo: 'money', grupo: 'Operación', auto: 'precio', requerido: true },
      { clave: 'formaPago', etiqueta: 'Forma de pago en el acto', tipo: 'textarea', grupo: 'Operación', pista: 'Cheque bancario nominativo nº… por…' },
      { clave: 'retencion', etiqueta: 'Retenciones acordadas', tipo: 'textarea', grupo: 'Operación', pista: 'Retención para cancelación de hipoteca, plusvalía, suministros…' },
      { clave: 'gastos', etiqueta: 'Pacto de gastos', tipo: 'select', grupo: 'Gastos', requerido: true, opciones: ['Reparto legal: matriz al vendedor, copias e inscripción al comprador', 'Todos los gastos a cargo de la parte compradora', 'Reparto al 50 % entre las partes'] }
    ],
    cuerpo: `# Minuta de comparecencia
Para {{notaria}}

§ Señalamiento
Firma prevista: {{fechaFirma|fecha}}, a las {{hora}} horas.

§ Comparecientes
Por la parte vendedora: {{vendedor}}.

Por la parte compradora: {{comprador}}.

Por la entidad financiera: {{banco}}.

§ Objeto
Compraventa de la vivienda sita en {{direccion}}, por precio de {{precio|letra}} ({{precio|eur}}).

§ Pago del precio
{{formaPago}}

Retenciones acordadas: {{retencion}}

§ Gastos
{{gastos}}.

§ Documentación que se aporta en el acto
Nota simple actualizada, escritura de título, certificado de eficiencia energética, certificado de deuda cero de la comunidad, último recibo del IBI, cédula de habitabilidad cuando proceda, justificantes de los medios de pago y documentos de identidad en vigor de todos los comparecientes.

> Enviar a la notaría con un mínimo de cinco días hábiles de antelación para que puedan preparar la minuta y solicitar la nota telemática.`
  },

  {
    id: 'plt-suministros',
    nombre: 'Cambio de titularidad de suministros',
    requisito: 'IN-09',
    autor: 'Atención al cliente',
    version: '1.0',
    actualizada: '2026-02-14',
    usos: 22,
    descripcion: 'Comunicación a las compañías tras la firma, con CUPS y lecturas.',
    campos: [
      { clave: 'compania', etiqueta: 'Compañía suministradora', tipo: 'text', grupo: 'Destinatario', requerido: true },
      { clave: 'suministro', etiqueta: 'Suministro', tipo: 'select', grupo: 'Destinatario', requerido: true, opciones: ['Electricidad', 'Gas natural', 'Agua'] },
      { clave: 'cups', etiqueta: 'CUPS o número de contador', tipo: 'text', grupo: 'Destinatario', requerido: true, pista: 'ES0021000012345678AB' },
      { clave: 'direccion', etiqueta: 'Punto de suministro', tipo: 'text', grupo: 'Suministro', auto: 'direccion', requerido: true },
      { clave: 'titularAnterior', etiqueta: 'Titular saliente', tipo: 'text', grupo: 'Suministro', auto: 'vendedor', requerido: true },
      { clave: 'titularNuevo', etiqueta: 'Titular entrante', tipo: 'text', grupo: 'Suministro', auto: 'comprador', requerido: true },
      { clave: 'nifNuevo', etiqueta: 'NIF del titular entrante', tipo: 'nif', grupo: 'Suministro', auto: 'compradorNif', requerido: true },
      { clave: 'iban', etiqueta: 'IBAN de domiciliación', tipo: 'text', grupo: 'Suministro', pista: 'ES00 0000 0000 0000 0000 0000' },
      { clave: 'lectura', etiqueta: 'Lectura del contador en la entrega', tipo: 'text', grupo: 'Efectos' },
      { clave: 'fechaEfecto', etiqueta: 'Fecha de efecto', tipo: 'date', grupo: 'Efectos', auto: 'fechaFirma', requerido: true }
    ],
    cuerpo: `# Solicitud de cambio de titularidad
A la atención de {{compania}} — suministro de {{suministro}}

§ Punto de suministro
Dirección: {{direccion}}. CUPS o contador: {{cups}}.

§ Cambio solicitado
Titular saliente: {{titularAnterior}}.

Titular entrante: {{titularNuevo}}, con NIF {{nifNuevo}}.

Domiciliación bancaria del nuevo titular: {{iban}}.

Lectura del contador en el momento de la entrega de llaves: {{lectura}}.

§ Efectos
Se solicita que el cambio surta efecto desde el {{fechaEfecto|fecha}}, fecha de otorgamiento de la escritura pública de compraventa y de entrega de la posesión, manteniendo la potencia y las condiciones contratadas y sin interrupción del suministro.

Se acompaña copia simple de la escritura de compraventa y del documento de identidad del nuevo titular.

> Tramitar en las 48 h siguientes a la firma. El cambio de titularidad es gratuito; una baja seguida de alta nueva no lo es.`
  },

  {
    id: 'plt-poder',
    nombre: 'Instrucciones para poder especial de compraventa',
    requisito: 'PT-03',
    autor: 'Nuria Sanchís',
    version: '1.2',
    actualizada: '2026-05-28',
    usos: 11,
    descripcion: 'Minuta de facultades para que la notaría prepare el poder de representación.',
    campos: [
      { clave: 'poderdante', etiqueta: 'Poderdante', tipo: 'text', grupo: 'Partes', requerido: true },
      { clave: 'poderdanteNif', etiqueta: 'DNI / NIE del poderdante', tipo: 'nif', grupo: 'Partes', requerido: true },
      { clave: 'apoderado', etiqueta: 'Apoderado', tipo: 'text', grupo: 'Partes', requerido: true },
      { clave: 'apoderadoNif', etiqueta: 'DNI / NIE del apoderado', tipo: 'nif', grupo: 'Partes', requerido: true },
      { clave: 'posicion', etiqueta: 'Actúa como', tipo: 'select', grupo: 'Partes', requerido: true, opciones: ['Parte vendedora', 'Parte compradora'] },
      { clave: 'direccion', etiqueta: 'Finca', tipo: 'text', grupo: 'Objeto', auto: 'direccion', requerido: true },
      { clave: 'precioMinimo', etiqueta: 'Precio mínimo / máximo autorizado', tipo: 'money', grupo: 'Objeto', auto: 'precio', requerido: true },
      { clave: 'facultades', etiqueta: 'Facultades adicionales', tipo: 'textarea', grupo: 'Objeto', pista: 'Cancelar hipoteca, cobrar el precio, liquidar impuestos…' },
      { clave: 'vigencia', etiqueta: 'Vigencia del poder', tipo: 'text', grupo: 'Objeto', pista: 'Hasta el otorgamiento, o 12 meses' }
    ],
    cuerpo: `# Minuta de poder especial para compraventa
§ Otorgante
{{poderdante|may}}, con DNI/NIE {{poderdanteNif}}, confiere poder especial a favor de {{apoderado|may}}, con DNI/NIE {{apoderadoNif}}, para que actúe en su nombre como {{posicion}}.

§ Objeto
Otorgar la escritura pública de compraventa de la vivienda sita en {{direccion}}, por un precio de {{precioMinimo|letra}} ({{precioMinimo|eur}}) o el que resulte de la negociación dentro de dicho límite.

§ Facultades
Fijar precio y condiciones dentro del límite indicado, recibir o entregar cantidades, otorgar y firmar la escritura pública, solicitar y recibir copias, y cuantas facultades sean necesarias para la plena eficacia del encargo, incluidas las siguientes:

{{facultades}}

§ Vigencia
{{vigencia}}.

> Enviar la minuta a la notaría con antelación: el notario de la firma debe emitir juicio de suficiencia del poder. Si se otorga en el extranjero, necesita Apostilla de La Haya y traducción jurada.`
  }
]
