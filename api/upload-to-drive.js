// api/upload-to-drive.js
import { google } from 'googleapis';
import multiparty from 'multiparty';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Upload to Drive - Start');

    // Vérifier les variables d'environnement
    const requiredVars = ['GOOGLE_PROJECT_ID', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_CLIENT_EMAIL'];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        console.error(`❌ Variable manquante: ${varName}`);
        return res.status(500).json({ 
          error: 'Configuration error',
          message: `Missing environment variable: ${varName}`
        });
      }
    }

    // Parser le fichier uploadé
    const form = new multiparty.Form();
    
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('❌ Parse error:', err);
          reject(err);
        }
        resolve({ fields, files });
      });
    });

    console.log('📁 Files received:', Object.keys(files));

    if (!files.file || !files.file[0]) {
      return res.status(400).json({ 
        error: 'No file provided',
        message: 'Please upload a file'
      });
    }

    const file = files.file[0];
    console.log('📄 File:', file.originalFilename, file.size, 'bytes');

    // Créer les credentials
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    // Remplacer les \n littéraux par de vrais retours à la ligne
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key: privateKey,
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
    };

    console.log('🔑 Credentials created');

    // Authentifier
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const authClient = await auth.getClient();
    console.log('✅ Authentication successful');

    const drive = google.drive({ version: 'v3', auth: authClient });

    // Préparer les métadonnées du fichier
    const fileMetadata = {
      name: file.originalFilename || 'labelisation.csv',
    };

    // Ajouter le dossier parent si spécifié
    if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
      fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
      console.log('📁 Dossier cible:', process.env.GOOGLE_DRIVE_FOLDER_ID);
    } else {
      console.log('📁 Upload à la racine de Mon Drive');
    }

    const media = {
      mimeType: 'text/csv',
      body: fs.createReadStream(file.path),
    };

    console.log('⬆️ Uploading to Drive...');

    // Upload le fichier
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    // Nettoyer le fichier temporaire
    try {
      fs.unlinkSync(file.path);
      console.log('🗑️ Temp file cleaned');
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup error:', cleanupError.message);
    }

    console.log('✅ Upload successful:', response.data.name);

    return res.status(200).json({
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      webViewLink: response.data.webViewLink,
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);

    // Nettoyer les fichiers temporaires en cas d'erreur
    try {
      const form = new multiparty.Form();
      form.parse(req, (err, fields, files) => {
        if (!err && files.file && files.file[0]) {
          fs.unlinkSync(files.file[0].path);
        }
      });
    } catch (cleanupError) {
      // Ignorer les erreurs de nettoyage
    }

    return res.status(500).json({ 
      error: 'Upload failed',
      message: error.message,
      details: error.response?.data?.error?.message || error.toString()
    });
  }
}
