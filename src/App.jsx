//lalala
import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Download, ArrowLeft, Clock, Database, Trash2, Smartphone, CheckCircle, AlertTriangle, Bug, Car, Edit2, Check, Mic, Github, ChevronDown, Radio } from 'lucide-react';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [sessions, setSessions] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [sessionStartDate, setSessionStartDate] = useState(null);
  const [activeLabels, setActiveLabels] = useState({});
  const [recordings, setRecordings] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showGithubConfig, setShowGithubConfig] = useState(false);
  const [showMqttConfig, setShowMqttConfig] = useState(false);
  const [mqttProxyUrl, setMqttProxyUrl] = useState(() => localStorage.getItem('mqttProxyUrl') || '/api/mqtt-proxy');
  const [mqttTopic, setMqttTopic] = useState(() => {
    const stored = localStorage.getItem('mqttTopic') || '';
    // Migration: corriger les anciens formats de topic
    if (stored.startsWith('driving_session/') || stored === 'driving/session') {
      const uin = stored.replace('driving_session/', '').replace('driving/session', '');
      const fixed = uin ? `driving/${uin}/session` : 'driving/session';
      localStorage.setItem('mqttTopic', fixed);
      return fixed;
    }
    return stored || 'driving/session';
  });
  const [mqttHost, setMqttHost] = useState(() => localStorage.getItem('mqttHost') || '94.23.12.188');
  const [mqttPort, setMqttPort] = useState(() => localStorage.getItem('mqttPort') || '1886');
  const [mqttUsername, setMqttUsername] = useState(() => localStorage.getItem('mqttUsername') || 'thibaut_test');
  const [mqttPassword, setMqttPassword] = useState(() => localStorage.getItem('mqttPassword') || '90fc5952f3');
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [currentSessionData, setCurrentSessionData] = useState(null);
  const [imuData, setImuData] = useState({ ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 });
  const [imuPermission, setImuPermission] = useState(false);
  const [imuHistory, setImuHistory] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('githubToken') || '');
  const [githubRepo, setGithubRepo] = useState(() => localStorage.getItem('githubRepo') || '');
  const [githubBranch, setGithubBranch] = useState(() => localStorage.getItem('githubBranch') || 'main');
  const [needsPermission, setNeedsPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [sensorWarning, setSensorWarning] = useState('');
  
  const [carName, setCarName] = useState('');
  const [isEditingCarName, setIsEditingCarName] = useState(false);
  const [tempCarName, setTempCarName] = useState('');
  const [boitiersList, setBoitiersList] = useState([]);
  const [showBoitierDropdown, setShowBoitierDropdown] = useState(false);
  const [vehiculesList, setVehiculesList] = useState([]);
  const [showVehiculeDropdown, setShowVehiculeDropdown] = useState(false);
  const [selectedVehicule, setSelectedVehicule] = useState(() => localStorage.getItem('selectedVehicule') || '');
  const [tempVehicule, setTempVehicule] = useState('');
  const [driverName, setDriverName] = useState(() => localStorage.getItem('driverName') || '');
  const [tempDriverName, setTempDriverName] = useState('');
  const [isEditingDriver, setIsEditingDriver] = useState(false);
  
  const [mode, setMode] = useState('instantane');
  const [clickedLabel, setClickedLabel] = useState(null);
  const [pendingLabels, setPendingLabels] = useState({});
  
  const [showDebug, setShowDebug] = useState(false);
  const [showSensors, setShowSensors] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  
  // Fréquence d'échantillonnage configurable
  const [samplingFrequency, setSamplingFrequency] = useState(() => {
    const saved = localStorage.getItem('samplingFrequency');
    return saved ? parseInt(saved) : 2; // 2Hz par défaut (plus fiable)
  });

  // NOUVEAU : États pour la reconnaissance vocale
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  const recognitionRef = useRef(null);

  // Wake Lock pour empêcher la mise en veille
  const [wakeLock, setWakeLock] = useState(null);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);

  // Pull-to-Refresh
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullThreshold = 80; // Distance minimale pour déclencher le refresh

  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxiMLcvhyhqnNvkFmrtKtwsdcdkbuhdH4hRwmIF09GSYAzPoWal672F2UYwSF4xGhYb/exec';

  const imuDataRef = useRef(imuData);
  const modeRef = useRef(mode);
  const isRunningRef = useRef(isRunning);
  const toggleLabelRef = useRef(null);
  
  useEffect(() => {
    imuDataRef.current = imuData;
  }, [imuData]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);
  
  // Sauvegarder la fréquence sélectionnée
  useEffect(() => {
    localStorage.setItem('samplingFrequency', samplingFrequency.toString());
    addDebugLog(`⚙️ Fréquence changée: ${samplingFrequency}Hz (${1000/samplingFrequency}ms)`, 'info');
  }, [samplingFrequency]);

  // Splash screen loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // 2 secondes
    
    return () => clearTimeout(timer);
  }, []);

  // Charger la configuration GitHub depuis le fichier OU les variables d'environnement
  useEffect(() => {
    const loadGithubConfig = async () => {
      // Priorité 1 : Variables d'environnement Vercel
      const envRepo = process.env.REACT_APP_GITHUB_REPO;
      const envToken = process.env.REACT_APP_GITHUB_TOKEN;
      const envBranch = process.env.REACT_APP_GITHUB_BRANCH;
      
      if (envRepo && envToken) {
        setGithubRepo(envRepo);
        setGithubToken(envToken);
        setGithubBranch(envBranch || 'main');
        localStorage.setItem('githubRepo', envRepo);
        localStorage.setItem('githubToken', envToken);
        localStorage.setItem('githubBranch', envBranch || 'main');
        addDebugLog('✅ Configuration GitHub chargée depuis variables d\'environnement', 'success');
        addDebugLog(`📦 Repository: ${envRepo}`, 'info');
        return;
      }
      
      // Priorité 2 : Fichier github-config.json
      try {
        const response = await fetch('/github-config.json');
        if (response.ok) {
          const config = await response.json();
          if (config.githubRepo && config.githubRepo !== 'username/repository') {
            setGithubRepo(config.githubRepo);
            localStorage.setItem('githubRepo', config.githubRepo);
          }
          if (config.githubToken && config.githubToken !== 'ghp_your_token_here') {
            setGithubToken(config.githubToken);
            localStorage.setItem('githubToken', config.githubToken);
          }
          if (config.githubBranch) {
            setGithubBranch(config.githubBranch);
            localStorage.setItem('githubBranch', config.githubBranch);
          }
          addDebugLog('✅ Configuration GitHub chargée depuis fichier', 'success');
          addDebugLog(`📦 Repository: ${config.githubRepo}`, 'info');
          return;
        }
      } catch (error) {
        // Pas de fichier, on continue
      }
      
      // Priorité 3 : localStorage (configuration manuelle via interface)
      const storedRepo = localStorage.getItem('githubRepo');
      const storedToken = localStorage.getItem('githubToken');
      
      if (storedRepo && storedToken) {
        addDebugLog('ℹ️ Configuration GitHub chargée depuis localStorage', 'info');
        addDebugLog(`📦 Repository: ${storedRepo}`, 'info');
      } else {
        addDebugLog('⚠️ Aucune configuration GitHub trouvée', 'error');
        addDebugLog('💡 Configurez via variables Vercel ou interface', 'info');
      }
    };
    
    loadGithubConfig();
  }, []);

  // Charger la liste des boîtiers depuis GitHub
  useEffect(() => {
    const loadBoitiers = async () => {
      try {
        // Priorité 1 : Fichier local (public/boitiers.json)
        try {
          addDebugLog('🔍 Recherche boitiers.json local...', 'info');
          const localResponse = await fetch('/boitiers.json');
          addDebugLog(`📥 Réponse: ${localResponse.status} ${localResponse.statusText}`, 'info');
          
          if (localResponse.ok) {
            const contentType = localResponse.headers.get('content-type') || '';
            const text = await localResponse.text();
            addDebugLog(`📄 Content-Type: ${contentType}, taille: ${text.length}`, 'info');
            
            // Vérifier que c'est bien du JSON et pas du HTML (page 404 React)
            if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
              const data = JSON.parse(text);
              if (Array.isArray(data) && data.length > 0) {
                setBoitiersList(data);
                addDebugLog(`✅ ${data.length} boîtiers chargés: ${data.join(', ')}`, 'success');
                return;
              } else {
                addDebugLog('⚠️ Fichier JSON vide ou pas un tableau', 'warning');
              }
            } else {
              addDebugLog('⚠️ Le fichier retourné n\'est pas du JSON (probablement du HTML)', 'warning');
            }
          }
        } catch (e) {
          addDebugLog(`⚠️ Erreur fetch local: ${e.message}`, 'warning');
        }

        // Priorité 2 : Fichier sur GitHub
        if (githubRepo && githubToken) {
          addDebugLog('🔍 Recherche boitiers.json sur GitHub...', 'info');
          const url = `https://api.github.com/repos/${githubRepo}/contents/boitiers.json`;
          const response = await fetch(url, {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          if (response.ok) {
            const fileData = await response.json();
            const content = atob(fileData.content);
            const data = JSON.parse(content);
            if (Array.isArray(data) && data.length > 0) {
              setBoitiersList(data);
              addDebugLog(`✅ ${data.length} boîtiers chargés (GitHub): ${data.join(', ')}`, 'success');
              return;
            }
          } else {
            addDebugLog(`⚠️ GitHub: ${response.status} ${response.statusText}`, 'warning');
          }
        }

        addDebugLog('⚠️ Aucune liste de boîtiers trouvée', 'warning');
      } catch (error) {
        addDebugLog(`❌ Erreur chargement boîtiers: ${error.message}`, 'error');
      }
    };

    // Petit délai pour laisser le temps au config GitHub de se charger
    const timer = setTimeout(loadBoitiers, 1000);
    return () => clearTimeout(timer);
  }, [githubRepo, githubToken]);

  // Charger la liste des véhicules
  useEffect(() => {
    const loadVehicules = async () => {
      try {
        // Priorité 1 : Fichier local (public/vehicules.json)
        try {
          const localResponse = await fetch('/vehicules.json');
          if (localResponse.ok) {
            const text = await localResponse.text();
            if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
              const data = JSON.parse(text);
              if (Array.isArray(data) && data.length > 0) {
                setVehiculesList(data);
                addDebugLog(`✅ ${data.length} véhicules chargés: ${data.join(', ')}`, 'success');
                return;
              }
            }
          }
        } catch (e) {
          addDebugLog(`⚠️ Erreur fetch vehicules local: ${e.message}`, 'warning');
        }

        // Priorité 2 : Fichier sur GitHub
        if (githubRepo && githubToken) {
          const url = `https://api.github.com/repos/${githubRepo}/contents/vehicules.json`;
          const response = await fetch(url, {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          if (response.ok) {
            const fileData = await response.json();
            const content = atob(fileData.content);
            const data = JSON.parse(content);
            if (Array.isArray(data) && data.length > 0) {
              setVehiculesList(data);
              addDebugLog(`✅ ${data.length} véhicules chargés (GitHub)`, 'success');
              return;
            }
          }
        }

        addDebugLog('⚠️ Aucune liste de véhicules trouvée', 'warning');
      } catch (error) {
        addDebugLog(`❌ Erreur chargement véhicules: ${error.message}`, 'error');
      }
    };

    const timer = setTimeout(loadVehicules, 1200);
    return () => clearTimeout(timer);
  }, [githubRepo, githubToken]);

  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDebugLogs(prev => [...prev.slice(-20), { time: timestamp, message, type }]);
  };

  // Fonction pour jouer un beep de confirmation
  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Fréquence en Hz (son agréable)
      oscillator.type = 'sine'; // Type de son (sine = doux)

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // Volume à 30%
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2); // Fade out

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2); // Durée 200ms
    } catch (error) {
      console.error('Erreur beep:', error);
    }
  };

  // Fonctions Wake Lock pour empêcher la mise en veille
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        addDebugLog('🔒 Écran verrouillé (pas de mise en veille)', 'success');
        
        // Gérer la libération automatique (ex: changement d'onglet)
        lock.addEventListener('release', () => {
          addDebugLog('⚠️ Wake Lock libéré', 'warning');
        });
      }
    } catch (err) {
      addDebugLog(`❌ Erreur Wake Lock: ${err.message}`, 'error');
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLock) {
      try {
        await wakeLock.release();
        setWakeLock(null);
        addDebugLog('🔓 Wake Lock libéré', 'info');
      } catch (err) {
        addDebugLog(`⚠️ Erreur libération Wake Lock: ${err.message}`, 'warning');
      }
    }
  };

  // Fonctions Pull-to-Refresh
  const handleTouchStart = (e) => {
    // Ne déclencher que si on est en haut de la page et pas pendant une session
    if (window.scrollY === 0 && !isRefreshing && !isRunning) {
      setPullStartY(e.touches[0].clientY);
      setIsPulling(false);
    }
  };

  const handleTouchMove = (e) => {
    if (pullStartY === 0 || isRefreshing || isRunning) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - pullStartY;

    // Ne tirer que vers le bas et si on est en haut
    if (distance > 0 && window.scrollY === 0) {
      setIsPulling(true);
      setPullDistance(Math.min(distance, 150)); // Max 150px
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling || isRefreshing || isRunning) {
      setPullStartY(0);
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    // Si on a tiré assez loin, déclencher le refresh
    if (pullDistance >= pullThreshold) {
      performRefresh();
    } else {
      // Sinon, réinitialiser
      setPullDistance(0);
      setIsPulling(false);
      setPullStartY(0);
    }
  };

  const performRefresh = async () => {
    setIsRefreshing(true);
    
    // Feedback haptique
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    try {
      if (currentPage === 'home') {
        // Sur la page d'accueil : recharger les sessions
        addDebugLog('🔄 Actualisation de l\'historique...', 'info');
        
        const savedSessions = localStorage.getItem('sessions');
        if (savedSessions) {
          const loadedSessions = JSON.parse(savedSessions);
          setSessions(loadedSessions);
          addDebugLog(`✅ ${loadedSessions.length} session(s) chargée(s)`, 'success');
        } else {
          addDebugLog('📋 Aucune session en mémoire', 'info');
        }
      } else {
        // Sur les autres pages : message générique
        addDebugLog('🔄 Actualisation...', 'info');
      }

      // Simulation d'un délai pour l'animation
      await new Promise(resolve => setTimeout(resolve, 800));

    } catch (error) {
      addDebugLog('❌ Erreur lors de l\'actualisation', 'error');
      console.error(error);
    } finally {
      // Réinitialiser les états
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        setIsPulling(false);
        setPullStartY(0);
      }, 300);
    }
  };

  // Vérifier le support du Wake Lock au chargement
  useEffect(() => {
    if ('wakeLock' in navigator) {
      setWakeLockSupported(true);
      addDebugLog('✅ Wake Lock API disponible', 'success');
    } else {
      setWakeLockSupported(false);
      addDebugLog('❌ Wake Lock API non disponible', 'warning');
    }
  }, []);

  // Réactiver le Wake Lock si l'utilisateur revient sur l'app
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isRunning && wakeLockSupported && !wakeLock) {
        addDebugLog('👀 Retour sur l\'app - Réactivation Wake Lock', 'info');
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, wakeLockSupported, wakeLock]);

  const labels = [
    { 
      id: 'braking', 
      name: 'Freinage', 
      color: 'bg-zinc-600', 
      keywords: ['freinage', 'frein', 'freinage brusque', 'freinage agressif', 'freinage fort']
    },
    { 
      id: 'acceleration', 
      name: 'Accélération', 
      color: 'bg-neutral-600', 
      keywords: ['accélération', 'accélération brusque', 'accélération agressive']
    },
    { 
      id: 'left-turn', 
      name: 'Virage serré à gauche', 
      color: 'bg-gray-500', 
      keywords: ['virage serré à gauche', 'virage serré gauche', 'virage gauche', 'virage brusque gauche', 'virage brusque à gauche', 'virage agressif à gauche', 'virage agressif gauche']
    },
    { 
      id: 'right-turn', 
      name: 'Virage serré à droite', 
      color: 'bg-slate-600', 
      keywords: ['virage serré à droite', 'virage serré droite', 'virage droite', 'virage brusque droite', 'virage brusque à droite', 'virage agressif à droite', 'virage agressif droite']
    },
    { 
      id: 'left-lane', 
      name: 'Changement de voie à gauche', 
      color: 'bg-zinc-500', 
      keywords: ['changement de voie à gauche', 'changement de voie gauche', 'changement de voix gauche', 'changement de voix à gauche', 'changement gauche', 'changement à gauche']
    },
    { 
      id: 'right-lane', 
      name: 'Changement de voie à droite', 
      color: 'bg-gray-600', 
      keywords: ['changement de voie à droite', 'changement de voie droite', 'changement de voix droite', 'changement de voix à droite', 'changement droite', 'changement à droite']
    }
  ];

  // NOUVEAU : Initialiser la reconnaissance vocale
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setVoiceSupported(true);
      addDebugLog('🎤 Reconnaissance vocale disponible', 'success');
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript.toLowerCase().trim();
        
        setLastTranscript(transcript);
        addDebugLog(`🎤 Reconnu: "${transcript}"`, 'info');
        
        // Vérifier qu'on est en mode vocal et que la session est en cours
        if (modeRef.current !== 'vocal' || !isRunningRef.current) {
          addDebugLog(`⚠️ Ignoré (mode: ${modeRef.current}, running: ${isRunningRef.current})`, 'warning');
          return;
        }
        
        // Chercher le label correspondant
        const matchedLabel = labels.find(label => 
          label.keywords.some(keyword => transcript.includes(keyword))
        );
        
        if (matchedLabel) {
          addDebugLog(`✅ Commande trouvée: ${matchedLabel.name}`, 'success');
          // Utiliser la ref pour appeler toggleLabel
          if (toggleLabelRef.current) {
            toggleLabelRef.current(matchedLabel.id);
            playBeep(); // Jouer un son de confirmation
            addDebugLog(`🔥 toggleLabel appelé pour ${matchedLabel.name}`, 'success');
          } else {
            addDebugLog(`❌ toggleLabelRef.current est null!`, 'error');
          }
        } else {
          addDebugLog(`❌ Commande non reconnue: "${transcript}"`, 'warning');
        }
      };

      recognition.onerror = (event) => {
        addDebugLog(`⚠️ Erreur vocale: ${event.error}`, 'error');
        if (event.error === 'no-speech') {
          // Pas de parole détectée, on relance automatiquement
          if (modeRef.current === 'vocal' && isRunningRef.current) {
            setTimeout(() => {
              try {
                recognition.start();
              } catch (e) {
                // Ignore si déjà démarré
              }
            }, 100);
          }
        }
      };

      recognition.onend = () => {
        // Relancer automatiquement si en mode vocal et session en cours
        if (modeRef.current === 'vocal' && isRunningRef.current) {
          try {
            recognition.start();
            addDebugLog('🔄 Reconnaissance vocale relancée', 'info');
          } catch (e) {
            addDebugLog('⚠️ Impossible de relancer: ' + e.message, 'warning');
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      setVoiceSupported(false);
      addDebugLog('❌ Reconnaissance vocale non disponible', 'error');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  // Gérer l'activation/désactivation automatique de la reconnaissance vocale selon le mode
  useEffect(() => {
    if (!voiceSupported || !recognitionRef.current) return;

    if (mode === 'vocal' && isRunning) {
      // Activer la reconnaissance vocale
      try {
        recognitionRef.current.start();
        addDebugLog('🎤 Mode vocal activé - Écoute en cours', 'success');
      } catch (e) {
        if (e.name !== 'InvalidStateError') {
          addDebugLog('⚠️ Erreur démarrage vocal: ' + e.message, 'error');
        }
      }
    } else {
      // Désactiver la reconnaissance vocale
      try {
        recognitionRef.current.stop();
        if (mode === 'vocal' && !isRunning) {
          addDebugLog('🔇 Mode vocal arrêté (fin de session)', 'info');
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }, [mode, isRunning, voiceSupported]);


  useEffect(() => {
    loadSessions();
    const savedCarName = localStorage.getItem('carName');
    if (savedCarName) {
      setCarName(savedCarName);
    }
  }, []);

  const saveCarName = (name) => {
    setCarName(name);
    localStorage.setItem('carName', name);
    // Mettre à jour le topic MQTT automatiquement
    if (name && name !== 'Sans nom') {
      const newTopic = `driving/${name}/session`;
      setMqttTopic(newTopic);
      localStorage.setItem('mqttTopic', newTopic);
      addDebugLog(`📡 Topic MQTT → ${newTopic}`, 'info');
    }
  };

  const selectBoitier = (uin) => {
    saveCarName(uin);
    setShowBoitierDropdown(false);
    setIsEditingCarName(false);
  };

  const selectVehicule = (name) => {
    setSelectedVehicule(name);
    localStorage.setItem('selectedVehicule', name);
    setShowVehiculeDropdown(false);
    addDebugLog(`🚗 Véhicule sélectionné: ${name}`, 'info');
  };

  const loadSessions = () => {
    try {
      const stored = localStorage.getItem('driving-sessions');
      if (stored) {
        setSessions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
      setSessions([]);
    }
  };

  const saveSessions = (newSessions) => {
    try {
      localStorage.setItem('driving-sessions', JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const requestIMUPermission = async () => {
    addDebugLog('Demande de permission IMU...', 'info');
    
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceMotionEvent.requestPermission();
        if (permissionState === 'granted') {
          addDebugLog('✅ Permission accordée !', 'success');
          setImuPermission(true);
          setNeedsPermission(false);
          setPermissionDenied(false);
          return true;
        } else {
          addDebugLog('❌ Permission refusée', 'error');
          setPermissionDenied(true);
          setNeedsPermission(false);
          return false;
        }
      } catch (err) {
        addDebugLog('❌ Erreur permission: ' + err.message, 'error');
        setPermissionDenied(true);
        return false;
      }
    } else {
      addDebugLog('📱 Activation directe (non-iOS)', 'success');
      setImuPermission(true);
      setNeedsPermission(false);
      return true;
    }
  };

  useEffect(() => {
    if (currentPage !== 'labeling') return;

    addDebugLog('Page labeling chargée', 'info');
    
    // Détecter si on est sur mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const hasMotionSensors = 'DeviceMotionEvent' in window;
    
    if (!isMobile) {
      addDebugLog('⚠️ DESKTOP DÉTECTÉ - Les capteurs IMU ne fonctionnent PAS sur ordinateur ! Utilisez un téléphone !', 'error');
      setSensorWarning('⚠️ Capteurs IMU indisponibles sur desktop. Testez sur mobile !');
    } else {
      addDebugLog('📱 Mobile détecté - Capteurs IMU disponibles', 'success');
    }

    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      setNeedsPermission(true);
      addDebugLog('iOS détecté - Permission requise', 'warning');
      return;
    }

    const handleMotion = (event) => {
      const accel = event.acceleration || event.accelerationIncludingGravity;
      const rotation = event.rotationRate;
      
      if (accel && rotation) {
        const newImuData = {
          ax: accel.x !== null && accel.x !== undefined ? Number(accel.x.toFixed(2)) : 0,
          ay: accel.y !== null && accel.y !== undefined ? Number(accel.y.toFixed(2)) : 0,
          az: accel.z !== null && accel.z !== undefined ? Number(accel.z.toFixed(2)) : 0,
          gx: rotation.alpha !== null && rotation.alpha !== undefined ? Number(rotation.alpha.toFixed(2)) : 0,
          gy: rotation.beta !== null && rotation.beta !== undefined ? Number(rotation.beta.toFixed(2)) : 0,
          gz: rotation.gamma !== null && rotation.gamma !== undefined ? Number(rotation.gamma.toFixed(2)) : 0
        };
        setImuData(newImuData);
      } else {
        addDebugLog('⚠️ Capteurs non disponibles', 'error');
        setSensorWarning('Capteurs IMU non disponibles');
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    setImuPermission(true);
    addDebugLog('✅ Capteurs IMU activés', 'success');

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [currentPage]);

  useEffect(() => {
    if (!imuPermission || currentPage !== 'labeling') return;

    const handleMotion = (event) => {
      const accel = event.acceleration || event.accelerationIncludingGravity;
      const rotation = event.rotationRate;
      
      if (accel && rotation) {
        const newImuData = {
          ax: accel.x !== null && accel.x !== undefined ? Number(accel.x.toFixed(2)) : 0,
          ay: accel.y !== null && accel.y !== undefined ? Number(accel.y.toFixed(2)) : 0,
          az: accel.z !== null && accel.z !== undefined ? Number(accel.z.toFixed(2)) : 0,
          gx: rotation.alpha !== null && rotation.alpha !== undefined ? Number(rotation.alpha.toFixed(2)) : 0,
          gy: rotation.beta !== null && rotation.beta !== undefined ? Number(rotation.beta.toFixed(2)) : 0,
          gz: rotation.gamma !== null && rotation.gamma !== undefined ? Number(rotation.gamma.toFixed(2)) : 0
        };
        setImuData(newImuData);
      }
    };

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [imuPermission, currentPage]);

  useEffect(() => {
    if (!isRunning) return;

    // Sur certains téléphones, devicemotion est à 30Hz au lieu de 60Hz
    // Donc on divise le ratio par 2
    const deviceMotionHz = 30; // Fréquence réelle sur mobile
    const samplingRatio = Math.round(deviceMotionHz / samplingFrequency);
    
    addDebugLog(`🔴 Démarrage enregistrement IMU à ${samplingFrequency}Hz (ratio: 1/${samplingRatio} événements, base ${deviceMotionHz}Hz)`, 'success');

    let eventCounter = 0;
    let recordCount = 0;
    let startTime = Date.now();
    let lastRecordTime = Date.now();
    let intervalTimes = [];

    // Enregistrer via compteur d'événements devicemotion
    const handleMotionRecording = (event) => {
      eventCounter++;
      
      // Enregistrer seulement tous les N événements
      if (eventCounter % samplingRatio === 0) {
        const now = Date.now();
        const timeSinceLastRecord = now - lastRecordTime;
        recordCount++;
        intervalTimes.push(timeSinceLastRecord);
        lastRecordTime = now;
        
        const accel = event.acceleration || event.accelerationIncludingGravity;
        const rotation = event.rotationRate;
        
        if (accel && rotation) {
          const dataPoint = {
            timestamp: now,
            ax: accel.x !== null && accel.x !== undefined ? Number(accel.x.toFixed(2)) : 0,
            ay: accel.y !== null && accel.y !== undefined ? Number(accel.y.toFixed(2)) : 0,
            az: accel.z !== null && accel.z !== undefined ? Number(accel.z.toFixed(2)) : 0,
            gx: rotation.alpha !== null && rotation.alpha !== undefined ? Number(rotation.alpha.toFixed(2)) : 0,
            gy: rotation.beta !== null && rotation.beta !== undefined ? Number(rotation.beta.toFixed(2)) : 0,
            gz: rotation.gamma !== null && rotation.gamma !== undefined ? Number(rotation.gamma.toFixed(2)) : 0
          };
          
          setImuHistory(prev => {
            const updated = [...prev, dataPoint];
            
            if (updated.length === 1) {
              addDebugLog(`📊 Première mesure (événement devicemotion #${eventCounter})`, 'info');
            }
            
            if (updated.length <= 5) {
              addDebugLog(`📏 Mesure #${updated.length}: après ${eventCounter} événements devicemotion (délai: ${timeSinceLastRecord.toFixed(0)}ms)`, 'info');
            }
            
            if (updated.length === 10) {
              const avgInterval = intervalTimes.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
              const avgFreq = 1000 / avgInterval;
              addDebugLog(`⏱️ 10 mesures - Délai moyen: ${avgInterval.toFixed(0)}ms = ${avgFreq.toFixed(2)}Hz`, 'warning');
            }
            
            // Log toutes les 5 secondes
            const logInterval = samplingFrequency * 5;
            if (updated.length % logInterval === 0) {
              const elapsed = (now - startTime) / 1000;
              const actualFreq = (updated.length / elapsed).toFixed(2);
              const avgInterval = (elapsed * 1000 / updated.length).toFixed(0);
              const nonZero = updated.filter(d => d.ax !== 0 || d.ay !== 0 || d.az !== 0).length;
              const recentAvg = intervalTimes.slice(-logInterval).reduce((a, b) => a + b, 0) / logInterval;
              const freqRatio = ((parseFloat(actualFreq) / samplingFrequency) * 100).toFixed(0);
              addDebugLog(`💾 ${updated.length} mesures (${nonZero} non-null) | Cible: ${samplingFrequency}Hz | Réel: ${actualFreq}Hz (${freqRatio}%) | Moy: ${avgInterval}ms`, 'info');
            }
            
            return updated;
          });
        }
      }
    };

    window.addEventListener('devicemotion', handleMotionRecording);

    return () => {
      window.removeEventListener('devicemotion', handleMotionRecording);
      const avgInterval = intervalTimes.length > 0 ? intervalTimes.reduce((a, b) => a + b, 0) / intervalTimes.length : 0;
      const totalEvents = eventCounter;
      addDebugLog(`🛑 Arrêt IMU - ${recordCount} enregistrements sur ${totalEvents} événements (ratio: 1/${samplingRatio}) - Intervalle moyen: ${avgInterval.toFixed(0)}ms`, 'warning');
    };
  }, [isRunning, samplingFrequency]);

  // PLUS BESOIN de ce système, on va gérer ça différemment

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTimeOnly = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDateTimeOnly = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  const formatDateTimeForFilename = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}_${minutes}_${seconds}`;
  };

  const startNewSession = () => {
    // Réinitialiser complètement tous les états
    addDebugLog('🆕 Nouveau trajet - Réinitialisation', 'info');
    
    setIsRunning(false);
    setElapsedTime(0);
    setStartTime(null);
    setSessionStartDate(null);
    setActiveLabels({});
    setRecordings([]);
    setSessionEnded(false);
    setCurrentSessionData(null);
    setImuHistory([]);
    setUploadStatus('idle');
    setSensorWarning('');
    setPendingLabels({});
    setClickedLabel(null);
    
    // Changer de page
    setCurrentPage('labeling');
    
    addDebugLog('✅ Prêt pour un nouveau trajet', 'success');
  };

  const resetSessionAndGoHome = () => {
    // Réinitialiser tous les états de session
    addDebugLog('🏠 Retour à l\'accueil - Réinitialisation', 'info');
    
    setIsRunning(false);
    setElapsedTime(0);
    setStartTime(null);
    setSessionStartDate(null);
    setActiveLabels({});
    setRecordings([]);
    setSessionEnded(false);
    setCurrentSessionData(null);
    setImuHistory([]);
    setUploadStatus('idle');
    setSensorWarning('');
    setPendingLabels({});
    setClickedLabel(null);
    
    // Libérer le Wake Lock si actif
    if (wakeLock) {
      releaseWakeLock();
    }
    
    // Retour à l'accueil
    setCurrentPage('home');
  };

  const startSession = () => {
    const now = new Date();
    addDebugLog('🚀 Démarrage session', 'success');
    setIsRunning(true);
    setStartTime(Date.now());
    setSessionStartDate(now);
    setElapsedTime(0);
    setActiveLabels({});
    setRecordings([]);
    setSessionEnded(false);
    setCurrentSessionData(null);
    setImuHistory([]);
    setUploadStatus('idle');
    setSensorWarning('');
    
    // Activer le Wake Lock pour empêcher la mise en veille
    if (wakeLockSupported) {
      requestWakeLock();
    }
    
    if (mode === 'instantane' || mode === 'vocal') {
      addDebugLog(`📝 Initialisation automatique (mode ${mode})`, 'info');
    }
  };

  const editLabel = (id, newLabelId) => {
    const newLabel = labels.find(l => l.id === newLabelId);
    setRecordings(prev => prev.map(r => r.id === id ? {...r, label: newLabel.name} : r));
    // Met à jour aussi currentSessionData si la session est terminée
    if (currentSessionData) {
      setCurrentSessionData(prev => ({
        ...prev,
        recordings: prev.recordings.map(r => r.id === id ? {...r, label: newLabel.name} : r)
      }));
    }
    setEditingId(null);
  };

  const deleteEvent = (id) => {
    if (window.confirm('Supprimer cet événement ?')) {
      setRecordings(prev => prev.filter(r => r.id !== id));
      // Met à jour aussi currentSessionData si la session est terminée
      if (currentSessionData) {
        setCurrentSessionData(prev => ({
          ...prev,
          recordings: prev.recordings.filter(r => r.id !== id)
        }));
      }
    }
  };

  const toggleLabel = (labelId) => {
    if (!isRunning) return;

    setClickedLabel(labelId);
    setTimeout(() => setClickedLabel(null), mode === 'vocal' ? 2000 : 500);

    const currentTime = elapsedTime;
    const currentTimestamp = Date.now();
    const newRecordings = [...recordings];
    const labelName = labels.find(l => l.id === labelId).name;
    
    if (mode === 'instantane' || mode === 'vocal') {
      // Fenêtres de capture différentes selon le mode
      const WINDOW_BEFORE = mode === 'instantane' ? 5000 : 10000; // -5s instantané, -10s vocal
      const WINDOW_AFTER  = mode === 'instantane' ? 5000 : 100;   // +5s instantané, 0s vocal

      if (recordings.length === 0 && Object.keys(pendingLabels).length === 0) {
        let initStartTime = 0;
        let initEndTime = currentTime - WINDOW_BEFORE;
        
        if (initEndTime < 0) {
          initEndTime = 0;
        }
        
        const initImuData = imuHistory.filter(d => 
          d.timestamp <= (currentTimestamp - WINDOW_BEFORE) || d.timestamp <= sessionStartDate.getTime()
        );
        
        addDebugLog(`📝 Init (mode ${mode}): ${initImuData.length} mesures`, 'info');
        
        newRecordings.push({
          id: Date.now(),
          label: 'Conduite non agressive',
          mode: 'auto',
          startTime: formatTime(initStartTime),
          endTime: formatTime(Math.max(0, initEndTime)),
          duration: formatTime(Math.max(0, initEndTime)),
          absoluteStartTime: sessionStartDate,
          absoluteEndTime: new Date(sessionStartDate.getTime() + Math.max(0, initEndTime)),
          imuData: initImuData
        });
        
        setRecordings(newRecordings);
      }
      
      const pendingKey = `${labelId}_${Date.now()}`;
      setPendingLabels(prev => ({
        ...prev,
        [pendingKey]: {
          labelId,
          labelName,
          clickTime: currentTime,
          clickTimestamp: currentTimestamp
        }
      }));
      
      addDebugLog(`⏳ ${labelName} - ${mode === 'instantane' ? '5s avant + attente 5s après' : '10s avant'}`, 'info');
      
      setTimeout(() => {
        const finalTime = Date.now() - startTime;
        const finalTimestamp = Date.now();
        
        let startTimeBefore = currentTime - WINDOW_BEFORE;
        let startTimestampBefore = currentTimestamp - WINDOW_BEFORE;
        
        const currentRecordings = [...recordings];
        if (currentRecordings.length > 0) {
          const lastRecording = currentRecordings[currentRecordings.length - 1];
          const lastEndTime = lastRecording.absoluteEndTime.getTime();
          const timeSinceLastEvent = currentTimestamp - lastEndTime;
          
          if (timeSinceLastEvent < WINDOW_BEFORE) {
            startTimestampBefore = lastEndTime;
            startTimeBefore = currentTime - timeSinceLastEvent;
            addDebugLog(`🔗 Événement proche détecté : ${Math.round(timeSinceLastEvent/1000)}s depuis le dernier`, 'info');
          }
        }
        
        const periodImuData = imuHistory.filter(d => 
          d.timestamp >= startTimestampBefore && d.timestamp <= finalTimestamp
        );
        
        const nonZero = periodImuData.filter(d => d.ax !== 0 || d.ay !== 0 || d.az !== 0 || d.gx !== 0 || d.gy !== 0 || d.gz !== 0).length;
        const duration = finalTime - startTimeBefore;
        addDebugLog(`⚡ ${labelName} (${Math.round(duration/1000)}s): ${periodImuData.length} mesures (${nonZero} non-null)`, 'success');
        
        setRecordings(prev => [...prev, {
          id: Date.now() + Math.random(),
          label: labelName,
          mode: mode === 'vocal' ? 'vocal-10s' : 'instantane-5/+5',
          startTime: formatTime(Math.max(0, startTimeBefore)),
          endTime: formatTime(finalTime),
          duration: formatTime(duration),
          absoluteStartTime: new Date(sessionStartDate.getTime() + Math.max(0, startTimeBefore)),
          absoluteEndTime: new Date(sessionStartDate.getTime() + finalTime),
          imuData: periodImuData
        }]);
        
        setPendingLabels(prev => {
          const updated = {...prev};
          delete updated[pendingKey];
          return updated;
        });
      }, WINDOW_AFTER);
      
      return;
    }
    
    if (recordings.length === 0 && Object.keys(activeLabels).length === 0) {
      const initImuData = imuHistory.filter(d => d.timestamp <= currentTimestamp);
      addDebugLog(`📝 Init: ${initImuData.length} mesures`, 'info');
      
      newRecordings.push({
        label: 'Conduite non agressive',
          mode: 'auto',
        startTime: formatTime(0),
        endTime: formatTime(currentTime),
        duration: formatTime(currentTime),
        absoluteStartTime: sessionStartDate,
        absoluteEndTime: new Date(sessionStartDate.getTime() + currentTime),
        imuData: initImuData
      });
    }
    
    if (activeLabels[labelId]) {
      const startTimeLabel = activeLabels[labelId].time;
      const startTimestamp = activeLabels[labelId].timestamp;
      
      const periodImuData = imuHistory.filter(d => 
        d.timestamp >= startTimestamp && d.timestamp <= currentTimestamp
      );
      
      const nonZero = periodImuData.filter(d => d.ax !== 0 || d.ay !== 0 || d.az !== 0 || d.gx !== 0 || d.gy !== 0 || d.gz !== 0).length;
      addDebugLog(`✅ ${labelName}: ${periodImuData.length} mesures (${nonZero} non-null)`, 'success');
      
      newRecordings.push({
        label: labelName,
        mode: 'borne',
        startTime: formatTime(startTimeLabel),
        endTime: formatTime(currentTime),
        duration: formatTime(currentTime - startTimeLabel),
        absoluteStartTime: new Date(sessionStartDate.getTime() + startTimeLabel),
        absoluteEndTime: new Date(sessionStartDate.getTime() + currentTime),
        imuData: periodImuData
      });
      
      setActiveLabels({});
      setRecordings(newRecordings);
    } else {
      Object.keys(activeLabels).forEach(activeLabelId => {
        const startTimeLabel = activeLabels[activeLabelId].time;
        const startTimestamp = activeLabels[activeLabelId].timestamp;
        
        const periodImuData = imuHistory.filter(d => 
          d.timestamp >= startTimestamp && d.timestamp <= currentTimestamp
        );
        
        newRecordings.push({
          label: labels.find(l => l.id === activeLabelId).name,
          mode: 'borne',
          startTime: formatTime(startTimeLabel),
          endTime: formatTime(currentTime),
          duration: formatTime(currentTime - startTimeLabel),
          absoluteStartTime: new Date(sessionStartDate.getTime() + startTimeLabel),
          absoluteEndTime: new Date(sessionStartDate.getTime() + currentTime),
          imuData: periodImuData
        });
      });
      
      addDebugLog(`▶️ ${labelName} activé`, 'info');
      setActiveLabels({ [labelId]: { time: currentTime, timestamp: currentTimestamp } });
      setRecordings(newRecordings);
    }
  };

  // Mettre à jour la ref pour la reconnaissance vocale
  useEffect(() => {
    toggleLabelRef.current = toggleLabel;
  }, [toggleLabel]);

  const endSession = () => {
    const finalRecordings = [...recordings];
    const currentTime = elapsedTime;
    const endDate = new Date();
    const currentTimestamp = Date.now();
    
    const nonZero = imuHistory.filter(d => d.ax !== 0 || d.ay !== 0 || d.az !== 0 || d.gx !== 0 || d.gy !== 0 || d.gz !== 0).length;
    addDebugLog(`🏁 Fin: ${imuHistory.length} mesures (${nonZero} non-null)`, 'success');
    
    // Ajouter les labels actifs aux enregistrements
    if (finalRecordings.length === 0 && Object.keys(activeLabels).length === 0) {
      finalRecordings.push({
        label: 'Conduite non agressive',
          mode: 'auto',
        startTime: formatTime(0),
        endTime: formatTime(currentTime),
        duration: formatTime(currentTime),
        absoluteStartTime: sessionStartDate,
        absoluteEndTime: endDate,
        imuData: imuHistory
      });
    } else {
      Object.keys(activeLabels).forEach(labelId => {
        const startTimeLabel = activeLabels[labelId].time;
        const startTimestamp = activeLabels[labelId].timestamp;
        
        const periodImuData = imuHistory.filter(d => 
          d.timestamp >= startTimestamp && d.timestamp <= currentTimestamp
        );
        
        finalRecordings.push({
          label: labels.find(l => l.id === labelId).name,
          startTime: formatTime(startTimeLabel),
          endTime: formatTime(currentTime),
          duration: formatTime(currentTime - startTimeLabel),
          absoluteStartTime: new Date(sessionStartDate.getTime() + startTimeLabel),
          absoluteEndTime: endDate,
          imuData: periodImuData
        });
      });
    }

    // ===== NOUVELLE LOGIQUE : REMPLIR TOUS LES TROUS AVEC "CONDUITE NON AGRESSIVE" =====
    addDebugLog('🔍 Analyse des trous pour "Conduite non agressive"...', 'info');
    
    // Trier les enregistrements par temps de début
    const sortedRecordings = finalRecordings
      .sort((a, b) => a.absoluteStartTime.getTime() - b.absoluteStartTime.getTime());
    
    const allRecordingsWithGaps = [];
    const sessionStart = sessionStartDate.getTime();
    const sessionEnd = currentTimestamp;
    
    // Vérifier s'il y a un trou au début
    if (sortedRecordings.length === 0 || sortedRecordings[0].absoluteStartTime.getTime() > sessionStart) {
        const gapStart = sessionStart;
        const gapEnd = sortedRecordings.length > 0 ? sortedRecordings[0].absoluteStartTime.getTime() : sessionEnd;
        const duration = gapEnd - gapStart;
        
        if (duration > 1000) { // Au moins 1 seconde
          const gapImuData = imuHistory.filter(d => d.timestamp >= gapStart && d.timestamp < gapEnd);
          
          allRecordingsWithGaps.push({
            label: 'Conduite non agressive',
          mode: 'auto',
            startTime: formatTime(0),
            endTime: formatTime(gapEnd - sessionStart),
            duration: formatTime(duration),
            absoluteStartTime: new Date(gapStart),
            absoluteEndTime: new Date(gapEnd),
            imuData: gapImuData
          });
          
          addDebugLog(`🟢 Trou début: ${gapImuData.length} mesures (${(duration/1000).toFixed(1)}s)`, 'success');
        }
      }
      
      // Ajouter les enregistrements et combler les trous entre eux
      sortedRecordings.forEach((recording, index) => {
        allRecordingsWithGaps.push(recording);
        
        // Vérifier s'il y a un trou après cet enregistrement
        if (index < sortedRecordings.length - 1) {
          const currentEnd = recording.absoluteEndTime.getTime();
          const nextStart = sortedRecordings[index + 1].absoluteStartTime.getTime();
          const gapDuration = nextStart - currentEnd;
          
          if (gapDuration > 1000) { // Au moins 1 seconde
            const gapImuData = imuHistory.filter(d => d.timestamp > currentEnd && d.timestamp < nextStart);
            
            allRecordingsWithGaps.push({
              label: 'Conduite non agressive',
          mode: 'auto',
              startTime: formatTime(currentEnd - sessionStart),
              endTime: formatTime(nextStart - sessionStart),
              duration: formatTime(gapDuration),
              absoluteStartTime: new Date(currentEnd),
              absoluteEndTime: new Date(nextStart),
              imuData: gapImuData
            });
            
            addDebugLog(`🟢 Trou entre événements: ${gapImuData.length} mesures (${(gapDuration/1000).toFixed(1)}s)`, 'success');
          }
        }
      });
      
      // Vérifier s'il y a un trou à la fin
      if (sortedRecordings.length > 0) {
        const lastEnd = sortedRecordings[sortedRecordings.length - 1].absoluteEndTime.getTime();
        const gapDuration = sessionEnd - lastEnd;
        
        if (gapDuration > 1000) { // Au moins 1 seconde
          const gapImuData = imuHistory.filter(d => d.timestamp > lastEnd && d.timestamp <= sessionEnd);
          
          allRecordingsWithGaps.push({
            label: 'Conduite non agressive',
          mode: 'auto',
            startTime: formatTime(lastEnd - sessionStart),
            endTime: formatTime(currentTime),
            duration: formatTime(gapDuration),
            absoluteStartTime: new Date(lastEnd),
            absoluteEndTime: new Date(sessionEnd),
            imuData: gapImuData
          });
          
          addDebugLog(`🟢 Trou fin: ${gapImuData.length} mesures (${(gapDuration/1000).toFixed(1)}s)`, 'success');
        }
      }
    
    // Trier par ordre chronologique
    allRecordingsWithGaps.sort((a, b) => a.absoluteStartTime.getTime() - b.absoluteStartTime.getTime());
    
    addDebugLog(`✅ ${allRecordingsWithGaps.length} enregistrements (trous comblés)`, 'success');

    const newSession = {
      id: Date.now(),
      startDate: sessionStartDate,
      endDate: endDate,
      duration: formatTime(currentTime),
      carName: carName || 'Sans nom',
      vehiculeName: selectedVehicule || '',
      driverName: driverName || '',
      recordings: allRecordingsWithGaps
    };

    const updatedSessions = [newSession, ...sessions];
    saveSessions(updatedSessions);
    
    setRecordings(allRecordingsWithGaps);
    setActiveLabels({});
    setPendingLabels({});
    setIsRunning(false);
    setSessionEnded(true);
    setCurrentSessionData(newSession);
    
    // Libérer le Wake Lock
    releaseWakeLock();
    
    addDebugLog('💾 Session sauvegardée', 'success');
  };

  const downloadCSV = (data, session) => {
    const removeAccents = (str) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };
    
    const headers = ['vehicule_name', 'UIN', 'conducteur', 'Label', 'mode', 'Start_time', 'End_time', 'Duration', 'Acceleration X', 'Acceleration Y', 'Acceleration Z', 'Gyroscope X', 'Gyroscope Y', 'Gyroscope Z'];
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => {
        const durationParts = row.duration.split(':');
        let durationSeconds = 0;
        if (durationParts.length === 2) {
          const [minutes, secondsWithMs] = durationParts;
          const [seconds, ms] = secondsWithMs.split('.');
          durationSeconds = parseInt(minutes) * 60 + parseInt(seconds) + (ms ? parseInt(ms) / 100 : 0);
        }
        
        const axList = row.imuData && row.imuData.length > 0 
          ? '[' + row.imuData.map(d => d.ax).join(',') + ']'
          : '[]';
        const ayList = row.imuData && row.imuData.length > 0 
          ? '[' + row.imuData.map(d => d.ay).join(',') + ']'
          : '[]';
        const azList = row.imuData && row.imuData.length > 0 
          ? '[' + row.imuData.map(d => d.az).join(',') + ']'
          : '[]';
        const gxList = row.imuData && row.imuData.length > 0 
          ? '[' + row.imuData.map(d => d.gx).join(',') + ']'
          : '[]';
        const gyList = row.imuData && row.imuData.length > 0 
          ? '[' + row.imuData.map(d => d.gy).join(',') + ']'
          : '[]';
        const gzList = row.imuData && row.imuData.length > 0 
          ? '[' + row.imuData.map(d => d.gz).join(',') + ']'
          : '[]';
        
        return `"${removeAccents(selectedVehicule || session.carName || 'Sans nom')}","${removeAccents(session.carName || '')}","${removeAccents(driverName || '')}","${removeAccents(row.label)}","${row.mode || ''}","${formatDateTimeOnly(row.absoluteStartTime)}","${formatDateTimeOnly(row.absoluteEndTime)}",${durationSeconds.toFixed(2)},"${axList}","${ayList}","${azList}","${gxList}","${gyList}","${gzList}"`;
      })
    ].join('\n');

    addDebugLog(`📄 CSV généré: ${csvContent.length} chars`, 'success');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const carNamePart = session.carName && session.carName !== 'Sans nom' ? `_${removeAccents(session.carName).replace(/\s+/g, '')}` : '';
    const filename = `labelisation${carNamePart}_${formatDateTimeForFilename(session.startDate)}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addDebugLog('✅ Téléchargement lancé', 'success');
  };

  const uploadToDrive = async (data, session) => {
    setUploadStatus('uploading');
    addDebugLog('📤 Upload vers Drive...', 'info');
    
    try {
      const removeAccents = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      };
      
      const headers = ['vehicule_name', 'UIN', 'conducteur', 'Label', 'mode', 'Start_time', 'End_time', 'Duration', 'Acceleration X', 'Acceleration Y', 'Acceleration Z', 'Gyroscope X', 'Gyroscope Y', 'Gyroscope Z'];
      
      const csvContent = [
        headers.join(','),
        ...data.map(row => {
          const durationParts = row.duration.split(':');
          let durationSeconds = 0;
          if (durationParts.length === 2) {
            const [minutes, secondsWithMs] = durationParts;
            const [seconds, ms] = secondsWithMs.split('.');
            durationSeconds = parseInt(minutes) * 60 + parseInt(seconds) + (ms ? parseInt(ms) / 100 : 0);
          }
          
          const axList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.ax).join(',') + ']'
            : '[]';
          const ayList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.ay).join(',') + ']'
            : '[]';
          const azList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.az).join(',') + ']'
            : '[]';
          const gxList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.gx).join(',') + ']'
            : '[]';
          const gyList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.gy).join(',') + ']'
            : '[]';
          const gzList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.gz).join(',') + ']'
            : '[]';
          
          return `"${removeAccents(selectedVehicule || session.carName || 'Sans nom')}","${removeAccents(session.carName || '')}","${removeAccents(driverName || '')}","${removeAccents(row.label)}","${row.mode || ''}","${formatDateTimeOnly(row.absoluteStartTime)}","${formatDateTimeOnly(row.absoluteEndTime)}",${durationSeconds.toFixed(2)},"${axList}","${ayList}","${azList}","${gxList}","${gyList}","${gzList}"`;
        })
      ].join('\n');

      const base64CSV = btoa(unescape(encodeURIComponent(csvContent)));
      
      const carNamePart = session.carName && session.carName !== 'Sans nom' ? `_${removeAccents(session.carName).replace(/\s+/g, '')}` : '';
      const filename = `labelisation${carNamePart}_${formatDateTimeForFilename(session.startDate)}.csv`;

      const params = new URLSearchParams();
      params.append('file', base64CSV);
      params.append('fileName', filename);

      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const result = await response.json();

      if (result.success) {
        addDebugLog(`✅ Upload réussi: ${filename}`, 'success');
        setUploadStatus('success');
        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      addDebugLog(`❌ Erreur upload: ${error.message}`, 'error');
      setUploadStatus('error');
      downloadCSV(data, session);
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const uploadToGitHub = async (data, session) => {
    addDebugLog('🐙 Tentative d\'upload GitHub...', 'info');
    addDebugLog(`📦 Repository: ${githubRepo || 'NON DÉFINI'}`, 'info');
    addDebugLog(`🔑 Token: ${githubToken ? 'PRÉSENT' : 'MANQUANT'}`, githubToken ? 'success' : 'error');
    
    if (!githubToken || !githubRepo) {
      addDebugLog('❌ Configuration GitHub manquante!', 'error');
      alert('⚠️ Configuration GitHub manquante!\n\nRepository: ' + (githubRepo || 'NON DÉFINI') + '\nToken: ' + (githubToken ? 'Présent' : 'MANQUANT') + '\n\nVérifiez les variables Vercel ou le fichier de config.');
      return;
    }

    setUploadStatus('uploading');
    addDebugLog('📤 Upload vers GitHub en cours...', 'info');
    
    try {
      const removeAccents = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      };
      
      const headers = ['vehicule_name', 'UIN', 'conducteur', 'Label', 'mode', 'Start_time', 'End_time', 'Duration', 'Acceleration X', 'Acceleration Y', 'Acceleration Z', 'Gyroscope X', 'Gyroscope Y', 'Gyroscope Z'];
      
      const csvContent = [
        headers.join(','),
        ...data.map(row => {
          const durationParts = row.duration.split(':');
          let durationSeconds = 0;
          if (durationParts.length === 2) {
            const [minutes, secondsWithMs] = durationParts;
            const [seconds, ms] = secondsWithMs.split('.');
            durationSeconds = parseInt(minutes) * 60 + parseInt(seconds) + (ms ? parseInt(ms) / 100 : 0);
          }
          
          const axList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.ax).join(',') + ']'
            : '[]';
          const ayList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.ay).join(',') + ']'
            : '[]';
          const azList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.az).join(',') + ']'
            : '[]';
          const gxList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.gx).join(',') + ']'
            : '[]';
          const gyList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.gy).join(',') + ']'
            : '[]';
          const gzList = row.imuData && row.imuData.length > 0 
            ? '[' + row.imuData.map(d => d.gz).join(',') + ']'
            : '[]';
          
          return `"${removeAccents(selectedVehicule || session.carName || 'Sans nom')}","${removeAccents(session.carName || '')}","${removeAccents(driverName || '')}","${removeAccents(row.label)}","${row.mode || ''}","${formatDateTimeOnly(row.absoluteStartTime)}","${formatDateTimeOnly(row.absoluteEndTime)}",${durationSeconds.toFixed(2)},"${axList}","${ayList}","${azList}","${gxList}","${gyList}","${gzList}"`;
        })
      ].join('\n');

      const base64CSV = btoa(unescape(encodeURIComponent(csvContent)));
      
      const carNamePart = session.carName && session.carName !== 'Sans nom' ? `_${removeAccents(session.carName).replace(/\s+/g, '')}` : '';
      const filename = `labelisation${carNamePart}_${formatDateTimeForFilename(session.startDate)}.csv`;
      const filePath = `data/roulage/${filename}`;

      addDebugLog(`📄 Fichier: ${filename}`, 'info');
      
      // GitHub API: Create or update file
      const url = `https://api.github.com/repos/${githubRepo}/contents/${filePath}`;
      
      addDebugLog(`🔗 URL: ${url}`, 'info');
      
      // Check if file exists first
      let sha = null;
      try {
        addDebugLog('🔍 Vérification si le fichier existe...', 'info');
        const checkResponse = await fetch(url, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (checkResponse.ok) {
          const fileData = await checkResponse.json();
          sha = fileData.sha;
          addDebugLog('📝 Fichier existe, sera mis à jour', 'info');
        } else {
          addDebugLog('📝 Nouveau fichier, sera créé', 'info');
        }
      } catch (e) {
        addDebugLog('📝 Nouveau fichier (erreur check normale)', 'info');
      }

      const body = {
        message: `Add driving data: ${filename}`,
        content: base64CSV,
        branch: githubBranch
      };

      if (sha) {
        body.sha = sha;
      }

      addDebugLog('📡 Envoi vers GitHub API...', 'info');
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      addDebugLog(`📊 Réponse HTTP: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error');

      if (response.ok) {
        const result = await response.json();
        addDebugLog(`✅ Upload GitHub réussi: ${filename}`, 'success');
        addDebugLog(`🔗 Lien: ${result.content.html_url}`, 'info');
        setUploadStatus('success');
        alert('✅ Fichier envoyé sur GitHub avec succès!\n\nFichier: ' + filename + '\n\nVérifiez sur GitHub dans le dossier data/roulage/');
        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        const errorData = await response.json();
        addDebugLog(`❌ Erreur GitHub: ${errorData.message}`, 'error');
        if (errorData.errors) {
          errorData.errors.forEach(err => {
            addDebugLog(`  → ${err.message || JSON.stringify(err)}`, 'error');
          });
        }
        throw new Error(errorData.message || 'GitHub upload failed');
      }
    } catch (error) {
      console.error('Erreur upload GitHub:', error);
      addDebugLog(`❌ Erreur upload GitHub: ${error.message}`, 'error');
      addDebugLog(`💡 Stack: ${error.stack?.substring(0, 200)}`, 'error');
      setUploadStatus('error');
      alert('❌ Erreur d\'envoi GitHub!\n\n' + error.message + '\n\nLe CSV sera téléchargé localement à la place.');
      downloadCSV(data, session);
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const uploadToMQTT = async (data, session) => {
    addDebugLog('📡 Tentative d\'envoi MQTT...', 'info');
    addDebugLog(`🔗 Proxy: ${mqttProxyUrl}`, 'info');
    addDebugLog(`📍 Topic: ${mqttTopic}`, 'info');
    addDebugLog(`🏠 Broker: ${mqttHost}:${mqttPort}`, 'info');

    setUploadStatus('uploading');

    try {
      const removeAccents = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      };

      // Envoyer chaque événement comme un message MQTT individuel
      const events = data.map(row => {
        const durationParts = row.duration.split(':');
        let durationSeconds = 0;
        if (durationParts.length === 2) {
          const [minutes, secondsWithMs] = durationParts;
          const [seconds, ms] = secondsWithMs.split('.');
          durationSeconds = parseInt(minutes) * 60 + parseInt(seconds) + (ms ? parseInt(ms) / 100 : 0);
        }

        return {
          vehicule: removeAccents(selectedVehicule || session.carName || 'Sans nom'),
          UIN: removeAccents(session.carName || ''),
          conducteur: removeAccents(driverName || ''),
          label: removeAccents(row.label),
          mode: row.mode || '',
          start_time: formatDateTimeOnly(row.absoluteStartTime),
          start_timestamp: new Date(row.absoluteStartTime).getTime(),
          end_time: formatDateTimeOnly(row.absoluteEndTime),
          end_timestamp: new Date(row.absoluteEndTime).getTime(),
          duration: parseFloat(durationSeconds.toFixed(2)),
        };
      });

      addDebugLog(`📊 ${events.length} événements à envoyer`, 'info');

      // Envoyer chaque événement un par un
      for (let i = 0; i < events.length; i++) {
        await sendToMqttProxy(mqttTopic, events[i]);
        addDebugLog(`✅ Event ${i + 1}/${events.length}: ${events[i].label}`, 'success');
      }

      addDebugLog(`✅ Envoi MQTT réussi !`, 'success');
      setUploadStatus('success');
      alert(`✅ Données envoyées via MQTT !\n\nTopic: ${mqttTopic}\nBroker: ${mqttHost}:${mqttPort}\n${data.length} événements`);
      setTimeout(() => setUploadStatus('idle'), 3000);

    } catch (error) {
      console.error('Erreur MQTT:', error);
      addDebugLog(`❌ Erreur MQTT: ${error.message}`, 'error');
      setUploadStatus('error');
      alert(`❌ Erreur d'envoi MQTT !\n\n${error.message}\n\nVérifiez la configuration du proxy et du broker.`);
      setTimeout(() => setUploadStatus('idle'), 5000);
    }
  };

  const sendToMqttProxy = async (topic, message) => {
    const response = await fetch(mqttProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        message,
        host: mqttHost,
        port: parseInt(mqttPort),
        username: mqttUsername,
        password: mqttPassword,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  };

  const deleteSession = (sessionId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce trajet ?')) {
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      saveSessions(updatedSessions);
    }
  };

  if (currentPage === 'home') {
    return (
      <div 
        className="min-h-screen bg-slate-700 p-4 sm:p-8"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* VERSION INDICATOR - Pour vérifier le déploiement */}
        <div className="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-xl">
          v6.22-CONFIG ✅
        </div>
        
        {/* Indicateur Pull-to-Refresh */}
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
          style={{
            transform: `translateY(${isPulling || isRefreshing ? pullDistance - 60 : -60}px)`,
            transition: isPulling ? 'none' : 'transform 0.3s ease-out'
          }}
        >
          <div className="bg-slate-800 border border-slate-600 rounded-full px-6 py-3 shadow-xl flex items-center gap-3 mt-2">
            {isRefreshing ? (
              <>
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-cyan-400 font-semibold text-sm">Actualisation...</span>
              </>
            ) : (
              <>
                <div 
                  className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full"
                  style={{
                    transform: `rotate(${(pullDistance / pullThreshold) * 360}deg)`,
                    transition: 'transform 0.1s'
                  }}
                ></div>
                <span className="text-slate-400 font-semibold text-sm">
                  {pullDistance >= pullThreshold ? 'Relâchez pour actualiser' : 'Tirez pour actualiser'}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Labelisation de conduite
            </h1>
            <p className="text-slate-300 font-mono text-xs sm:text-sm">Système mobile de collecte de données</p>
          </div>

          <div className="text-center mb-8">
            <button
              onClick={startNewSession}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 active:scale-95 text-white px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center gap-2 transition-all shadow-lg w-full sm:w-auto justify-center"
            >
              <Play size={20} />
              Nouveau trajet
            </button>
          </div>

          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4 sm:mb-6">Historique</h2>
            
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Database className="mx-auto mb-3" size={48} strokeWidth={1.5} />
                <p className="text-base sm:text-lg">Aucun trajet enregistré</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="bg-slate-700 p-4 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedSession(session);
                      setCurrentPage('details');
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div className="flex-1">
                        {(session.vehiculeName || (session.carName && session.carName !== 'Sans nom') || session.driverName) && (
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            {session.vehiculeName && (
                              <span className="text-cyan-400 text-sm">
                                🚗 {session.vehiculeName}
                              </span>
                            )}
                            {session.carName && session.carName !== 'Sans nom' && (
                              <span className="text-slate-400 text-sm font-mono">
                                📡 {session.carName}
                              </span>
                            )}
                            {session.driverName && (
                              <span className="text-slate-400 text-sm">
                                👤 {session.driverName}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Clock size={16} className="text-slate-400" />
                          <span className="text-white font-medium text-sm sm:text-base">
                            {formatDateTime(session.startDate)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-slate-300 font-mono">
                          <span>Durée: {session.duration}</span>
                          <span>Events: {session.recordings.length}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-slate-600 rounded transition-colors self-end sm:self-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === 'details' && selectedSession) {
    return (
      <div className="min-h-screen bg-slate-700 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              setCurrentPage('home');
              setSelectedSession(null);
            }}
            className="mb-4 text-slate-300 hover:text-white inline-flex items-center gap-2 active:scale-95"
          >
            <ArrowLeft size={18} />
            Retour
          </button>

          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-6">Détails</h2>
            
            {(selectedSession.carName || selectedSession.vehiculeName || selectedSession.driverName) && (
              <div className="bg-slate-700 rounded-lg p-4 mb-6 border border-slate-600">
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <Car size={16} className="text-cyan-400" />
                  Configuration
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                    <p className="text-xs text-slate-400 mb-1">🚗 Véhicule</p>
                    <p className="text-white font-semibold">{selectedSession.vehiculeName || '-'}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                    <p className="text-xs text-slate-400 mb-1">📡 Boîtier</p>
                    <p className="text-white font-semibold font-mono">{selectedSession.carName !== 'Sans nom' ? selectedSession.carName : '-'}</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3 border border-slate-600">
                    <p className="text-xs text-slate-400 mb-1">👤 Conducteur</p>
                    <p className="text-white font-semibold">{selectedSession.driverName || '-'}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <p className="text-slate-400 text-xs mb-1 font-mono">Début</p>
                <p className="text-white text-sm font-semibold font-mono">{formatDateTime(selectedSession.startDate)}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <p className="text-slate-400 text-xs mb-1 font-mono">Fin</p>
                <p className="text-white text-sm font-semibold font-mono">{formatDateTime(selectedSession.endDate)}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <p className="text-slate-400 text-xs mb-1 font-mono">Durée</p>
                <p className="text-white text-sm font-semibold font-mono">{selectedSession.duration}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                <p className="text-slate-400 text-xs mb-1 font-mono">Events</p>
                <p className="text-white text-sm font-semibold font-mono">{selectedSession.recordings.length}</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-3">Événements</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedSession.recordings.map((rec, idx) => (
                <div key={idx} className="bg-slate-700 p-3 rounded-lg border border-slate-600">
                  <div className="flex flex-col gap-2">
                    <span className="font-medium text-white text-sm">{rec.label}</span>
                    <div className="text-xs text-slate-300 font-mono space-y-1">
                      <div>📅 Début: {formatDateTimeOnly(rec.absoluteStartTime)}</div>
                      <div>📅 Fin: {formatDateTimeOnly(rec.absoluteEndTime)}</div>
                      <div className="text-cyan-400">⏱️ Durée: {rec.duration}</div>
                    </div>
                  </div>
                  {rec.imuData && rec.imuData.length > 0 && (
                    <p className="text-xs text-cyan-400 font-mono mt-2">
                      {rec.imuData.length} mesures IMU
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-auto sm:flex-1">
                <div className="flex w-full">
                  <button
                    onClick={() => uploadToGitHub(selectedSession.recordings, selectedSession)}
                    disabled={uploadStatus === 'uploading' || !githubToken || !githubRepo}
                    className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black active:scale-95 text-white px-6 py-3 rounded-l-lg font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    <Github size={18} />
                    {uploadStatus === 'uploading' ? 'Envoi...' : 
                     uploadStatus === 'success' ? 'Envoyé !' :
                     uploadStatus === 'error' ? 'Erreur' :
                     'Envoyer GitHub'}
                  </button>
                  <button
                    onClick={() => setShowGithubConfig(!showGithubConfig)}
                    className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black active:scale-95 text-white px-2 py-3 rounded-r-lg border-l border-slate-600 flex-shrink-0"
                  >
                    <ChevronDown size={16} className={showGithubConfig ? 'rotate-180' : ''} />
                  </button>
                </div>
                {showGithubConfig && (
                  <div className="absolute top-full left-0 mt-2 p-3 bg-slate-800 rounded-lg border border-slate-600 shadow-xl z-50 w-80">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Github size={14} className="inline mr-1" />
                      Configuration GitHub
                    </label>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Repository</label>
                        <input
                          type="text"
                          value={githubRepo}
                          onChange={(e) => {
                            setGithubRepo(e.target.value);
                            localStorage.setItem('githubRepo', e.target.value);
                          }}
                          placeholder="username/repository"
                          className="w-full bg-slate-700 text-white px-2 py-1.5 rounded text-xs border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Token</label>
                        <input
                          type="password"
                          value={githubToken}
                          onChange={(e) => {
                            setGithubToken(e.target.value);
                            localStorage.setItem('githubToken', e.target.value);
                          }}
                          placeholder="ghp_xxxxxxxxxxxx"
                          className="w-full bg-slate-700 text-white px-2 py-1.5 rounded text-xs border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Branche</label>
                        <input
                          type="text"
                          value={githubBranch}
                          onChange={(e) => {
                            setGithubBranch(e.target.value);
                            localStorage.setItem('githubBranch', e.target.value);
                          }}
                          placeholder="main"
                          className="w-full bg-slate-700 text-white px-2 py-1.5 rounded text-xs border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => uploadToDrive(selectedSession.recordings, selectedSession)}
                disabled={uploadStatus === 'uploading'}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 active:scale-95 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto sm:flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                {uploadStatus === 'uploading' ? 'Envoi...' : 
                 uploadStatus === 'success' ? 'Envoyé !' :
                 uploadStatus === 'error' ? 'Erreur' :
                 'Envoyer Drive'}
              </button>
              <div className="relative w-full sm:w-auto sm:flex-1">
                <div className="flex w-full">
                  <button
                    onClick={() => uploadToMQTT(selectedSession.recordings, selectedSession)}
                    disabled={uploadStatus === 'uploading'}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white px-6 py-3 rounded-l-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto sm:flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    <Radio size={18} />
                    {uploadStatus === 'uploading' ? 'Envoi...' : 
                     uploadStatus === 'success' ? 'Envoyé !' :
                     uploadStatus === 'error' ? 'Erreur' :
                     'Envoyer MQTT'}
                  </button>
                  <button
                    onClick={() => setShowMqttConfig(!showMqttConfig)}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white px-2 py-3 rounded-r-lg border-l border-amber-400 flex-shrink-0"
                  >
                    <ChevronDown size={16} className={showMqttConfig ? 'rotate-180' : ''} />
                  </button>
                </div>
                {showMqttConfig && (
                  <div className="absolute top-full left-0 mt-2 p-3 bg-slate-800 rounded-lg border border-slate-600 shadow-xl z-50 w-80">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Radio size={14} className="inline mr-1" />
                      Configuration MQTT
                    </label>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">URL Proxy</label>
                        <input
                          type="text"
                          value={mqttProxyUrl}
                          onChange={(e) => { setMqttProxyUrl(e.target.value); localStorage.setItem('mqttProxyUrl', e.target.value); }}
                          placeholder="/api/mqtt-proxy"
                          className="w-full bg-slate-700 text-white px-2 py-1.5 rounded text-xs border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Host Broker</label>
                        <input
                          type="text"
                          value={mqttHost}
                          onChange={(e) => { setMqttHost(e.target.value); localStorage.setItem('mqttHost', e.target.value); }}
                          placeholder="94.23.12.188"
                          className="w-full bg-slate-700 text-white px-2 py-1.5 rounded text-xs border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Port</label>
                          <input
                            type="text"
                            value={mqttPort}
                            onChange={(e) => { setMqttPort(e.target.value); localStorage.setItem('mqttPort', e.target.value); }}
                            placeholder="1886"
                            className="w-full bg-slate-700 text-white px-2 py-1.5 rounded text-xs border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Topic</label>
                          <input
                            type="text"
                            value={mqttTopic}
                            onChange={(e) => { setMqttTopic(e.target.value); localStorage.setItem('mqttTopic', e.target.value); }}
                            placeholder="driving/UIN/session"
                            className="w-full bg-slate-700 text-white px-2 py-1.5 rounded text-xs border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Username</label>
                        <input
                          type="text"
                          value={mqttUsername}
                          onChange={(e) => { setMqttUsername(e.target.value); localStorage.setItem('mqttUsername', e.target.value); }}
                          placeholder="thibaut_test"
                          className="w-full bg-slate-700 text-white px-2 py-1.5 rounded text-xs border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Password</label>
                        <input
                          type="password"
                          value={mqttPassword}
                          onChange={(e) => { setMqttPassword(e.target.value); localStorage.setItem('mqttPassword', e.target.value); }}
                          placeholder="••••••••"
                          className="w-full bg-slate-700 text-white px-2 py-1.5 rounded text-xs border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => downloadCSV(selectedSession.recordings, selectedSession)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto sm:flex-1 justify-center"
              >
                <Download size={18} />
                Télécharger CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Splash screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8 animate-bounce">
            <Car size={120} className="text-cyan-400 mx-auto drop-shadow-2xl" strokeWidth={1.5} />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Labelisation
          </h1>
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <p className="text-lg">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-700 p-4 sm:p-8 pb-safe"
    >
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg active:scale-95"
        >
          <Bug size={24} />
        </button>

        {showDebug && (
          <div className="fixed top-16 right-4 z-40 bg-slate-900 border border-purple-500 rounded-lg p-4 shadow-2xl max-w-sm max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Bug size={18} />
                Debug
              </h3>
              <button
                onClick={() => setDebugLogs([])}
                className="text-slate-400 hover:text-white text-xs"
              >
                Effacer
              </button>
            </div>
            <div className="space-y-1">
              {debugLogs.length === 0 ? (
                <p className="text-slate-400 text-xs">Aucun log</p>
              ) : (
                debugLogs.map((log, idx) => (
                  <div key={idx} className="text-xs font-mono">
                    <span className="text-slate-500">{log.time}</span>
                    <span className={`ml-2 ${
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'warning' ? 'text-amber-400' :
                      log.type === 'success' ? 'text-green-400' :
                      'text-slate-300'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-700">
              <p className="text-xs font-bold text-white mb-2">Statistiques</p>
              <div className="space-y-1 text-xs text-slate-300 font-mono">
                <div>Mesures totales: <span className="text-cyan-400">{imuHistory.length}</span></div>
                <div>Non-nulles: <span className="text-green-400">
                  {imuHistory.filter(d => d.ax !== 0 || d.ay !== 0 || d.az !== 0 || d.gx !== 0 || d.gy !== 0 || d.gz !== 0).length}
                </span></div>
                <div>Events: <span className="text-purple-400">{recordings.length}</span></div>
                <div>Mode: <span className="text-amber-400">{mode}</span></div>
                <div>Wake Lock: <span className={wakeLock ? 'text-green-400' : 'text-slate-500'}>
                  {wakeLock ? '✓ Actif' : '✗ Inactif'}
                </span></div>
                {mode === 'vocal' && voiceSupported && (
                  <div>Vocal: <span className={mode === 'vocal' && isRunning ? 'text-green-400' : 'text-red-400'}>
                    {mode === 'vocal' && isRunning ? '✓ Actif' : '✗ Inactif'}
                  </span></div>
                )}
                {lastTranscript && mode === 'vocal' && (
                  <div className="pt-2 border-t border-slate-700">
                    <div className="text-amber-400">Dernier: "{lastTranscript}"</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (isRunning) {
              if (window.confirm('Voulez-vous vraiment quitter ? La session en cours sera perdue.')) {
                resetSessionAndGoHome();
              }
            } else {
              resetSessionAndGoHome();
            }
          }}
          className="mb-4 text-slate-300 hover:text-white inline-flex items-center gap-2 active:scale-95"
        >
          <ArrowLeft size={18} />
          Retour
        </button>

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mb-4">
          <h3 className="text-white font-semibold mb-4 text-sm flex items-center gap-2">
            <Car size={18} className="text-cyan-400" />
            Configuration
          </h3>

          {/* Véhicule */}
          <div className="mb-3 relative">
            <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3 border border-slate-600">
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">🚗 Véhicule</p>
                <span className="text-white font-semibold">
                  {selectedVehicule || 'Non sélectionné'}
                </span>
              </div>
              <button
                onClick={() => { setShowVehiculeDropdown(!showVehiculeDropdown); setShowBoitierDropdown(false); }}
                className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors active:scale-95"
              >
                <ChevronDown size={16} className={showVehiculeDropdown ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
            </div>

            {showVehiculeDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-slate-700 border border-slate-500 rounded-lg shadow-xl z-50 overflow-hidden">
                {vehiculesList.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    {vehiculesList.map((v) => (
                      <button
                        key={v}
                        onClick={() => selectVehicule(v)}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between
                          ${selectedVehicule === v 
                            ? 'bg-cyan-600 text-white' 
                            : 'text-slate-200 hover:bg-slate-600 active:bg-slate-500'
                          }`}
                      >
                        <span className="font-semibold">{v}</span>
                        {selectedVehicule === v && <Check size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-center">
                    <p className="text-slate-400 text-xs">Ajoutez vehicules.json dans public/</p>
                  </div>
                )}
                <div className="border-t border-slate-600 p-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempVehicule}
                      onChange={(e) => setTempVehicule(e.target.value)}
                      onKeyPress={(e) => { if (e.key === 'Enter' && tempVehicule.trim()) { selectVehicule(tempVehicule.trim()); setTempVehicule(''); } }}
                      placeholder="Saisie manuelle..."
                      className="flex-1 px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none text-xs"
                    />
                    <button
                      onClick={() => { if (tempVehicule.trim()) { selectVehicule(tempVehicule.trim()); setTempVehicule(''); } }}
                      className="px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors text-xs font-semibold"
                    >OK</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Boîtier (UIN) */}
          <div className="mb-3 relative">
            <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3 border border-slate-600">
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">📡 Boîtier (UIN)</p>
                <span className="text-white font-semibold">
                  {carName || 'Non sélectionné'}
                </span>
              </div>
              <button
                onClick={() => { setShowBoitierDropdown(!showBoitierDropdown); setShowVehiculeDropdown(false); }}
                className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors active:scale-95"
              >
                <ChevronDown size={16} className={showBoitierDropdown ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
            </div>

            {showBoitierDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-slate-700 border border-slate-500 rounded-lg shadow-xl z-50 overflow-hidden">
                {boitiersList.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto">
                    {boitiersList.map((uin) => (
                      <button
                        key={uin}
                        onClick={() => selectBoitier(uin)}
                        className={`w-full text-left px-4 py-3 text-sm font-mono transition-colors flex items-center justify-between
                          ${carName === uin 
                            ? 'bg-cyan-600 text-white' 
                            : 'text-slate-200 hover:bg-slate-600 active:bg-slate-500'
                          }`}
                      >
                        <span className="font-semibold">{uin}</span>
                        {carName === uin && <Check size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-4 text-center">
                    <p className="text-slate-400 text-xs">Ajoutez boitiers.json dans public/</p>
                  </div>
                )}
                <div className="border-t border-slate-600 p-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempCarName}
                      onChange={(e) => setTempCarName(e.target.value)}
                      onKeyPress={(e) => { if (e.key === 'Enter' && tempCarName.trim()) { selectBoitier(tempCarName.trim()); setTempCarName(''); } }}
                      placeholder="UIN manuelle..."
                      className="flex-1 px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none text-xs font-mono"
                    />
                    <button
                      onClick={() => { if (tempCarName.trim()) { selectBoitier(tempCarName.trim()); setTempCarName(''); } }}
                      className="px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors text-xs font-semibold"
                    >OK</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Conducteur */}
          <div className="mb-3">
            <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3 border border-slate-600">
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">👤 Conducteur</p>
                {isEditingDriver ? (
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={tempDriverName}
                      onChange={(e) => setTempDriverName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          setDriverName(tempDriverName.trim());
                          localStorage.setItem('driverName', tempDriverName.trim());
                          setIsEditingDriver(false);
                        }
                      }}
                      placeholder="Nom du conducteur..."
                      className="flex-1 px-3 py-2 bg-slate-800 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        setDriverName(tempDriverName.trim());
                        localStorage.setItem('driverName', tempDriverName.trim());
                        setIsEditingDriver(false);
                      }}
                      className="px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors text-xs font-semibold"
                    >OK</button>
                  </div>
                ) : (
                  <span className="text-white font-semibold">
                    {driverName || 'Non renseigné'}
                  </span>
                )}
              </div>
              {!isEditingDriver && (
                <button
                  onClick={() => { setTempDriverName(driverName); setIsEditingDriver(true); }}
                  className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors active:scale-95"
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Résumé topic */}
          {carName && (
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-600">
              <p className="text-xs text-slate-400 font-mono text-center">
                📡 Topic MQTT: <span className="text-cyan-400 font-semibold">driving/{carName}/session</span>
              </p>
            </div>
          )}
        </div>


        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mb-4">
          <h3 className="text-white font-semibold mb-3 text-sm">Mode de labelisation</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                if (!isRunning) {
                  setMode('instantane');
                  addDebugLog('⚡ Mode Instantané activé (5s avant + 5s après)', 'info');
                }
              }}
              disabled={isRunning}
              className={`
                ${mode === 'instantane' 
                  ? 'bg-purple-600 border-purple-400 ring-2 ring-purple-400' 
                  : 'bg-slate-700 border-slate-600'
                }
                ${isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700 active:scale-95'}
                border-2 text-white px-4 py-3 rounded-lg font-semibold transition-all text-sm
              `}
            >
              <div className="flex flex-col items-center gap-1">
                <span>⚡ Instantané</span>
                <span className="text-xs opacity-80">5s avant + 5s après</span>
              </div>
            </button>
            <button
              onClick={() => {
                if (!isRunning) {
                  setMode('borne');
                  addDebugLog('🔄 Mode Borné activé', 'info');
                }
              }}
              disabled={isRunning}
              className={`
                ${mode === 'borne' 
                  ? 'bg-cyan-600 border-cyan-400 ring-2 ring-cyan-400' 
                  : 'bg-slate-700 border-slate-600'
                }
                ${isRunning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-cyan-700 active:scale-95'}
                border-2 text-white px-4 py-3 rounded-lg font-semibold transition-all text-sm
              `}
            >
              <div className="flex flex-col items-center gap-1">
                <span>🎯 Borné</span>
                <span className="text-xs opacity-80">Début → Fin</span>
              </div>
            </button>
            <button
              onClick={() => {
                if (!isRunning) {
                  if (voiceSupported) {
                    setMode('vocal');
                    addDebugLog('🎤 Mode Vocal activé', 'info');
                  } else {
                    alert('La reconnaissance vocale n\'est pas disponible sur ce navigateur.');
                  }
                }
              }}
              disabled={isRunning || !voiceSupported}
              className={`
                ${mode === 'vocal' 
                  ? 'bg-green-600 border-green-400 ring-2 ring-green-400' 
                  : 'bg-slate-700 border-slate-600'
                }
                ${isRunning || !voiceSupported ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700 active:scale-95'}
                border-2 text-white px-3 py-3 rounded-lg font-semibold transition-all text-xs
              `}
            >
              <div className="flex flex-col items-center gap-1">
                <Mic size={16} />
                <span>Vocal</span>
                <span className="text-[10px] opacity-80">Mains libres</span>
              </div>
            </button>
          </div>
          {!isRunning && (
            <p className="text-slate-400 text-xs mt-3 text-center">
              {mode === 'instantane' 
                ? '⚡ Cliquez pendant l\'événement (capture 5s avant + 5s après)' 
                : mode === 'vocal'
                  ? '🎤 Dictez les labels à voix haute (capture 10s avant)'
                  : '📌 Appuyez 1× au début, 1× à la fin de l\'événement'}
            </p>
          )}
          
          {/* Aide vocale - Mots-clés à dire */}
          {!isRunning && mode === 'vocal' && (
            <div className="mt-3 bg-slate-700 border border-slate-500 rounded-lg p-4">
              <h3 className="text-white font-semibold text-sm mb-3 text-center">
                🎤 Phrases à dire pour chaque label
              </h3>
              <div className="space-y-2 text-xs">
                {labels.map(label => (
                  <div key={label.id} className="bg-slate-800 rounded p-2 border border-slate-600">
                    <div className="text-cyan-400 font-semibold mb-1">
                      {label.name}
                    </div>
                    <div className="text-slate-300 text-[11px] leading-relaxed">
                      {label.keywords.map((kw, idx) => (
                        <span key={idx}>
                          "{kw}"{idx < label.keywords.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-slate-400 text-[10px] mt-3 text-center italic">
                💡 Dites n'importe quelle phrase ci-dessus pour activer le label
              </p>
            </div>
          )}
          
          {isRunning && mode === 'vocal' && (
            <div className="mt-3 space-y-2">
              <div className="bg-green-900 border border-green-600 rounded-lg p-3">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-200 text-xs font-semibold">
                    🎤 Écoute en cours... Dictez les labels
                  </span>
                </div>
                {lastTranscript && (
                  <p className="text-center text-xs text-green-300 mt-2 font-mono">
                    Dernier: "{lastTranscript}"
                  </p>
                )}
              </div>
              
              {/* Bouton pour afficher/masquer l'aide */}
              <button
                onClick={() => setShowVoiceHelp(!showVoiceHelp)}
                className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95"
              >
                {showVoiceHelp ? '▼ Masquer l\'aide vocale' : '▶ Voir les phrases à dire'}
              </button>
              
              {/* Panneau d'aide vocale (collapsible) */}
              {showVoiceHelp && (
                <div className="bg-slate-700 border border-slate-500 rounded-lg p-3">
                  <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
                    {labels.map(label => (
                      <div key={label.id} className="bg-slate-800 rounded p-2 border border-slate-600">
                        <div className="text-cyan-400 font-semibold mb-1 text-[11px]">
                          {label.name}
                        </div>
                        <div className="text-slate-300 text-[10px] leading-relaxed">
                          {label.keywords.map((kw, idx) => (
                            <span key={idx}>
                              "{kw}"{idx < label.keywords.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {isRunning && mode !== 'vocal' && (
            <p className="text-amber-400 text-xs mt-3 text-center">
              🔒 Mode verrouillé pendant l'enregistrement
            </p>
          )}
        </div>

        {needsPermission && !imuPermission && (
          <div className="bg-blue-900 border border-blue-600 rounded-xl p-6 mb-4">
            <div className="flex items-start gap-4">
              <Smartphone className="text-blue-300 flex-shrink-0 mt-1" size={24} />
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-2">Autorisation requise</h3>
                <p className="text-blue-200 text-sm mb-4">
                  Pour enregistrer les données de l'accéléromètre, veuillez autoriser l'accès aux capteurs de mouvement.
                </p>
                <button
                  onClick={requestIMUPermission}
                  className="bg-blue-500 hover:bg-blue-600 active:scale-95 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2"
                >
                  <Smartphone size={18} />
                  Autoriser les capteurs
                </button>
              </div>
            </div>
          </div>
        )}

        {permissionDenied && (
          <div className="bg-red-900 border border-red-600 rounded-xl p-4 mb-4">
            <p className="text-red-200 text-sm">
              ❌ Permission refusée. Veuillez autoriser l'accès aux capteurs dans les paramètres de votre navigateur.
            </p>
          </div>
        )}

        {sensorWarning && (
          <div className="bg-amber-900 border border-amber-600 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-300" />
              <p className="text-amber-200 text-sm">{sensorWarning}</p>
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 mb-4">
          <button
            onClick={() => setShowSensors(!showSensors)}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-white">État des capteurs</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${imuPermission ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                {imuPermission ? '✓ Actifs' : '✗ Inactifs'}
              </span>
              {isRunning && (
                <span className="text-xs text-red-400 font-mono">🔴 {samplingFrequency}Hz</span>
              )}
            </div>
            <ChevronDown size={18} className={`text-slate-400 transition-transform ${showSensors ? 'rotate-180' : ''}`} />
          </button>

          {showSensors && (
            <div className="px-4 pb-4">
              {/* Sélecteur de fréquence */}
              {!isRunning && (
                <div className="mb-3 p-3 bg-slate-700 rounded-lg border border-slate-600">
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    ⚙️ Fréquence d'échantillonnage
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSamplingFrequency(2)}
                      className={`py-2 px-3 rounded-lg font-mono text-xs font-bold transition-all ${
                        samplingFrequency === 2
                          ? 'bg-cyan-500 text-white shadow-lg'
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                    >
                      2Hz <span className="font-normal opacity-75">Recommandé</span>
                    </button>
                    <button
                      onClick={() => setSamplingFrequency(4)}
                      className={`py-2 px-3 rounded-lg font-mono text-xs font-bold transition-all ${
                        samplingFrequency === 4
                          ? 'bg-cyan-500 text-white shadow-lg'
                          : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }`}
                    >
                      4Hz <span className="font-normal opacity-75">Haute résolution</span>
                    </button>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-slate-700 rounded p-2 border border-slate-600">
                  <p className="text-slate-400 text-[10px] font-mono mb-0.5">Acc X</p>
                  <p className={`text-sm font-bold font-mono ${imuPermission ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {imuPermission ? imuData.ax : '--'}
                  </p>
                </div>
                <div className="bg-slate-700 rounded p-2 border border-slate-600">
                  <p className="text-slate-400 text-[10px] font-mono mb-0.5">Acc Y</p>
                  <p className={`text-sm font-bold font-mono ${imuPermission ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {imuPermission ? imuData.ay : '--'}
                  </p>
                </div>
                <div className="bg-slate-700 rounded p-2 border border-slate-600">
                  <p className="text-slate-400 text-[10px] font-mono mb-0.5">Acc Z</p>
                  <p className={`text-sm font-bold font-mono ${imuPermission ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {imuPermission ? imuData.az : '--'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-700 rounded p-2 border border-slate-600">
                  <p className="text-slate-400 text-[10px] font-mono mb-0.5">Gyro X</p>
                  <p className={`text-sm font-bold font-mono ${imuPermission ? 'text-purple-400' : 'text-slate-500'}`}>
                    {imuPermission ? imuData.gx : '--'}
                  </p>
                </div>
                <div className="bg-slate-700 rounded p-2 border border-slate-600">
                  <p className="text-slate-400 text-[10px] font-mono mb-0.5">Gyro Y</p>
                  <p className={`text-sm font-bold font-mono ${imuPermission ? 'text-purple-400' : 'text-slate-500'}`}>
                    {imuPermission ? imuData.gy : '--'}
                  </p>
                </div>
                <div className="bg-slate-700 rounded p-2 border border-slate-600">
                  <p className="text-slate-400 text-[10px] font-mono mb-0.5">Gyro Z</p>
                  <p className={`text-sm font-bold font-mono ${imuPermission ? 'text-purple-400' : 'text-slate-500'}`}>
                    {imuPermission ? imuData.gz : '--'}
                  </p>
                </div>
              </div>
              {!imuPermission && (
                <p className="text-amber-400 text-xs mt-2 text-center">
                  ⚠️ Autorisez les capteurs pour voir les données en temps réel
                </p>
              )}
            </div>
          )}
        </div>

        {sessionStartDate && (
          <div className="bg-slate-800 rounded-lg p-3 mb-4 text-center border border-slate-600">
            <p className="text-xs text-slate-400 font-mono mb-1">Début</p>
            <p className="text-base font-semibold text-white font-mono">{formatDateTime(sessionStartDate)}</p>
          </div>
        )}

        {/* Indicateur Wake Lock */}
        {isRunning && wakeLock && (
          <div className="bg-green-900 border border-green-600 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-green-200 text-sm">
                🔒 Écran protégé - Pas de mise en veille
              </span>
            </div>
          </div>
        )}

        {!wakeLockSupported && (
          <div className="bg-amber-900 border border-amber-600 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 justify-center">
              <span className="text-amber-200 text-xs">
                ⚠️ Empêchez manuellement la mise en veille dans les paramètres de votre téléphone
              </span>
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-6 mb-4">
          <div className="text-center">
            {!isRunning && !sessionEnded ? (
              <>
                <div className="mb-6">
                  <div className="text-slate-400 text-lg mb-2">Prêt à démarrer</div>
                  <p className="text-slate-500 text-sm">Cliquez sur Démarrer pour lancer l'enregistrement</p>
                </div>
                <button
                  onClick={startSession}
                  disabled={!imuPermission}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white px-12 py-4 rounded-lg text-xl font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Play size={24} />
                  Démarrer
                </button>
              </>
            ) : isRunning ? (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-2xl font-bold text-red-500">REC</span>
                  </div>
                  <div className="text-slate-300 text-sm mb-1">Enregistrement en cours</div>
                  {sessionStartDate && (
                    <div className="text-slate-400 text-xs font-mono">
                      Démarré à {formatTimeOnly(sessionStartDate)}
                    </div>
                  )}
                </div>
                <button
                  onClick={endSession}
                  className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 active:scale-95 text-white px-12 py-4 rounded-lg text-xl font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Square size={24} />
                  Terminer
                </button>
              </>
            ) : (
              <div className="space-y-4">
                {uploadStatus === 'idle' && <p className="text-green-400 text-lg font-semibold">✓ Session terminée</p>}
                {uploadStatus === 'uploading' && <p className="text-blue-400 text-lg font-semibold">⏳ Envoi en cours...</p>}
                {uploadStatus === 'success' && <p className="text-green-400 text-lg font-semibold">✓ Envoyé avec succès !</p>}
                {uploadStatus === 'error' && <p className="text-orange-400 text-lg font-semibold">⚠️ Erreur d'envoi - Téléchargement local effectué</p>}
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <div className="relative w-full sm:w-auto sm:flex-1">
                    <div className="flex w-full">
                      <button
                        onClick={() => uploadToGitHub(currentSessionData.recordings, currentSessionData)}
                        disabled={uploadStatus === 'uploading' || !githubToken || !githubRepo}
                        className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black active:scale-95 disabled:opacity-50 text-white px-8 py-4 rounded-l-lg text-base font-semibold inline-flex items-center gap-2 justify-center flex-1"
                      >
                        <Github size={20} />
                        {uploadStatus === 'uploading' ? 'Envoi...' : 'Envoyer GitHub'}
                      </button>
                      <button
                        onClick={() => setShowGithubConfig(!showGithubConfig)}
                        className="bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black active:scale-95 text-white px-3 py-4 rounded-r-lg border-l border-slate-600 flex-shrink-0"
                      >
                        <ChevronDown size={20} className={showGithubConfig ? 'rotate-180' : ''} />
                      </button>
                    </div>
                    {showGithubConfig && (
                      <div className="absolute top-full left-0 mt-2 p-4 bg-slate-800 rounded-lg border border-slate-600 shadow-xl z-50 w-80">
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                          <Github size={16} className="inline mr-1" />
                          Configuration GitHub
                        </label>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Repository</label>
                            <input
                              type="text"
                              value={githubRepo}
                              onChange={(e) => {
                                setGithubRepo(e.target.value);
                                localStorage.setItem('githubRepo', e.target.value);
                              }}
                              placeholder="username/repository"
                              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Token</label>
                            <input
                              type="password"
                              value={githubToken}
                              onChange={(e) => {
                                setGithubToken(e.target.value);
                                localStorage.setItem('githubToken', e.target.value);
                              }}
                              placeholder="ghp_xxxxxxxxxxxx"
                              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Branche</label>
                            <input
                              type="text"
                              value={githubBranch}
                              onChange={(e) => {
                                setGithubBranch(e.target.value);
                                localStorage.setItem('githubBranch', e.target.value);
                              }}
                              placeholder="main"
                              className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => uploadToDrive(currentSessionData.recordings, currentSessionData)}
                    disabled={uploadStatus === 'uploading'}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 active:scale-95 disabled:opacity-50 text-white px-8 py-4 rounded-lg text-base font-semibold inline-flex items-center gap-2 justify-center w-full sm:w-auto sm:flex-1"
                  >
                    <Download size={20} />
                    {uploadStatus === 'uploading' ? 'Envoi...' : 'Envoyer Drive'}
                  </button>
                  <div className="relative w-full sm:w-auto sm:flex-1">
                    <div className="flex w-full">
                      <button
                        onClick={() => uploadToMQTT(currentSessionData.recordings, currentSessionData)}
                        disabled={uploadStatus === 'uploading'}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 disabled:opacity-50 text-white px-8 py-4 rounded-l-lg text-base font-semibold inline-flex items-center gap-2 justify-center flex-1"
                      >
                        <Radio size={20} />
                        {uploadStatus === 'uploading' ? 'Envoi...' : 'Envoyer MQTT'}
                      </button>
                      <button
                        onClick={() => setShowMqttConfig(!showMqttConfig)}
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white px-3 py-4 rounded-r-lg border-l border-amber-400 flex-shrink-0"
                      >
                        <ChevronDown size={20} className={showMqttConfig ? 'rotate-180' : ''} />
                      </button>
                    </div>
                    {showMqttConfig && (
                      <div className="absolute top-full left-0 mt-2 p-4 bg-slate-800 rounded-lg border border-slate-600 shadow-xl z-50 w-80">
                        <label className="block text-sm font-medium text-slate-300 mb-3">
                          <Radio size={16} className="inline mr-1" />
                          Configuration MQTT
                        </label>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">URL Proxy</label>
                            <input type="text" value={mqttProxyUrl} onChange={(e) => { setMqttProxyUrl(e.target.value); localStorage.setItem('mqttProxyUrl', e.target.value); }} placeholder="/api/mqtt-proxy" className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Host Broker</label>
                            <input type="text" value={mqttHost} onChange={(e) => { setMqttHost(e.target.value); localStorage.setItem('mqttHost', e.target.value); }} placeholder="94.23.12.188" className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-slate-400 block mb-1">Port</label>
                              <input type="text" value={mqttPort} onChange={(e) => { setMqttPort(e.target.value); localStorage.setItem('mqttPort', e.target.value); }} placeholder="1886" className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono" />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 block mb-1">Topic</label>
                              <input type="text" value={mqttTopic} onChange={(e) => { setMqttTopic(e.target.value); localStorage.setItem('mqttTopic', e.target.value); }} placeholder="driving/UIN/session" className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Username</label>
                            <input type="text" value={mqttUsername} onChange={(e) => { setMqttUsername(e.target.value); localStorage.setItem('mqttUsername', e.target.value); }} placeholder="thibaut_test" className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono" />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Password</label>
                            <input type="password" value={mqttPassword} onChange={(e) => { setMqttPassword(e.target.value); localStorage.setItem('mqttPassword', e.target.value); }} placeholder="••••••••" className="w-full bg-slate-700 text-white px-3 py-2 rounded text-sm border border-slate-500 focus:border-cyan-400 focus:outline-none font-mono" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => downloadCSV(currentSessionData.recordings, currentSessionData)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white px-8 py-4 rounded-lg text-base font-semibold inline-flex items-center gap-2 justify-center w-full sm:w-auto sm:flex-1"
                  >
                    <Download size={20} />
                    Télécharger CSV
                  </button>
                </div>
                
                {/* Liste des événements avec possibilité d'édition */}
                {currentSessionData && currentSessionData.recordings && currentSessionData.recordings.length > 0 && (
                  <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-white">Événements enregistrés</h2>
                      <span className="bg-green-900 text-green-300 text-xs px-3 py-1 rounded-full font-mono">
                        {currentSessionData.recordings.length} event{currentSessionData.recordings.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {currentSessionData.recordings.map((rec, idx) => (
                        <div key={rec.id || idx} className="bg-slate-700 p-3 rounded-lg border border-slate-600 animate-fadeIn">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2 flex-1">
                              <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                {editingId === rec.id ? (
                                  <div className="mb-2">
                                    <p className="text-xs text-slate-400 mb-2">Choisir le label :</p>
                                    <div className="grid grid-cols-2 gap-1">
                                      {labels.map(l => (
                                        <button key={l.id} onClick={() => editLabel(rec.id, l.id)} className={`${l.color} text-white px-2 py-1 rounded text-xs`}>
                                          {l.name}
                                        </button>
                                      ))}
                                    </div>
                                    <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 mt-1">Annuler</button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-medium text-white text-sm">{rec.label}</p>
                                    {rec.id && (
                                      <>
                                        <button onClick={() => setEditingId(rec.id)} className="text-slate-400 hover:text-cyan-400 transition-colors">
                                          <Edit2 size={12} />
                                        </button>
                                        <button onClick={() => deleteEvent(rec.id)} className="text-slate-400 hover:text-red-400 transition-colors">
                                          <Trash2 size={12} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-col gap-1 text-xs text-slate-400 font-mono">
                                  <div>📅 Début: {formatDateTimeOnly(rec.absoluteStartTime)}</div>
                                  <div>📅 Fin: {formatDateTimeOnly(rec.absoluteEndTime)}</div>
                                  <div className="flex flex-wrap gap-2 mt-1">
                                    <span className="text-cyan-400">⏱️ Durée: {rec.duration}</span>
                                    {rec.imuData && rec.imuData.length > 0 && (
                                      <>
                                        <span className="text-slate-500">•</span>
                                        <span className="text-cyan-400">{rec.imuData.length} mesures</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {!imuPermission && !isRunning && !sessionEnded && (
              <p className="text-amber-400 text-sm mt-3">
                ⚠️ Autorisez d'abord les capteurs pour démarrer
              </p>
            )}
          </div>
        </div>

        {mode !== 'vocal' && !sessionEnded && (
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mb-4">
            <h2 className="text-lg font-semibold text-white mb-4">Labels de conduite</h2>
            <div className="grid grid-cols-2 gap-2">
              {/* Colonne GAUCHE */}
              <div className="space-y-2">
                {/* Accélération */}
                {(() => {
                  const label = labels.find(l => l.id === 'acceleration');
                  const isPending = Object.values(pendingLabels).some(p => p.labelId === label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      disabled={!isRunning}
                      className={`
                        ${clickedLabel === label.id 
                          ? 'bg-green-500 ring-2 ring-green-300 shadow-2xl' 
                          : isPending
                            ? 'bg-orange-500 ring-2 ring-orange-300 shadow-xl animate-pulse'
                            : mode === 'borne' && activeLabels[label.id] 
                              ? `${label.color} ring-2 ring-white shadow-xl` 
                              : `${label.color}`
                        }
                        ${!isRunning ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
                        text-white px-4 py-5 rounded-lg text-sm font-semibold transition-all w-full text-center leading-tight
                      `}
                    >
                      <div>Accélération</div>
                      <div>agressive</div>
                    </button>
                  );
                })()}

                {/* Virage gauche */}
                {(() => {
                  const label = labels.find(l => l.id === 'left-turn');
                  const isPending = Object.values(pendingLabels).some(p => p.labelId === label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      disabled={!isRunning}
                      className={`
                        ${clickedLabel === label.id 
                          ? 'bg-green-500 ring-2 ring-green-300 shadow-2xl' 
                          : isPending
                            ? 'bg-orange-500 ring-2 ring-orange-300 shadow-xl animate-pulse'
                            : mode === 'borne' && activeLabels[label.id] 
                              ? `${label.color} ring-2 ring-white shadow-xl` 
                              : `${label.color}`
                        }
                        ${!isRunning ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
                        text-white px-4 py-5 rounded-lg text-sm font-semibold transition-all w-full text-center leading-tight
                      `}
                    >
                      <div>Virage agressif</div>
                      <div>à gauche</div>
                    </button>
                  );
                })()}

                {/* Changement de voie gauche */}
                {(() => {
                  const label = labels.find(l => l.id === 'left-lane');
                  const isPending = Object.values(pendingLabels).some(p => p.labelId === label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      disabled={!isRunning}
                      className={`
                        ${clickedLabel === label.id 
                          ? 'bg-green-500 ring-2 ring-green-300 shadow-2xl' 
                          : isPending
                            ? 'bg-orange-500 ring-2 ring-orange-300 shadow-xl animate-pulse'
                            : mode === 'borne' && activeLabels[label.id] 
                              ? `${label.color} ring-2 ring-white shadow-xl` 
                              : `${label.color}`
                        }
                        ${!isRunning ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
                        text-white px-4 py-5 rounded-lg text-sm font-semibold transition-all w-full text-center leading-tight
                      `}
                    >
                      <div>Changement de voie</div>
                      <div>agressif à gauche</div>
                    </button>
                  );
                })()}
              </div>

              {/* Colonne DROITE */}
              <div className="space-y-2">
                {/* Freinage */}
                {(() => {
                  const label = labels.find(l => l.id === 'braking');
                  const isPending = Object.values(pendingLabels).some(p => p.labelId === label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      disabled={!isRunning}
                      className={`
                        ${clickedLabel === label.id 
                          ? 'bg-green-500 ring-2 ring-green-300 shadow-2xl' 
                          : isPending
                            ? 'bg-orange-500 ring-2 ring-orange-300 shadow-xl animate-pulse'
                            : mode === 'borne' && activeLabels[label.id] 
                              ? `${label.color} ring-2 ring-white shadow-xl` 
                              : `${label.color}`
                        }
                        ${!isRunning ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
                        text-white px-4 py-5 rounded-lg text-sm font-semibold transition-all w-full text-center leading-tight
                      `}
                    >
                      <div>Freinage</div>
                      <div>agressif</div>
                    </button>
                  );
                })()}

                {/* Virage droite */}
                {(() => {
                  const label = labels.find(l => l.id === 'right-turn');
                  const isPending = Object.values(pendingLabels).some(p => p.labelId === label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      disabled={!isRunning}
                      className={`
                        ${clickedLabel === label.id 
                          ? 'bg-green-500 ring-2 ring-green-300 shadow-2xl' 
                          : isPending
                            ? 'bg-orange-500 ring-2 ring-orange-300 shadow-xl animate-pulse'
                            : mode === 'borne' && activeLabels[label.id] 
                              ? `${label.color} ring-2 ring-white shadow-xl` 
                              : `${label.color}`
                        }
                        ${!isRunning ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
                        text-white px-4 py-5 rounded-lg text-sm font-semibold transition-all w-full text-center leading-tight
                      `}
                    >
                      <div>Virage agressif</div>
                      <div>à droite</div>
                    </button>
                  );
                })()}

                {/* Changement de voie droite */}
                {(() => {
                  const label = labels.find(l => l.id === 'right-lane');
                  const isPending = Object.values(pendingLabels).some(p => p.labelId === label.id);
                  return (
                    <button
                      key={label.id}
                      onClick={() => toggleLabel(label.id)}
                      disabled={!isRunning}
                      className={`
                        ${clickedLabel === label.id 
                          ? 'bg-green-500 ring-2 ring-green-300 shadow-2xl' 
                          : isPending
                            ? 'bg-orange-500 ring-2 ring-orange-300 shadow-xl animate-pulse'
                            : mode === 'borne' && activeLabels[label.id] 
                              ? `${label.color} ring-2 ring-white shadow-xl` 
                              : `${label.color}`
                        }
                        ${!isRunning ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
                        text-white px-4 py-5 rounded-lg text-sm font-semibold transition-all w-full text-center leading-tight
                      `}
                    >
                      <div>Changement de voie</div>
                      <div>agressif à droite</div>
                    </button>
                  );
                })()}
              </div>
            </div>
          {isRunning && (
            <p className="text-slate-400 text-xs mt-3 text-center">
              {mode === 'borne' 
                ? '🎯 Cliquez pour démarrer/arrêter chaque phase' 
                : '⚡ Cliquez pendant l\'événement (5s avant + 5s après)'}
            </p>
          )}
        </div>
        )}

        {mode === 'vocal' && (
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-6 mb-4">
            <h2 className="text-lg font-semibold text-white mb-4 text-center">🎤 Mode Vocal</h2>
            
            {isRunning ? (
              <div className="space-y-4">
                <div className="bg-green-900 border-2 border-green-500 rounded-lg p-4">
                  <div className="flex items-center gap-3 justify-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-200 font-semibold text-lg">Écoute en cours...</span>
                  </div>
                  <p className="text-center text-green-300 text-sm mt-2">
                    Dictez les labels à voix haute
                  </p>
                </div>

                {lastTranscript && (
                  <div className="bg-blue-900 border border-blue-500 rounded-lg p-4">
                    <p className="text-blue-300 text-xs mb-2">Dernière phrase détectée :</p>
                    <p className="text-white font-mono text-base text-center">"{lastTranscript}"</p>
                  </div>
                )}

                {clickedLabel && (
                  <div className="bg-green-600 border-2 border-green-400 rounded-lg p-4 animate-pulse">
                    <p className="text-white font-bold text-center text-lg">
                      ✅ {labels.find(l => l.id === clickedLabel)?.name}
                    </p>
                    <p className="text-green-200 text-sm text-center mt-1">
                      Label reconnu et enregistré !
                    </p>
                  </div>
                )}

                <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                  <p className="text-slate-300 text-sm font-semibold mb-3 text-center">Commandes disponibles :</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Ligne 1: Freinage et Accélération */}
                    <div className="bg-slate-600 rounded px-3 py-2 text-slate-200 text-center">
                      Freinage agressif
                    </div>
                    <div className="bg-slate-600 rounded px-3 py-2 text-slate-200 text-center">
                      Accélération agressive
                    </div>
                    
                    {/* Ligne 2: Virages */}
                    <div className="bg-slate-600 rounded px-3 py-2 text-slate-200 text-center">
                      Virage agressif à gauche
                    </div>
                    <div className="bg-slate-600 rounded px-3 py-2 text-slate-200 text-center">
                      Virage agressif à droite
                    </div>
                    
                    {/* Ligne 3: Changements de voie */}
                    <div className="bg-slate-600 rounded px-3 py-2 text-slate-200 text-center">
                      Changement de voie agressif à gauche
                    </div>
                    <div className="bg-slate-600 rounded px-3 py-2 text-slate-200 text-center">
                      Changement de voie agressif à droite
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">Cliquez sur "Démarrer" pour activer la reconnaissance vocale</p>
                <p className="text-slate-500 text-sm">Le micro s'activera automatiquement</p>
              </div>
            )}
          </div>
        )}

        {isRunning && recordings.length > 0 && (
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Événements enregistrés</h2>
              <span className="bg-green-900 text-green-300 text-xs px-3 py-1 rounded-full font-mono">
                {recordings.length} event{recordings.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recordings.map((rec, idx) => (
                <div key={rec.id || idx} className="bg-slate-700 p-3 rounded-lg border border-slate-600 animate-fadeIn">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        {editingId === rec.id ? (
                          <div className="mb-2">
                            <p className="text-xs text-slate-400 mb-2">Choisir le label :</p>
                            <div className="grid grid-cols-2 gap-1">
                              {labels.map(l => (
                                <button key={l.id} onClick={() => editLabel(rec.id, l.id)} className={`${l.color} text-white px-2 py-1 rounded text-xs`}>
                                  {l.name}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 mt-1">Annuler</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-white text-sm">{rec.label}</p>
                            {isRunning && rec.id && (
                              <>
                                <button onClick={() => setEditingId(rec.id)} className="text-slate-400 hover:text-cyan-400 transition-colors">
                                  <Edit2 size={12} />
                                </button>
                                <button onClick={() => deleteEvent(rec.id)} className="text-slate-400 hover:text-red-400 transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        <div className="flex flex-col gap-1 text-xs text-slate-400 font-mono">
                          <div>📅 Début: {formatDateTimeOnly(rec.absoluteStartTime)}</div>
                          <div>📅 Fin: {formatDateTimeOnly(rec.absoluteEndTime)}</div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-cyan-400">⏱️ Durée: {rec.duration}</span>
                            {rec.imuData && rec.imuData.length > 0 && (
                              <>
                                <span className="text-slate-500">•</span>
                                <span className="text-cyan-400">{rec.imuData.length} mesures</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isRunning && imuHistory.length > 0 && (
          <div className="bg-emerald-900 border border-emerald-600 rounded-xl p-4">
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-emerald-200 font-mono text-sm">
                Enregistrement continu : {imuHistory.length} mesures ({samplingFrequency}Hz)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
