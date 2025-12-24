# GTA 5 Style 3D Game

Videojuego 3D en estilo GTA 5 desarrollado con Three.js y JavaScript moderno.

## 📁 Estructura del Proyecto

```
project/
├── css/
│   └── main.css              # Estilos principales del juego
├── js/
│   ├── config.js             # Configuración global del juego
│   └── main.js               # Punto de entrada principal
├── assets/
│   ├── models/               # Modelos 3D (GLTF, GLB, OBJ)
│   ├── textures/             # Texturas y materiales
│   ├── sounds/               # Efectos de sonido y música
│   └── maps/                 # Datos del mundo y mapas
├── index.html                # Página principal
└── .gitignore               # Archivos ignorados por Git
```

## 🚀 Características

### HUD - Interfaz de Usuario
- Barra de salud
- Barra de armadura
- Contador de dinero
- Misión actual
- Minimapa
- Información de armas
- Reloj del juego

### Sistema de Menús
- Menú de pausa funcional
- Pantalla de carga animada
- Diseño responsivo

### Configuración del Juego
- Constantes del jugador (velocidad, salto, gravedad)
- Configuración de vehículos
- Configuración de cámara (tercera persona, primera persona)
- Sistema de física
- Configuración de entrada (teclado, ratón, gamepad)
- Configuración gráfica
- Configuración de audio
- Opciones de depuración

## 🎮 Controles (Configurados)

### Movimiento
- `W` / `↑` - Adelante
- `S` / `↓` - Atrás
- `A` / `←` - Izquierda
- `D` / `→` - Derecha
- `Shift` - Correr
- `Ctrl` / `C` - Agacharse
- `Espacio` - Saltar

### Acciones
- `E` - Interactuar
- `F` - Entrar en vehículo

### Combate
- `Clic Izquierdo` - Atacar
- `Clic Derecho` - Apuntar
- `R` - Recargar
- `Tab` / `Q` - Cambiar arma

### Cámara
- `Rueda del ratón` / `+` / `-` - Zoom

### Menú
- `Escape` - Pausar
- `I` - Inventario
- `M` - Mapa

### Vehículos
- `W` / `↑` - Acelerar
- `S` / `↓` - Frenar/Reversa
- `A` / `←` - Girar izquierda
- `D` / `→` - Girar derecha
- `Espacio` - Freno de mano
- `H` - Bocina

## 📦 Próximos Pasos

Para completar el juego, necesitarás agregar:

1. **Three.js Integration**
   ```javascript
   import * as THREE from 'three';
   ```

2. **Motor de Física**
   - Cannon.js o Ammo.js

3. **Sistema de Personaje**
   - Modelo 3D del jugador
   - Animaciones (idle, walk, run, jump)
   - Sistema de control de cámara

4. **Sistema de Vehículos**
   - Modelos de vehículos
   - Física de conducción
   - Sistema de entrada/salida

5. **Sistema de Misiones**
   - Sistema de objectives
   - Diálogos
   - Sistema de progreso

6. **IA de NPCs**
   - Sistema de navegación
   - Comportamientos
   - Sistema de combate

7. **Sistema de Audio**
   - Música de fondo
   - Efectos de sonido
   - Audio espacial 3D

## 🛠️ Instalación

1. Clona el repositorio:
   ```bash
   git clone <tu-repositorio>
   cd project
   ```

2. Sirve el proyecto con un servidor HTTP local (necesario para módulos ES):
   ```bash
   # Usando Python 3
   python -m http.server 8000
   
   # Usando Node.js (http-server)
   npx http-server -p 8000
   
   # Usando PHP
   php -S localhost:8000
   ```

3. Abre tu navegador en `http://localhost:8000`

## 📝 Notas de Desarrollo

- El proyecto utiliza módulos ES6 (`type="module"`)
- Todos los estilos usan variables CSS para fácil personalización
- La configuración está centralizada en `js/config.js`
- El código está preparado para la integración de Three.js

## 🎨 Personalización

### Colores del HUD
Edita las variables CSS en `css/main.css`:
```css
:root {
    --primary-color: #ffcc00;
    --secondary-color: #ff6b35;
    --danger-color: #ff4444;
    --success-color: #00ff88;
}
```

### Configuración del Juego
Edita las constantes en `js/config.js` según tus necesidades.

## 📄 Licencia

Este proyecto es para fines educativos y de desarrollo.

## 👥 Contribuyentes

Equipo de Desarrollo del Juego
