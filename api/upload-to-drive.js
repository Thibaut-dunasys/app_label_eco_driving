// api/upload-to-drive.js
// Fonction serverless Vercel pour uploader vers Google Drive

import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';

// Désactiver le body parser par défaut de Next.js/Vercel
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Permettre seulement POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parser le fichier uploadé
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50 MB max
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = files.file[0];
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Créer les credentials depuis les variables d'environnement
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`,
    };

    // Authentifier avec Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // Uploader le fichier
    const fileMetadata = {
      name: file.originalFilename || 'labelisation.csv',
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || 'root'], // Optionnel: ID du dossier cible
    };

    const media = {
      mimeType: 'text/csv',
      body: fs.createReadStream(file.filepath),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    // Nettoyer le fichier temporaire
    fs.unlinkSync(file.filepath);

    console.log('✅ Fichier uploadé:', response.data);

    return res.status(200).json({
      success: true,
      fileId: response.data.id,
      fileName: response.data.name,
      webViewLink: response.data.webViewLink,
    });

  } catch (error) {
    console.error('❌ Erreur upload Drive:', error);
    return res.status(500).json({ 
      error: 'Upload failed',
      message: error.message,
      details: error.response?.data || error.toString()
    });
  }
}
