# Guía de Optimización - Índices MongoDB

Esta guía te ayuda a crear los índices necesarios para que tu aplicación
escale a 100+ clientes sin problemas de rendimiento.

## ¿Por qué son necesarios los índices?

Sin índices, cada consulta de reservaciones hace un "full collection scan"
(revisa TODOS los documentos). Con 100 clientes y 50,000 reservaciones
históricas, esto sería extremadamente lento.

Con índices, MongoDB encuentra los datos instantáneamente usando una
estructura de árbol B-tree.

---

## Índices Requeridos

### 1. Índice Principal (CRÍTICO)
**Colección:** `reservations`

Este es el índice más importante. Optimiza las consultas del calendario
y todos los listados de reservaciones.

```javascript
// En MongoDB Atlas Shell o Compass
db.reservations.createIndex(
  { clientId: 1, dateId: 1 },
  { name: "idx_client_date" }
)
```

### 2. Índice de Estado (IMPORTANTE)
Optimiza los widgets de pendientes y métricas de balance.

```javascript
db.reservations.createIndex(
  { clientId: 1, status: 1, dateId: 1 },
  { name: "idx_client_status_date" }
)
```

### 3. Índice de Staff (OPCIONAL)
Solo si usas filtros por empleado frecuentemente.

```javascript
db.reservations.createIndex(
  { clientId: 1, staffId: 1, dateId: 1 },
  { name: "idx_client_staff_date" }
)
```

### 4. Índice de Teléfono (OPCIONAL)
Para búsqueda rápida de clientes por teléfono.

```javascript
db.reservations.createIndex(
  { clientId: 1, phone: 1 },
  { name: "idx_client_phone" }
)
```

---

## Cómo Crear Índices en MongoDB Atlas

### Opción 1: MongoDB Atlas UI

1. Ir a tu Cluster en MongoDB Atlas
2. Click en "Browse Collections"
3. Seleccionar la colección `reservations`
4. Click en la pestaña "Indexes"
5. Click en "Create Index"
6. En el campo JSON, pegar:
   ```json
   { "clientId": 1, "dateId": 1 }
   ```
7. Click "Review" y luego "Confirm"

### Opción 2: MongoDB Compass

1. Conectar a tu cluster con la connection string
2. Navegar a la base de datos > colección `reservations`
3. Click en "Indexes"
4. Click "Create Index"
5. Añadir los campos: `clientId (ASC)`, `dateId (ASC)`
6. Click "Create Index"

### Opción 3: Script de Node.js

Puedes correr este script una vez para crear todos los índices:

```javascript
// scripts/create-indexes.js
const { MongoClient } = require('mongodb');

async function createIndexes() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db(); // Usa la DB del URI
    const reservations = db.collection('reservations');
    
    console.log('Creando índices...');
    
    // Índice principal
    await reservations.createIndex(
      { clientId: 1, dateId: 1 },
      { name: 'idx_client_date', background: true }
    );
    console.log('✓ idx_client_date creado');
    
    // Índice de status
    await reservations.createIndex(
      { clientId: 1, status: 1, dateId: 1 },
      { name: 'idx_client_status_date', background: true }
    );
    console.log('✓ idx_client_status_date creado');
    
    console.log('¡Todos los índices creados!');
    
    // Mostrar índices
    const indexes = await reservations.indexes();
    console.log('Índices actuales:', indexes);
    
  } finally {
    await client.close();
  }
}

createIndexes().catch(console.error);
```

Correr con:
```bash
MONGODB_URI="tu-connection-string" node scripts/create-indexes.js
```

---

## Verificar Índices Existentes

En MongoDB Atlas Shell:
```javascript
db.reservations.getIndexes()
```

Deberías ver algo como:
```javascript
[
  { v: 2, key: { _id: 1 }, name: '_id_' },
  { v: 2, key: { clientId: 1, dateId: 1 }, name: 'idx_client_date' },
  { v: 2, key: { clientId: 1, status: 1, dateId: 1 }, name: 'idx_client_status_date' }
]
```

---

## Impacto Esperado

| Consulta | Sin Índice | Con Índice |
|----------|------------|------------|
| Calendario del mes | ~500ms (50K docs) | ~5ms |
| Widget pendientes | ~300ms | ~2ms |
| Balance mensual | ~1000ms | ~10ms |

---

## Limpieza de Índices Duplicados

Si creaste índices manualmente antes, podrías tener duplicados.
Para eliminar un índice:

```javascript
db.reservations.dropIndex("nombre_del_indice")
```

---

## Notas Importantes

1. **Los índices se crean en background** - No afectan operaciones en curso
2. **Crearlos una sola vez** - No hay que recrearlos cada deploy
3. **Monitorear con Atlas** - Ir a "Performance Advisor" para ver sugerencias automáticas
