# Sistema del Jugador - Documentación

## Resumen

Sistema completo de personaje jugable con movimiento, animaciones y cámara en tercera persona para el juego estilo GTA.

## Archivos Creados

### 1. `js/player.js`
Sistema principal del jugador que incluye:
- **Modelo 3D**: Cápsula construida con cilindro + esferas (cuerpo, cabeza, pies)
- **Movimiento**: WASD o flechas para moverse
- **Rotación**: El personaje rota automáticamente hacia la dirección de movimiento
- **Velocidades**:
  - Caminar: 5.0 unidades/segundo (sin Shift)
  - Correr: 12.0 unidades/segundo (con Shift)
- **Salto**: Presionar Space (gravedad física aplicada)
- **Colisiones**: Detección contra edificios con deslizamiento en paredes
- **Límites**: El jugador se mantiene dentro del terreno (±280 unidades)

### 2. `js/camera.js`
Sistema de cámara en tercera persona:
- **Seguimiento suave**: Usa lerp para movimiento fluido
- **Posición**: Detrás y arriba del jugador
- **Distancia ajustable**: Por defecto 8 unidades, configurable entre 3-15
- **Control con mouse**: Opcional con pointer lock (click en canvas)
- **Auto-seguimiento**: Sin mouse, la cámara sigue la rotación del jugador

### 3. `js/animations.js`
Sistema de animaciones procedurales:
- **Idle**: Respiración sutil, ligero movimiento de cabeza
- **Walk**: Bob moderado del cuerpo, pies oscilando
- **Run**: Bob más pronunciado, rotación del torso
- **Jump**: Estiramiento al despegar, compresión al aterrizar
- **Transiciones**: Blend suave entre animaciones (0.18s)

### 4. `js/main.js` (actualizado)
Integración completa:
- Inicialización del jugador en posición (0, 5, 0)
- Creación del controlador de cámara
- Creación del controlador de animaciones
- Update loop que actualiza todo el sistema
- Raycasting para detectar altura del terreno

## Controles

### Movimiento
- **W / ↑**: Mover adelante
- **S / ↓**: Mover atrás
- **A / ←**: Mover izquierda
- **D / →**: Mover derecha
- **Shift**: Correr (2.4x velocidad de caminar)
- **Space**: Saltar

### Cámara
- **Click en canvas**: Activar control con mouse (pointer lock)
- **Mouse**: Rotar cámara (cuando está activado)
- **ESC**: Salir del pointer lock / Pausar

## Características Técnicas

### Sistema de Colisiones
- Usa AABB (Axis-Aligned Bounding Boxes) de los edificios
- Radio del jugador: 0.5 unidades (con margen de 1.2x para seguridad)
- Deslizamiento en paredes: Permite moverse a lo largo de superficies
- Detección continua: Se verifica antes de cada movimiento

### Sistema de Física
- Gravedad: 30 unidades/segundo²
- Fuerza de salto: 15 unidades/segundo
- Cooldown de salto: 0.2 segundos
- Detección de suelo: Raycast hacia el terreno

### Rendimiento
- Animaciones procedurales (sin carga de archivos)
- Colisiones eficientes con estructuras AABB pre-calculadas
- Lerp optimizado para seguimiento suave
- Sin dependencias externas (solo Three.js)

## Configuración

Todos los parámetros están en `js/config.js`:

```javascript
GAME_CONFIG.PLAYER = {
    WALK_SPEED: 5.0,
    RUN_SPEED: 12.0,
    SPRINT_SPEED: 18.0,
    JUMP_FORCE: 15.0,
    GRAVITY: 30.0,
    HEIGHT: 1.8,
    RADIUS: 0.5,
    CAMERA_HEIGHT: 1.6,
};

CAMERA_CONFIG.THIRD_PERSON = {
    DEFAULT_DISTANCE: 8.0,
    MIN_DISTANCE: 3.0,
    MAX_DISTANCE: 15.0,
    SMOOTHING_FACTOR: 0.1,
    HEIGHT_OFFSET: 0.5,
};
```

## Próximas Mejoras Posibles

1. **Stamina system**: Limitar el tiempo de sprint
2. **Agacharse**: Implementar crouch con ControlLeft/ControlRight
3. **Modelo 3D avanzado**: Cargar modelos FBX/GLTF con esqueleto
4. **Animaciones con archivos**: Usar AnimationMixer de Three.js
5. **Sombras mejoradas**: Shadow frustum que sigue al jugador
6. **Partículas**: Polvo al correr, efectos de salto
7. **Sonidos**: Pasos, saltos, aterrizajes
8. **Interpolación**: Smooth stepping para colisiones más precisas

## Integración con Otros Sistemas

El sistema del jugador está listo para integrarse con:
- **Vehículos**: Player.getPosition() para spawn cerca del jugador
- **NPCs**: Sistema de colisiones compatible
- **Misiones**: Acceso a posición y estado del jugador
- **UI**: Display de velocidad, stamina, etc.

## Testing

Para probar el sistema:
```bash
npm start
# Abrir http://localhost:8000
# Usar WASD para mover, Shift para correr, Space para saltar
# Click en canvas para control de cámara con mouse
```
