import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated, getAuth } from '../../lib/auth';
import { startSession, analyzeFrame, endSession } from '../../lib/api';
import Webcam from 'react-webcam';
import { Play, Square, Eye, AlertCircle } from 'lucide-react';

export default function StudentMonitoring() {
  const router = useRouter();
  const webcamRef = useRef(null);
  const intervalRef = useRef(null);
  
  const [sessionId, setSessionId] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [stats, setStats] = useState({
    frames: 0,
    focused: 0,
    distracted: 0,
    drowsy: 0,
    eyesClosed: 0,
    blinks: 0
  });
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
  }, []);

  // Timer de durée
  useEffect(() => {
    let timer;
    if (isMonitoring) {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isMonitoring]);

  const handleStartSession = async () => {
    setError('');
    setLoading(true);

    try {
      const auth = getAuth();
      const data = await startSession(auth.matricule);
      setSessionId(data.session_id);
      setIsMonitoring(true);
      setStats({ frames: 0, focused: 0, distracted: 0, drowsy: 0, eyesClosed: 0, blinks: 0 });
      setDuration(0);

      // Démarrer l'analyse des frames (1 frame toutes les 2 secondes)
      intervalRef.current = setInterval(() => {
        captureAndAnalyze(data.session_id);
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors du démarrage');
    } finally {
      setLoading(false);
    }
  };

  const captureAndAnalyze = async (sid) => {
    if (!webcamRef.current) return;

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      // Convertir en blob
      const res = await fetch(imageSrc);
      const blob = await res.blob();

      // Envoyer pour analyse
      const timestamp = Date.now() / 1000;
      const result = await analyzeFrame(sid, timestamp, blob);

      if (result.face_detected) {
        setCurrentStatus(result);
        
        // Mettre à jour les stats
        setStats((prev) => {
          const newStats = {
            ...prev,
            frames: prev.frames + 1,
            blinks: result.total_blinks || prev.blinks
          };

          switch (result.attention_level) {
            case 'focused':
              newStats.focused++;
              break;
            case 'distracted':
              newStats.distracted++;
              break;
            case 'drowsy':
              newStats.drowsy++;
              break;
            case 'eyes_closed':
              newStats.eyesClosed++;
              break;
          }

          return newStats;
        });
      } else {
        setCurrentStatus({ face_detected: false });
      }
    } catch (err) {
      console.error('Erreur analyse frame:', err);
    }
  };

  const handleStopSession = async () => {
    if (!sessionId) return;

    setLoading(true);
    clearInterval(intervalRef.current);

    try {
      const result = await endSession(sessionId);
      
      // Afficher les résultats finaux
      alert(`Session terminée !\n\nAttention moyenne: ${result.average_attention}%\nDurée: ${Math.floor(result.total_duration_seconds / 60)} minutes\nFrames analysées: ${result.total_frames}`);
      
      router.push('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'arrêt');
    } finally {
      setLoading(false);
      setIsMonitoring(false);
      setSessionId(null);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAttentionColor = (level) => {
    switch (level) {
      case 'focused': return 'text-green-400';
      case 'distracted': return 'text-yellow-400';
      case 'drowsy': return 'text-orange-400';
      case 'eyes_closed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getAttentionText = (level) => {
    switch (level) {
      case 'focused': return 'Concentré ✓';
      case 'distracted': return 'Distrait';
      case 'drowsy': return 'Somnolent';
      case 'eyes_closed': return 'Yeux fermés';
      default: return 'En attente...';
    }
  };

  const currentAttention = stats.frames > 0 
    ? Math.round((stats.focused / stats.frames) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Session de Surveillance</h1>
        {isMonitoring && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-white font-mono text-xl">{formatDuration(duration)}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webcam */}
        <div className="lg:col-span-2 bg-dark-800 border border-dark-600 rounded-lg p-6">
          <div className="relative">
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full rounded-md"
              videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
            />
            
            {/* Overlay status */}
            {isMonitoring && currentStatus && (
              <div className="absolute top-4 left-4 right-4">
                {!currentStatus.face_detected ? (
                  <div className="bg-red-900/90 border border-red-700 text-white px-4 py-2 rounded-md flex items-center space-x-2">
                    <AlertCircle size={20} />
                    <span>Aucun visage détecté</span>
                  </div>
                ) : (
                  <div className="bg-dark-900/90 border border-dark-600 text-white px-4 py-3 rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">État:</span>
                      <span className={`font-bold ${getAttentionColor(currentStatus.attention_level)}`}>
                        {getAttentionText(currentStatus.attention_level)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">EAR:</span>
                      <span className="text-white">{currentStatus.ear?.toFixed(3)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Clignements:</span>
                      <span className="text-white">{currentStatus.total_blinks}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contrôles */}
          <div className="mt-4 flex justify-center space-x-4">
            {!isMonitoring ? (
              <button
                onClick={handleStartSession}
                disabled={loading}
                className="flex items-center space-x-2 bg-green-900 hover:bg-green-800 text-white px-8 py-3 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                <Play size={20} />
                <span>{loading ? 'Démarrage...' : 'Démarrer la session'}</span>
              </button>
            ) : (
              <button
                onClick={handleStopSession}
                disabled={loading}
                className="flex items-center space-x-2 bg-red-900 hover:bg-red-800 text-white px-8 py-3 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                <Square size={20} />
                <span>{loading ? 'Arrêt...' : 'Terminer la session'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats en temps réel */}
        <div className="space-y-4">
          {/* Attention actuelle */}
          <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-white">Attention Actuelle</h3>
              <Eye className="text-blue-500" size={24} />
            </div>
            <p className={`text-5xl font-bold ${
              currentAttention >= 75 ? 'text-green-400' :
              currentAttention >= 50 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {currentAttention}%
            </p>
          </div>

          {/* Statistiques détaillées */}
          <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Statistiques</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Frames analysées</span>
                <span className="text-white font-bold">{stats.frames}</span>
              </div>
              
              <div className="h-px bg-dark-600"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-green-400">✓ Concentré</span>
                <span className="text-white font-bold">{stats.focused}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-yellow-400">⚠ Distrait</span>
                <span className="text-white font-bold">{stats.distracted}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-orange-400">😴 Somnolent</span>
                <span className="text-white font-bold">{stats.drowsy}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-red-400">👁️ Yeux fermés</span>
                <span className="text-white font-bold">{stats.eyesClosed}</span>
              </div>
              
              <div className="h-px bg-dark-600"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Clignements</span>
                <span className="text-white font-bold">{stats.blinks}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-900/20 border border-blue-900 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">💡 Conseils</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Regardez l'écran</li>
              <li>• Gardez la tête droite</li>
              <li>• Bon éclairage requis</li>
              <li>• Évitez les mouvements brusques</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}