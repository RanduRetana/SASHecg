# SASHecg

SASHecg (se pronuncia «sash» + «ECG») anonimiza informes de electrocardiograma de una página que llegan juntos en un PDF. Todo el trabajo ocurre en el navegador: el archivo no se sube a ningún servidor.

Sirve cuando un hospital entrega cientos de hojas con los datos del paciente en la misma esquina superior izquierda. Marcas esa zona una vez, la aplicas a todas las páginas y descargas un ZIP con un PDF por hoja.

## Privacidad

- No hay backend, cuentas ni telemetría.
- El PDF, la contraseña y las imágenes se quedan en la memoria de la pestaña.
- La contraseña, si el archivo está cifrado, solo se usa para abrirlo en este dispositivo y no se guarda.
- Al recargar o cerrar la pestaña, esos datos se olvidan.
- La anonimización es permanente. Cada página se rasteriza (objetivo 220 ppp, dentro de 200–300 cuando el tamaño lo permite), se pinta un rectángulo opaco encima y se guarda como un PDF de una sola imagen. No se copia el texto, ni los metadatos, ni una capa escondida debajo de la máscara.
- SASHecg solo tapa el rectángulo que configuras. No busca otros nombres, fechas o números que queden a la vista.

## Requisitos

- [Bun](https://bun.sh) 1.1 o posterior
- Un navegador actual (Chrome, Edge, Firefox o Safari)

## Comandos

```bash
bun install
bun run dev        # http://127.0.0.1:43123
bun run build
bun run preview
bun run typecheck
bun run lint
bun test
```

`bun test` usa el ejecutor de Bun. Incluye la geometría del recuadro, los nombres de archivo, el aplanado de una página y una prueba de integración: 100 páginas de entrada producen 100 PDF, sin el texto marcado y con los píxeles del área sustituidos.

## Uso

1. **Subir.** Elige un PDF o suéltalo. Si está protegido, la contraseña se pide en la página. También puedes crear un PDF sintético de tres páginas, sin datos reales, para ensayar.
2. **Definir área.** El recuadro inicial cubre la esquina superior izquierda (30 % del ancho y 15,5 % del alto). Arrástralo, usa los tiradores o escribe X, Y, ancho y alto en fracciones de 0 a 1. El origen es la esquina superior izquierda de la página tal como se ve. «Todas» aplica la misma fracción a cada hoja. «Excepción» guarda otra área para la página visible o para las que hayas seleccionado.
3. **Revisar.** Al procesar se generan miniaturas ya anonimizadas. Puedes marcar páginas, ajustar una excepción y reprocesar solo esas. Mayús y clic selecciona un rango.
4. **Exportar.** El ZIP contiene `ecg-001.pdf`, `ecg-002.pdf`, … con al menos tres dígitos. El nombre del ZIP sale del archivo original, por ejemplo `informe-anonimizado.zip`. Un segundo clic no dispara otra descarga.

«Nuevo archivo» borra el documento de esta pestaña.

## Cómo está hecho

Aplicación de una sola página con React, TypeScript y Vite. Bun instala, ejecuta los tests y el servidor de desarrollo.

| Pieza | Para qué |
| --- | --- |
| PDF.js | Abrir el PDF y dibujar cada página, con rotación incluida |
| pdf-lib | Crear el PDF de salida, solo con la imagen ya tapada |
| fflate | Armar el ZIP en el navegador |
| Stealth UI | Controles de la interfaz |

La interfaz usa el tema claro de Stealth UI, con un papel un poco más frío. Stealth UI no es un paquete npm único: es un registro de componentes en `https://www.stealth.pm/r/{name}.json`. Los que usa esta app están copiados en `src/components/ui` (botón, zona de soltar, pasos, barra de progreso, campo numérico, campo, entrada, casilla, aviso, llamada, insignia, diálogo, control segmentado, ruleta, estado vacío, área de desplazamiento, tooltip y botón de icono) junto con `src/lib/cn.ts`, `src/lib/motion.ts`, `src/lib/icons.tsx` y `src/styles/stealth.css`. No se usa el conjunto de shadcn/ui. `components.json` deja apuntado el registro `@stealth` por si más adelante quieres añadir otro componente con `bunx shadcn@latest add @stealth/nombre`.

El área se guarda normalizada (0–1) respecto a la página **ya girada**, así que un bloque en la esquina superior izquierda sigue ahí aunque cambien el tamaño o la rotación. El puntero se convierte con el recuadro CSS de la página (`getBoundingClientRect`), no con los píxeles internos del lienzo.

Si una hoja a 220 ppp pasaría de 8 megapíxeles, o si el navegador informa poca memoria libre, la resolución baja y la revisión lo avisa. El proceso es página por página y se puede cancelar.

## Limitaciones

- Solo se elimina lo que cae dentro del rectángulo. Una anotación, un nombre en el margen o un código de barras fuera de esa zona siguen visibles en la imagen.
- El PDF de salida es una imagen. Se lee en pantalla y se imprime, pero ya no tiene texto seleccionable ni la nitidez vectorial del original.
- Páginas enormes pueden quedar por debajo de 200 ppp para no agotar la memoria.
- Un PDF de más de unos cientos de páginas ocupa bastante RAM porque las imágenes resultantes se conservan hasta la descarga.
- Hace falta la contraseña si el archivo está cifrado. SASHecg no la recupera.
- El cifrado del PDF de salida no se vuelve a aplicar: son documentos nuevos, sin los metadatos del paciente.
- La cuadrícula de miniaturas muestra la imagen anonimizada, no el archivo original.

## Llevar el código a tu Mac y a GitHub

Este proyecto se preparó en un entorno remoto. No se creó ni se publicó un repositorio en GitHub ni en Origin. Cuando tengas la carpeta en `~/Documents/breakaway/sash-ecg`:

```bash
cd ~/Documents/breakaway/sash-ecg
bun install
bun test
bun run dev
```

Para publicarlo tú mismo, crea en GitHub un repositorio vacío (sin README y sin licencia) y, desde esa carpeta:

```bash
git init
git add .
git commit -m "Inicializa SASHecg"
git branch -M main
git remote add origin git@github.com:TU_USUARIO/sash-ecg.git
git push -u origin main
```

Si la carpeta ya es un repositorio, no hace falta `git init`: añade el remoto y haz push. No subas `node_modules` ni `dist`; ya están en `.gitignore`.

No hay archivo de licencia.
