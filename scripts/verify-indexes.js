/**
 * Script de verificación de índices
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Cargar .env.local
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

async function verifyIndexes() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI no configurado');
        process.exit(1);
    }

    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();

        console.log('═══════════════════════════════════════════════════════════');
        console.log('                 VERIFICACIÓN DE ÍNDICES');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log(`📦 Base de datos: ${db.databaseName}\n`);

        // Verificar colección reservations
        console.log('📋 COLECCIÓN: reservations');
        console.log('─────────────────────────────────────────────────────────────');

        const reservationsIndexes = await db.collection('reservations').indexes();
        console.log(`   Total de índices: ${reservationsIndexes.length}\n`);

        reservationsIndexes.forEach(idx => {
            const keys = Object.keys(idx.key).join(', ');
            console.log(`   ✓ ${idx.name}`);
            console.log(`     Campos: { ${keys} }\n`);
        });

        // Verificar customers
        console.log('\n📋 COLECCIÓN: customers');
        console.log('─────────────────────────────────────────────────────────────');

        try {
            const customersIndexes = await db.collection('customers').indexes();
            console.log(`   Total de índices: ${customersIndexes.length}\n`);
            customersIndexes.forEach(idx => {
                const keys = Object.keys(idx.key).join(', ');
                console.log(`   ✓ ${idx.name}`);
                console.log(`     Campos: { ${keys} }\n`);
            });
        } catch (e) {
            console.log('   (colección aún no existe)\n');
        }

        // Verificar business_users
        console.log('\n📋 COLECCIÓN: business_users');
        console.log('─────────────────────────────────────────────────────────────');

        try {
            const usersIndexes = await db.collection('business_users').indexes();
            console.log(`   Total de índices: ${usersIndexes.length}\n`);
            usersIndexes.forEach(idx => {
                const keys = Object.keys(idx.key).join(', ');
                console.log(`   ✓ ${idx.name}`);
                console.log(`     Campos: { ${keys} }\n`);
            });
        } catch (e) {
            console.log('   (colección aún no existe)\n');
        }

        // Contar documentos
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('                 ESTADÍSTICAS DE DATOS');
        console.log('═══════════════════════════════════════════════════════════\n');

        const reservationsCount = await db.collection('reservations').countDocuments();
        console.log(`   📅 Reservaciones: ${reservationsCount.toLocaleString()} documentos`);

        try {
            const customersCount = await db.collection('customers').countDocuments();
            console.log(`   👥 Clientes: ${customersCount.toLocaleString()} documentos`);
        } catch (e) { }

        try {
            const usersCount = await db.collection('business_users').countDocuments();
            console.log(`   🏢 Negocios: ${usersCount.toLocaleString()} documentos`);
        } catch (e) { }

        console.log('\n═══════════════════════════════════════════════════════════');
        console.log('                     ✅ VERIFICACIÓN OK');
        console.log('═══════════════════════════════════════════════════════════\n');

    } finally {
        await client.close();
    }
}

verifyIndexes().catch(console.error);
