/* Ruteo y render del sitio.
   Todo el contenido sale de contenido.json + los .md de contenido/.
   Agregar material no debería requerir tocar este archivo nunca. */

(function () {
  'use strict';

  var app = document.getElementById('app');
  var barra = document.getElementById('barra');
  var barraVolver = document.getElementById('barraVolver');

  var indice = null;          // contenido.json ya normalizado
  var cacheDocs = {};         // ruta del .md -> texto
  var TITULO_BASE = 'Música — Bajo y batería';

  /* claves de una sección que no son subsecciones de contenido */
  var RESERVADAS = ['titulo', 'descripcion', 'herramientas'];

  // ---------------------------------------------------------------- utilidades

  function el(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) n.className = clase;
    if (texto != null) n.textContent = texto;
    return n;
  }

  function escapar(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function capitalizar(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function vaciar(nodo) {
    while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  }

  /* "bajo/curso/semana-01.md" -> "semana-01" */
  function slugDe(archivo) {
    return archivo.split('/').pop().replace(/\.md$/, '');
  }

  // ---------------------------------------------------- carga de contenido.json

  /* Normaliza para que el resto del código no tenga que conocer las variantes.
     Una subsección puede escribirse como array o como objeto con "items". */
  function normalizar(datos) {
    var secciones = [];
    Object.keys(datos).forEach(function (clave) {
      var cruda = datos[clave] || {};
      var subs = [];

      Object.keys(cruda).forEach(function (k) {
        if (RESERVADAS.indexOf(k) !== -1) return;
        var v = cruda[k];
        var items, tipo = 'lista', total = 0;

        if (Array.isArray(v)) {
          items = v;
        } else if (v && typeof v === 'object') {
          items = Array.isArray(v.items) ? v.items : [];
          tipo = v.tipo || 'lista';
          total = v.total || 0;
        } else {
          return;
        }

        subs.push({
          clave: k,
          titulo: capitalizar(k),
          tipo: tipo,
          total: total,
          items: items
        });
      });

      secciones.push({
        clave: clave,
        titulo: cruda.titulo || capitalizar(clave),
        descripcion: cruda.descripcion || '',
        herramientas: cruda.herramientas || [],
        subsecciones: subs
      });
    });
    return secciones;
  }

  function contarItems(seccion) {
    var n = seccion.herramientas.length;
    seccion.subsecciones.forEach(function (s) { n += s.items.length; });
    return n;
  }

  function buscarSeccion(clave) {
    for (var i = 0; i < indice.length; i++) {
      if (indice[i].clave === clave) return indice[i];
    }
    return null;
  }

  function buscarSub(seccion, clave) {
    if (!seccion) return null;
    for (var i = 0; i < seccion.subsecciones.length; i++) {
      if (seccion.subsecciones[i].clave === clave) return seccion.subsecciones[i];
    }
    return null;
  }

  function buscarItem(sub, slug) {
    if (!sub) return null;
    for (var i = 0; i < sub.items.length; i++) {
      if (slugDe(sub.items[i].archivo || '') === slug) return sub.items[i];
    }
    return null;
  }

  /* Todos los documentos del sitio, aplanados. Lo usa la búsqueda. */
  function todosLosDocumentos() {
    var docs = [];
    indice.forEach(function (sec) {
      sec.subsecciones.forEach(function (sub) {
        sub.items.forEach(function (item) {
          if (item.archivo) {
            docs.push({ seccion: sec, sub: sub, item: item });
          }
        });
      });
    });
    return docs;
  }

  // ------------------------------------------------------------ markdown → HTML

  var RE_YOUTUBE = /^\s*(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:\S*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})\S*\s*$/;

  /* Una URL de YouTube sola en su línea se convierte en reproductor.
     En el markdown nunca se escribe un iframe. */
  function embeberVideos(md, vertical) {
    var clase = vertical ? 'video vertical' : 'video';
    return md.split('\n').map(function (linea) {
      var m = linea.match(RE_YOUTUBE);
      if (!m) return linea;
      return '<div class="' + clase + '">' +
        '<iframe src="https://www.youtube-nocookie.com/embed/' + m[1] + '" ' +
        'title="Video" loading="lazy" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'allowfullscreen></iframe></div>';
    }).join('\n');
  }

  function renderizarMarkdown(md, opciones) {
    opciones = opciones || {};
    var html = marked.parse(embeberVideos(md, opciones.vertical), {
      gfm: true,
      breaks: false
    });
    var caja = el('div', 'doc');
    caja.innerHTML = html;

    /* Las tablas scrollean dentro de su caja: la página nunca se va al costado. */
    Array.prototype.forEach.call(caja.querySelectorAll('table'), function (tabla) {
      var envoltorio = el('div', 'tabla-scroll');
      tabla.parentNode.insertBefore(envoltorio, tabla);
      envoltorio.appendChild(tabla);
    });

    /* Los links externos abren en otra pestaña. */
    Array.prototype.forEach.call(caja.querySelectorAll('a[href^="http"]'), function (a) {
      a.target = '_blank';
      a.rel = 'noopener';
    });

    return caja;
  }

  function traerDocumento(archivo) {
    if (cacheDocs[archivo] != null) {
      return Promise.resolve(cacheDocs[archivo]);
    }
    return fetch('contenido/' + archivo).then(function (r) {
      if (!r.ok) throw new Error('falta');
      return r.text();
    }).then(function (txt) {
      cacheDocs[archivo] = txt;
      return txt;
    });
  }

  // ------------------------------------------------------------------- vistas

  function ponerCabecera(destino, antetitulo, titulo, bajada, centrada) {
    var h = el('header', 'cabecera' + (centrada ? ' centrada' : ''));
    if (antetitulo) h.appendChild(el('div', 'antetitulo', antetitulo));
    var h1 = el('h1');
    h1.textContent = titulo;
    h.appendChild(h1);
    if (bajada) h.appendChild(el('p', 'bajada', bajada));
    destino.appendChild(h);
    return h;
  }

  function tarjeta(href, titulo, meta, desc, etiquetas) {
    var a = el('a', 'tarjeta');
    a.href = href;
    var cabeza = el('div', 'tarjeta-cabeza');
    cabeza.appendChild(el('div', 'tarjeta-titulo', titulo));
    if (meta) cabeza.appendChild(el('div', 'tarjeta-meta', meta));
    a.appendChild(cabeza);
    if (desc) a.appendChild(el('div', 'tarjeta-desc', desc));
    (etiquetas || []).forEach(function (et, i) {
      a.appendChild(el('span', 'etiqueta' + (i % 2 ? ' calida' : ''), et));
    });
    return a;
  }

  // --- home

  function vistaHome(destino) {
    document.title = TITULO_BASE;
    ponerCabecera(destino, 'Práctica personal', 'Bajo y batería',
      'Material de estudio, clases y herramientas. Todo en un solo lugar.', true);

    var caja = el('div', 'tarjetas');
    var conContenido = 0;

    indice.forEach(function (sec, i) {
      if (contarItems(sec) === 0) return;   // secciones vacías no se muestran
      conContenido++;
      var a = el('a', 'acceso' + (i % 2 ? ' calido' : ''));
      a.href = '#/' + sec.clave;
      a.appendChild(el('div', 'acceso-titulo', sec.titulo));
      if (sec.descripcion) a.appendChild(el('div', 'acceso-desc', sec.descripcion));
      caja.appendChild(a);
    });

    if (!conContenido) {
      caja.appendChild(el('p', 'vacio', 'Todavía no hay contenido cargado.'));
    }
    destino.appendChild(caja);

    destino.appendChild(el('div', 'rotulo', 'Buscar'));
    var b = el('a', 'tarjeta');
    b.href = '#/buscar';
    b.appendChild(el('div', 'tarjeta-titulo', 'Buscar en todo el material'));
    b.appendChild(el('div', 'tarjeta-desc', 'Texto libre sobre las clases, los apuntes y el curso.'));
    destino.appendChild(b);
  }

  // --- sección

  function vistaSeccion(destino, sec) {
    document.title = sec.titulo + ' — ' + TITULO_BASE;
    ponerCabecera(destino, 'Material', sec.titulo, sec.descripcion);

    sec.subsecciones.forEach(function (sub) {
      destino.appendChild(el('div', 'rotulo', sub.titulo));
      var caja = el('div', 'tarjetas');

      if (sub.tipo === 'grilla') {
        caja.appendChild(tarjeta(
          '#/' + sec.clave + '/' + sub.clave,
          sub.titulo,
          sub.items.length + ' / ' + sub.total,
          'Las semanas disponibles hasta ahora. Las que faltan se muestran en gris.'
        ));
      } else if (!sub.items.length) {
        caja.appendChild(el('p', 'vacio', 'Todavía no hay nada acá.'));
      } else {
        caja.appendChild(tarjeta(
          '#/' + sec.clave + '/' + sub.clave,
          sub.titulo,
          sub.items.length === 1 ? '1 archivo' : sub.items.length + ' archivos',
          sub.items.slice(0, 3).map(function (i) { return i.titulo; }).join(' · ')
        ));
      }
      destino.appendChild(caja);
    });

    if (sec.herramientas.length) {
      destino.appendChild(el('div', 'rotulo', 'Herramientas'));
      var cajaH = el('div', 'tarjetas');
      sec.herramientas.forEach(function (h) {
        cajaH.appendChild(tarjeta(h.url, h.titulo, h.meta, h.descripcion, ['Interactivo']));
      });
      destino.appendChild(cajaH);
    }
  }

  // --- subsección

  function vistaSubseccion(destino, sec, sub) {
    document.title = sub.titulo + ' · ' + sec.titulo + ' — ' + TITULO_BASE;
    ponerCabecera(destino, sec.titulo, sub.titulo);

    if (sub.tipo === 'grilla') {
      vistaGrilla(destino, sec, sub);
      return;
    }

    if (!sub.items.length) {
      destino.appendChild(el('p', 'vacio', 'Todavía no hay nada acá. Cuando agregues un archivo aparece solo.'));
      return;
    }

    var caja = el('div', 'tarjetas');
    sub.items.forEach(function (item) {
      caja.appendChild(tarjeta(
        '#/' + sec.clave + '/' + sub.clave + '/' + slugDe(item.archivo),
        item.titulo,
        item.fecha || '',
        item.descripcion || ''
      ));
    });
    destino.appendChild(caja);
  }

  // --- grilla del curso

  function vistaGrilla(destino, sec, sub) {
    var porSemana = {};
    sub.items.forEach(function (item) {
      if (item.semana) porSemana[item.semana] = item;
    });

    var grilla = el('div', 'grilla-curso');
    for (var n = 1; n <= sub.total; n++) {
      var item = porSemana[n];
      if (item) {
        var a = el('a', 'semana');
        a.href = '#/' + sec.clave + '/' + sub.clave + '/' + slugDe(item.archivo);
        a.appendChild(el('span', 'n', String(n)));
        var tieneRegistro = window.Registro && window.Registro.hayRegistro(n);
        a.appendChild(el('span', 'et', tieneRegistro ? 'Registrada' : 'Semana'));
        if (tieneRegistro) a.className = 'semana registrada';
        a.title = item.titulo;
        grilla.appendChild(a);
      } else {
        var d = el('div', 'semana falta');
        d.setAttribute('aria-disabled', 'true');
        d.appendChild(el('span', 'n', String(n)));
        d.appendChild(el('span', 'et', 'Falta'));
        grilla.appendChild(d);
      }
    }
    destino.appendChild(grilla);

    var ley = el('div', 'leyenda');
    var l1 = el('span'); l1.appendChild(el('i')); l1.appendChild(document.createTextNode('Disponible'));
    var l2 = el('span'); l2.appendChild(el('i', 'registrada')); l2.appendChild(document.createTextNode('Con registro'));
    var l3 = el('span'); l3.appendChild(el('i', 'falta')); l3.appendChild(document.createTextNode('Todavía no escrita'));
    ley.appendChild(l1); ley.appendChild(l2); ley.appendChild(l3);
    destino.appendChild(ley);

    if (!sub.items.length) {
      var aviso = el('div', 'aviso', 'El curso se escribe por bloques de cuatro semanas. Todavía no hay ninguna cargada.');
      aviso.style.marginTop = '1.5rem';
      destino.appendChild(aviso);
    }
  }

  // --- documento

  function vistaDocumento(destino, sec, sub, item) {
    document.title = item.titulo + ' — ' + TITULO_BASE;
    ponerCabecera(destino, sec.titulo + ' · ' + sub.titulo, item.titulo, item.fecha || '');

    var hueco = el('div');
    hueco.appendChild(el('p', 'cargando', 'Cargando…'));
    destino.appendChild(hueco);

    traerDocumento(item.archivo).then(function (md) {
      vaciar(hueco);
      hueco.appendChild(renderizarMarkdown(md, { vertical: item.vertical === true }));

      /* El registro semanal solo existe en las semanas del curso. */
      if (item.semana && window.Registro) {
        hueco.appendChild(window.Registro.crear(item.semana, item.titulo));
      }
    }).catch(function () {
      vaciar(hueco);
      hueco.appendChild(el('div', 'aviso',
        'Este material todavía no está escrito. Figura en el índice pero falta el archivo ' +
        item.archivo + '.'));
    });
  }

  // --- búsqueda

  function vistaBuscar(destino) {
    document.title = 'Buscar — ' + TITULO_BASE;
    ponerCabecera(destino, 'Todo el material', 'Buscar');

    var caja = el('div', 'buscador');
    var input = el('input');
    input.type = 'search';
    input.placeholder = 'Escribí una palabra…';
    input.setAttribute('aria-label', 'Buscar en el contenido');
    input.autocomplete = 'off';
    caja.appendChild(input);
    destino.appendChild(caja);

    var estado = el('p', 'vacio', 'Cargando el material…');
    destino.appendChild(estado);
    var resultados = el('div', 'tarjetas');
    destino.appendChild(resultados);

    var docs = todosLosDocumentos();
    if (!docs.length) {
      estado.textContent = 'Todavía no hay material para buscar.';
      return;
    }

    /* Sin índice precompilado: se cargan los markdown y se filtra. */
    Promise.all(docs.map(function (d) {
      return traerDocumento(d.item.archivo)
        .then(function (txt) { d.completo = d.item.titulo + '\n\n' + txt; return d; })
        .catch(function () { d.completo = d.item.titulo; return d; });
    })).then(function (cargados) {
      estado.textContent = 'Buscá en ' + cargados.length +
        (cargados.length === 1 ? ' documento.' : ' documentos.');
      input.focus();

      /* Compara sin acentos y sin mayúsculas, pero carácter por carácter:
         así las posiciones siguen valiendo sobre el texto original. */
      function sinAcentos(s) {
        var salida = '';
        for (var i = 0; i < s.length; i++) {
          salida += s.charAt(i).normalize('NFD').charAt(0);
        }
        return salida.toLowerCase();
      }

      function correr() {
        var q = input.value.trim();
        vaciar(resultados);
        if (q.length < 2) {
          estado.textContent = 'Buscá en ' + cargados.length +
            (cargados.length === 1 ? ' documento.' : ' documentos.');
          return;
        }
        var nq = sinAcentos(q);
        var hallados = 0;

        cargados.forEach(function (d) {
          var pos = sinAcentos(d.completo).indexOf(nq);
          if (pos === -1) return;
          hallados++;

          var a = el('a', 'tarjeta');
          a.href = '#/' + d.seccion.clave + '/' + d.sub.clave + '/' + slugDe(d.item.archivo);
          var cabeza = el('div', 'tarjeta-cabeza');
          cabeza.appendChild(el('div', 'tarjeta-titulo', d.item.titulo));
          cabeza.appendChild(el('div', 'tarjeta-meta', d.seccion.titulo + ' · ' + d.sub.titulo));
          a.appendChild(cabeza);

          /* Fragmento con el término resaltado, sobre el texto original. */
          var desde = Math.max(0, pos - 70);
          var hasta = Math.min(d.completo.length, pos + nq.length + 90);
          var antes = d.completo.slice(desde, pos).replace(/\s+/g, ' ');
          var medio = d.completo.slice(pos, pos + nq.length);
          var despues = d.completo.slice(pos + nq.length, hasta).replace(/\s+/g, ' ');
          var p = el('p', 'resultado-fragmento');
          p.innerHTML = (desde > 0 ? '…' : '') +
            escapar(antes) + '<mark>' + escapar(medio) + '</mark>' + escapar(despues) +
            (hasta < d.completo.length ? '…' : '');
          a.appendChild(p);
          resultados.appendChild(a);
        });

        estado.textContent = hallados === 0
          ? 'Sin resultados para "' + q + '".'
          : hallados === 1 ? '1 resultado.' : hallados + ' resultados.';
      }

      input.addEventListener('input', correr);
    });
  }

  // -------------------------------------------------------------------- ruteo

  function partesDeHash() {
    var h = location.hash.replace(/^#\/?/, '').replace(/\/+$/, '');
    if (!h) return [];
    return h.split('/').filter(Boolean).map(decodeURIComponent);
  }

  function actualizarBarra(partes) {
    if (!partes.length) {
      barra.hidden = true;
      return;
    }
    barra.hidden = false;
    var destino = '#/';
    var texto = '← Inicio';
    if (partes.length === 2 && partes[0] !== 'buscar') {
      destino = '#/' + partes[0];
      texto = '← ' + (buscarSeccion(partes[0]) || {}).titulo;
    } else if (partes.length >= 3) {
      destino = '#/' + partes[0] + '/' + partes[1];
      var sub = buscarSub(buscarSeccion(partes[0]), partes[1]);
      texto = '← ' + (sub ? sub.titulo : 'Volver');
    }
    barraVolver.href = destino;
    barraVolver.textContent = texto;
  }

  function noEncontrado(destino) {
    ponerCabecera(destino, 'Error', 'No encontrado');
    destino.appendChild(el('div', 'aviso', 'Esa dirección no corresponde a nada del sitio.'));
    var a = el('a', 'boton');
    a.href = '#/';
    a.textContent = 'Ir al inicio';
    var acc = el('div', 'acciones');
    acc.appendChild(a);
    destino.appendChild(acc);
  }

  function rutear() {
    var partes = partesDeHash();
    vaciar(app);
    actualizarBarra(partes);

    if (!partes.length) { vistaHome(app); }
    else if (partes[0] === 'buscar') { vistaBuscar(app); }
    else {
      var sec = buscarSeccion(partes[0]);
      if (!sec) { noEncontrado(app); }
      else if (partes.length === 1) { vistaSeccion(app, sec); }
      else {
        var sub = buscarSub(sec, partes[1]);
        if (!sub) { noEncontrado(app); }
        else if (partes.length === 2) { vistaSubseccion(app, sec, sub); }
        else {
          var item = buscarItem(sub, partes[2]);
          if (!item) { noEncontrado(app); }
          else { vistaDocumento(app, sec, sub, item); }
        }
      }
    }

    window.scrollTo(0, 0);
  }

  // ------------------------------------------------------------------- arranque

  fetch('contenido.json')
    .then(function (r) {
      if (!r.ok) throw new Error('no se pudo leer contenido.json');
      return r.json();
    })
    .then(function (datos) {
      indice = normalizar(datos);
      window.addEventListener('hashchange', rutear);
      rutear();
    })
    .catch(function (e) {
      vaciar(app);
      app.appendChild(el('div', 'aviso',
        'No se pudo cargar contenido.json. Si abriste el archivo directamente, ' +
        'el sitio necesita un servidor estático simple para funcionar.'));
      if (window.console) console.error(e);
    });
})();
