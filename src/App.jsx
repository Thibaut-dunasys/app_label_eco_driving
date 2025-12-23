import React, { useState, useEffect } from 'react';
import { Play, Square, Download, ArrowLeft, Clock, Database, Trash2, Car, Edit2, Check } from 'lucide-react';
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
  const [carName, setCarName] = useState('');
  const [isEditingCarName, setIsEditingCarName] = useState(false);
  const [tempCarName, setTempCarName] = useState('');

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
    const savedCarName = localStorage.getItem('carName');
    if (savedCarName) setCarName(savedCarName);
  }, []);

  const saveCarName = (name) => {
    setCarName(name);
    localStorage.setItem('carName', name);
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

  // Gestion de la centrale inertielle (IMU) - Actif dès l'arrivée sur la page
  useEffect(() => {
    if (currentPage !== 'labeling') return;

    console.log('🎯 Activation des capteurs IMU...');

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

    // iOS 13+ nécessite une permission explicite
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      console.log('📱 iOS détecté - Demande de permission...');
      DeviceMotionEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            console.log('✅ Permission accordée !');
            window.addEventListener('devicemotion', handleMotion);
            setImuPermission(true);
          } else {
            console.warn('❌ Permission refusée');
          }
        })
        .catch(err => {
          console.error('Erreur permission:', err);
        });
    } else {
      // Autres appareils
      console.log('📱 Appareil non-iOS - Activation directe');
      window.addEventListener('devicemotion', handleMotion);
      setImuPermission(true);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      console.log('🛑 Capteurs IMU désactivés');
    };
  }, [currentPage]);

  // Enregistrement des données IMU toutes les secondes
  useEffect(() => {
    if (!isRunning || Object.keys(activeLabels).length === 0) return;

    const interval = setInterval(() => {
      const dataPoint = {
        timestamp: Date.now(),
        ax: imuData.ax,
        ay: imuData.ay,
        gz: imuData.gz
      };
      setImuHistory(prev => {
        const updated = [...prev, dataPoint];
        console.log('💾 IMU enregistré:', dataPoint, '| Total:', updated.length);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, activeLabels, imuData]);

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
    console.log('🚀 Démarrage session');
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
      console.log('📝 Initialisation - IMU data:', initImuData.length, 'points');
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
      
      console.log(`📝 ${labels.find(l => l.id === labelId).name} - IMU data:`, periodImuData.length, 'points');
      
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
    
    console.log('🏁 Fin de session - Total IMU history:', imuHistory.length, 'points');
    
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
      imuPoints: r.imuData?.length || 0
    })));

    const newSession = {
      id: Date.now(),
      startDate: sessionStartDate,
      endDate: endDate,
      duration: formatTime(currentTime),
      carName: carName || null,
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
        const axList = row.imuData ? row.imuData.map(d => d.ax).join(';') : '';
        const ayList = row.imuData ? row.imuData.map(d => d.ay).join(';') : '';
        const gzList = row.imuData ? row.imuData.map(d => d.gz).join(';') : '';
        
        return `"${formatDateTime(row.absoluteStartTime)}","${removeAccents(row.label)}","${row.startTime}","${row.endTime}","${row.duration}","${axList}","${ayList}","${gzList}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const carNamePart = session.carName ? `_${removeAccents(session.carName).replace(/\s+/g, '')}` : '';
    link.setAttribute('download', `labelisation${carNamePart}_${new Date(session.startDate).toISOString().slice(0, 19).replace(/:/g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadToDrive = async (data, session) => {
    setUploadStatus('uploading');
    
    try {
      const removeAccents = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      };
      
      const headers = ['Heure', 'Label', 'Debut chrono', 'Fin chrono', 'Duree', 'Acceleration X', 'Acceleration Y', 'Gyroscope Z'];
      
      const csvContent = [
        headers.join(','),
        ...data.map(row => {
          const axList = row.imuData ? row.imuData.map(d => d.ax).join(';') : '';
          const ayList = row.imuData ? row.imuData.map(d => d.ay).join(';') : '';
          const gzList = row.imuData ? row.imuData.map(d => d.gz).join(';') : '';
          
          return `"${formatDateTime(row.absoluteStartTime)}","${removeAccents(row.label)}","${row.startTime}","${row.endTime}","${row.duration}","${axList}","${ayList}","${gzList}"`;
        })
      ].join('\n');

      const base64CSV = btoa(unescape(encodeURIComponent(csvContent)));
      
      const carNamePart = session.carName ? `_${removeAccents(session.carName).replace(/\s+/g, '')}` : '';
      const fileName = `labelisation${carNamePart}_${new Date(session.startDate).toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;

      const params = new URLSearchParams();
      params.append('file', base64CSV);
      params.append('fileName', fileName);

      const response = await fetch('https://script.google.com/macros/s/AKfycbxiMLcvhyhqnNvkFmrtKtwsdcdkbuhdH4hRwmIF09GSYAzPoWal672F2UYwSF4xGhYb/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus('success');
        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        throw new Error(result.message || 'Upload failed');
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

  // Demander la permission IMU sur iOS dès le premier clic
  const requestIMUPermission = () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            console.log('✅ Permission IMU accordée');
          }
        })
        .catch(console.error);
    }
  };

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
              onClick={() => {
                requestIMUPermission();
                setCurrentPage('labeling');
              }}
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
                  <div key={session.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4 active:bg-slate-650">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                      <div className="flex-1">
                        {session.carName && (
                          <div className="flex items-center gap-2 mb-2">
                            <Car size={16} className="text-cyan-400" />
                            <span className="text-cyan-400 font-semibold text-sm">{session.carName}</span>
                          </div>
                        )}
                        <div className="text-white font-medium font-mono text-sm mb-2">
                          {formatDateTime(session.startDate)}
                        </div>
                        <div className="flex items-center gap-4 text-slate-300 text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} />
                            <span>{session.duration}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Database size={12} />
                            <span>{session.recordings.length} events</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            setCurrentPage('details');
                          }}
                          className="flex-1 sm:flex-none bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:scale-95 text-white px-4 py-2 rounded-md font-semibold text-sm"
                        >
                          Analyser
                        </button>
                        <button
                          onClick={() => downloadCSV(session.recordings, session)}
                          className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white px-4 py-2 rounded-md font-semibold inline-flex items-center justify-center gap-1.5 text-sm"
                        >
                          <Download size={14} />
                          CSV
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 active:scale-95 text-white px-3 py-2 rounded-md font-semibold text-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
            onClick={() => setCurrentPage('home')}
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
                      {rec.startTime} → {rec.endTime} | {rec.imuData?.length || 0} pts IMU
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={() => downloadCSV(selectedSession.recordings, selectedSession)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Download size={18} />
                Télécharger
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-700 p-4 sm:p-8 pb-safe">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => {
            if (isRunning) {
              if (window.confirm('Voulez-vous vraiment quitter ?')) {
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
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 active:scale-95 text-white px-12 py-4 rounded-lg text-xl font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
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
                {uploadStatus === 'idle' && <p className="text-green-400 text-lg font-semibold">Session terminée</p>}
                {uploadStatus === 'uploading' && <p className="text-blue-400 text-lg font-semibold">⏳ Envoi...</p>}
                {uploadStatus === 'success' && <p className="text-green-400 text-lg font-semibold">✓ Envoyé !</p>}
                {uploadStatus === 'error' && <p className="text-orange-400 text-lg font-semibold">⚠️ Erreur</p>}
                
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
                    Télécharger
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Labels</h2>
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
                  ${!isRunning ? 'opacity-40' : 'active:scale-95'}
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

        {currentPage === 'labeling' && (
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mt-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-white">Capteurs IMU</h2>
              <div className="flex items-center gap-2">
                {imuPermission ? (
                  <span className="text-emerald-400 font-mono text-xs flex items-center gap-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    Actif
                  </span>
                ) : (
                  <span className="text-orange-400 font-mono text-xs">⚠️ Inactif</span>
                )}
                {isRunning && (
                  <span className="text-slate-400 font-mono text-xs">
                    {imuHistory.length} pts
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-700 rounded p-3 border border-slate-600">
                <p className="text-slate-400 text-xs font-mono mb-1">Accélération X</p>
                <p className={`text-2xl font-bold font-mono ${parseFloat(imuData.ax) !== 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {imuData.ax}
                </p>
                <p className="text-slate-500 text-xs font-mono">m/s²</p>
              </div>
              <div className="bg-slate-700 rounded p-3 border border-slate-600">
                <p className="text-slate-400 text-xs font-mono mb-1">Accélération Y</p>
                <p className={`text-2xl font-bold font-mono ${parseFloat(imuData.ay) !== 0 ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {imuData.ay}
                </p>
                <p className="text-slate-500 text-xs font-mono">m/s²</p>
              </div>
              <div className="bg-slate-700 rounded p-3 border border-slate-600">
                <p className="text-slate-400 text-xs font-mono mb-1">Gyroscope Z</p>
                <p className={`text-2xl font-bold font-mono ${parseFloat(imuData.gz) !== 0 ? 'text-purple-400' : 'text-slate-500'}`}>
                  {imuData.gz}
                </p>
                <p className="text-slate-500 text-xs font-mono">°/s</p>
              </div>
            </div>
            {!imuPermission && (
              <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="text-orange-400 text-xs text-center">
                  Sur iOS : cliquez sur "Nouveau trajet" puis autorisez l'accès aux capteurs
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

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
    // Empêcher le zoom sur mobile
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
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

  useEffect(() => {
    if (!isRunning) return;

    const handleMotion = (event) => {
      if (event.acceleration && event.rotationRate) {
        setImuData({
          ax: event.acceleration.x?.toFixed(2) || 0,
          ay: event.acceleration.y?.toFixed(2) || 0,
          az: event.acceleration.z?.toFixed(2) || 0,
          gx: event.rotationRate.alpha?.toFixed(2) || 0,
          gy: event.rotationRate.beta?.toFixed(2) || 0,
          gz: event.rotationRate.gamma?.toFixed(2) || 0
        });
      }
    };

    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
            setImuPermission(true);
          }
        })
        .catch(console.error);
    } else {
      window.addEventListener('devicemotion', handleMotion);
      setImuPermission(true);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || Object.keys(activeLabels).length === 0) return;

    const interval = setInterval(() => {
      setImuHistory(prev => [...prev, {
        timestamp: Date.now(),
        ax: imuData.ax,
        ay: imuData.ay,
        gz: imuData.gz
      }]);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, activeLabels, imuData]);

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


  // Pages
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
                  <div key={session.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4 active:bg-slate-650">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-white font-medium font-mono text-sm mb-2">
                          {formatDateTime(session.startDate)}
                        </div>
                        <div className="flex items-center gap-4 text-slate-300 text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} />
                            <span>{session.duration}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Database size={12} />
                            <span>{session.recordings.length} events</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            setCurrentPage('details');
                          }}
                          className="flex-1 sm:flex-none bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 active:scale-95 text-white px-4 py-2 rounded-md font-semibold text-sm"
                        >
                          Analyser
                        </button>
                        <button
                          onClick={() => downloadCSV(session.recordings, session)}
                          className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white px-4 py-2 rounded-md font-semibold inline-flex items-center justify-center gap-1.5 text-sm"
                        >
                          <Download size={14} />
                          CSV
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 active:scale-95 text-white px-3 py-2 rounded-md font-semibold text-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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
            onClick={() => setCurrentPage('home')}
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
                </div>
              ))}
            </div>

            <div className="mt-6">
              <button
                onClick={() => downloadCSV(selectedSession.recordings, selectedSession)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Download size={18} />
                Télécharger
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
              if (window.confirm('Voulez-vous vraiment quitter ?')) {
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

        {/* Champ nom de voiture */}
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mb-4">
          <div className="flex items-center gap-3">
            <Car size={20} className="text-cyan-400" />
            {isEditingCarName ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={tempCarName}
                  onChange={(e) => setTempCarName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      saveCarName(tempCarName.trim());
                      setIsEditingCarName(false);
                    }
                  }}
                  placeholder="Nom de la voiture..."
                  className="flex-1 px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-cyan-500 focus:outline-none text-sm"
                  autoFocus
                />
                <button
                  onClick={() => {
                    saveCarName(tempCarName.trim());
                    setIsEditingCarName(false);
                  }}
                  className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                >
                  <Check size={18} />
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between">
                <span className="text-white font-medium">
                  {carName || 'Aucun véhicule'}
                </span>
                <button
                  onClick={() => {
                    setTempCarName(carName);
                    setIsEditingCarName(true);
                  }}
                  className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
          </div>
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
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 active:scale-95 text-white px-12 py-4 rounded-lg text-xl font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
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
                {uploadStatus === 'idle' && <p className="text-green-400 text-lg font-semibold">Session terminée</p>}
                {uploadStatus === 'uploading' && <p className="text-blue-400 text-lg font-semibold">⏳ Envoi...</p>}
                {uploadStatus === 'success' && <p className="text-green-400 text-lg font-semibold">✓ Envoyé !</p>}
                {uploadStatus === 'error' && <p className="text-orange-400 text-lg font-semibold">⚠️ Erreur</p>}
                
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
                    Télécharger
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Labels</h2>
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
                  ${!isRunning ? 'opacity-40' : 'active:scale-95'}
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

        {isRunning && imuPermission && imuHistory.length > 0 && (
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mt-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-white">IMU</h2>
              <span className="text-emerald-400 font-mono text-xs">
                {imuHistory.length} mesures
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-700 rounded p-2 border border-slate-600">
                <p className="text-slate-400 text-xs font-mono">Acc X</p>
                <p className="text-cyan-400 text-lg font-bold font-mono">{imuData.ax}</p>
              </div>
              <div className="bg-slate-700 rounded p-2 border border-slate-600">
                <p className="text-slate-400 text-xs font-mono">Acc Y</p>
                <p className="text-cyan-400 text-lg font-bold font-mono">{imuData.ay}</p>
              </div>
              <div className="bg-slate-700 rounded p-2 border border-slate-600">
                <p className="text-slate-400 text-xs font-mono">Gyro Z</p>
                <p className="text-purple-400 text-lg font-bold font-mono">{imuData.gz}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
