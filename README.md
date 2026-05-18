# Anime Vault

Anime Vault es una biblioteca personal para llevar el control de animes, temporadas, episodios, valoraciones, notas y portadas.

## Caracteristicas

- Dashboard con resumen rapido
- Biblioteca con busqueda y filtros
- Editor para crear y actualizar registros
- Vista de detalle con progreso y acciones
- Guardado local cuando se abre en GitHub Pages

## Como ejecutar en local

1. Entra a la carpeta del proyecto:

   ```powershell
   cd ani
   ```

2. Instala dependencias si hiciera falta:

   ```powershell
   npm install
   ```

3. Inicia el servidor local:

   ```powershell
   npm start
   ```

4. Abre:

   ```text
   http://localhost:5173
   ```

## Como usar GitHub Pages

Este proyecto puede publicarse en GitHub Pages porque la raiz del repositorio incluye un `index.html` que redirige a la app.

### Pasos

1. Sube el repositorio a GitHub.
2. Ve a `Settings > Pages`.
3. En `Build and deployment`, elige:
   - `Source`: `Deploy from a branch`
   - `Branch`: `main`
   - `Folder`: `/root`
4. Guarda los cambios y espera la URL publicada.

### Importante

- GitHub Pages no ejecuta `server.js`.
- En Pages, la app usa `localStorage` para guardar tus animes.
- En local, si ejecutas `npm start`, se usa el servidor con archivo JSON en `ani/data/animes.json`.

## Estructura

- `index.html`: entrada para GitHub Pages
- `ani/index.html`: interfaz principal
- `ani/script.js`: logica de la app
- `ani/style.css`: estilos
- `ani/server.js`: servidor local
- `ani/data/animes.json`: base de datos local

## Licencia

Proyecto personal.
