import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated, isAdmin } from '../../lib/auth';
import { getAdminDashboard } from '../../lib/api';
import { Users, Clock, TrendingUp, AlertCircle, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await getAdminDashboard();
      setDashboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard Administrateur</h1>

      {dashboard.pending_accounts > 0 && (
        <div
          className="bg-yellow-900/20 border border-yellow-900/60 rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-yellow-900/30 transition-colors"
          onClick={() => router.push('/admin/validations')}
        >
          <div className="flex items-center space-x-3">
            <ClipboardList className="text-yellow-400" size={24} />
            <div>
              <p className="text-yellow-400 font-semibold">
                {dashboard.pending_accounts} compte(s) en attente de validation
              </p>
              <p className="text-yellow-400/70 text-sm">Cliquez pour valider ou rejeter les inscriptions</p>
            </div>
          </div>
          <span className="text-yellow-400 text-xl font-bold bg-yellow-900/40 px-3 py-1 rounded-full">
            {dashboard.pending_accounts}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Étudiants</p>
              <p className="text-3xl font-bold text-white mt-1">{dashboard.total_students}</p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Sessions</p>
              <p className="text-3xl font-bold text-white mt-1">{dashboard.total_sessions}</p>
            </div>
            <Clock className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Heures Totales</p>
              <p className="text-3xl font-bold text-white mt-1">{dashboard.total_hours}h</p>
            </div>
            <TrendingUp className="text-purple-500" size={32} />
          </div>
        </div>
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Attention Moyenne</p>
              <p className="text-3xl font-bold text-white mt-1">{dashboard.average_attention_global}%</p>
            </div>
            <AlertCircle className="text-yellow-500" size={32} />
          </div>
        </div>
      </div>

      {dashboard.students_without_face.length > 0 && (
        <div className="bg-red-900/20 border border-red-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-4">
            ⚠️ Étudiants sans visage enregistré ({dashboard.students_without_face.length})
          </h3>
          <div className="space-y-2">
            {dashboard.students_without_face.map((student) => (
              <div key={student.matricule} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{student.name} — {student.matricule}</span>
                <span className="text-gray-500 text-xs">{format(new Date(student.created_at), 'dd/MM/yyyy')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🏆 Top 10 Étudiants</h3>
          {dashboard.top_students.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Aucune session enregistrée</p>
          ) : (
            <div className="space-y-3">
              {dashboard.top_students.map((student, index) => (
                <div key={student.matricule} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}</span>
                    <div>
                      <p className="text-white font-medium">{student.name}</p>
                      <p className="text-gray-400 text-xs">{student.total_sessions} sessions</p>
                    </div>
                  </div>
                  <span className="text-green-400 font-semibold">{student.average_attention}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Activité Récente</h3>
          {dashboard.recent_activity.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">Aucune activité récente</p>
          ) : (
            <div className="space-y-3">
              {dashboard.recent_activity.map((activity) => (
                <div key={activity.session_id} className="border-l-2 border-blue-500 pl-3">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium">{activity.name}</p>
                    <span className="text-xs text-gray-500">{activity.duration_minutes}min</span>
                  </div>
                  <p className="text-gray-400 text-xs">{activity.matricule}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-gray-500 text-xs">{format(new Date(activity.date), 'dd/MM/yyyy HH:mm')}</p>
                    <span className={`text-xs font-semibold ${activity.attention >= 75 ? 'text-green-400' : activity.attention >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {activity.attention}%
                    </span>
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