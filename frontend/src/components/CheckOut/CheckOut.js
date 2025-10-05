import React, { useState, useEffect } from 'react';
import { claimsAPI, attendanceAPI, membersAPI, settingsAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Search, UserX, AlertTriangle, FileText, CheckCircle, Hash, User, Lock } from 'lucide-react';

const CheckOut = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('control'); // 'control' or 'name'
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [memberCheckOutStatus, setMemberCheckOutStatus] = useState({});
  const [checkoutEnabled, setCheckoutEnabled] = useState(true);
  const [claimData, setClaimData] = useState({
    lostStub: false,
    incorrectStub: false,
    differentStubNumber: false,
    differentStubValue: '',
    manualFormSigned: false,
    overrideReason: ''
  });

  // Check checkout setting on component mount
  useEffect(() => {
    const checkCheckoutSetting = async () => {
      try {
        const response = await settingsAPI.getCheckoutEnabled();
        setCheckoutEnabled(response.data.checkout_enabled);
      } catch (error) {
        console.error('Error checking checkout setting:', error);
        // Default to enabled if there's an error
        setCheckoutEnabled(true);
      }
    };
    
    checkCheckoutSetting();
  }, []);

  useEffect(() => {
    if (searchType === 'name' && searchTerm.length >= 2) {
      searchMembers();
    } else {
      setMembers([]);
    }
  }, [searchTerm, searchType]);

  const searchMembers = async () => {
    try {
      const response = await membersAPI.getAll({ search: searchTerm });
      setMembers(response.data);
      
      // Check check-out status for each member
      const statusPromises = response.data.map(async (member) => {
        try {
          const statusResponse = await attendanceAPI.getByMemberId(member.member_id);
          return { memberId: member.member_id, status: 'checked_out', data: statusResponse.data };
        } catch (error) {
          return { memberId: member.member_id, status: 'not_checked_out', data: null };
        }
      });
      
      const statusResults = await Promise.all(statusPromises);
      const statusMap = {};
      statusResults.forEach(result => {
        statusMap[result.memberId] = result;
      });
      setMemberCheckOutStatus(statusMap);
    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    setSearchTerm(`${member.first_name} ${member.middle_initial ? member.middle_initial + '. ' : ''}${member.last_name}`);
    setMembers([]);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setLoading(true);
    try {
      if (searchType === 'control') {
        const response = await attendanceAPI.getByControlNumber(searchTerm);
        setAttendanceRecord(response.data);
        setSelectedMember(null);
      } else if (searchType === 'name' && selectedMember) {
        // Search for attendance record by member ID
        const response = await attendanceAPI.getByMemberId(selectedMember.member_id);
        setAttendanceRecord(response.data);
      }
    } catch (error) {
      if (error.response?.data?.code === 'CONTROL_NOT_FOUND') {
        toast.error('Control number not found');
      } else if (error.response?.data?.code === 'MEMBER_NOT_FOUND') {
        toast.error('No attendance record found for this member');
      } else if (error.response?.data?.code === 'ALREADY_CHECKED_OUT') {
        toast.error('This member has already checked out');
      } else {
        toast.error('Error fetching attendance record');
      }
      setAttendanceRecord(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimTypeChange = (type) => {
    setClaimData(prev => ({
      ...prev,
      [type]: !prev[type],
      // Reset other types when selecting one
      ...(type === 'lostStub' && { incorrectStub: false, differentStubNumber: false }),
      ...(type === 'incorrectStub' && { lostStub: false, differentStubNumber: false }),
      ...(type === 'differentStubNumber' && { lostStub: false, incorrectStub: false })
    }));
  };

  const handleCheckOut = async () => {
    if (!attendanceRecord) {
      toast.error('No attendance record found');
      return;
    }

    if (!claimData.lostStub && !claimData.incorrectStub && !claimData.differentStubNumber && !claimData.manualFormSigned) {
      // Normal claim
      try {
        setLoading(true);
        const response = await claimsAPI.checkOut({
          controlNumber: attendanceRecord.control_number
        });
        
        toast.success('Check-out successful!');
        console.log('Check-out response:', response.data);
        resetForm();
      } catch (error) {
        if (error.response?.data?.code === 'ALREADY_CLAIMED') {
          toast.error('Transportation allowance already claimed');
        } else {
          toast.error(error.response?.data?.error || 'Check-out failed');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Special claim (lost or incorrect stub)
      try {
        setLoading(true);
        const response = await claimsAPI.checkOut({
          controlNumber: attendanceRecord.control_number,
          lostStub: claimData.lostStub,
          incorrectStub: claimData.incorrectStub,
          differentStubNumber: claimData.differentStubNumber,
          differentStubValue: claimData.differentStubValue,
          manualFormSigned: claimData.manualFormSigned,
          overrideReason: claimData.overrideReason
        });
        
        toast.success('Check-out successful!');
        console.log('Check-out response:', response.data);
        resetForm();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Check-out failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setSearchTerm('');
    setSelectedMember(null);
    setMembers([]);
    setAttendanceRecord(null);
    setClaimData({
      lostStub: false,
      incorrectStub: false,
      differentStubNumber: false,
      differentStubValue: '',
      manualFormSigned: false,
      overrideReason: ''
    });
  };

  const getClaimStatus = () => {
    if (claimData.lostStub) return '📝 Lost Stub';
    if (claimData.incorrectStub) return '⚠️ Incorrect Stub';
    if (claimData.differentStubNumber) return '🔢 Different Stub Number';
    return '✅ Normal Claim';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Check-Out</h1>
        {!checkoutEnabled && (
          <div className="flex items-center text-red-600">
            <Lock className="h-5 w-5 mr-2" />
            <span className="font-medium">Checkout Disabled</span>
          </div>
        )}
      </div>

      {!checkoutEnabled && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-red-800">Checkout Disabled</h4>
              <p className="text-sm text-red-700 mt-1">
                Checkout functionality is currently disabled by system settings. Please contact an administrator to enable checkout.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          {/* Search Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Search Method
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchType"
                  value="control"
                  checked={searchType === 'control'}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3 flex items-center">
                  <Hash className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Control Number</span>
                </div>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="searchType"
                  value="name"
                  checked={searchType === 'name'}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div className="ml-3 flex items-center">
                  <User className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Member Name</span>
                </div>
              </label>
            </div>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {searchType === 'control' ? 'Control Number' : 'Member Name'}
            </label>
            <form onSubmit={handleSearch} className="flex space-x-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder={searchType === 'control' ? 'Enter control number...' : 'Type member name to search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading || (searchType === 'name' && !selectedMember)}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>
            
            {/* Member Search Results */}
            {searchType === 'name' && members.length > 0 && (
              <div className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {members.map((member) => {
                  const checkOutStatus = memberCheckOutStatus[member.member_id];
                  const isCheckedOut = checkOutStatus?.status === 'checked_out';
                  
                  return (
                    <button
                      key={member.member_id}
                      onClick={() => handleMemberSelect(member)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 ${
                        isCheckedOut ? 'bg-red-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {member.first_name} {member.middle_initial ? member.middle_initial + '. ' : ''}{member.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.member_type} • {member.cooperative_id}
                          </div>
                        </div>
                        {isCheckedOut && (
                          <div className="flex items-center text-red-600">
                            <UserX className="h-4 w-4 mr-1" />
                            <span className="text-xs font-medium">Check-out Status</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected Member */}
            {searchType === 'name' && selectedMember && (
              <div className={`mt-2 border rounded-md p-3 ${
                memberCheckOutStatus[selectedMember.member_id]?.status === 'checked_out' 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className={`h-4 w-4 mr-2 ${
                      memberCheckOutStatus[selectedMember.member_id]?.status === 'checked_out' 
                        ? 'text-red-600' 
                        : 'text-blue-600'
                    }`} />
                    <div>
                      <div className={`font-medium ${
                        memberCheckOutStatus[selectedMember.member_id]?.status === 'checked_out' 
                          ? 'text-red-900' 
                          : 'text-blue-900'
                      }`}>
                        {selectedMember.first_name} {selectedMember.middle_initial ? selectedMember.middle_initial + '. ' : ''}{selectedMember.last_name}
                      </div>
                      <div className={`text-sm ${
                        memberCheckOutStatus[selectedMember.member_id]?.status === 'checked_out' 
                          ? 'text-red-700' 
                          : 'text-blue-700'
                      }`}>
                        {selectedMember.member_type} • {selectedMember.cooperative_id}
                      </div>
                    </div>
                  </div>
                  {memberCheckOutStatus[selectedMember.member_id]?.status === 'checked_out' && (
                    <div className="flex items-center text-red-600 bg-red-100 px-2 py-1 rounded-full">
                      <UserX className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">Already Checked Out</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Attendance Record Display */}
          {attendanceRecord && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-900">Attendance Record Found</span>
              </div>
              <div className="text-sm text-green-800">
                <div><strong>Name:</strong> {attendanceRecord.first_name} {attendanceRecord.middle_initial ? attendanceRecord.middle_initial + '. ' : ''}{attendanceRecord.last_name}</div>
                <div><strong>Member Type:</strong> {attendanceRecord.member_type}</div>
                <div><strong>Cooperative ID:</strong> {attendanceRecord.cooperative_id}</div>
                <div><strong>Control Number:</strong> {attendanceRecord.control_number}</div>
                <div><strong>Check-in Time:</strong> {new Date(attendanceRecord.check_in_time).toLocaleString()}</div>
                <div><strong>Meal Stub:</strong> {attendanceRecord.meal_stub_issued ? 'Yes' : 'No'}</div>
                <div><strong>Transportation Stub:</strong> {attendanceRecord.transportation_stub_issued ? 'Yes' : 'No'}</div>
              </div>
            </div>
          )}

          {/* Claim Type Selection */}
          {attendanceRecord && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Claim Type
              </label>
              <div className="space-y-3">
                <label className={`flex items-center ${
                  attendanceRecord.claimed ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="radio"
                    name="claimType"
                    checked={!claimData.lostStub && !claimData.incorrectStub}
                    onChange={() => setClaimData(prev => ({ ...prev, lostStub: false, incorrectStub: false }))}
                    disabled={attendanceRecord.claimed}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Normal Claim</span>
                  </div>
                </label>
                
                <label className={`flex items-center ${
                  attendanceRecord.claimed ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="radio"
                    name="claimType"
                    checked={claimData.lostStub}
                    onChange={() => handleClaimTypeChange('lostStub')}
                    disabled={attendanceRecord.claimed}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Lost Stub</span>
                  </div>
                </label>
                
                <label className={`flex items-center ${
                  attendanceRecord.claimed ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="radio"
                    name="claimType"
                    checked={claimData.incorrectStub}
                    onChange={() => handleClaimTypeChange('incorrectStub')}
                    disabled={attendanceRecord.claimed}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Incorrect Stub</span>
                  </div>
                </label>
                
                <label className={`flex items-center ${
                  attendanceRecord.claimed ? 'opacity-50 cursor-not-allowed' : ''
                }`}>
                  <input
                    type="radio"
                    name="claimType"
                    checked={claimData.differentStubNumber}
                    onChange={() => handleClaimTypeChange('differentStubNumber')}
                    disabled={attendanceRecord.claimed}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <div className="ml-3 flex items-center">
                    <Hash className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Different Stub Number</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Different Stub Value Input */}
          {claimData.differentStubNumber && !attendanceRecord.claimed && (
            <div>
              <label htmlFor="differentStubValue" className="block text-sm font-medium text-gray-700 mb-1">
                Different Stub Number Value
              </label>
              <input
                id="differentStubValue"
                type="text"
                value={claimData.differentStubValue}
                onChange={(e) => setClaimData(prev => ({ ...prev, differentStubValue: e.target.value }))}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter the different stub number..."
                required
              />
            </div>
          )}

          {/* Manual Form and Override Reason */}
          {(claimData.lostStub || claimData.incorrectStub || claimData.differentStubNumber) && !attendanceRecord.claimed && (
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={claimData.manualFormSigned}
                  onChange={(e) => setClaimData(prev => ({ ...prev, manualFormSigned: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3 flex items-center">
                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Manual Form Signed</span>
                </div>
              </label>
              
              <div>
                <label htmlFor="overrideReason" className="block text-sm font-medium text-gray-700 mb-1">
                  Override Reason
                </label>
                <textarea
                  id="overrideReason"
                  rows={3}
                  value={claimData.overrideReason}
                  onChange={(e) => setClaimData(prev => ({ ...prev, overrideReason: e.target.value }))}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter reason for override..."
                />
              </div>
            </div>
          )}

          {/* Status Display */}
          {attendanceRecord && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="text-sm">
                <div><strong>Claim Status:</strong> {getClaimStatus()}</div>
                {claimData.differentStubNumber && claimData.differentStubValue && (
                  <div className="text-purple-700 mt-1">🔢 Different stub number: {claimData.differentStubValue}</div>
                )}
                {claimData.manualFormSigned && (
                  <div className="text-green-700 mt-1">✓ Manual form will be required</div>
                )}
              </div>
            </div>
          )}

          {/* Check-out Button */}
          {attendanceRecord && (
            <div className="flex justify-end">
              {attendanceRecord.claimed ? (
                <div className="flex items-center text-red-600 bg-red-100 px-4 py-2 rounded-md">
                  <UserX className="h-5 w-5 mr-2" />
                  <span className="font-medium">Already Checked Out</span>
                </div>
              ) : (
                <button
                  onClick={handleCheckOut}
                  disabled={loading || !checkoutEnabled}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : !checkoutEnabled ? 'Checkout Disabled' : 'Check Out Member'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckOut;
