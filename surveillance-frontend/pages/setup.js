import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Webcam from 'react-webcam';
import { createFirstAdmin } from '../lib/api';
import { Camera, Eye, EyeOff } from 'lucide-react';

export default function Setup() {
  const router = useRouter();
  const webcamRef = useRef(null);
  
  const [formData, setFormData] = useState({
    matricule: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [capturedImage, setCapturedImage] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (!capturedImage) {
      setError('Veuillez capturer une photo de votre visage');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });

      await createFirstAdmin(
        formData.matricule,
        formData.password,
        formData.name,
        file
      );

      alert('Administrateur créé avec succès ! Vous pouvez maintenant vous connecter.');
      router.push('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-dark-800 rounded-lg shadow-xl border border-dark-600 p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">Configuration Initiale</h2>
            <p className="text-gray-400 mt-2">Créez le premier administrateur du système</p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Matricule *
                </label>
                <input
                  type="text"
                  value={formData.matricule}
                  onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nom complet *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirmer mot de passe *
                </label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Photo du visage * (obligatoire)
              </label>
              {!capturedImage ? (
                <div className="space-y-2">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full rounded-md"
                    videoConstraints={{ facingMode: 'user' }}
                  />
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-full bg-blue-900 hover:bg-blue-800 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                  >
                    <Camera size={20} />
                    <span>Capturer</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <img src={capturedImage} alt="Captured" className="w-full rounded-md" />
                  <button
                    type="button"
                    onClick={() => setCapturedImage(null)}
                    className="w-full bg-dark-700 hover:bg-dark-600 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    Reprendre
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !capturedImage}
              className="w-full bg-green-900 hover:bg-green-800 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Création...' : 'Créer l\'administrateur'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-dark-600 text-center">
            <p className="text-gray-400 text-sm">
              Déjà configuré ?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-blue-400 hover:text-blue-300"
              >
                Se connecter
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}