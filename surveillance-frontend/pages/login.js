import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Webcam from 'react-webcam';
import { login, verifyFace } from '../lib/api';
import { saveAuth, saveTempToken } from '../lib/auth';
import { Camera, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const webcamRef = useRef(null);

  const [step, setStep] = useState(1); // 1: password, 2: face
  const [matricule, setMatricule] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(matricule, password);
      setTempToken(data.temp_token);
      saveTempToken(data.temp_token);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  };

  const handleFaceVerify = async () => {
    if (!capturedImage) {
      setError('Veuillez capturer une photo');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });

      const data = await verifyFace(matricule, file, tempToken);
      saveAuth(data.access_token, data.role, data.matricule);

      if (data.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/student/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Visage non reconnu');
      setCapturedImage(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="max-w-md w-full">
        <div className="bg-dark-800 rounded-lg shadow-xl border border-dark-600 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">Connexion</h2>
            <p className="text-gray-400 mt-2">
              {step === 1 ? 'Étape 1/2 : Identification' : 'Étape 2/2 : Vérification faciale'}
            </p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Matricule
                </label>
                <input
                  type="text"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Connexion...' : 'Continuer'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                {!capturedImage ? (
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full rounded-md"
                    videoConstraints={{ facingMode: 'user' }}
                  />
                ) : (
                  <img src={capturedImage} alt="Captured" className="w-full rounded-md" />
                )}
              </div>

              <div className="flex space-x-3">
                {!capturedImage ? (
                  <button
                    onClick={capturePhoto}
                    className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                  >
                    <Camera size={20} />
                    <span>Capturer</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setCapturedImage(null)}
                      className="flex-1 bg-dark-700 hover:bg-dark-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Reprendre
                    </button>
                    <button
                      onClick={handleFaceVerify}
                      disabled={loading}
                      className="flex-1 bg-green-900 hover:bg-green-800 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Vérification...' : 'Vérifier'}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full text-gray-400 hover:text-gray-300 text-sm"
              >
                ← Retour
              </button>
            </div>
          )}

          {/* Lien vers inscription — uniquement à l'étape 1 */}
          {step === 1 && (
            <div className="mt-6 pt-6 border-t border-dark-600 text-center">
              <p className="text-gray-400 text-sm">
                Pas encore de compte ?{' '}
                <button
                  onClick={() => router.push('/register')}
                  className="text-blue-400 hover:text-blue-300"
                >
                  S'inscrire
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}