import React, { useState, useEffect, useRef } from 'react';
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
  
  // NOUVEAU: État pour le nom de la voiture (sauvegardé en localStorage)
  const [carName, setCarName] = useState('');
  const [isEditingCarName, setIsEditingCarName] = useState(false);
  const [tempCarName, setTempCarName] = useState('');

  // URL du script Google Apps Script
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxiMLcvhyhqnNvkFmrtKtwsdcdkbuhdH4hRwmIF09GSYAzPoWal672F2UYwSF4xGhYb/exec';

  const imuDataRef = useRef(imuData);
  
  useEffect(() => {
    imuDataRef.current = imuData;
  }, [imuData]);

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
    // Charger le nom de la voiture depuis localStorage
    const savedCarName = localStorage.getItem('carName');
    if (savedCarName) {
      setCarName(savedCarName);
    }
  }, []);

  // Sauvegarder automatiquement le nom de la voiture
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

  useEffect(() => {
    if (currentPage !== 'labeling') return;

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

    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
            setImuPermission(true);
          }
        })
        .catch(err => console.error('Erreur permission:', err));
    } else {
      window.addEventListener('devicemotion', handleMotion);
      setImuPermission(true);
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [currentPage]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      const currentImuData = imuDataRef.current;
      
      const dataPoint = {
        timestamp: Date.now(),
        ax: Number(currentImuData.ax) || 0,
        ay: Number(currentImuData.ay) || 0,
        gz: Number(currentImuData.gz) || 0
      };
      
      setImuHistory(prev => [...prev, dataPoint]);
    }, 500);

    return () => clearInterval(interval);
  }, [isRunning]);

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
    const labelName = labels.find(l => l.id === labelId).name;
    
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
        label: labelName,
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
      carName: carName || 'Sans nom',
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
        
        return `"${formatDateTime(row.absoluteStartTime)}","${removeAccents(row.label)}","${row.startTime}","${row.endTime}","${row.duration}","${axList}","${ayList}","${gzList}"`;
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const carNamePart = session.carName && session.carName !== 'Sans nom' ? `_${removeAccents(session.carName).replace(/\s+/g, '')}` : '';
    const filename = `labelisation${carNamePart}_${new Date(session.startDate).toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
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
          const axList = row.imuData && row.imuData.length > 0 ? row.imuData.map(d => d.ax).join(';') : '';
          const ayList = row.imuData && row.imuData.length > 0 ? row.imuData.map(d => d.ay).join(';') : '';
          const gzList = row.imuData && row.imuData.length > 0 ? row.imuData.map(d => d.gz).join(';') : '';
          
          return `"${formatDateTime(row.absoluteStartTime)}","${removeAccents(row.label)}","${row.startTime}","${row.endTime}","${row.duration}","${axList}","${ayList}","${gzList}"`;
        })
      ].join('\n');

      const base64CSV = btoa(unescape(encodeURIComponent(csvContent)));
      
      const carNamePart = session.carName && session.carName !== 'Sans nom' ? `_${removeAccents(session.carName).replace(/\s+/g, '')}` : '';
      const filename = `labelisation${carNamePart}_${new Date(session.startDate).toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;

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
                        {session.carName && session.carName !== 'Sans nom' && (
                          <div className="flex items-center gap-2 mb-2">
                            <Car size={16} className="text-cyan-400" />
                            <span className="text-cyan-400 font-semibold text-sm">{session.carName}</span>
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
            
            {selectedSession.carName && selectedSession.carName !== 'Sans nom' && (
              <div className="bg-cyan-500 bg-opacity-10 border border-cyan-500 border-opacity-30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <Car size={24} className="text-cyan-400" />
                  <div>
                    <p className="text-xs text-cyan-300 mb-1">Véhicule</p>
                    <p className="text-xl font-semibold text-white">{selectedSession.carName}</p>
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

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => uploadToDrive(selectedSession.recordings, selectedSession)}
                disabled={uploadStatus === 'uploading'}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 active:scale-95 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                {uploadStatus === 'uploading' ? 'Envoi...' : 
                 uploadStatus === 'success' ? 'Envoyé !' :
                 uploadStatus === 'error' ? 'Erreur' :
                 'Envoyer Drive'}
              </button>
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

  return (
    <div className="min-h-screen bg-slate-700 p-4 sm:p-8 pb-safe">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => {
              if (isRunning && !window.confirm('Êtes-vous sûr de vouloir quitter ? Le trajet en cours sera perdu.')) {
                return;
              }
              setCurrentPage('home');
              setIsRunning(false);
              setElapsedTime(0);
              setActiveLabels({});
              setRecordings([]);
            }}
            className="text-slate-300 hover:text-white inline-flex items-center gap-2 active:scale-95"
          >
            <ArrowLeft size={18} />
            Retour
          </button>
        </div>

        {/* NOUVEAU: Champ nom de voiture en haut */}
        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 mb-6">
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

        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 sm:p-6 mb-6">
          <div className="text-center mb-6">
            <div className="text-6xl sm:text-7xl font-mono font-bold text-white mb-2">
              {formatTime(elapsedTime)}
            </div>
            <p className="text-slate-400 text-sm font-mono">
              {isRunning ? '● Enregistrement en cours' : '○ En pause'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!isRunning && !sessionEnded ? (
              <button
                onClick={startSession}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Play size={20} />
                Démarrer
              </button>
            ) : isRunning ? (
              <button
                onClick={endSession}
                className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 active:scale-95 text-white px-8 py-4 rounded-lg text-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Square size={20} />
                Arrêter
              </button>
            ) : null}
          </div>
        </div>

        {(isRunning || sessionEnded) && (
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 sm:p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Capteurs IMU (2Hz)</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                <p className="text-xs text-slate-400 mb-1 font-mono">Accel X</p>
                <p className="text-lg font-bold text-cyan-400 font-mono">{imuData.ax}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                <p className="text-xs text-slate-400 mb-1 font-mono">Accel Y</p>
                <p className="text-lg font-bold text-cyan-400 font-mono">{imuData.ay}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                <p className="text-xs text-slate-400 mb-1 font-mono">Gyro Z</p>
                <p className="text-lg font-bold text-cyan-400 font-mono">{imuData.gz}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center mt-3 font-mono">
              {imuHistory.length} mesures enregistrées
            </p>
          </div>
        )}

        {isRunning && (
          <div className="space-y-3">
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() => toggleLabel(label.id)}
                className={`w-full p-4 sm:p-6 rounded-xl text-white font-semibold text-base sm:text-lg transition-all active:scale-95 ${
                  activeLabels[label.id]
                    ? `${label.color} shadow-lg ring-4 ring-white ring-opacity-50`
                    : `${label.color} bg-opacity-70 hover:bg-opacity-100`
                }`}
              >
                {label.name}
                {activeLabels[label.id] && (
                  <span className="ml-2 text-sm">●</span>
                )}
              </button>
            ))}
          </div>
        )}

        {sessionEnded && currentSessionData && (
          <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-600 p-4 sm:p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Session terminée !</h3>
            
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {currentSessionData.recordings.map((rec, idx) => (
                <div key={idx} className="bg-slate-700 p-3 rounded-lg border border-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white text-sm">{rec.label}</span>
                    <span className="text-xs text-slate-300 font-mono">{rec.duration}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => uploadToDrive(currentSessionData.recordings, currentSessionData)}
                disabled={uploadStatus === 'uploading'}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 active:scale-95 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                {uploadStatus === 'uploading' ? 'Envoi...' : 
                 uploadStatus === 'success' ? 'Envoyé !' :
                 uploadStatus === 'error' ? 'Erreur' :
                 'Envoyer Drive'}
              </button>
              <button
                onClick={() => downloadCSV(currentSessionData.recordings, currentSessionData)}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Download size={18} />
                Télécharger CSV
              </button>
              <button
                onClick={() => {
                  setCurrentPage('home');
                  setSessionEnded(false);
                  setCurrentSessionData(null);
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold w-full sm:w-auto"
              >
                Retour
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
