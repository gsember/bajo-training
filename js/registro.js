/* Registro semanal del curso de bajo.
   Vive en localStorage: sin backend, sin cuentas.
   El markdown de la semana define el contenido; esto es del usuario.

   Orden de la vista, de arriba hacia abajo:
     1. campos de carga (rúbrica, aciertos de oído, texto libre)
     2. total calculado, en vivo
     3. botones de exportación
     4. borrado, aparte y con confirmación */

window.Registro = (function () {
  'use strict';

  var CLAVE = 'registro-curso-v1';

  /* Las cinco categorías son las que define el curso. Los descriptores de cada
     nivel están en la tabla del markdown de la semana, arriba del registro. */
  var RUBRICA = [
    { clave: 'altura', nombre: 'Altura en contexto' },
    { clave: 'aterrizajes', nombre: 'Aterrizajes armónicos' },
    { clave: 'economia', nombre: 'Economía de mástil' },
    { clave: 'musicalidad', nombre: 'Musicalidad' },
    { clave: 'lectura', nombre: 'Lectura' }
  ];

  var DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  var CAMPOS = [
    { clave: 'funciono', nombre: 'Qué funcionó esta semana' },
    { clave: 'pendiente', nombre: 'Qué queda pendiente' }
  ];

  var MAXIMO = RUBRICA.length * 2;

  // ------------------------------------------------------------ almacenamiento

  function leerTodo() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE)) || {};
    } catch (e) {
      return {};
    }
  }

  function guardarTodo(datos) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
      return true;
    } catch (e) {
      return false;
    }
  }

  function leerSemana(n) {
    var r = leerTodo()[n] || {};
    return {
      titulo: r.titulo || '',
      editado: r.editado || '',
      rubrica: r.rubrica || {},
      oido: r.oido || {},
      textos: r.textos || {}
    };
  }

  function guardarSemana(n, datos) {
    var todo = leerTodo();
    todo[n] = datos;
    return guardarTodo(todo);
  }

  function tieneDatos(r) {
    if (!r) return false;
    if (r.rubrica && Object.keys(r.rubrica).length) return true;
    if (r.oido && Object.keys(r.oido).length) return true;
    if (r.textos && Object.keys(r.textos).some(function (k) {
      return (r.textos[k] || '').trim();
    })) return true;
    return false;
  }

  /* ¿La semana tiene algo cargado? Lo usa la grilla del curso. */
  function hayRegistro(n) {
    return tieneDatos(leerTodo()[n]);
  }

  /* Números de semana con datos, ordenados. */
  function semanasCargadas() {
    var todo = leerTodo();
    return Object.keys(todo)
      .filter(function (n) { return tieneDatos(todo[n]); })
      .map(Number)
      .filter(function (n) { return !isNaN(n); })
      .sort(function (a, b) { return a - b; });
  }

  function borrarSemana(n) {
    var todo = leerTodo();
    delete todo[n];
    guardarTodo(todo);
  }

  // ------------------------------------------------------------------ cálculos

  function totalDe(rubrica) {
    var total = 0, contadas = 0;
    RUBRICA.forEach(function (r) {
      var v = rubrica[r.clave];
      if (v === 0 || v) { total += v; contadas++; }
    });
    return { total: total, contadas: contadas, faltan: RUBRICA.length - contadas };
  }

  function dosDigitos(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function fechaLegible(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return iso;
    }
  }

  // ------------------------------------------------------- formatos de salida

  /* Estructura pensada para leerla de forma programática dentro de seis meses:
     cada valor viene con su nombre, sin depender de este archivo. */
  function comoDatos(n) {
    var d = leerSemana(n);
    var t = totalDe(d.rubrica);

    return {
      semana: Number(n),
      titulo: d.titulo || '',
      editado: d.editado || '',
      rubrica: RUBRICA.map(function (r) {
        var v = d.rubrica[r.clave];
        return {
          clave: r.clave,
          nombre: r.nombre,
          puntaje: (v === 0 || v) ? v : null
        };
      }),
      total: t.total,
      maximo: MAXIMO,
      categoriasSinPuntuar: t.faltan,
      oido: DIAS.map(function (dia, i) {
        var v = d.oido[i];
        return {
          indice: i,
          dia: dia,
          aciertos: (v === 0 || v) ? v : null
        };
      }),
      textos: CAMPOS.map(function (c) {
        return {
          clave: c.clave,
          nombre: c.nombre,
          texto: (d.textos[c.clave] || '').trim()
        };
      })
    };
  }

  /* Markdown legible: se lee bien en crudo y se ve bien renderizado. */
  function comoMarkdown(n, nivel) {
    var d = comoDatos(n);
    var h = nivel === 2 ? '##' : '#';
    var hh = nivel === 2 ? '###' : '##';
    var l = [];

    l.push(h + ' Registro — Semana ' + d.semana);
    l.push('');
    if (d.titulo) { l.push(d.titulo); l.push(''); }
    if (d.editado) { l.push('Última edición: ' + fechaLegible(d.editado)); l.push(''); }

    l.push(hh + ' Rúbrica');
    l.push('');
    l.push('| Categoría | Puntaje |');
    l.push('| --- | --- |');
    d.rubrica.forEach(function (r) {
      l.push('| ' + r.nombre + ' | ' + (r.puntaje === null ? '—' : r.puntaje) + ' |');
    });
    l.push('| **Total** | **' + d.total + ' / ' + d.maximo + '** |');
    if (d.categoriasSinPuntuar) {
      l.push('');
      l.push('Categorías sin puntuar: ' + d.categoriasSinPuntuar + '.');
    }
    l.push('');

    l.push(hh + ' Aciertos de oído por día');
    l.push('');
    l.push('| Día | Aciertos |');
    l.push('| --- | --- |');
    d.oido.forEach(function (o) {
      l.push('| ' + o.dia + ' | ' + (o.aciertos === null ? '—' : o.aciertos) + ' |');
    });
    l.push('');

    d.textos.forEach(function (c) {
      l.push(hh + ' ' + c.nombre);
      l.push('');
      l.push(c.texto || '—');
      l.push('');
    });

    return l.join('\n').replace(/\n+$/, '\n');
  }

  function todoComoMarkdown() {
    var semanas = semanasCargadas();
    var l = ['# Registro del curso de bajo', ''];
    l.push('Exportado el ' + fechaLegible(new Date().toISOString()));
    l.push('');
    l.push(semanas.length === 1
      ? 'Una semana cargada.'
      : semanas.length + ' semanas cargadas: ' + semanas.join(', ') + '.');
    l.push('');
    l.push('---');
    l.push('');
    semanas.forEach(function (n) {
      l.push(comoMarkdown(n, 2));
      l.push('---');
      l.push('');
    });
    return l.join('\n').replace(/\n+$/, '\n');
  }

  function todoComoDatos() {
    return {
      exportado: new Date().toISOString(),
      maximo: MAXIMO,
      categorias: RUBRICA.map(function (r) {
        return { clave: r.clave, nombre: r.nombre };
      }),
      dias: DIAS.slice(),
      semanas: semanasCargadas().map(comoDatos)
    };
  }

  // ----------------------------------------------------- descarga y portapapeles

  function descargar(nombre, contenido, tipo) {
    /* El archivo bajado son bytes pelados: el charset del blob no viaja con él.
       Sin BOM, el editor del celular lo abre como Latin-1 y rompe los acentos.
       En el .json no va: JSON.parse y json.load de Python se atragantan con el
       BOM, y el .json existe justamente para leerlo de forma programática. */
    var BOM = String.fromCharCode(0xFEFF);   // marca de UTF-8
    var texto = (tipo === 'text/markdown' ? BOM : '') + contenido;
    var blob = new Blob([texto], { type: tipo + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    /* Se revoca después: si se revoca en el acto, algunos navegadores
       cancelan la descarga antes de empezarla. */
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* Copiar tiene dos caminos y el orden importa.

     Primero el sincrónico (execCommand): corre dentro del gesto del usuario y
     anda también por http en la red local, que es como se abre el sitio desde
     el celular — ahí no hay contexto seguro y navigator.clipboard no existe.

     Segundo el moderno, y con reloj: hay navegadores que dejan la promesa de
     writeText colgada, sin resolver ni rechazar. Si esperáramos esa promesa
     para siempre, el botón no daría ninguna señal de vida. */
  function copiar(texto) {
    if (copiarALaVieja(texto)) return Promise.resolve(true);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return Promise.race([
        navigator.clipboard.writeText(texto).then(
          function () { return true; },
          function () { return false; }
        ),
        new Promise(function (listo) {
          setTimeout(function () { listo(false); }, 1200);
        })
      ]);
    }
    return Promise.resolve(false);
  }

  function copiarALaVieja(texto) {
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    ta.style.fontSize = '16px';   /* evita que iOS haga zoom al enfocar */
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, texto.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  // -------------------------------------------------------------------- vista

  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function crear(semana, titulo) {
    var datos = leerSemana(semana);
    var raiz = el('section', 'registro');
    raiz.setAttribute('aria-label', 'Registro de la semana ' + semana);

    raiz.appendChild(el('div', 'rotulo', 'Registro de la semana'));

    var aviso = el('p', 'guardado');
    aviso.setAttribute('role', 'status');
    var tAviso;

    function avisar(texto, clase) {
      aviso.textContent = texto;
      aviso.className = 'guardado' + (clase ? ' ' + clase : '');
      clearTimeout(tAviso);
      tAviso = setTimeout(function () { aviso.textContent = ''; }, 2600);
    }

    function alGuardar() {
      datos.titulo = titulo || datos.titulo || '';
      datos.editado = new Date().toISOString();
      var ok = guardarSemana(semana, datos);
      avisar(ok ? 'Guardado' : 'No se pudo guardar', ok ? '' : 'error');
      refrescarTotal();
      refrescarBotones();
    }

    // --- 1. campos de carga

    var fsR = el('fieldset');
    fsR.appendChild(el('legend', null, 'Rúbrica · 0 a 2 por categoría'));
    RUBRICA.forEach(function (r) {
      var fila = el('div', 'rubrica-fila');
      fila.appendChild(el('span', 'rubrica-nombre', r.nombre));
      var caja = el('div', 'puntos');
      caja.setAttribute('role', 'group');
      caja.setAttribute('aria-label', r.nombre);

      [0, 1, 2].forEach(function (v) {
        var b = el('button', null, String(v));
        b.type = 'button';
        b.setAttribute('aria-pressed', datos.rubrica[r.clave] === v ? 'true' : 'false');
        b.addEventListener('click', function () {
          /* Volver a tocar el mismo valor lo saca. */
          if (datos.rubrica[r.clave] === v) delete datos.rubrica[r.clave];
          else datos.rubrica[r.clave] = v;
          Array.prototype.forEach.call(caja.children, function (otro, i) {
            otro.setAttribute('aria-pressed', datos.rubrica[r.clave] === i ? 'true' : 'false');
          });
          alGuardar();
        });
        caja.appendChild(b);
      });
      fila.appendChild(caja);
      fsR.appendChild(fila);
    });
    raiz.appendChild(fsR);

    var fsO = el('fieldset');
    fsO.appendChild(el('legend', null, 'Aciertos de oído por día'));
    var grillaDias = el('div', 'dias');
    DIAS.forEach(function (dia, i) {
      var caja = el('div', 'dia');
      var id = 'oido-' + semana + '-' + i;
      var lab = el('label', null, dia);
      lab.htmlFor = id;
      var inp = el('input');
      inp.type = 'number';
      inp.id = id;
      inp.min = '0';
      inp.inputMode = 'numeric';
      inp.value = (datos.oido[i] === 0 || datos.oido[i]) ? datos.oido[i] : '';
      inp.addEventListener('input', function () {
        if (inp.value === '') delete datos.oido[i];
        else datos.oido[i] = Number(inp.value);
        alGuardar();
      });
      caja.appendChild(lab);
      caja.appendChild(inp);
      grillaDias.appendChild(caja);
    });
    fsO.appendChild(grillaDias);
    raiz.appendChild(fsO);

    var fsT = el('fieldset');
    fsT.appendChild(el('legend', null, 'Notas de la semana'));
    CAMPOS.forEach(function (c) {
      var id = 'campo-' + semana + '-' + c.clave;
      var lab = el('label', 'campo', c.nombre);
      lab.htmlFor = id;
      var ta = el('textarea');
      ta.id = id;
      ta.value = datos.textos[c.clave] || '';
      ta.addEventListener('input', function () {
        datos.textos[c.clave] = ta.value;
        alGuardar();
      });
      fsT.appendChild(lab);
      fsT.appendChild(ta);
    });
    raiz.appendChild(fsT);

    // --- 2. total calculado, siempre debajo de los campos

    var cajaTotal = el('div', 'total');
    var totalNumero = el('div', 'total-numero');
    var totalDetalle = el('div', 'total-detalle');
    cajaTotal.appendChild(el('div', 'total-rotulo', 'Total de la rúbrica'));
    cajaTotal.appendChild(totalNumero);
    cajaTotal.appendChild(totalDetalle);
    raiz.appendChild(cajaTotal);

    function refrescarTotal() {
      var t = totalDe(datos.rubrica);
      totalNumero.textContent = t.total + ' / ' + MAXIMO;
      if (t.faltan === RUBRICA.length) {
        totalDetalle.textContent = 'Todavía no puntuaste ninguna categoría.';
      } else if (t.faltan) {
        totalDetalle.textContent = t.faltan === 1
          ? 'Falta puntuar 1 categoría.'
          : 'Faltan puntuar ' + t.faltan + ' categorías.';
      } else {
        totalDetalle.textContent = 'Las cinco categorías puntuadas.';
      }
      cajaTotal.classList.toggle('completo', t.faltan === 0);
    }

    // --- 3. exportación

    raiz.appendChild(el('div', 'rotulo', 'Exportar'));

    var nn = dosDigitos(Number(semana));
    var exportaciones = el('div', 'exportaciones');

    var bCopiar = el('button', 'boton principal', 'Copiar');
    bCopiar.type = 'button';
    bCopiar.addEventListener('click', function () {
      copiar(comoMarkdown(semana)).then(function (ok) {
        if (ok) {
          avisar('Copiado al portapapeles');
        } else {
          /* Último recurso: lo dejo a la vista y seleccionado. */
          respaldo.value = comoMarkdown(semana);
          respaldo.hidden = false;
          respaldo.focus();
          respaldo.select();
          avisar('No pude copiar solo: está seleccionado abajo', 'error');
        }
      });
    });

    var bMd = el('button', 'boton suave', 'Descargar .md');
    bMd.type = 'button';
    bMd.addEventListener('click', function () {
      descargar('registro-semana-' + nn + '.md', comoMarkdown(semana), 'text/markdown');
      avisar('Bajando registro-semana-' + nn + '.md');
    });

    var bJson = el('button', 'boton suave', 'Descargar .json');
    bJson.type = 'button';
    bJson.addEventListener('click', function () {
      descargar('registro-semana-' + nn + '.json',
        JSON.stringify(comoDatos(semana), null, 2), 'application/json');
      avisar('Bajando registro-semana-' + nn + '.json');
    });

    var bTodo = el('button', 'boton suave completo', 'Descargar todo');
    bTodo.type = 'button';
    bTodo.addEventListener('click', function () {
      var semanas = semanasCargadas();
      if (!semanas.length) return;
      descargar('registro-completo.md', todoComoMarkdown(), 'text/markdown');
      /* Separadas: si salen juntas, algunos navegadores se comen la segunda. */
      setTimeout(function () {
        descargar('registro-completo.json',
          JSON.stringify(todoComoDatos(), null, 2), 'application/json');
      }, 400);
      avisar(semanas.length === 1
        ? 'Bajando el respaldo (1 semana)'
        : 'Bajando el respaldo (' + semanas.length + ' semanas)');
    });

    exportaciones.appendChild(bCopiar);
    exportaciones.appendChild(bMd);
    exportaciones.appendChild(bJson);
    exportaciones.appendChild(bTodo);
    raiz.appendChild(exportaciones);
    raiz.appendChild(aviso);

    var ayudaTodo = el('p', 'ayuda',
      'Copiar y las dos descargas de arriba son de esta semana. ' +
      '"Descargar todo" junta todas las semanas cargadas: es el respaldo.');
    raiz.appendChild(ayudaTodo);

    var respaldo = el('textarea', 'exportado');
    respaldo.readOnly = true;
    respaldo.hidden = true;
    respaldo.setAttribute('aria-label', 'Registro en markdown, listo para copiar a mano');
    raiz.appendChild(respaldo);

    function refrescarBotones() {
      var vacia = !tieneDatos(datos);
      [bCopiar, bMd, bJson].forEach(function (b) {
        b.disabled = vacia;
        b.title = vacia ? 'Cargá algún dato para poder exportar' : '';
      });
      var hayAlguna = semanasCargadas().length > 0;
      bTodo.disabled = !hayAlguna;
      bTodo.title = hayAlguna ? '' : 'Todavía no hay ninguna semana con datos';
    }

    // --- 4. borrado, aparte de la exportación

    var zona = el('div', 'zona-borrado');
    var bBorrar = el('button', 'boton peligro', 'Borrar registro');
    bBorrar.type = 'button';
    zona.appendChild(bBorrar);
    raiz.appendChild(zona);

    /* Confirmación en dos toques en vez de un confirm(): en el celular,
       apoyado en el atril, un diálogo del navegador es peor. */
    var armado = false, tArmado;
    bBorrar.addEventListener('click', function () {
      if (!armado) {
        armado = true;
        bBorrar.classList.add('armado');
        bBorrar.textContent = '¿Seguro? Tocá otra vez';
        tArmado = setTimeout(function () {
          armado = false;
          bBorrar.classList.remove('armado');
          bBorrar.textContent = 'Borrar registro';
        }, 5000);
        return;
      }
      clearTimeout(tArmado);
      armado = false;
      bBorrar.classList.remove('armado');
      borrarSemana(semana);
      datos = { titulo: '', editado: '', rubrica: {}, oido: {}, textos: {} };
      bBorrar.textContent = 'Borrar registro';
      respaldo.hidden = true;
      Array.prototype.forEach.call(raiz.querySelectorAll('.puntos button'), function (b) {
        b.setAttribute('aria-pressed', 'false');
      });
      Array.prototype.forEach.call(raiz.querySelectorAll('.dias input'), function (i) {
        i.value = '';
      });
      Array.prototype.forEach.call(raiz.querySelectorAll('textarea:not(.exportado)'), function (t) {
        t.value = '';
      });
      refrescarTotal();
      refrescarBotones();
      avisar('Registro borrado');
    });

    refrescarTotal();
    refrescarBotones();
    return raiz;
  }

  return {
    crear: crear,
    hayRegistro: hayRegistro,
    semanasCargadas: semanasCargadas,
    comoMarkdown: comoMarkdown,
    comoDatos: comoDatos
  };
})();
