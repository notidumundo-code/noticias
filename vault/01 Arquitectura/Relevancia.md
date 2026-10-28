# Relevancia

1. **Clasificación** (`src/classify.ts`): cada fuente trae categoría y región. Las fuentes "mixtas" (noticias generales) se clasifican por palabras clave. Deportes, espectáculos y clima se descartan.
2. **Reubicación**: si un medio regional o mundial habla de Argentina en el título, la nota va a *Argentina*; si un medio mundial habla de un país latinoamericano, va a *Región*.
3. **Agrupación**: notas con títulos parecidos se juntan en una misma "historia".
4. **Puntaje**: `2 × cantidad de medios que la cubren + bonus por frescura`. Lo que cubren muchos medios a la vez sube.

Mejoras posibles en [[Ideas pendientes]].
