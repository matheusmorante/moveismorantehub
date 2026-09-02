const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Morantenho%4012345@db.hkoxhourxwlddgsfdgws.supabase.co:5432/postgres'
});

async function run() {
    await client.connect();

    const newApkUrl = 'https://expo.dev/artifacts/eas/LfZx-w0CCBqdqFboSKGGslTUTSxAo84WXZPSrqA6rkI.apk';
    const newMinBuild = 24;

    console.log('--- ATUALIZANDO CONFIGURAÇÃO DE BUILD E APK NO SUPABASE ---');

    const res = await client.query(`SELECT data FROM settings WHERE id = 'app';`);
    let currentData = res.rows[0]?.data || {};

    if (typeof currentData === 'string') {
        try { currentData = JSON.parse(currentData); } catch (e) {}
    }

    currentData.mobileSettings = {
        ...(currentData.mobileSettings || {}),
        minimumAndroidBuild: newMinBuild,
        androidUpdateUrl: newApkUrl,
        updatedAt: new Date().toISOString()
    };

    const updateRes = await client.query(
        `UPDATE settings SET data = $1::jsonb WHERE id = 'app' RETURNING *;`,
        [JSON.stringify(currentData)]
    );

    console.log('Configurações atualizadas com sucesso:');
    console.log('minimumAndroidBuild:', currentData.mobileSettings.minimumAndroidBuild);
    console.log('androidUpdateUrl:', currentData.mobileSettings.androidUpdateUrl);

    await client.end();
}

run().catch(console.error);
