# 🌴 Guía Playa Los Frailes PWA

![PWA](https://img.shields.io/badge/PWA-Ready-orange)
![React](https://img.shields.io/badge/React-19-blue)
![Firebase](https://img.shields.io/badge/Firebase-v12-yellow)
![Gemini AI](https://img.shields.io/badge/AI-Gemini_3_Flash-brightgreen)

Una aplicación web progresiva (PWA) diseñada para mejorar la experiencia del turista en la **Playa Los Frailes** (Parque Nacional Machalilla, Ecuador). La aplicación funciona con un enfoque "Offline-First" e integra Inteligencia Artificial para asistencia dinámica.

## ✨ Características Principales

### 👤 Para el Turista

- **Acceso Offline:** Registro de Service Workers para visualización de información sin conexión a internet.
- **Información Crítica:** Normativas de seguridad, horarios de parqueadero y protocolos actualizados.
- **Exploración:** Catálogo de actividades y servicios locales.
- **Geolocalización con IA:** Instrucciones dinámicas de "Cómo llegar" a aliados locales utilizando **Gemini API con Google Maps Grounding**.
- **Sistema de Opiniones:** Feedback en tiempo real sincronizado con Firebase.

### 🔐 Para el Administrador (CMS Integrado)

- **Modo Admin Oculto:** Activado mediante un "Easter Egg" (5 clics rápidos en el área superior de la pestaña Info).
- **Edición In-Situ:** Cambia textos e imágenes directamente desde la interfaz sin paneles complicados.
- **Mejora de Contenido con IA:** Botón de "Sparkles" (Destello) que utiliza **Gemini 3 Flash** para optimizar descripciones turísticas automáticamente.
- **Gestión de Visibilidad:** Controla qué secciones (Aliados, Tienda) son visibles para el público.

## 🛠️ Stack Tecnológico

- **Frontend:** [React 19](https://react.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- **Iconografía:** [Lucide React](https://lucide.dev/)
- **Backend as a Service:** [Firebase](https://firebase.google.com/) (Firestore para datos y Storage para medios)
- **Inteligencia Artificial:** [Google GenAI SDK](https://ai.google.dev/)
- **PWA:** Service Workers para almacenamiento en caché de activos y persistencia de datos local (IndexedDB).

## 🚀 Instalación y Configuración

1. **Clonar el repositorio:**

   ```bash
   git clone https://github.com/tu-usuario/los-frailes-pwa.git
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Variables de Entorno:**
   Crea un archivo `.env` en la raíz del proyecto y añade tu API Key de Google AI Studio:

   ```env
   API_KEY=tu_gemini_api_key_aqui
   ```

4. **Configuración de Firebase:**
   Actualiza las credenciales en `src/firebase.ts` con los datos de tu proyecto de Firebase.

5. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

## 🤖 Integración con Google Gemini

La aplicación utiliza dos modelos específicos para diferentes tareas:

1. **Gemini 3 Flash Preview:** Para la optimización de textos y descripciones en el modo administrador.
2. **Gemini 2.5 Flash:** Utilizado en la sección de Aliados para generar rutas dinámicas integrando la herramienta de **Google Maps**, permitiendo respuestas contextuales basadas en la ubicación del usuario.

## 🔑 Acceso Administrativo

Para entrar al modo de edición:

1. Ve a la pestaña **"Info"**.
2. Haz clic **5 veces** seguidas en la esquina superior izquierda (área invisible).
3. Introduce la contraseña maestra (Por defecto: `1996`).

---

Desarrollado con ❤️ para el turismo sostenible en Manabí, Ecuador.
