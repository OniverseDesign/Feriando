# Guía de Contribución — Feriando

¡Gracias por tu interés en mejorar **Feriando**! Todas las contribuciones, reportes de errores y sugerencias son bienvenidas.

## Cómo reportar errores o sugerir funciones

No necesitas saber programar para ayudar a mejorar la app:

1. Entra a la pestaña **[Issues](https://github.com/OniverseDesign/Feriando/issues)** del repositorio.
2. Haz clic en **New issue**.
3. Elige la plantilla que mejor se adapte:
   - **Reportar un error (Bug)** si algo falló o dio un cálculo incorrecto.
   - **Sugerir una mejora o función** si tienes una idea para sumar a la app.

## Cómo contribuir con código

1. Haz un **Fork** del repositorio y crea una rama desde `main`:
   ```bash
   git checkout -b feat/mi-mejora
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Realiza tus cambios y verifica que las pruebas y el build pasen:
   ```bash
   npm test
   npm run build
   ```
4. Abre un **Pull Request** describiendo claramente qué cambia y por qué.
