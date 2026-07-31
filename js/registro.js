/* Registro semanal del curso de bajo.
   Vive en localStorage: sin backend, sin cuentas.
   El markdown de la semana define el contenido; esto es del usuario. */

window.Registro = (function () {
  'use strict';

  var CLAVE = 'registro-curso-v1';

  var RUBRICA = [
    { clave: 'tecnica', nombre: 'Técnica' },
    { clave: 'tiempo', nombre: 'Tiempo' },
    { clave: 'oido', nombre: 'Oído' },
    { clave: 'lectura', nombre: 'Lectura' },
    { clave: 'musicalidad', nombre: 'Musicalidad' }
  ];

  var DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  var CAMPOS = [
    { clave: 'funciono', nombre: 'Qué funcionó esta semana' },
    { clave: 'pendiente', nombre: 'Qué queda pendiente' }
  ];

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
    var todo = leerTodo();
    var r = todo[n] || {};
    return {
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

  /* ¿La semana tiene algo cargado? Lo usa la grilla del curso. */
  function hayRegistro(n) {
    var r = leerTodo()[n];
    if (!r) return false;
    if (r.rubrica && Object.keys(r.rubrica).length) return true;
    if (r.oido && Object.keys(r.oido).some(function (k) { return r.oido[k] !== ''; })) return true;
    if (r.textos && Object.keys(r.textos).some(function (k) { return (r.textos[k] || '').trim(); })) return true;
    return false;
  }

  function borrarSemana(n) {
    var todo = leerTodo();
    delete todo[n];
    guardarTodo(todo);
  }

  // ------------------------------------------------------------------ export

  function comoTexto(n, titulo) {
    var d = leerSemana(n);
    var lineas = [];

    lineas.push('REGISTRO — Semana ' + n);
    if (titulo) lineas.push(titulo);
    lineas.push('');

    lineas.push('Rúbrica (0 a 2)');
    var total = 0, contadas = 0;
    RUBRICA.forEach(function (r) {
      var v = d.rubrica[r.clave];
      var puesto = (v === 0 || v) ? v : '—';
      if (v === 0 || v) { total += v; contadas++; }
      lineas.push('  ' + r.nombre + ': ' + puesto);
    });
    lineas.push('  Total: ' + total + ' / ' + (RUBRICA.length * 2) +
      (contadas < RUBRICA.length ? '  (' + (RUBRICA.length - contadas) + ' sin puntuar)' : ''));
    lineas.push('');

    lineas.push('Aciertos de oído por día');
    DIAS.forEach(function (dia, i) {
      var v = d.oido[i];
      lineas.push('  ' + dia + ': ' + ((v === 0 || v) ? v : '—'));
    });
    lineas.push('');

    CAMPOS.forEach(function (c) {
      lineas.push(c.nombre);
      var txt = (d.textos[c.clave] || '').trim();
      lineas.push(txt ? txt.split('\n').map(function (l) { return '  ' + l; }).join('\n') : '  —');
      lineas.push('');
    });

    return lineas.join('\n').replace(/\n+$/, '\n');
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

    var aviso = el('p', 'guardado', '');
    function marcarGuardado() {
      var ok = guardarSemana(semana, datos);
      aviso.textContent = ok ? 'Guardado' : 'No se pudo guardar';
      clearTimeout(marcarGuardado.t);
      marcarGuardado.t = setTimeout(function () { aviso.textContent = ''; }, 1600);
    }

    // --- rúbrica

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
          marcarGuardado();
        });
        caja.appendChild(b);
      });
      fila.appendChild(caja);
      fsR.appendChild(fila);
    });
    raiz.appendChild(fsR);

    // --- aciertos de oído

    var fsO = el('fieldset');
    fsO.appendChild(el('legend', null, 'Aciertos de oído por día'));
    var grilla = el('div', 'dias');
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
        marcarGuardado();
      });
      caja.appendChild(lab);
      caja.appendChild(inp);
      grilla.appendChild(caja);
    });
    fsO.appendChild(grilla);
    raiz.appendChild(fsO);

    // --- texto libre

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
        marcarGuardado();
      });
      fsT.appendChild(lab);
      fsT.appendChild(ta);
    });
    raiz.appendChild(fsT);

    // --- acciones

    var acciones = el('div', 'acciones');

    var bExport = el('button', 'boton', 'Exportar');
    bExport.type = 'button';

    var bBorrar = el('button', 'boton peligro', 'Borrar registro');
    bBorrar.type = 'button';

    acciones.appendChild(bExport);
    acciones.appendChild(bBorrar);
    raiz.appendChild(acciones);
    raiz.appendChild(aviso);

    var salida = el('textarea', 'exportado');
    salida.readOnly = true;
    salida.hidden = true;
    salida.setAttribute('aria-label', 'Registro exportado, listo para copiar');
    raiz.appendChild(salida);

    bExport.addEventListener('click', function () {
      if (!salida.hidden) {
        salida.hidden = true;
        bExport.textContent = 'Exportar';
        return;
      }
      salida.value = comoTexto(semana, titulo);
      salida.hidden = false;
      bExport.textContent = 'Ocultar export';
      salida.focus();
      salida.select();
      aviso.textContent = 'Seleccionado: copialo';
      clearTimeout(marcarGuardado.t);
      marcarGuardado.t = setTimeout(function () { aviso.textContent = ''; }, 3000);
    });

    /* Confirmación en dos toques en vez de un confirm(): en el celular,
       apoyado en el atril, un diálogo del navegador es peor. */
    var armado = false, tArmado;
    bBorrar.addEventListener('click', function () {
      if (!armado) {
        armado = true;
        bBorrar.textContent = '¿Seguro? Tocá otra vez';
        tArmado = setTimeout(function () {
          armado = false;
          bBorrar.textContent = 'Borrar registro';
        }, 5000);
        return;
      }
      clearTimeout(tArmado);
      armado = false;
      borrarSemana(semana);
      datos = { rubrica: {}, oido: {}, textos: {} };
      bBorrar.textContent = 'Borrar registro';
      salida.hidden = true;
      bExport.textContent = 'Exportar';
      Array.prototype.forEach.call(raiz.querySelectorAll('.puntos button'), function (b) {
        b.setAttribute('aria-pressed', 'false');
      });
      Array.prototype.forEach.call(raiz.querySelectorAll('.dias input'), function (i) {
        i.value = '';
      });
      Array.prototype.forEach.call(raiz.querySelectorAll('textarea:not(.exportado)'), function (t) {
        t.value = '';
      });
      aviso.textContent = 'Registro borrado';
      setTimeout(function () { aviso.textContent = ''; }, 2200);
    });

    return raiz;
  }

  return {
    crear: crear,
    hayRegistro: hayRegistro,
    comoTexto: comoTexto
  };
})();
