import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { isAuthenticated, getAuth } from '../../lib/auth';
import { getStudentDashboard } from '../../lib/api';
import { Clock, TrendingUp, Award, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const auth = getAuth();
      const data = await getStudentDashboard(auth.matricule);
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

  // Préparer les données pour le graphique
  const chartData = dashboard.recent_sessions.map((session, index) => ({
    name: `S${dashboard.recent_sessions.length - index}`,
    attention: session.attention,
    date: format(new Date(session.date), 'dd/MM')
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Bonjour, {dashboard.name}</h1>
        <p className="text-gray-400 mt-1">Voici un résumé de vos performances</p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Sessions</p>
              <p className="text-3xl font-bold text-white mt-1">{dashboard.total_sessions}</p>
            </div>
            <Calendar className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Heures Totales</p>
              <p className="text-3xl font-bold text-white mt-1">{dashboard.total_hours}h</p>
            </div>
            <Clock className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Attention Moyenne</p>
              <p className="text-3xl font-bold text-white mt-1">{dashboard.average_attention}%</p>
            </div>
            <TrendingUp className={`${
              dashboard.average_attention >= 75 ? 'text-green-500' :
              dashboard.average_attention >= 50 ? 'text-yellow-500' : 'text-red-500'
            }`} size={32} />
          </div>
        </div>

        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Meilleure Session</p>
              <p className="text-3xl font-bold text-white mt-1">
                {dashboard.best_session ? `${dashboard.best_session.attention}%` : 'N/A'}
              </p>
            </div>
            <Award className="text-yellow-500" size={32} />
          </div>
        </div>
      </div>

      {/* Graphique d'évolution */}
      {chartData.length > 0 && (
        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">📈 Évolution de l'attention</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2e2e2e',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Line
                type="monotone"
                dataKey="attention"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meilleure session */}
        {dashboard.best_session && (
          <div className="bg-gradient-to-br from-green-900/30 to-dark-800 border border-green-900/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">🏆 Meilleure Session</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span className="text-white font-medium">
                  {format(new Date(dashboard.best_session.date), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Attention</span>
                <span className="text-green-400 font-bold text-xl">
                  {dashboard.best_session.attention}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Durée</span>
                <span className="text-white">{dashboard.best_session.duration_minutes} min</span>
              </div>
            </div>
          </div>
        )}

        {/* Pire session */}
        {dashboard.worst_session && (
          <div className="bg-gradient-to-br from-red-900/30 to-dark-800 border border-red-900/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">📊 Session à améliorer</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span className="text-white font-medium">
                  {format(new Date(dashboard.worst_session.date), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Attention</span>
                <span className="text-red-400 font-bold text-xl">
                  {dashboard.worst_session.attention}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Durée</span>
                <span className="text-white">{dashboard.worst_session.duration_minutes} min</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sessions récentes */}
      <div className="bg-dark-800 border border-dark-600 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">📅 Sessions Récentes</h3>
        <div className="space-y-3">
          {dashboard.recent_sessions.map((session) => (
            <div
              key={session.session_id}
              className="flex items-center justify-between p-4 bg-dark-700 rounded-lg"
            >
              <div>
                <p className="text-white font-medium">
                  {format(new Date(session.date), 'dd/MM/yyyy à HH:mm')}
                </p>
                <p className="text-gray-400 text-sm">{session.duration_minutes} minutes</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  session.attention >= 75 ? 'text-green-400' :
                  session.attention >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {session.attention}%
                </p>
                <p className="text-gray-500 text-xs">attention</p>
              </div>
            </div>
          ))}
        </div>

        {dashboard.recent_sessions.length === 0 && (
          <p className="text-gray-400 text-center py-8">
            Aucune session enregistrée. Commencez une session de surveillance !
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="bg-blue-900/20 border border-blue-900 rounded-lg p-6 text-center">
        <p className="text-white font-medium mb-4">
          Prêt pour une nouvelle session de surveillance ?
        </p>
        <button
          onClick={() => router.push('/student/monitoring')}
          className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-3 rounded-md font-medium transition-colors"
        >
          Démarrer une session
        </button>
      </div>
    </div>
  );
}