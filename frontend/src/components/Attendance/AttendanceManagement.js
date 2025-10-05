import React, { useState, useEffect } from 'react';
import { simplifiedAttendanceAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { formatDateTime, getCurrentDate } from '../../utils/timezone';
import { 
  Search, 
  UserCheck, 
  UserX, 
  Trash2, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Download,
  AlertTriangle
} from 'lucide-react';

const AttendanceManagement = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all'); // all, checked-in, checked-out
  const [selectedDate, setSelectedDate] = useState(getCurrentDate());

  const recordsPerPage = 10;

  useEffect(() => {
    fetchAttendanceRecords();
  }, [currentPage, searchTerm, filterStatus, selectedDate]);

  const fetchAttendanceRecords = async () => {
    setLoading(true);
    try {
      const params = {
        status: filterStatus === 'all' ? undefined : filterStatus,
        date: selectedDate,
        limit: recordsPerPage,
        offset: (currentPage - 1) * recordsPerPage
      };
      
      const response = await simplifiedAttendanceAPI.getAll(params);
      setAttendanceRecords(response.data || []);
      // For simplified API, we'll calculate pagination on the frontend
      setTotalPages(Math.ceil((response.data?.length || 0) / recordsPerPage) || 1);
      setTotalRecords(response.data?.length || 0);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchAttendanceRecords();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleOverrideCheckIn = async (memberId) => {
    if (!window.confirm('Are you sure you want to override this check-in? This will remove the check-in record.')) {
      return;
    }

    try {
      // For simplified attendance, we need to implement override functionality
      // This would require a new API endpoint in the simplified attendance system
      toast.error('Override check-in functionality not yet implemented for simplified attendance');
      // await simplifiedAttendanceAPI.overrideCheckIn(memberId);
      // toast.success('Check-in overridden successfully');
      // fetchAttendanceRecords();
    } catch (error) {
      console.error('Error overriding check-in:', error);
      toast.error('Failed to override check-in');
    }
  };

  const handleOverrideCheckOut = async (controlNumber) => {
    if (!window.confirm('Are you sure you want to override this check-out? This will remove the check-out record.')) {
      return;
    }

    try {
      // For simplified attendance, we need to implement override functionality
      // This would require a new API endpoint in the simplified attendance system
      toast.error('Override check-out functionality not yet implemented for simplified attendance');
      // await simplifiedAttendanceAPI.overrideCheckOut(controlNumber);
      // toast.success('Check-out overridden successfully');
      // fetchAttendanceRecords();
    } catch (error) {
      console.error('Error overriding check-out:', error);
      toast.error('Failed to override check-out');
    }
  };

  const handleRemoveCheckIn = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this check-in record? This action cannot be undone.')) {
      return;
    }

    try {
      // For simplified attendance, we need to implement remove functionality
      // This would require a new API endpoint in the simplified attendance system
      toast.error('Remove check-in functionality not yet implemented for simplified attendance');
      // await simplifiedAttendanceAPI.removeCheckIn(memberId);
      // toast.success('Check-in record removed successfully');
      // fetchAttendanceRecords();
    } catch (error) {
      console.error('Error removing check-in:', error);
      toast.error('Failed to remove check-in record');
    }
  };

  const handleRemoveCheckOut = async (controlNumber) => {
    if (!window.confirm('Are you sure you want to remove this check-out record? This action cannot be undone.')) {
      return;
    }

    try {
      // For simplified attendance, we need to implement remove functionality
      // This would require a new API endpoint in the simplified attendance system
      toast.error('Remove check-out functionality not yet implemented for simplified attendance');
      // await simplifiedAttendanceAPI.removeCheckOut(controlNumber);
      // toast.success('Check-out record removed successfully');
      // fetchAttendanceRecords();
    } catch (error) {
      console.error('Error removing check-out:', error);
      toast.error('Failed to remove check-out record');
    }
  };

  const exportAttendance = async () => {
    try {
      // For now, we'll export the current data as CSV
      const csvData = convertToCSV(attendanceRecords);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Attendance data exported successfully');
    } catch (error) {
      console.error('Error exporting attendance:', error);
      toast.error('Failed to export attendance data');
    }
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = [
      'Member Name',
      'Control Number',
      'Check-in Time',
      'Check-out Time',
      'Meal Stub Issued',
      'Transportation Stub Issued',
      'Check-out Type',
      'Different Stub Value',
      'Manual Form Signed',
      'Override Reason',
      'Status'
    ];
    
    const rows = data.map(record => [
      `"${record.first_name} ${record.middle_initial ? record.middle_initial + '. ' : ''}${record.last_name}"`,
      `"${record.control_number}"`,
      `"${formatDateTimeDisplay(record.check_in_time)}"`,
      `"${formatDateTimeDisplay(record.check_out_time)}"`,
      record.meal_stub_issued ? 'Yes' : 'No',
      record.transportation_stub_issued ? 'Yes' : 'No',
      record.lost_stub ? 'Lost Stub' : 
      record.incorrect_stub ? 'Incorrect Stub' : 
      record.different_stub_number ? 'Different Stub Number' : 
      record.status === 'complete' ? 'Normal Check-out' : 'Not checked out',
      record.different_stub_value || '',
      record.manual_form_signed ? 'Yes' : 'No',
      record.override_reason || '',
      record.status
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  };

  const getStatusBadge = (record) => {
    if (record.status === 'complete') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <UserX className="h-3 w-3 mr-1" />
          Checked Out
        </span>
      );
    } else if (record.status === 'checked_in') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <UserCheck className="h-3 w-3 mr-1" />
          Checked In
        </span>
      );
    }
    return null;
  };

  const formatDateTimeDisplay = (dateTime) => {
    if (!dateTime) return 'N/A';
    return formatDateTime(dateTime);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
            <p className="text-gray-600">Manage member check-ins and check-outs</p>
          </div>
          <button
            onClick={exportAttendance}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Members
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search by name or control number..."
                />
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                id="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">All</option>
                <option value="checked-in">Checked In</option>
                <option value="checked-out">Checked Out</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </button>
            
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Results Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Attendance Records</h3>
            <p className="text-sm text-gray-600">
              Showing {attendanceRecords.length} of {totalRecords} records
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Control Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Times
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stubs Issued
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-out Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((record) => (
                  <tr key={record.journey_id || record.control_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.first_name} {record.middle_initial ? record.middle_initial + '. ' : ''}{record.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.member_type} • {record.cooperative_id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.control_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex flex-col space-y-2">
                        <div className="flex items-center">
                          <div className="flex items-center mr-2">
                            <UserCheck className="h-4 w-4 text-green-600 mr-1" />
                            <span className="text-xs font-medium text-green-700">Check-in:</span>
                          </div>
                          <span className="text-sm">{formatDateTimeDisplay(record.check_in_time)}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="flex items-center mr-2">
                            <UserX className="h-4 w-4 text-red-600 mr-1" />
                            <span className="text-xs font-medium text-red-700">Check-out:</span>
                          </div>
                          <span className="text-sm">{formatDateTimeDisplay(record.check_out_time)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col space-y-1">
                        {record.meal_stub_issued && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Meal Stub
                          </span>
                        )}
                        {record.transportation_stub_issued && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Transportation Stub
                          </span>
                        )}
                        {!record.meal_stub_issued && !record.transportation_stub_issued && (
                          <span className="text-xs text-gray-500">No stubs issued</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.status === 'complete' ? (
                        <div className="flex flex-col space-y-1">
                          {record.lost_stub && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Lost Stub
                            </span>
                          )}
                          {record.incorrect_stub && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Incorrect Stub
                            </span>
                          )}
                          {record.different_stub_number && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Different Stub: {record.different_stub_value}
                            </span>
                          )}
                          {!record.lost_stub && !record.incorrect_stub && !record.different_stub_number && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Normal Check-out
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Not checked out</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {record.status === 'checked_in' && (
                          <button
                            onClick={() => handleOverrideCheckIn(record.member_id)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Override Check-in"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {record.status === 'complete' && (
                          <button
                            onClick={() => handleOverrideCheckOut(record.control_number)}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Override Check-out"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {record.status === 'checked_in' && (
                          <button
                            onClick={() => handleRemoveCheckIn(record.member_id)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove Check-in"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {record.status === 'complete' && (
                          <button
                            onClick={() => handleRemoveCheckOut(record.control_number)}
                            className="text-red-600 hover:text-red-900"
                            title="Remove Check-out"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceManagement;
