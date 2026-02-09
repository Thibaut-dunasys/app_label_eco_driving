// api/mqtt-proxy.js — Vercel Serverless Function
// Proxy HTTP → MQTT : reçoit du JSON en POST et publie sur le broker Mosquitto

const mqtt = require('mqtt');

module.exports = async function handler(req, res) {
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
    const {
      topic = 'driving/session',
      message,
      // Paramètres broker (peuvent être overridés depuis le front ou via env vars)
      host = process.env.MQTT_HOST || '94.23.12.188',
      port = process.env.MQTT_PORT || 1886,
      username = process.env.MQTT_USERNAME || 'thibaut_test',
      password = process.env.MQTT_PASSWORD || '90fc5952f3',
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Le champ "message" est requis' });
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    // Connexion MQTT (TCP classique — côté serveur, pas de restriction navigateur)
    const client = mqtt.connect(`mqtt://${host}:${port}`, {
      username,
      password,
      connectTimeout: 10000,
      reconnectPeriod: 0, // Pas de reconnexion auto (one-shot)
    });

    const result = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end(true);
        reject(new Error('Timeout connexion MQTT (10s)'));
      }, 10000);

      client.on('connect', () => {
        client.publish(topic, payload, { qos: 1 }, (err) => {
          clearTimeout(timeout);
          client.end();
          if (err) {
            reject(new Error(`Erreur publication: ${err.message}`));
          } else {
            resolve({
              success: true,
              topic,
              messageSize: payload.length,
              timestamp: new Date().toISOString(),
            });
          }
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        client.end(true);
        reject(new Error(`Erreur MQTT: ${err.message}`));
      });
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('MQTT Proxy Error:', error);
    return res.status(500).json({
      error: error.message,
      success: false,
    });
  }
};
