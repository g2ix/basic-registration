import React, { useState, useEffect } from 'react';
import { membersAPI, attendanceAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Search, UserCheck, UserX, Ticket, Car, Hash, X, Copy, Shield, ShieldOff } from 'lucide-react';

const CheckIn = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null);
  const [memberCheckInStatus, setMemberCheckInStatus] = useState({});
  const [formData, setFormData] = useState({
    controlNumber: '',
    mealStub: false,
    transportationStub: false
  });

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchMembers();
    } else {
      setMembers([]);
    }
  }, [searchTerm]);

  // Monitor status changes
  useEffect(() => {
    if (selectedMember) {
      // Status changed for selected member
    }
  }, [memberCheckInStatus, selectedMember]);

  const searchMembers = async () => {
    try {
      const response = await membersAPI.getAll({ search: searchTerm });
      setMembers(response.data);
      
      // Check check-in status for each member
      const statusPromises = response.data.map(async (member) => {
        try {
          const statusResponse = await attendanceAPI.getByMemberId(member.member_id);
          const result = { memberId: member.member_id, status: 'checked_in', data: statusResponse.data };
          return result;
        } catch (error) {
          // Handle different error types
          if (error.response?.status === 404) {
            const result = { memberId: member.member_id, status: 'not_checked_in', data: null };
            return result;
          } else if (error.response?.status === 400) {
            const errorData = error.response?.data;
            
            // Check if member has completed the full cycle
            if (errorData?.code === 'COMPLETE') {
              const result = { memberId: member.member_id, status: 'complete', data: errorData };
              return result;
            }
            
            // Other 400 errors (like already checked in)
            const result = { memberId: member.member_id, status: 'checked_in', data: errorData };
            return result;
          } else {
            const result = { memberId: member.member_id, status: 'error', data: null };
            return result;
          }
        }
      });
      
      const statusResults = await Promise.all(statusPromises);
      const statusMap = {};
      statusResults.forEach(result => {
        statusMap[result.memberId] = result;
      });
      
      setMemberCheckInStatus(statusMap);
    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  const handleMemberSelect = (member) => {
    setSelectedMember(member);
    const fullName = `${member.first_name} ${member.middle_initial ? member.middle_initial + '. ' : ''}${member.last_name}`;
    setSearchTerm(fullName);
    setMembers([]);
  };

  const handleCheckboxChange = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const refreshMemberStatus = async (memberId) => {
    try {
      const statusResponse = await attendanceAPI.getByMemberId(memberId);
      setMemberCheckInStatus(prev => ({
        ...prev,
        [memberId]: { memberId, status: 'checked_in', data: statusResponse.data }
      }));
    } catch (error) {
      if (error.response?.status === 404) {
        setMemberCheckInStatus(prev => ({
          ...prev,
          [memberId]: { memberId, status: 'not_checked_in', data: null }
        }));
      } else {
      }
    }
  };


  const clearCheckInResult = () => {
    setCheckInResult(null);
    setSelectedMember(null);
    setSearchTerm('');
    setMembers([]);
    setMemberCheckInStatus({});
    setFormData({
      controlNumber: '',
      mealStub: false,
      transportationStub: false
    });
  };

  const copyControlNumber = async () => {
    try {
      await navigator.clipboard.writeText(checkInResult.control_number);
      toast.success('Control number copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy control number');
    }
  };

  const handleCheckIn = async () => {
    if (!selectedMember) {
      toast.error('Please select a member');
      return;
    }

    if (!formData.controlNumber.trim()) {
      toast.error('Please enter a control number');
      return;
    }

    if (!formData.mealStub && !formData.transportationStub) {
      toast.error('Please select at least one stub type');
      return;
    }

    setLoading(true);
    try {
      const response = await attendanceAPI.checkIn({
        member_id: selectedMember.member_id,
        control_number: formData.controlNumber,
        mealStub: formData.mealStub,
        transportationStub: formData.transportationStub
      });

      toast.success('Check-in successful!');
      
      // Store the check-in result to display control number
      setCheckInResult(response.data);
      
      // Refresh the member's status to show they're now checked in
      await refreshMemberStatus(selectedMember.member_id);
      
      // Reset form and clear all fields
      setSelectedMember(null);
      setSearchTerm('');
      setMembers([]);
      setFormData({
        controlNumber: '',
        mealStub: false,
        transportationStub: false
      });
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData?.code === 'ALREADY_CHECKED_IN') {
        toast.error('This member has already checked in today');
      } else if (errorData?.code === 'CONTROL_NUMBER_EXISTS') {
        toast.error('This control number is already in use');
      } else if (errorData?.code === 'NOT_ELIGIBLE') {
        toast.error(`Member is not eligible for check-in (${errorData.member?.eligibility})`);
      } else {
        toast.error(errorData?.error || 'Check-in failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Check-In</h1>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          {/* Member Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Member
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Type member name to search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            {/* Search Results */}
            {members.length > 0 && (
              <div className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {members.map((member) => {
                  const checkInStatus = memberCheckInStatus[member.member_id];
                  const isCheckedIn = checkInStatus?.status === 'checked_in';
                  const isCheckedOut = checkInStatus?.status === 'complete';
                  const isEligible = member.eligibility === 'eligible';
                  
                  return (
                    <button
                      key={member.member_id}
                      onClick={() => handleMemberSelect(member)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 ${
                        isCheckedIn ? 'bg-blue-50' : !isEligible ? 'bg-red-50' : isEligible ? 'bg-green-50' : ''
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
                        <div className="flex items-center space-x-2">
                          {/* Eligibility Status */}
                          {!isEligible && (
                            <div className="flex items-center text-red-600">
                              <ShieldOff className="h-4 w-4 mr-1" />
                              <span className="text-xs font-medium">Not Eligible</span>
                            </div>
                          )}
                          {isEligible && (
                            <div className="flex items-center text-green-600">
                              <Shield className="h-4 w-4 mr-1" />
                              <span className="text-xs font-medium">Eligible</span>
                            </div>
                          )}
                          
                          {/* Check-in Status */}
                          {isCheckedIn && (
                            <div className="flex items-center text-blue-600">
                              <UserCheck className="h-4 w-4 mr-1" />
                              <span className="text-xs font-medium">Already Checked In</span>
                            </div>
                          )}
                          {isCheckedOut && (
                            <div className="flex items-center text-purple-600">
                              <UserX className="h-4 w-4 mr-1" />
                              <span className="text-xs font-medium">Complete</span>
                            </div>
                          )}
                          {isEligible && !isCheckedIn && !isCheckedOut && (
                            <div className="flex items-center text-gray-600">
                              <UserCheck className="h-4 w-4 mr-1" />
                              <span className="text-xs font-medium">Ready to Check In</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Member - Only show if member can check in */}
          {selectedMember && (() => {
            const memberStatus = memberCheckInStatus[selectedMember.member_id];
            const canCheckIn = selectedMember.eligibility === 'eligible' && 
                              memberStatus?.status === 'not_checked_in';
            
            
            if (!canCheckIn) {
              return (
                <div className="border rounded-md p-4 bg-gray-50 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UserX className="h-5 w-5 mr-2 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {selectedMember.first_name} {selectedMember.middle_initial ? selectedMember.middle_initial + '. ' : ''}{selectedMember.last_name}
                        </div>
                        <div className="text-sm text-gray-700">
                          {selectedMember.eligibility !== 'eligible' 
                            ? 'Not Eligible for Check-in'
                            : memberStatus?.status === 'checked_in'
                            ? 'Already Checked In'
                            : memberStatus?.status === 'complete'
                            ? 'Complete'
                            : memberStatus?.status === 'error'
                            ? 'Error - Cannot Check In'
                            : 'Ready to Check In'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            
            return (
              <div className="border rounded-md p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserCheck className={`h-5 w-5 mr-2 ${
                    memberCheckInStatus[selectedMember.member_id]?.status === 'checked_in' 
                      ? 'text-green-600' 
                      : selectedMember.eligibility !== 'eligible'
                      ? 'text-red-600'
                      : 'text-blue-600'
                  }`} />
                  <div>
                    <div className={`font-medium ${
                      memberCheckInStatus[selectedMember.member_id]?.status === 'checked_in' 
                        ? 'text-green-900' 
                        : selectedMember.eligibility !== 'eligible'
                        ? 'text-red-900'
                        : 'text-blue-900'
                    }`}>
                      {selectedMember.first_name} {selectedMember.middle_initial ? selectedMember.middle_initial + '. ' : ''}{selectedMember.last_name}
                    </div>
                    <div className={`text-sm ${
                      memberCheckInStatus[selectedMember.member_id]?.status === 'checked_in' 
                        ? 'text-green-700' 
                        : selectedMember.eligibility !== 'eligible'
                        ? 'text-red-700'
                        : 'text-blue-700'
                    }`}>
                      {selectedMember.member_type} • {selectedMember.cooperative_id}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Eligibility Status */}
                  {selectedMember.eligibility !== 'eligible' && (
                    <div className="flex items-center text-red-600 bg-red-100 px-2 py-1 rounded-full">
                      <ShieldOff className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">Not Eligible</span>
                    </div>
                  )}
                  {selectedMember.eligibility === 'eligible' && (
                    <div className="flex items-center text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      <Shield className="h-4 w-4 mr-1" />
                      <span className="text-xs font-medium">Eligible</span>
                    </div>
                  )}
                  
                  {/* Check-in Status */}
                  {(() => {
                    const memberStatus = memberCheckInStatus[selectedMember.member_id];
                    
                    // STEP 1: Check if member is eligible
                    if (selectedMember.eligibility !== 'eligible') {
                      return (
                        <div className="flex items-center text-red-600 bg-red-100 px-2 py-1 rounded-full">
                          <ShieldOff className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">Not Eligible</span>
                        </div>
                      );
                    }
                    
                    // STEP 2: Member is eligible, check their status
                    if (memberStatus?.status === 'checked_in') {
                      return (
                        <div className="flex items-center text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                          <UserCheck className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">Already Checked In</span>
                        </div>
                      );
                    }
                    
                    if (memberStatus?.status === 'complete') {
                      return (
                        <div className="flex items-center text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                          <UserX className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">Complete</span>
                        </div>
                      );
                    }
                    
                    // STEP 3: Member is eligible and not checked in (ready to check in)
                    if (memberStatus?.status === 'not_checked_in' || !memberStatus) {
                      return (
                        <div className="flex items-center text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                          <UserCheck className="h-4 w-4 mr-1" />
                          <span className="text-xs font-medium">Ready to Check In</span>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                </div>
              </div>
            </div>
            );
          })()}

          {/* Control Number Input - Only show if member can check in */}
          {selectedMember && (() => {
            const memberStatus = memberCheckInStatus[selectedMember.member_id];
            const canCheckIn = selectedMember.eligibility === 'eligible' && 
                              memberStatus?.status === 'not_checked_in';
            
            if (!canCheckIn) return null;
            
            return (
              <div>
                <label htmlFor="controlNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Control Number *
                </label>
                <input
                  type="text"
                  id="controlNumber"
                  name="controlNumber"
                  required
                  value={formData.controlNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, controlNumber: e.target.value }))}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter control number"
                />
              </div>
            );
          })()}

          {/* Stub Selection - Only show if member can check in */}
          {selectedMember && (() => {
            const memberStatus = memberCheckInStatus[selectedMember.member_id];
            const canCheckIn = selectedMember.eligibility === 'eligible' && 
                              memberStatus?.status === 'not_checked_in';
            
            if (!canCheckIn) return null;
            
            return (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Stubs to Issue
                </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.mealStub}
                      onChange={() => handleCheckboxChange('mealStub')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex items-center">
                      <Ticket className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Meal Stub</span>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.transportationStub}
                      onChange={() => handleCheckboxChange('transportationStub')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex items-center">
                      <Car className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Transportation Stub</span>
                    </div>
                  </label>
                </div>
              </div>
            );
          })()}

          {/* Check-in Button - Only show if member can check in */}
          {selectedMember && (() => {
            const memberStatus = memberCheckInStatus[selectedMember.member_id];
            const canCheckIn = selectedMember.eligibility === 'eligible' && 
                              memberStatus?.status === 'not_checked_in';
            
            if (!canCheckIn) return null;
            
            return (
              <div className="flex justify-end">
                <button
                  onClick={handleCheckIn}
                  disabled={loading || (!formData.mealStub && !formData.transportationStub)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : 'Check In Member'}
                </button>
              </div>
            );
          })()}

          {/* Check-in Result */}
          {checkInResult && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <UserCheck className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-green-900">Check-in Successful!</span>
                  </div>
                  
                  {/* Control Number - Highlighted */}
                  <div className="bg-white border border-green-300 rounded-md p-3 mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <Hash className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-800">Control Number</span>
                      </div>
                      <button
                        onClick={copyControlNumber}
                        className="flex items-center text-green-600 hover:text-green-800 hover:bg-green-100 px-2 py-1 rounded-md transition-colors text-sm"
                        title="Copy control number"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </button>
                    </div>
                    <div className="text-lg font-mono font-bold text-green-900">
                      {checkInResult.control_number}
                    </div>
                  </div>
                  
                  <div className="text-sm text-green-800 space-y-1">
                    <div><strong>Member:</strong> {checkInResult.member.first_name} {checkInResult.member.middle_initial ? checkInResult.member.middle_initial + '. ' : ''}{checkInResult.member.last_name}</div>
                    <div><strong>Cooperative ID:</strong> {checkInResult.member.cooperative_id}</div>
                    <div><strong>Stubs Issued:</strong></div>
                    <ul className="ml-4 mt-1 space-y-1">
                      {checkInResult.meal_stub_issued && (
                        <li className="flex items-center">
                          <Ticket className="h-3 w-3 text-green-600 mr-2" />
                          Meal Stub
                        </li>
                      )}
                      {checkInResult.transportation_stub_issued && (
                        <li className="flex items-center">
                          <Car className="h-3 w-3 text-green-600 mr-2" />
                          Transportation Stub
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={clearCheckInResult}
                    className="px-3 py-1 text-sm font-medium text-green-600 hover:text-green-800 hover:bg-green-100 rounded-md transition-colors"
                  >
                    New Check-in
                  </button>
                  <button
                    onClick={() => setCheckInResult(null)}
                    className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-md transition-colors"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckIn;
