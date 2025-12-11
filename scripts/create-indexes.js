/**
 * Script para crear índices en MongoDB
 * 
 * USO:
 *   node scripts/create-indexes.js
 * 
 * Requiere que MONGODB_URI esté configurado en .env.local
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match && !process.env[match[1]]) {
            process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
        }
    });
}

const INDEXES = [
    {
        collection: 'reservations',
        keys: { clientId: 1, dateId: 1 },
        name: 'idx_client_date',
        description: 'Optimiza consultas del calendario'
    },
    {
        collection: 'reservations',
        keys: { clientId: 1, status: 1, dateId: 1 },
        name: 'idx_client_status_date',
        description: 'Optimiza widgets de pendientes y balance'
    },
    {
        collection: 'reservations',
        keys: { clientId: 1, staffId: 1, dateId: 1 },
        name: 'idx_client_staff_date',
        description: 'Optimiza filtros por empleado'
    },
    {
        collection: 'reservations',
        keys: { clientId: 1, phone: 1 },
        name: 'idx_client_phone',
        description: 'Optimiza búsqueda por teléfono'
    },
    {
        collection: 'customers',
        keys: { clientId: 1, phone: 1 },
        name: 'idx_client_phone',
        description: 'Búsqueda rápida de clientes'
    },
    {
        collection: 'customers',
        keys: { clientId: 1, name: 1 },
        name: 'idx_client_name',
        description: 'Búsqueda por nombre'
    },
    {
        collection: 'business_users',
        keys: { clientId: 1 },
        name: 'idx_clientId',
        description: 'Acceso rápido al perfil de negocio'
    },
    {
        collection: 'business_users',
        keys: { email: 1 },
        name: 'idx_email',
        description: 'Login por email'
    }
];

async function createIndexes() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error('❌ Error: MONGODB_URI no está configurado');
        console.error('   Asegúrate de tener el archivo .env.local con MONGODB_URI');
        process.exit(1);
    }

    console.log('🔗 Conectando a MongoDB...');
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('✅ Conectado\n');

        const db = client.db();
        console.log(`📦 Base de datos: ${db.databaseName}\n`);

        console.log('📋 Creando índices...\n');

        for (const index of INDEXES) {
            try {
                const collection = db.collection(index.collection);

                await collection.createIndex(index.keys, {
                    name: index.name,
                    background: true
                });

                console.log(`   ✓ ${index.collection}.${index.name}`);
                console.log(`     ${index.description}\n`);

            } catch (err) {
                if (err.code === 85 || err.code === 86) {
                    // Index already exists with same/different options
                    console.log(`   ⚠ ${index.collection}.${index.name} ya existe`);
                } else {
                    console.error(`   ❌ Error en ${index.collection}.${index.name}:`, err.message);
                }
            }
        }

        // Mostrar resumen
        console.log('\n📊 Resumen de índices:\n');

        const collections = [...new Set(INDEXES.map(i => i.collection))];

        for (const collName of collections) {
            try {
                const coll = db.collection(collName);
                const indexes = await coll.indexes();
                console.log(`   ${collName}: ${indexes.length} índices`);
                indexes.forEach(idx => {
                    if (idx.name !== '_id_') {
                        console.log(`     - ${idx.name}`);
                    }
                });
                console.log();
            } catch (err) {
                // Collection might not exist yet
            }
        }

        console.log('✅ ¡Listo! Los índices están configurados.\n');

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

createIndexes();
