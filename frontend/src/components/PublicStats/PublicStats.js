import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../../services/api';
import { Users, UserCheck, BarChart3, Calendar } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const PublicStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await settingsAPI.getPublicStatistics();
      setStats(response.data);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStats();

    // Set up Server-Sent Events for real-time updates
    const eventSource = new EventSource('/api/settings/public/statistics/stream');
    
    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        setIsUpdating(true);
        const data = JSON.parse(event.data);
        if (data.error) {
          setError(data.error);
        } else {
          setStats(data);
          setLastUpdated(data.lastUpdated);
          setError(null);
        }
        // Reset updating indicator after a short delay
        setTimeout(() => setIsUpdating(false), 1000);
      } catch (err) {
        console.error('Error parsing SSE data:', err);
        setIsUpdating(false);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setIsConnected(false);
      setError('Connection lost. Attempting to reconnect...');
      
      // Fallback to polling if SSE fails
      const fallbackInterval = setInterval(fetchStats, 10000); // 10 seconds
      
      // Clean up fallback after 5 minutes
      setTimeout(() => {
        clearInterval(fallbackInterval);
      }, 5 * 60 * 1000);
    };

    // Cleanup on component unmount
    return () => {
      eventSource.close();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <BarChart3 className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Statistics</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchStats}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const memberPopulationData = {
    labels: ['Regular Members', 'Associate Members'],
    datasets: [
      {
        label: 'Member Population',
        data: [stats.memberPopulation.regular, stats.memberPopulation.associate],
        backgroundColor: ['#3B82F6', '#10B981'],
        borderColor: ['#2563EB', '#059669'],
        borderWidth: 2,
      },
    ],
  };

  const attendedData = {
    labels: ['Regular Attended', 'Associate Attended'],
    datasets: [
      {
        label: 'Attended Assembly',
        data: [stats.attendedAssembly.regular, stats.attendedAssembly.associate],
        backgroundColor: ['#F59E0B', '#EF4444'],
        borderColor: ['#D97706', '#DC2626'],
        borderWidth: 2,
      },
    ],
  };

  const populationDoughnutData = {
    labels: ['Regular Members', 'Associate Members'],
    datasets: [
      {
        data: [stats.memberPopulation.regular, stats.memberPopulation.associate],
        backgroundColor: ['#3B82F6', '#10B981'],
        borderColor: ['#2563EB', '#059669'],
        borderWidth: 2,
      },
    ],
  };

  const attendedDoughnutData = {
    labels: ['Regular Attended', 'Associate Attended'],
    datasets: [
      {
        data: [stats.attendedAssembly.regular, stats.attendedAssembly.associate],
        backgroundColor: ['#F59E0B', '#EF4444'],
        borderColor: ['#D97706', '#DC2626'],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Member Statistics',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cooperative Statistics</h1>
              <p className="text-gray-600 mt-2">Real-time member population and attendance data</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} ${isUpdating ? 'animate-ping' : 'animate-pulse'}`}></div>
                <span className="text-sm text-gray-600">
                  {isUpdating ? 'Updating...' : isConnected ? 'Live Updates' : 'Offline'}
                </span>
              </div>
              
              {lastUpdated && (
                <div className="text-sm text-gray-500">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Last updated: {new Date(lastUpdated).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Highlighted Key Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Total Members - Highlighted */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-xl p-8 text-white transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-lg font-medium">Total Member Population</p>
                <p className="text-6xl font-bold mt-2 text-white drop-shadow-lg animate-pulse">{stats.memberPopulation.total}</p>
                <div className="flex items-center mt-4 space-x-6">
                  <div className="text-center bg-blue-400 bg-opacity-30 rounded-lg p-3">
                    <p className="text-blue-200 text-sm font-medium">Regular</p>
                    <p className="text-3xl font-bold">{stats.memberPopulation.regular}</p>
                  </div>
                  <div className="text-center bg-blue-400 bg-opacity-30 rounded-lg p-3">
                    <p className="text-blue-200 text-sm font-medium">Associate</p>
                    <p className="text-3xl font-bold">{stats.memberPopulation.associate}</p>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <Users className="h-20 w-20 text-blue-200 drop-shadow-lg" />
              </div>
            </div>
          </div>

              {/* Attended Assembly - Highlighted */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-xl p-8 text-white transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-lg font-medium">Attended Assembly</p>
                    <p className="text-6xl font-bold mt-2 text-white drop-shadow-lg animate-pulse">{stats.attendedAssembly.total}</p>
                    <div className="flex items-center mt-4 space-x-6">
                      <div className="text-center bg-green-400 bg-opacity-30 rounded-lg p-3">
                        <p className="text-green-200 text-sm font-medium">Regular</p>
                        <p className="text-3xl font-bold">{stats.attendedAssembly.regular}</p>
                      </div>
                      <div className="text-center bg-green-400 bg-opacity-30 rounded-lg p-3">
                        <p className="text-green-200 text-sm font-medium">Associate</p>
                        <p className="text-3xl font-bold">{stats.attendedAssembly.associate}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <UserCheck className="h-20 w-20 text-green-200 drop-shadow-lg" />
                  </div>
                </div>
              </div>
        </div>

        {/* Additional Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Regular Members</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.memberPopulation.regular}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Associate Members</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.memberPopulation.associate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Member Population Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Population</h3>
            <div className="h-80">
              <Bar data={memberPopulationData} options={chartOptions} />
            </div>
          </div>

          {/* Checked In Today Bar Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attended Assembly</h3>
            <div className="h-80">
              <Bar data={attendedData} options={chartOptions} />
            </div>
          </div>

          {/* Member Population Doughnut Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Distribution</h3>
            <div className="h-80 flex items-center justify-center">
              <Doughnut data={populationDoughnutData} options={doughnutOptions} />
            </div>
          </div>

          {/* Checked In Today Doughnut Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assembly Attendance Distribution</h3>
            <div className="h-80 flex items-center justify-center">
              <Doughnut data={attendedDoughnutData} options={doughnutOptions} />
            </div>
          </div>
        </div>

        {/* Additional Statistics */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Rate</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.memberPopulation.regular > 0 
                  ? Math.round((stats.attendedAssembly.regular / stats.memberPopulation.regular) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-gray-500">Regular Member Attendance</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.memberPopulation.associate > 0 
                  ? Math.round((stats.attendedAssembly.associate / stats.memberPopulation.associate) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-gray-500">Associate Member Attendance</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {stats.memberPopulation.total > 0 
                  ? Math.round((stats.attendedAssembly.total / stats.memberPopulation.total) * 100)
                  : 0}%
              </div>
              <p className="text-sm text-gray-500">Overall Attendance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicStats;
