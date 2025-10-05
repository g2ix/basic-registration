import React, { useState } from 'react';
import { Upload, FileText, Download, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { membersAPI } from '../../services/api';

const CSVUpload = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
    } else {
      toast.error('Please select a CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const result = await membersAPI.uploadCSV(formData);
      toast.success(`Successfully uploaded ${result.data.inserted} members`);
      onSuccess();
      onClose();
    } catch (error) {
      if (error.response?.data?.errors) {
        toast.error(`Validation errors: ${error.response.data.errors.slice(0, 3).join(', ')}`);
      } else {
        toast.error(error.response?.data?.error || 'Upload failed');
      }
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `cooperative_id,first_name,middle_initial,last_name,work_email,personal_email,status,eligibility,member_type
COOP-001,John,A,Smith,john.smith@company.com,john@personal.com,active,eligible,Regular
COOP-002,Jane,,Doe,jane.doe@company.com,jane@personal.com,active,eligible,Associate
COOP-003,Bob,B,Johnson,bob.johnson@company.com,bob@personal.com,dormant,not_eligible,Regular`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Batch Upload Members
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start">
              <FileText className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">CSV Format Requirements:</p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Required fields: cooperative_id, first_name, last_name, status, eligibility, member_type</li>
                  <li>Status: active or dormant</li>
                  <li>Eligibility: eligible or not_eligible</li>
                  <li>Member Type: Regular or Associate</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".csv"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">CSV files only</p>
              </div>
            </div>
            {file && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {file.name}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={downloadTemplate}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVUpload;
