import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { settingsAPI } from '../../services/api';
import { Settings as SettingsIcon, ToggleLeft, ToggleRight, Save, AlertCircle, Trash2, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutEnabled, setCheckoutEnabled] = useState(true);
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);
  const [showResetJourneyDialog, setShowResetJourneyDialog] = useState(false);
  const [resetAllConfirmText, setResetAllConfirmText] = useState('');
  const [resetJourneyConfirmText, setResetJourneyConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!isAdmin()) {
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getAll();
      setSettings(response.data || []);
      
      // Find checkout setting
      const checkoutSetting = response.data?.find(s => s.setting_key === 'checkout_enabled');
      if (checkoutSetting) {
        setCheckoutEnabled(checkoutSetting.setting_value === 'true');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      setSaving(true);
      await settingsAPI.update(key, { value });
      
      // Update local state
      setSettings(prev => 
        prev.map(setting => 
          setting.setting_key === key 
            ? { ...setting, setting_value: value }
            : setting
        )
      );
      
      // Update checkout enabled state if it's the checkout setting
      if (key === 'checkout_enabled') {
        setCheckoutEnabled(value === 'true');
      }
      
      toast.success('Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckoutToggle = () => {
    const newValue = checkoutEnabled ? 'false' : 'true';
    updateSetting('checkout_enabled', newValue);
  };

  const handleResetAllData = async () => {
    if (resetAllConfirmText !== 'RESET ALL DATA') {
      toast.error('Please type "RESET ALL DATA" to confirm');
      return;
    }

    try {
      setResetting(true);
      await settingsAPI.resetAllData(true);
      toast.success('All data has been successfully reset');
      setShowResetAllDialog(false);
      setResetAllConfirmText('');
      
      // Refresh the page to reflect the reset
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error resetting all data:', error);
      toast.error('Failed to reset all data');
    } finally {
      setResetting(false);
    }
  };

  const handleResetJourneyData = async () => {
    if (resetJourneyConfirmText !== 'RESET JOURNEY DATA') {
      toast.error('Please type "RESET JOURNEY DATA" to confirm');
      return;
    }

    try {
      setResetting(true);
      await settingsAPI.resetJourneyData(true);
      toast.success('Member journey data has been successfully reset');
      setShowResetJourneyDialog(false);
      setResetJourneyConfirmText('');
      
      // Refresh the page to reflect the reset
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error resetting journey data:', error);
      toast.error('Failed to reset journey data');
    } finally {
      setResetting(false);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Admin privileges required to access settings.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <SettingsIcon className="h-6 w-6 text-gray-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          </div>
          <p className="text-gray-600 mt-2">Manage system-wide settings and preferences.</p>
        </div>

        <div className="p-6">
          {/* Checkout Setting */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Checkout Functionality</h3>
                <p className="text-gray-600 mb-4">
                  Enable or disable the checkout feature system-wide. When disabled, users will not be able to check out members.
                </p>
                <div className="flex items-center space-x-4">
                  <span className={`text-sm font-medium ${checkoutEnabled ? 'text-green-600' : 'text-red-600'}`}>
                    {checkoutEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  {checkoutEnabled && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                  {!checkoutEnabled && (
                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-6">
                <button
                  onClick={handleCheckoutToggle}
                  disabled={saving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    checkoutEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      checkoutEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* System Maintenance Setting */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">System Maintenance</h3>
                <p className="text-gray-600 mb-4">
                  Enable maintenance mode to temporarily disable certain system functions.
                </p>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-600">
                    Currently: Normal Operation
                  </span>
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                    Available
                  </span>
                </div>
              </div>
              <div className="ml-6">
                <button
                  disabled
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 cursor-not-allowed opacity-50"
                >
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Maintenance mode feature coming soon.
            </p>
          </div>

          {/* Warning Message */}
          {!checkoutEnabled && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Checkout Disabled</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Checkout functionality is currently disabled. Users will not be able to check out members until this setting is re-enabled.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reset Data Section */}
          <div className="mt-8 space-y-6">
            {/* Reset Journey Data */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Trash2 className="h-6 w-6 text-yellow-600 mr-3" />
                <h3 className="text-lg font-semibold text-yellow-900">Reset Journey Data</h3>
              </div>
              <p className="text-yellow-700 mb-4">
                <strong>⚠️ WARNING:</strong> This will permanently delete all member journey/attendance records. Members and settings will remain intact.
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowResetJourneyDialog(true)}
                  className="inline-flex items-center px-4 py-2 border border-yellow-300 text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset Journey Data
                </button>
                <div className="flex items-center text-yellow-600">
                  <Shield className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Admin Only</span>
                </div>
              </div>
            </div>

            {/* Reset All Data */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Trash2 className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-semibold text-red-900">Reset All Data</h3>
              </div>
              <p className="text-red-700 mb-4">
                <strong>⚠️ DANGER ZONE:</strong> This action will permanently delete all data including members, attendance records, and settings. This action cannot be undone.
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowResetAllDialog(true)}
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset All Data
                </button>
                <div className="flex items-center text-red-600">
                  <Shield className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Admin Only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Journey Data Confirmation Dialog */}
      {showResetJourneyDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-yellow-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Confirm Journey Data Reset</h3>
              </div>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  This will permanently delete <strong>JOURNEY DATA ONLY</strong> including:
                </p>
                <ul className="text-sm text-gray-500 list-disc list-inside mb-4">
                  <li>All attendance/journey records</li>
                  <li>All check-in/check-out data</li>
                  <li>All claim information</li>
                </ul>
                <p className="text-sm text-gray-500 mb-4">
                  <strong>Members and settings will remain intact.</strong>
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <code className="bg-gray-100 px-2 py-1 rounded">RESET JOURNEY DATA</code> to confirm:
                  </label>
                  <input
                    type="text"
                    value={resetJourneyConfirmText}
                    onChange={(e) => setResetJourneyConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    placeholder="RESET JOURNEY DATA"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowResetJourneyDialog(false);
                    setResetJourneyConfirmText('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetJourneyData}
                  disabled={resetting || resetJourneyConfirmText !== 'RESET JOURNEY DATA'}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetting ? 'Resetting...' : 'Reset Journey Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset All Data Confirmation Dialog */}
      {showResetAllDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Confirm All Data Reset</h3>
              </div>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  This will permanently delete <strong>ALL DATA</strong> including:
                </p>
                <ul className="text-sm text-gray-500 list-disc list-inside mb-4">
                  <li>All member records</li>
                  <li>All attendance/journey records</li>
                  <li>All staff records</li>
                  <li>All settings (will be reset to defaults)</li>
                </ul>
                <p className="text-sm text-gray-500 mb-4">
                  <strong>This action cannot be undone!</strong>
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <code className="bg-gray-100 px-2 py-1 rounded">RESET ALL DATA</code> to confirm:
                  </label>
                  <input
                    type="text"
                    value={resetAllConfirmText}
                    onChange={(e) => setResetAllConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="RESET ALL DATA"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowResetAllDialog(false);
                    setResetAllConfirmText('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetAllData}
                  disabled={resetting || resetAllConfirmText !== 'RESET ALL DATA'}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetting ? 'Resetting...' : 'Reset All Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
