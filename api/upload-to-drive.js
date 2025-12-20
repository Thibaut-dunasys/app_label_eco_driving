// api/upload-to-drive.js
// Version ultra-robuste avec maximum de logs

const { google } = require('googleapis');
const { Readable } = require('stream');

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('═══════════════════════════════════════');
  console.log('🚀 DÉBUT UPLOAD DRIVE');
  console.log('═══════════════════════════════════════');

  try {
    // 1. Vérifier le body
    console.log('📦 Body reçu:', {
      hasContent: !!req.body,
      hasCsvContent: !!req.body?.csvContent,
      hasFileName: !!req.body?.fileName,
      csvLength: req.body?.csvContent?.length,
      fileName: req.body?.fileName
    });

    const { csvContent, fileName } = req.body || {};

    if (!csvContent) {
      console.error('❌ csvContent manquant');
      return res.status(400).json({ error: 'csvContent manquant' });
    }

    if (!fileName) {
      console.error('❌ fileName manquant');
      return res.status(400).json({ error: 'fileName manquant' });
    }

    console.log('✅ Données validées');

    // 2. Préparer la clé privée
    console.log('🔑 Préparation de la clé privée...');
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!privateKey) {
      console.error('❌ GOOGLE_PRIVATE_KEY non défini');
      return res.status(500).json({ error: 'Configuration manquante: GOOGLE_PRIVATE_KEY' });
    }

    // Nettoyer la clé
    privateKey = privateKey.replace(/\\n/gm, '\n');

    console.log('🔍 Format de la clé:', {
      startsWith: privateKey.substring(0, 27),
      endsWith: privateKey.substring(privateKey.length - 25),
      length: privateKey.length,
      hasNewlines: privateKey.includes('\n')
    });

    // 3. Créer les credentials
    console.log('🔐 Création des credentials...');
    
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
    };

    console.log('👤 Service Account:', credentials.client_email);

    // 4. Authentification
    console.log('🔓 Authentification...');
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const authClient = await auth.getClient();
    console.log('✅ Client authentifié');

    // 5. Créer l'instance Drive
    const drive = google.drive({ version: 'v3', auth: authClient });
    console.log('✅ Drive API initialisée');

    // 6. Préparer les métadonnées
    const fileMetadata = {
      name: fileName,
      mimeType: 'text/csv',
    };

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (folderId) {
      fileMetadata.parents = [folderId];
      console.log('📁 Dossier parent:', folderId);
    } else {
      console.log('📁 Pas de dossier parent (racine)');
    }

    // 7. Créer un stream depuis le contenu CSV
    console.log('📤 Préparation de l\'upload...');
    console.log('📊 Taille du CSV:', csvContent.length, 'caractères');

    const bufferStream = new Readable();
    bufferStream.push(csvContent);
    bufferStream.push(null);

    // 8. Upload
    console.log('⏳ Upload en cours...');
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'text/csv',
        body: bufferStream,
      },
      fields: 'id, name, webViewLink, createdTime',
    });

    console.log('═══════════════════════════════════════');
    console.log('✅ SUCCÈS !');
    console.log('📄 File ID:', response.data.id);
    console.log('📝 Nom:', response.data.name);
    console.log('🔗 Lien:', response.data.webViewLink);
    console.log('⏰ Créé à:', response.data.createdTime);
    console.log('═══════════════════════════════════════');

    return res.status(200).json({
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      link: response.data.webViewLink,
      createdTime: response.data.createdTime,
    });

  } catch (error) {
    console.error('═══════════════════════════════════════');
    console.error('❌ ERREUR');
    console.error('═══════════════════════════════════════');
    console.error('Type:', error.constructor.name);
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Status:', error.status);
    
    if (error.errors) {
      console.error('Détails:', JSON.stringify(error.errors, null, 2));
    }
    
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════════');

    // Messages d'erreur clairs pour l'utilisateur
    let userMessage = 'Erreur inconnue';
    let hint = '';

    if (error.message?.includes('DECODER')) {
      userMessage = 'Erreur de décodage de la clé privée';
      hint = 'Vérifiez le format de GOOGLE_PRIVATE_KEY';
    } else if (error.message?.includes('invalid_grant')) {
      userMessage = 'Token invalide';
      hint = 'Vérifiez les credentials du Service Account';
    } else if (error.code === 404) {
      userMessage = 'Dossier introuvable';
      hint = 'Vérifiez GOOGLE_DRIVE_FOLDER_ID ou supprimez cette variable';
    } else if (error.code === 403) {
      userMessage = 'Accès refusé';
      hint = 'Le Service Account doit avoir les droits Éditeur sur le dossier';
    } else if (error.message) {
      userMessage = error.message;
    }

    return res.status(500).json({
      error: userMessage,
      hint: hint,
      code: error.code,
      details: error.message,
    });
  }
}
