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

async function check() {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db();

    console.log('Base de datos:', db.databaseName);
    console.log('');

    // Reservations
    const resIndexes = await db.collection('reservations').indexes();
    console.log('INDICES EN RESERVATIONS (' + resIndexes.length + '):');
    resIndexes.forEach(i => {
        console.log('  * ' + i.name + ' -> ' + JSON.stringify(i.key));
    });

    const resCount = await db.collection('reservations').countDocuments();
    console.log('  Total documentos: ' + resCount);
    console.log('');

    // Business users
    try {
        const userIndexes = await db.collection('business_users').indexes();
        console.log('INDICES EN BUSINESS_USERS (' + userIndexes.length + '):');
        userIndexes.forEach(i => {
            console.log('  * ' + i.name + ' -> ' + JSON.stringify(i.key));
        });
    } catch (e) { }

    await client.close();
    console.log('');
    console.log('VERIFICACION COMPLETA');
}

check().catch(e => console.error('Error:', e.message));
