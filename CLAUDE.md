# Sitio de estudio de música — Bajo y batería

Sitio personal de estudio, publicado con GitHub Pages. Contiene material de bajo (curso propio de 24 semanas, clases del profesor, apuntes), material de batería, y una herramienta interactiva de lectura en clave de Fa.

Todo el contenido y la interfaz están en español rioplatense (es-AR).

---

## Reglas fundamentales

Estas cinco reglas mandan sobre cualquier otra consideración. Si una tarea parece requerir romperlas, avisar antes de hacerlo.

### 1. El contenido vive en markdown, nunca en HTML

Todo el material de estudio está en archivos `.md` dentro de `contenido/`. La aplicación los lee y los renderiza en tiempo de ejecución.

**Nunca convertir un `.md` de contenido a HTML a mano.** Agregar una semana del curso, una clase o un apunte tiene que ser: crear el archivo + agregar una línea a `contenido.json`. Si en algún momento agregar contenido requiere tocar código, el diseño está mal y hay que corregirlo.

### 2. El markdown se mantiene plano

Sin front matter, sin YAML, sin encabezados especiales, sin sintaxis de ningún generador. Markdown estándar y nada más.

El motivo es concreto: los archivos se editan desde el celular, en la interfaz web de GitHub, sin herramientas. Cualquier cosa que agregue ceremonia a un archivo de contenido está prohibida.

Los metadatos (título, fecha, orden, sección) van en `contenido.json`, no en los archivos.

### 3. `herramientas/lectura/` no se toca

Es una herramienta interactiva de lectura en clave de Fa que ya funciona y se usa a diario. Se migra tal cual está.

No refactorizar, no "modernizar", no reescribir en otro framework, no cambiarle el estilo para que combine. Si hay que integrarla visualmente, se hace desde afuera. Solo se modifica si el pedido es explícito y específico sobre esa herramienta.

### 4. Sin build, sin frameworks, sin dependencias

HTML, CSS y JavaScript plano. Nada de npm, nada de React, nada de compilación, nada de Jekyll.

Única dependencia externa aceptada: una librería de renderizado de markdown por CDN (marked.js o similar). Si hace falta alguna otra, preguntar primero.

El sitio tiene que funcionar abriendo el repo con un servidor estático simple. Nada que requiera un paso previo para ver el resultado.

### 5. Primero el celular, y con las manos ocupadas

El uso real es: el teléfono o una tablet apoyados en un atril, mientras se toca el bajo. Eso manda sobre las decisiones de diseño.

- Texto grande y legible a medio metro de distancia.
- Contraste alto. Se lee con luz mala y a veces de noche.
- Objetivos táctiles grandes. Se toca con las manos ocupadas o sucias.
- Nada crítico que dependa de hover.
- Los ejercicios de un día tienen que verse sin scroll horizontal ni zoom.

---

## Estructura

```
/
├── CLAUDE.md
├── index.html              Shell único de la aplicación
├── contenido.json          Índice de todo el contenido
│
├── contenido/
│   ├── bajo/
│   │   ├── curso/          semana-01.md … semana-24.md
│   │   ├── clases/         Clases del profesor (video + apuntes)
│   │   └── apuntes/        Teoría, RC-600, notas sueltas
│   │
│   ├── bateria/
│   │   ├── clases/
│   │   └── apuntes/
│   │
│   └── general/            Material mezclado o sin clasificar
│
├── herramientas/
│   └── lectura/            NO TOCAR
│
├── js/
│   ├── app.js              Ruteo y render
│   ├── registro.js         Registro semanal del curso
│   └── lib/
│
└── css/
```

### `contenido.json`

Es el índice del sitio. Estructura:

