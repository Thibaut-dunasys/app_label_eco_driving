// api/test-drive.js
// Placez ce fichier dans /api/ pour tester votre configuration

const { google } = require('googleapis');

export default async function handler(req, res) {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    checks: {}
  };

  try {
    // 1. Vérifier les variables d'environnement
    diagnostics.checks.env_vars = {
      GOOGLE_PROJECT_ID: !!process.env.GOOGLE_PROJECT_ID,
      GOOGLE_PRIVATE_KEY_ID: !!process.env.GOOGLE_PRIVATE_KEY_ID,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_DRIVE_FOLDER_ID: !!process.env.GOOGLE_DRIVE_FOLDER_ID
    };

    // 2. Vérifier le format de la clé privée
    if (process.env.GOOGLE_PRIVATE_KEY) {
      let privateKey = process.env.GOOGLE_PRIVATE_KEY;
      
      // Remplacer les \n littéraux
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      diagnostics.checks.private_key_format = {
        starts_with_begin: privateKey.startsWith('-----BEGIN PRIVATE KEY-----'),
        ends_with_end: privateKey.includes('-----END PRIVATE KEY-----'),
        has_newlines: privateKey.includes('\n'),
        length: privateKey.length,
        first_30_chars: privateKey.substring(0, 30),
        last_30_chars: privateKey.substring(privateKey.length - 30)
      };
    }

    // 3. Tester l'authentification Google
    try {
      let privateKey = process.env.GOOGLE_PRIVATE_KEY;
      if (privateKey && privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

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

      // Obtenir un token d'accès
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      
      diagnostics.checks.auth = {
        success: true,
        has_token: !!tokenResponse.token
      };

      // 4. Tester l'API Drive
      const drive = google.drive({ version: 'v3', auth });
      
      // Tester l'accès à Drive (lister les fichiers)
      try {
        const driveResponse = await drive.files.list({
          pageSize: 1,
          fields: 'files(id, name)'
        });
        
        diagnostics.checks.drive_access = {
          success: true,
          can_list_files: true
        };

        // 5. Vérifier l'accès au dossier spécifique
        if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
          try {
            const folderResponse = await drive.files.get({
              fileId: process.env.GOOGLE_DRIVE_FOLDER_ID,
              fields: 'id, name, mimeType'
            });
            
            diagnostics.checks.folder_access = {
              success: true,
              folder_id: folderResponse.data.id,
              folder_name: folderResponse.data.name,
              is_folder: folderResponse.data.mimeType === 'application/vnd.google-apps.folder'
            };
          } catch (folderError) {
            diagnostics.checks.folder_access = {
              success: false,
              error: folderError.message,
              code: folderError.code
            };
          }
        }

      } catch (driveError) {
        diagnostics.checks.drive_access = {
          success: false,
          error: driveError.message,
          code: driveError.code
        };
      }

    } catch (authError) {
      diagnostics.checks.auth = {
        success: false,
        error: authError.message,
        stack: authError.stack
      };
    }

    // Résumé
    const allChecks = Object.values(diagnostics.checks);
    const successfulChecks = allChecks.filter(check => 
      typeof check === 'object' && check.success === true
    ).length;

    diagnostics.summary = {
      total_checks: allChecks.length,
      successful: successfulChecks,
      status: successfulChecks === allChecks.length ? 'ALL_OK' : 'ISSUES_FOUND'
    };

    return res.status(200).json({
      status: 'completed',
      diagnostics
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack,
      diagnostics
    });
  }
}
