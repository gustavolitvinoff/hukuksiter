# HukukSiter 🧸

App para conectar familias de la comunidad con babysitters. En hebreo e inglés.

- **Familias**: eligen fecha y horario, ven qué babysitters están libres (nombre, apellido y edad) y les mandan un pedido.
- **Babysitters**: marcan sus horarios libres, reciben el pedido con una notificación y aceptan o rechazan.
- **El teléfono** de cada uno aparece recién cuando el pedido se acepta (está protegido en la base de datos, no solo oculto en pantalla).

Hecha con **Expo** (React Native) + **Supabase** (base de datos y usuarios, gratis).

---

## Puesta en marcha, paso a paso

Necesitás: una computadora con [Node.js](https://nodejs.org) (versión 20 o más nueva), tu cuenta de **GitHub**, tu cuenta de **expo.dev** y una cuenta gratis en **supabase.com**.

### 1. Crear la base de datos (Supabase)

1. Entrá a [supabase.com](https://supabase.com) → **New project**. Elegí un nombre (por ejemplo `hukuksiter`), una contraseña y la región **Frankfurt (eu-central-1)**, que es la más cercana a Israel.
2. Cuando termine de crearse, andá a **SQL Editor** → **New query**.
3. Abrí el archivo [`supabase/schema.sql`](supabase/schema.sql) de este proyecto, copiá **todo** el contenido, pegalo y apretá **Run**. Tiene que decir *Success*.
4. Andá a **Authentication → Sign In / Providers → Email**:
   - Para empezar a probar más fácil, podés **desactivar "Confirm email"** (así no hace falta confirmar el email al registrarse). Más adelante lo podés activar.
5. Andá a **Authentication → Emails → Reset Password** y reemplazá el texto del email por algo así (lo importante es `{{ .Token }}`, que es el código de 6 dígitos que se escribe en la app):

   ```
   <h2>HukukSiter</h2>
   <p>Your code / הקוד שלך: <strong>{{ .Token }}</strong></p>
   ```

6. Andá a **Project Settings → API** (o el botón **Connect**) y copiá:
   - **Project URL**
   - **anon public key** (o *publishable key*)

### 2. Conectar la app con la base de datos

Abrí `src/config.ts` y pegá esos dos datos:

```ts
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

### 3. Instalar y probar en tu computadora

```bash
npm install
npx expo start --web
```

Se abre en el navegador y ya podés registrarte como familia y como babysitter (usá dos emails distintos, por ejemplo en dos ventanas, una de ellas en modo incógnito) y probar todo el circuito. En la web no hay notificaciones push, pero la campanita 🔔 de la app sí funciona.

### 4. Subir el código a tu GitHub

Creá un repositorio vacío en GitHub llamado `hukuksiter` (sin README) y después:

```bash
git remote add origin https://github.com/TU-USUARIO/hukuksiter.git
git push -u origin main
```

### 5. Conectar con tu cuenta de Expo

```bash
npx eas-cli@latest login
npx eas-cli@latest init
```

`init` crea el proyecto en expo.dev y agrega su `projectId` a `app.json`. **Las notificaciones push lo necesitan.** Hacé commit de ese cambio.

### 6. Notificaciones push en Android (Firebase)

Para Android, Expo necesita una clave de Firebase (gratis). Hay que hacerlo una sola vez:

1. En [console.firebase.google.com](https://console.firebase.google.com) creá un proyecto y agregá una app **Android** con el nombre de paquete `com.hukuksiter.app`.
2. Descargá `google-services.json`, ponelo en la carpeta principal del proyecto y agregá en `app.json`, dentro de `"android"`:
   `"googleServicesFile": "./google-services.json"`
3. En Firebase → **Project settings → Service accounts → Generate new private key** (descarga un `.json`).
4. Subí ese archivo a Expo: `npx eas-cli@latest credentials` → Android → *Google Service Account* → *Manage your FCM V1 key*.

Guía oficial: https://docs.expo.dev/push-notifications/fcm-credentials/

### 7. Crear la app para instalar en Android

```bash
npx eas-cli@latest build --profile preview --platform android
```

Tarda unos minutos en los servidores de Expo. Al terminar te da un link para descargar el **APK**: mandáselo a la gente de la comunidad y lo instalan directamente.

> ⚠️ Las notificaciones push **no funcionan en la app Expo Go** de Android. Hay que usar el APK de este paso.

### 8. iPhone

Para instalar en iPhone (TestFlight o App Store) se necesita una cuenta de **Apple Developer** (US$99 por año). Con esa cuenta:

```bash
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios
```

Mientras tanto, las personas con iPhone pueden usar la versión web (`npx expo export --platform web` y subir la carpeta `dist` a un hosting gratis como Netlify o Vercel). La web no tiene notificaciones push.

### 9. Google Play (opcional)

Para publicar en Google Play se necesita una cuenta de desarrollador (US$25, un solo pago):

```bash
npx eas-cli@latest build --profile production --platform android
npx eas-cli@latest submit --platform android
```

---

## Cómo está armada

| Parte | Archivo |
|---|---|
| Base de datos, seguridad y notificaciones | `supabase/schema.sql` |
| Textos en hebreo e inglés | `src/i18n/strings.ts` |
| Colores y botones | `src/components/ui.tsx` |
| Pantallas | `src/app/` |
| Conexión a Supabase | `src/config.ts` |

**Pantallas**

- `login`, `register` (familia o babysitter), `forgot` (recuperar contraseña con código)
- Familia: **Buscar** → **Pedidos** → **Alertas** → **Perfil**
- Babysitter: **Mis horarios** → **Pedidos** (aceptar/rechazar) → **Alertas** → **Perfil**

**Reglas importantes (las hace cumplir la base de datos)**

- Una babysitter aparece en la búsqueda solo si marcó ese día (semanal o fecha puntual) cubriendo **todo** el horario pedido, y no tiene otro pedido aceptado que se superponga.
- Cuando acepta un pedido, se rechazan solos los otros pedidos pendientes que se superponen con ese horario.
- El teléfono de la otra persona solo se entrega cuando el pedido está **aceptado**.
- La notificación push llega en el idioma que eligió quien la recibe.

**Limitación actual:** los horarios terminan como máximo a las 23:59 del mismo día (no se pueden marcar turnos que pasen la medianoche).
