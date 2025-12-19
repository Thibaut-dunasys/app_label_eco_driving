// api/upload-to-drive.js
// Ce fichier doit être placé dans le dossier /api/ de votre projet Vercel

const { google } = require('googleapis');

export default async function handler(req, res) {
  // Autoriser uniquement les requêtes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { csvContent, fileName } = req.body;

    if (!csvContent || !fileName) {
      return res.status(400).json({ error: 'Missing csvContent or fileName' });
    }

    // CORRECTION: Bien gérer les retours à la ligne dans la clé privée
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    
    // Si la clé contient des \n littéraux (échappés), les remplacer par de vrais retours à la ligne
    if (privateKey && privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Configurer l'authentification avec Service Account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // ID du dossier Drive où sauvegarder (optionnel)
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

    // Créer le fichier sur Drive
    const fileMetadata = {
      name: fileName,
      mimeType: 'text/csv',
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: 'text/csv',
      body: csvContent,
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });

    console.log('Fichier uploadé:', file.data);

    return res.status(200).json({
      success: true,
      fileId: file.data.id,
      fileName: file.data.name,
      link: file.data.webViewLink,
    });

  } catch (error) {
    console.error('Erreur upload Drive:', error);
    return res.status(500).json({ 
      error: 'Upload failed',
      details: error.message 
    });
  }
}
