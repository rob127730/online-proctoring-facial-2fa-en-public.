import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated, isAdmin } from '../../lib/auth';
import { getPendingUsers, validateAccount } from '../../lib/api';
import { CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminValidations() {
  const router = useRouter();
  const [pendingData, setPendingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // matricule en cours d'action
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      const data = await getPendingUsers();
      setPendingData(data);
    } catch (err) {
      setError('Erreur lors du chargement des comptes en attente');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (matricule, name, action) => {
    setActionLoading(matricule);
    setError('');
    setSuccess('');

    try {
      await validateAccount(matricule, action);
      const label = action === 'validate' ? 'validé' : 'rejeté';
      setSuccess(`Compte de ${name} ${label} avec succès`);
      // Recharger la liste
      loadPending();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'action');
    } finally {
      setActionLoading(null);
    }
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
        <div>
          <h1 className="text-3xl font-bold text-white">Validation des comptes</h1>
          <p className="text-gray-400 mt-1">
            Comptes étudiants en attente de validation
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-yellow-900/20 border border-yellow-900/50 px-4 py-2 rounded-lg">
          <Clock className="text-yellow-400" size={20} />
          <span className="text-yellow-400 font-bold">{pendingData?.total || 0}</span>
          <span className="text-yellow-400 text-sm">en attente</span>
        </div>
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

      {pendingData?.pending_accounts?.length === 0 ? (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-16 text-center">
          <UserCheck className="mx-auto text-green-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">Tout est à jour !</h3>
          <p className="text-gray-400">Aucun compte en attente de validation.</p>
        </div>
      ) : (
        <div className="bg-dark-800 border border-dark-600 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-dark-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Étudiant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Matricule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Inscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Visage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {pendingData?.pending_accounts?.map((user) => (
                <tr key={user.matricule} className="hover:bg-dark-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400 font-bold text-sm">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {user.matricule}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {format(new Date(user.created_at), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.has_face_registered ? (
                      <span className="text-green-400 text-xs">✓ Enregistré</span>
                    ) : (
                      <span className="text-red-400 text-xs">✗ Manquant</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleAction(user.matricule, user.name, 'validate')}
                        disabled={actionLoading === user.matricule}
                        className="flex items-center space-x-1 bg-green-900/30 hover:bg-green-900/60 text-green-400 px-3 py-1.5 rounded-md text-sm transition-colors disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                        <span>{actionLoading === user.matricule ? '...' : 'Valider'}</span>
                      </button>
                      <button
                        onClick={() => handleAction(user.matricule, user.name, 'reject')}
                        disabled={actionLoading === user.matricule}
                        className="flex items-center space-x-1 bg-red-900/30 hover:bg-red-900/60 text-red-400 px-3 py-1.5 rounded-md text-sm transition-colors disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        <span>{actionLoading === user.matricule ? '...' : 'Rejeter'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}