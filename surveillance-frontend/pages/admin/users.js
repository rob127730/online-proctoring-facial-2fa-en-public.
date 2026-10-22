import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated, isAdmin } from '../../lib/auth';
import { getUsers, deleteUser, updateUser, updateUserFace } from '../../lib/api';
import { Trash2, Edit, Camera } from 'lucide-react';
import Webcam from 'react-webcam';
import { format } from 'date-fns';

const STATUS_LABELS = {
  validated: { label: 'Validé', class: 'bg-green-900/30 text-green-400' },
  pending: { label: 'En attente', class: 'bg-yellow-900/30 text-yellow-400' },
  rejected: { label: 'Rejeté', class: 'bg-red-900/30 text-red-400' },
};

export default function AdminUsers() {
  const router = useRouter();
  const webcamRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);

  const [formData, setFormData] = useState({ name: '', password: '' });

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await updateUser(
        selectedUser.matricule,
        formData.name || null,
        formData.password || null
      );
      setSuccess('Utilisateur modifié avec succès');
      setShowEditModal(false);
      setFormData({ name: '', password: '' });
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFace = async () => {
    if (!capturedImage) {
      setError('Veuillez capturer une photo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], 'face.jpg', { type: 'image/jpeg' });
      await updateUserFace(selectedUser.matricule, file);
      setSuccess('Visage mis à jour avec succès');
      setShowFaceModal(false);
      setCapturedImage(null);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (matricule) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;

    try {
      await deleteUser(matricule);
      setSuccess('Utilisateur supprimé avec succès');
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Gestion des Utilisateurs</h1>
        <p className="text-gray-400 text-sm">{users.length} utilisateur(s)</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900 text-red-400 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-900 text-green-400 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      <div className="bg-dark-800 border border-dark-600 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-dark-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Matricule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rôle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Visage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-600">
            {users.map((user) => {
              const statusInfo = STATUS_LABELS[user.account_status] || STATUS_LABELS['validated'];
              return (
                <tr key={user.matricule} className="hover:bg-dark-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{user.matricule}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      user.role === 'admin' ? 'bg-purple-900/30 text-purple-400' : 'bg-blue-900/30 text-blue-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${statusInfo.class}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.has_face_registered ? (
                      <span className="text-green-400 text-xs">✓ Enregistré</span>
                    ) : (
                      <span className="text-red-400 text-xs">✗ Manquant</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setFormData({ name: user.name, password: '' });
                          setShowEditModal(true);
                        }}
                        className="text-blue-400 hover:text-blue-300"
                        title="Modifier"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowFaceModal(true);
                        }}
                        className="text-purple-400 hover:text-purple-300"
                        title="Mettre à jour le visage"
                      >
                        <Camera size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.matricule)}
                        className="text-red-400 hover:text-red-300"
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Modifier */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Modifier {selectedUser.name}</h2>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nouveau mot de passe (laisser vide pour ne pas changer)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-700 border border-dark-600 rounded-md text-white"
                />
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setFormData({ name: '', password: '' });
                  }}
                  className="flex-1 bg-dark-700 hover:bg-dark-600 text-white py-2 rounded-md"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white py-2 rounded-md disabled:opacity-50"
                >
                  {loading ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visage */}
      {showFaceModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Mettre à jour le visage</h2>

            <div className="space-y-4">
              {!capturedImage ? (
                <div className="space-y-2">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full rounded-md"
                    videoConstraints={{ facingMode: 'user' }}
                  />
                  <button
                    onClick={capturePhoto}
                    className="w-full bg-blue-900 hover:bg-blue-800 text-white py-2 rounded-md flex items-center justify-center space-x-2"
                  >
                    <Camera size={20} />
                    <span>Capturer</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <img src={capturedImage} alt="Captured" className="w-full rounded-md" />
                  <button
                    onClick={() => setCapturedImage(null)}
                    className="w-full bg-dark-700 hover:bg-dark-600 text-white py-2 rounded-md"
                  >
                    Reprendre
                  </button>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowFaceModal(false);
                    setCapturedImage(null);
                  }}
                  className="flex-1 bg-dark-700 hover:bg-dark-600 text-white py-2 rounded-md"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateFace}
                  disabled={loading || !capturedImage}
                  className="flex-1 bg-green-900 hover:bg-green-800 text-white py-2 rounded-md disabled:opacity-50"
                >
                  {loading ? 'Mise à jour...' : 'Mettre à jour'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}