import React, { useState, useEffect } from 'react';
import { Play, Square, Download, ArrowLeft, Clock, Database, Trash2, Smartphone, CheckCircle } from 'lucide-react';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [sessions, setSessions] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [sessionStartDate, setSessionStartDate] = useState(null);
  const [activeLabels, setActiveLabels] = useState({});
  const [recordings, setRecordings] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [currentSessionData, setCurrentSessionData] = useState(null);
  const [imuData, setImuData] = useState({ ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 });
  const [imuPermission, setImuPermission] = useState(false);
  const [imuHistory, setImuHistory] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [needsPermission, setNeedsPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const labels = [
    { id: 'non-aggressive', name: 'Non agressive', color: 'bg-emerald-500' },
    { id: 'right-turn', name: 'Virage agressif à droite', color: 'bg-amber-500' },
    { id: 'left-turn', name: 'Virage agressif à gauche', color: 'bg-orange-500' },
    { id: 'right-lane', name: 'Changement de voie agressif à droite', color: 'bg-rose-500' },
    { id: 'left-lane', name: 'Changement de voie agressif à gauche', color: 'bg-red-500' },
    { id: 'braking', name: 'Freinage agressif', color: 'bg-purple-500' },
    { id: 'acceleration', name: 'Accélération agressive', color: 'bg-blue-500' }
  ];

  useEffect(() => {
    loadSessions();
  }, []);

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
    console.log('🎯 Demande de permission IMU...');
    
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permissionState = await DeviceMotionEvent.requestPermission();
        if (permissionState === 'granted') {
          console.log('✅ Permission accordée !');
          setImuPermission(true);
          setNeedsPermission(false);
          setPermissionDenied(false);
          return true;
        } else {
          console.warn('❌ Permission refusée');
          setPermissionDenied(true);
          setNeedsPermission(false);
          return false;
        }
      } catch (err) {
        console.error('Erreur permission:', err);
        setPermissionDenied(true);
        return false;
      }
    } else {
      console.log('📱 Appareil non-iOS - Activation directe');
      setImuPermission(true);
      setNeedsPermission(false);
      return true;
    }
  };

  useEffect(() => {
    if (currentPage !== 'labeling') return;

    console.log('🎯 Page labeling active...');

    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      setNeedsPermission(true);
      return;
    }

    const handleMotion = (event) => {
      if (event.acceleration && event.rotationRate) {
        const newImuData = {
          ax: event.acceleration.x?.toFixed(2) || 0,
          ay: event.acceleration.y?.toFixed(2) || 0,
          az: event.acceleration.z?.toFixed(2) || 0,
          gx: event.rotationRate.alpha?.toFixed(2) || 0,
          gy: event.rotationRate.beta?.toFixed(2) || 0,
          gz: event.rotationRate.gamma?.toFixed(2) || 0
        };
        setImuData(newImuData);
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    setImuPermission(true);
    console.log('📱 Capteurs IMU activés (Android)');

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      console.log('🛑 Capteurs IMU désactivés');
    };
  }, [currentPage]);

  useEffect(() => {
    if (!imuPermission || currentPage !== 'labeling') return;

    const handleMotion = (event) => {
      if (event.acceleration && event.rotationRate) {
        const newImuData = {
          ax: event.acceleration.x?.toFixed(2) || 0,
          ay: event.acceleration.y?.toFixed(2) || 0,
          az: event.acceleration.z?.toFixed(2) || 0,
          gx: event.rotationRate.alpha?.toFixed(2) || 0,
          gy: event.rotationRate.beta?.toFixed(2) || 0,
          gz: event.rotationRate.gamma?.toFixed(2) || 0
        };
        setImuData(newImuData);
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    console.log('📱 Listener IMU activé');

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [imuPermission, currentPage]);

  // CORRECTION: Enregistrement des données IMU toutes les 0.5 secondes DÈS QUE LA SESSION DÉMARRE
  // Plus besoin d'attendre qu'un label soit actif !
  useEffect(() => {
    if (!isRunning) return; // Enregistre dès que isRunning = true

    const interval = setInterval(() => {
      const dataPoint = {
        timestamp: Date.now(),
        ax: parseFloat(imuData.ax) || 0,
        ay: parseFloat(imuData.ay) || 0,
        gz: parseFloat(imuData.gz) || 0
      };
      setImuHistory(prev => {
        const updated = [...prev, dataPoint];
        console.log('💾 IMU enregistré (2Hz):', dataPoint, '| Total:', updated.length);
        return updated;
      });
    }, 500); // 500ms = 0.5 seconde = 2Hz

    return () => clearInterval(interval);
  }, [isRunning, imuData]); // Dépend seulement de isRunning et imuData, pas de activeLabels

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

  const startSession = () => {
    const now = new Date();
    console.log('🚀 Démarrage session - Enregistrement IMU continu à 2Hz');
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
  };

  const toggleLabel = (labelId) => {
    if (!isRunning) return;

    const currentTime = elapsedTime;
    const currentTimestamp = Date.now();
    const newRecordings = [...recordings];
    
    if (recordings.length === 0 && Object.keys(activeLabels).length === 0) {
      const initImuData = imuHistory.filter(d => d.timestamp <= currentTimestamp);
      console.log('📝 Initialisation - IMU data:', initImuData.length, 'points (2Hz)');
      newRecordings.push({
        label: 'Initialisation',
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
      
      console.log(`📝 ${labels.find(l => l.id === labelId).name} - IMU data:`, periodImuData.length, 'points (2Hz)');
      console.log('Données IMU:', periodImuData);
      
      newRecordings.push({
        label: labels.find(l => l.id === labelId).name,
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
          startTime: formatTime(startTimeLabel),
          endTime: formatTime(currentTime),
          duration: formatTime(currentTime - startTimeLabel),
          absoluteStartTime: new Date(sessionStartDate.getTime() + startTimeLabel),
          absoluteEndTime: new Date(sessionStartDate.getTime() + currentTime),
          imuData: periodImuData
        });
      });
      
      setActiveLabels({ [labelId]: { time: currentTime, timestamp: currentTimestamp } });
      setRecordings(newRecordings);
    }
  };

  const endSession = () => {
    const finalRecordings = [...recordings];
    const currentTime = elapsedTime;
    const endDate = new Date();
    const currentTimestamp = Date.now();
    
    console.log('🏁 Fin de session - Total IMU history:', imuHistory.length, 'points (2Hz)');
    
    if (finalRecordings.length === 0 && Object.keys(activeLabels).length === 0) {
      finalRecordings.push({
        label: 'Initialisation',
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

    finalRecordings.push({
      label: 'Fin',
      startTime: formatTime(currentTime),
      endTime: formatTime(currentTime),
      duration: '00:00.00',
      absoluteStartTime: endDate,
      absoluteEndTime: endDate,
      imuData: []
    });

    console.log('💾 Enregistrements finaux:', finalRecordings.map(r => ({
      label: r.label,
      imuPoints: r.imuData?.length || 0,
      sampleData: r.imuData?.slice(0, 3) // Afficher les 3 premières mesures pour debug
    })));

    const newSession = {
      id: Date.now(),
      startDate: sessionStartDate,
      endDate: endDate,
      duration: formatTime(currentTime),
      recordings: finalRecordings
    };

    const updatedSessions = [newSession, ...sessions];
    saveSessions(updatedSessions);
    
    setRecordings(finalRecordings);
    setActiveLabels({});
    setIsRunning(false);
    setSessionEnded(true);
    setCurrentSessionData(newSession);
  };

  const downloadCSV = (data, session) => {
    const removeAccents = (str) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };
    
    const headers = ['Heure', 'Label', 'Debut chrono', 'Fin chrono', 'Duree', 'Acceleration X', 'Acceleration Y', 'Gyroscope Z'];
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => {
        const axList = row.imuData && row.imuData.length > 0 ? row.imuData.map(d => d.ax).join(';') : '';
        const ayList = row.imuData && row.imuData.length > 0 ? row.imuData.map(d => d.ay).join(';') : '';
        const gzList = row.imuData && row.imuData.length > 0 ? row.imuData.map(d => d.gz).join(';') : '';
        
        console.log('CSV Row:', row.label, '- ax:', axList.substring(0, 50), '- ay:', ayList.substring(0, 50), '- gz:', gzList.substring(0, 50));
        
        return `"${formatDateTime(row.absoluteStartTime)}","${removeAccents(row.label)}","${row.startTime}","${row.endTime}","${row.duration}","${axList}","${ayList}","${gzList}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `labelisation_${new Date(session.startDate).toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadToDrive = async (data, session) => {
    setUploadStatus('uploading');
    
    const removeAccents = (str) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };
    
    const headers = ['Heure', 'Label', 'Debut chrono', 'Fin chrono', 'Duree', 'Acceleration X', 'Acceleration Y', 'Gyroscope Z'];
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => {
        const axList = row.imuData && row.imuData.length > 0 ? row.imuData.map(d => d.ax).join(';') : '';
        const ayList = row.imuData && row.imuData.length > 0 ? row.imuData.map(d => d.ay).join(';') : '';
        const gzList = row.imuData && row.imuData.length > 0 ? row.imuData.map(d => d.gz).join(';') : '';
        
        return `"${formatDateTime(row.absoluteStartTime)}","${removeAccents(row.label)}","${row.startTime}","${row.endTime}","${row.duration}","${axList}","${ayList}","${gzList}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const formData = new FormData();
    formData.append('file', blob, `labelisation_${new Date(session.startDate).toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);

    try {
      const response = await fetch('https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        console.log('✓ Fichier uploadé');
        setUploadStatus('success');
        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      setUploadStatus('error');
      downloadCSV(data, session);
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  const deleteSession = (sessionId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce trajet ?')) {
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      saveSessions(updatedSessions);
    }
  };

  // Page d'accueil
  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-slate-700 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Labelisation de conduite
            </h1>
            <p className="text-slate-300 font-mono text-xs sm:text-sm">Système mobile de collecte de données</p>
          </div>

          <div className="text-center mb-8">
            <button
              onClick={() => setCurrentPage('labeling')}
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

  // Page de détails
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
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <span className="font-medium text-white text-sm">{rec.label}</span>
                    <span className="text-xs text-slate-300 font-mono">
                      {rec.startTime} → {rec.endTime}
                    </span>
                  </div>
                  {rec.imuData && rec.imuData.length > 0 && (
                    <p className="text-xs text-cyan-400 font-mono mt-1">
                      {rec.imuData.length} mesures IMU (2Hz)
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={() => downloadCSV(selectedSession.recordings, selectedSession)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
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

  // Page de labelisation
  return (
    <div className="min-h-screen bg-slate-700 p-4 sm:p-8 pb-safe">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => {
            if (isRunning) {
              if (window.confirm('Voulez-vous vraiment quitter ? La session en cours sera perdue.')) {
                setIsRunning(false);
                setCurrentPage('home');
              }
            } else {
              setCurrentPage('home');
            }
          }}
          className="mb-4 text-slate-300 hover:text-white inline-flex items-center gap-2 active:scale-95"
        >
          <ArrowLeft size={18} />
          Retour
        </button>

        {/* Bouton de permission iOS */}
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

        {/* Message permission refusée */}
        {permissionDenied && (
          <div className="bg-red-900 border border-red-600 rounded-xl p-4 mb-4">
            <p className="text-red-200 text-sm">
              ❌ Permission refusée. Veuillez autoriser l'accès aux capteurs dans les paramètres de votre navigateur.
            </p>
          </div>
        )}

        {/* État des capteurs */}
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h2 className="text-lg font-semibold text-white">État des capteurs</h2>
              <p className="text-xs text-slate-400 font-mono mt-1">
                {isRunning ? '🔴 Enregistrement continu à 2Hz' : 'Fréquence: 2Hz (0.5s)'}
              </p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-mono ${imuPermission ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              {imuPermission ? '✓ Actifs' : '✗ Inactifs'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-700 rounded p-3 border border-slate-600">
              <p className="text-slate-400 text-xs font-mono mb-1">Acc X</p>
              <p className={`text-lg font-bold font-mono ${imuPermission ? 'text-cyan-400' : 'text-slate-500'}`}>
                {imuPermission ? imuData.ax : '--'}
              </p>
            </div>
            <div className="bg-slate-700 rounded p-3 border border-slate-600">
              <p className="text-slate-400 text-xs font-mono mb-1">Acc Y</p>
              <p className={`text-lg font-bold font-mono ${imuPermission ? 'text-cyan-400' : 'text-slate-500'}`}>
                {imuPermission ? imuData.ay : '--'}
              </p>
            </div>
            <div className="bg-slate-700 rounded p-3 border border-slate-600">
              <p className="text-slate-400 text-xs font-mono mb-1">Gyro Z</p>
              <p className={`text-lg font-bold font-mono ${imuPermission ? 'text-purple-400' : 'text-slate-500'}`}>
                {imuPermission ? imuData.gz : '--'}
              </p>
            </div>
          </div>
          {!imuPermission && (
            <p className="text-amber-400 text-xs mt-3 text-center">
              ⚠️ Autorisez les capteurs pour voir les données en temps réel
            </p>
          )}
        </div>

        {sessionStartDate && (
          <div className="bg-slate-800 rounded-lg p-3 mb-4 text-center border border-slate-600">
            <p className="text-xs text-slate-400 font-mono mb-1">Début</p>
            <p className="text-base font-semibold text-white font-mono">{formatDateTime(sessionStartDate)}</p>
          </div>
        )}

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-6 mb-4">
          <div className="text-center">
            <div className="text-5xl sm:text-6xl font-mono font-bold text-white mb-6">
              {formatTime(elapsedTime)}
            </div>
            
            {!isRunning && !sessionEnded ? (
              <button
                onClick={startSession}
                disabled={!imuPermission}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white px-12 py-4 rounded-lg text-xl font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Play size={24} />
                Démarrer
              </button>
            ) : isRunning ? (
              <button
                onClick={endSession}
                className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 active:scale-95 text-white px-12 py-4 rounded-lg text-xl font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Square size={24} />
                Terminer
              </button>
            ) : (
              <div className="space-y-4">
                {uploadStatus === 'idle' && <p className="text-green-400 text-lg font-semibold">✓ Session terminée</p>}
                {uploadStatus === 'uploading' && <p className="text-blue-400 text-lg font-semibold">⏳ Envoi en cours...</p>}
                {uploadStatus === 'success' && <p className="text-green-400 text-lg font-semibold">✓ Envoyé avec succès !</p>}
                {uploadStatus === 'error' && <p className="text-orange-400 text-lg font-semibold">⚠️ Erreur d'envoi</p>}
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => uploadToDrive(currentSessionData.recordings, currentSessionData)}
                    disabled={uploadStatus === 'uploading'}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 active:scale-95 disabled:opacity-50 text-white px-8 py-4 rounded-lg text-base font-semibold inline-flex items-center gap-2 justify-center"
                  >
                    <Download size={20} />
                    {uploadStatus === 'uploading' ? 'Envoi...' : 'Envoyer Drive'}
                  </button>
                  <button
                    onClick={() => downloadCSV(currentSessionData.recordings, currentSessionData)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white px-8 py-4 rounded-lg text-base font-semibold inline-flex items-center gap-2 justify-center"
                  >
                    <Download size={20} />
                    Télécharger CSV
                  </button>
                </div>
              </div>
            )}
            {!imuPermission && !isRunning && !sessionEnded && (
              <p className="text-amber-400 text-sm mt-3">
                ⚠️ Autorisez d'abord les capteurs pour démarrer
              </p>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mb-4">
          <h2 className="text-lg font-semibold text-white mb-4">Labels de conduite</h2>
          <div className="grid grid-cols-1 gap-3">
            {labels.map(label => (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                disabled={!isRunning}
                className={`
                  ${activeLabels[label.id] 
                    ? `${label.color} ring-2 ring-white shadow-xl` 
                    : 'bg-slate-700 border border-slate-600'
                  }
                  ${!isRunning ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}
                  text-white px-4 py-4 rounded-lg text-base font-semibold transition-all
                `}
              >
                <div className="flex items-center justify-between">
                  <span>{label.name}</span>
                  {activeLabels[label.id] && (
                    <span className="text-xs bg-white/30 px-2 py-1 rounded animate-pulse">●</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Historique en temps réel des événements enregistrés */}
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
                <div key={idx} className="bg-slate-700 p-3 rounded-lg border border-slate-600 animate-fadeIn">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm mb-1">{rec.label}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-400 font-mono">
                          <span>{rec.startTime} → {rec.endTime}</span>
                          <span className="text-slate-500">•</span>
                          <span>Durée: {rec.duration}</span>
                          {rec.imuData && rec.imuData.length > 0 && (
                            <>
                              <span className="text-slate-500">•</span>
                              <span className="text-cyan-400">{rec.imuData.length} mesures (2Hz)</span>
                            </>
                          )}
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
                Enregistrement continu : {imuHistory.length} mesures (2Hz)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