```json
{
  "bajo": {
    "titulo": "Bajo",
    "curso": [
      { "archivo": "bajo/curso/semana-01.md", "titulo": "Semana 1 — Oír la función, no buscar la nota", "semana": 1 }
    ],
    "clases": [
      { "archivo": "bajo/clases/2026-07-15-modos.md", "titulo": "Modos sobre vamps", "fecha": "2026-07-15" }
    ],
    "apuntes": []
  },
  "bateria": { "titulo": "Batería", "clases": [], "apuntes": [] },
  "general": { "titulo": "General", "notas": [] }
}
```

Las secciones y subsecciones no están fijas en el código: se leen de este archivo. Agregar una subsección nueva debe ser posible sin tocar JavaScript.

---

## Funcionalidad

### Navegación

Home con dos accesos grandes: **Bajo** y **Batería**. Dentro de bajo: Curso, Clases, Apuntes, y acceso a la herramienta de lectura.

El curso se lista como grilla de 24 semanas, con las completadas marcadas visualmente. Las semanas que todavía no tienen archivo se muestran en gris y no son clickeables.

Ruteo por hash (`#/bajo/curso/semana-01`) para que funcione en GitHub Pages sin configuración de servidor.

### Videos de YouTube

Las clases del profesor son videos de YouTube no listados.

**En el markdown, una URL de YouTube sola en su propia línea se convierte automáticamente en un reproductor embebido.** No se escribe HTML de iframe en los archivos de contenido. El renderizador detecta el patrón y lo reemplaza.

```markdown
## Ejercicio de octavas

https://www.youtube.com/watch?v=XXXXXXXXXXX

Notas de la clase: prestar atención al apagado de la mano derecha.
```

### Registro del curso

Cada semana del curso tiene un registro asociado: puntajes de rúbrica (5 categorías de 0 a 2), aciertos de oído por día, y dos campos de texto libre.

- Se guarda en `localStorage`. Sin backend, sin cuentas.
- Persiste entre visitas y sobrevive a recargas.
- **Botón de exportar obligatorio**: vuelca todo el registro de la semana como texto plano listo para copiar. Es la forma de sacar los datos del sitio, y se usa siempre.
- Botón de borrar registro, con confirmación.

El registro no vive en el markdown. El markdown de la semana define el contenido; el registro es del usuario.

### Búsqueda

Búsqueda simple de texto sobre todo el contenido. Sin índice precompilado ni dependencias: alcanza con cargar los markdown y filtrar.

---

## Convenciones

**Nombres de archivo.** Curso: `semana-NN.md` con cero adelante. Clases: `AAAA-MM-DD-tema-corto.md`. Apuntes: `tema-corto.md`. Todo en minúsculas, sin tildes ni espacios, guiones como separador.

**Idioma.** Todo en español rioplatense. Interfaz, mensajes de error, comentarios en el código. Voseo.

**Estilo visual.** Sobrio y legible antes que llamativo. Es una herramienta de trabajo que se mira todos los días durante seis meses, no un portfolio.

**Commits.** Mensajes en español, descriptivos y cortos.

---

## Cosas que conviene no hacer

- No agregar un generador de sitios estáticos. Se evaluó y se descartó a propósito.
- No mover contenido a una base de datos ni a un CMS.
- No agregar analytics, cookies ni tracking de ningún tipo.
- No agregar animaciones de transición entre páginas.
- No proponer tests unitarios para esto.
- No reorganizar `contenido/` sin preguntar: las rutas están referenciadas en `contenido.json`.
- No tocar la herramienta de lectura. Ya se dijo arriba, se repite acá.

---

## Contexto de uso

El sitio lo usa una sola persona: baterista con años de experiencia, aprendiendo bajo, que toca en un trío con dos guitarras eléctricas.

El curso de bajo de 24 semanas se escribe por bloques de cuatro semanas y se va agregando a medida que avanza. **La mayoría de los archivos de `bajo/curso/` no van a existir todavía.** La interfaz tiene que manejar eso con naturalidad: mostrar las semanas disponibles, indicar las que faltan, y nunca romperse ni mostrar un error por un archivo ausente.

Las clases del profesor aparecen de forma irregular, de a una, y se agregan cuando llegan.
