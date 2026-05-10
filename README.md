# BEEROMID (Expo + NestJS)

## Comandos para correr

```bash
npm install
npm run install:all
npm run dev
```

Si necesitas limpiar cache:

```bash
npm run dev -- --clear
```

## Estructura

- `backend/`: API REST + socket.io con NestJS
- `mobile/`: app Expo Router (React Native + TypeScript)

## Backend

```bash
cd backend
npm install
npm run start:dev
```

Servidor por defecto en `http://localhost:3001` (puedes cambiar con `PORT`).

## Mobile

```bash
cd mobile
npm install
npm run start
```

Si ejecutas en celular fisico, la app detecta automaticamente la IP LAN del host de Expo.
Opcionalmente puedes fijarla manual con:

```bash
set EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:3001
```

Si usas Android emulator, usa:

```bash
set EXPO_PUBLIC_API_URL=http://10.0.2.2:3001
```

### Build release (EAS)

En produccion, la app **no** usa fallback a `localhost`.
Debes configurar `EXPO_PUBLIC_API_URL` con la URL publica **HTTPS** de tu backend antes de compilar.

Ejemplo de variable para produccion:

```bash
EXPO_PUBLIC_API_URL=https://tu-backend-publico.com
```

Puedes cargarla en EAS (entorno `production`) con:

```bash
cd mobile
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://tu-backend-publico.com
```

Luego compila:

```bash
cd mobile
npm run build:android:aab
```

Si no configuras esa variable (o usas `http://` en release), la app mostrara `Backend no configurado` al crear/unirse a una sala.

## Todo junto (un comando)

Desde la raiz del proyecto:

```bash
npm install
npm run install:all
npm run dev
```

Eso levanta Backend + Expo al mismo tiempo en una sola terminal.
Si el puerto base esta ocupado, busca automaticamente el siguiente libre (`8082+`).
Tambien inyecta automaticamente `EXPO_PUBLIC_API_URL` para que el celular pueda llegar al backend.

Si Expo queda con cache viejo, usa:

```bash
npm run dev -- --clear
```

Opcional (si necesitas QR por tunnel):

```bash
npm run dev:tunnel
```

### Nota para Android fisico

Si pruebas en Expo Go en tu celular, `localhost` no apunta a tu PC.
Con `npm run dev` esto ya queda resuelto automaticamente.
Si levantas mobile por separado, usa la IP local de tu computador en `mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:3001
```

Ejemplo: `http://192.168.1.25:3001`

---

Hecho por Jean Carlos Francisco Garnica Flores  
IG: @mayisus6
