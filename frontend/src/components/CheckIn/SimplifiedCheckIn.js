import React, { useState, useEffect } from 'react';
import { Search, UserCheck, UserX, Shield, ShieldOff, Hash, Copy, CheckCircle, AlertTriangle, FileText, Lock } from 'lucide-react';
import { membersAPI, settingsAPI } from '../../services/api';

const SimplifiedCheckIn = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberJourney, setMemberJourney] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null);
  const [formData, setFormData] = useState({
    controlNumber: '',
    mealStub: false,
    transportationStub: false
  });

  const [checkoutData, setCheckoutData] = useState({
    lostStub: false,
    incorrectStub: false,
    differentStubNumber: false,
    differentStubValue: '',
    manualFormSigned: false,
    overrideReason: ''
  });

  const [checkoutSearchTerm, setCheckoutSearchTerm] = useState('');
  const [checkoutSearchType, setCheckoutSearchType] = useState('member'); // 'member' or 'control'
  const [checkoutSearchResults, setCheckoutSearchResults] = useState(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(true);

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

  // Search members and control numbers
  const searchMembers = async () => {
    if (searchTerm.length < 2) {
      setMembers([]);
      setCheckoutSearchResults(null);
      return;
    }

    try {
      // First try to search by control number
      try {
        const controlResponse = await fetch(`http://localhost:8000/api/simplified-attendance/control/${searchTerm}`);
        if (controlResponse.ok) {
          const controlData = await controlResponse.json();
          setCheckoutSearchResults(controlData);
          setMembers([]); // Clear member search results
          return;
        }
      } catch (controlError) {
        // Control number search failed, continue with member search
        console.log('Control number search failed, trying member search');
      }

      // If control number search didn't work, search by member name/ID
      const response = await membersAPI.getAll({ search: searchTerm });
      setMembers(response.data);
      setCheckoutSearchResults(null); // Clear control number search results
    } catch (error) {
      console.error('Error searching:', error);
      setMembers([]);
      setCheckoutSearchResults(null);
    }
  };

  // Check member journey status
  const checkMemberStatus = async (memberId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/simplified-attendance/member/${memberId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const journey = await response.json();
        setMemberJourney(journey);
        return journey;
      } else if (response.status === 404) {
        setMemberJourney(null);
        return null;
      } else if (response.status === 400) {
        const errorData = await response.json();
        setMemberJourney(errorData.journey);
        return errorData;
      }
    } catch (error) {
      console.error('Error checking member status:', error);
      setMemberJourney(null);
      return null;
    }
  };

  // Handle member selection
  const handleMemberSelect = async (member) => {
    setSelectedMember(member);
    setSearchTerm(`${member.first_name} ${member.last_name}`);
    setMembers([]);
    
    // Check member's current status
    await checkMemberStatus(member.member_id);
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (!selectedMember || !formData.controlNumber) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/simplified-attendance/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          member_id: selectedMember.member_id,
          control_number: formData.controlNumber,
          mealStub: formData.mealStub,
          transportationStub: formData.transportationStub
        })
      });

      if (response.ok) {
        const result = await response.json();
        setCheckInResult(result);
        
        // Refresh member status
        await checkMemberStatus(selectedMember.member_id);
        
        // Reset form
        setFormData({
          controlNumber: '',
          mealStub: false,
          transportationStub: false
        });
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      alert('Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  // Search for control number
  const searchByControlNumber = async () => {
    if (!checkoutSearchTerm.trim()) {
      alert('Please enter a control number');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/simplified-attendance/control/${checkoutSearchTerm}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCheckoutSearchResults(data);
        alert('Control number found!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
        setCheckoutSearchResults(null);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed');
      setCheckoutSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle check-out
  const handleCheckOut = async () => {
    const controlNumber = checkoutSearchResults?.control_number || memberJourney?.control_number;
    if (!controlNumber) {
      alert('No control number found for checkout');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/simplified-attendance/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          control_number: controlNumber,
          claimed: true,
          lost_stub: checkoutData.lostStub,
          incorrect_stub: checkoutData.incorrectStub,
          different_stub_number: checkoutData.differentStubNumber,
          different_stub_value: checkoutData.differentStubValue,
          manual_form_signed: checkoutData.manualFormSigned,
          override_reason: checkoutData.overrideReason
        })
      });

      if (response.ok) {
        // Refresh member status if we have a selected member
        if (selectedMember) {
          await checkMemberStatus(selectedMember.member_id);
        }
        alert('Check-out successful!');
        // Reset checkout data
        setCheckoutData({
          lostStub: false,
          incorrectStub: false,
          differentStubNumber: false,
          differentStubValue: '',
          manualFormSigned: false,
          overrideReason: ''
        });
        setCheckoutSearchResults(null);
        setCheckoutSearchTerm('');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Check-out error:', error);
      alert('Check-out failed');
    } finally {
      setLoading(false);
    }
  };

  // Determine member status and controls visibility
  const getMemberStatus = () => {
    if (!selectedMember) return null;
    
    // Step 1: Check eligibility first
    if (selectedMember.eligibility !== 'eligible') {
      return { 
        status: 'not_eligible', 
        message: 'Not Eligible', 
        color: 'red',
        showControls: false,
        showCheckInForm: false,
        showCheckOutButton: false
      };
    }
    
    // Step 2: Member is eligible, check their journey status
    if (!memberJourney) {
      // No journey data = ready to check in
      return { 
        status: 'ready', 
        message: 'Eligible and Ready for Check-in', 
        color: 'green',
        showControls: true,
        showCheckInForm: true,
        showCheckOutButton: false
      };
    }
    
    if (memberJourney.status === 'checked_in') {
      // Has check-in data but no check-out = already checked in
      return { 
        status: 'checked_in', 
        message: 'Eligible but Already Checked In', 
        color: 'blue',
        showControls: false,
        showCheckInForm: false,
        showCheckOutButton: true
      };
    }
    
    if (memberJourney.status === 'complete') {
      // Has both check-in and check-out data = completed
      return { 
        status: 'complete', 
        message: 'Eligible but Complete Attendance', 
        color: 'purple',
        showControls: false,
        showCheckInForm: false,
        showCheckOutButton: false
      };
    }
    
    // Default case (shouldn't happen)
    return { 
      status: 'ready', 
      message: 'Eligible and Ready for Check-in', 
      color: 'green',
      showControls: true,
      showCheckInForm: true,
      showCheckOutButton: false
    };
  };

  const memberStatus = getMemberStatus();
  const canCheckIn = memberStatus?.showCheckInForm;
  const canCheckOut = memberStatus?.showCheckOutButton;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Simplified Check-In</h1>
      
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyUp={searchMembers}
            placeholder="Search by member name, ID, or control number..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        
        {/* Search Results */}
        {members.length > 0 && (
          <div className="mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {members.map((member) => (
              <button
                key={member.member_id}
                onClick={() => handleMemberSelect(member)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {member.first_name} {member.middle_initial ? member.middle_initial + '. ' : ''}{member.last_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.member_type} • {member.cooperative_id}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {member.eligibility === 'eligible' ? (
                      <div className="flex items-center text-green-600">
                        <Shield className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Eligible</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <ShieldOff className="h-4 w-4 mr-1" />
                        <span className="text-xs font-medium">Not Eligible</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Control Number Search Results */}
        {checkoutSearchResults && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="font-medium text-green-900">Control Number Found</span>
            </div>
            <div className="text-sm text-green-800">
              <div><strong>Member:</strong> {checkoutSearchResults.first_name} {checkoutSearchResults.middle_initial ? checkoutSearchResults.middle_initial + '. ' : ''}{checkoutSearchResults.last_name}</div>
              <div><strong>Control Number:</strong> {checkoutSearchResults.control_number}</div>
              <div><strong>Status:</strong> {checkoutSearchResults.status}</div>
              {checkoutSearchResults.check_in_time && (
                <div><strong>Check-in Time:</strong> {new Date(checkoutSearchResults.check_in_time).toLocaleString()}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Member */}
      {selectedMember && (
        <div className="space-y-6">
          {/* Member Info Header */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <UserCheck className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedMember.first_name} {selectedMember.middle_initial ? selectedMember.middle_initial + '. ' : ''}{selectedMember.last_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedMember.member_type} • {selectedMember.cooperative_id}
                  </p>
                </div>
              </div>
              
              {/* Status Badge */}
              {memberStatus && (
                <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  memberStatus.color === 'red' ? 'bg-red-100 text-red-800' :
                  memberStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                  memberStatus.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                  memberStatus.color === 'green' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {memberStatus.color === 'red' ? <ShieldOff className="h-4 w-4 mr-1" /> :
                   memberStatus.color === 'blue' ? <UserCheck className="h-4 w-4 mr-1" /> :
                   memberStatus.color === 'purple' ? <UserX className="h-4 w-4 mr-1" /> :
                   memberStatus.color === 'green' ? <UserCheck className="h-4 w-4 mr-1" /> :
                   <UserCheck className="h-4 w-4 mr-1" />}
                  {memberStatus.message}
                </div>
              )}
            </div>
          </div>

          {/* Check-in Section */}
          {canCheckIn && (
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center mb-4">
                <UserCheck className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Check-In</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Control Number *
                  </label>
                  <input
                    type="text"
                    value={formData.controlNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, controlNumber: e.target.value }))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter control number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Stubs to Issue
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.mealStub}
                        onChange={(e) => setFormData(prev => ({ ...prev, mealStub: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">Meal Stub</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.transportationStub}
                        onChange={(e) => setFormData(prev => ({ ...prev, transportationStub: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-700">Transportation Stub</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleCheckIn}
                    disabled={loading || !formData.controlNumber}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : 'Check In Member'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Check-out Section */}
          {(canCheckOut || checkoutSearchResults) && (
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center mb-4">
                <UserX className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Check-Out</h3>
                {!checkoutEnabled && (
                  <div className="ml-auto flex items-center text-red-600">
                    <Lock className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Disabled</span>
                  </div>
                )}
              </div>
              
              {!checkoutEnabled && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
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
              
              <div className="space-y-4">
                {/* Checkout Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Search for Checkout
                  </label>
                  <div className="flex space-x-3">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={checkoutSearchTerm}
                          onChange={(e) => setCheckoutSearchTerm(e.target.value)}
                          placeholder="Enter control number..."
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={searchByControlNumber}
                      disabled={loading || !checkoutSearchTerm.trim()}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Check-out Type
                  </label>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="checkoutType"
                      checked={!checkoutData.lostStub && !checkoutData.incorrectStub && !checkoutData.differentStubNumber}
                      onChange={() => setCheckoutData(prev => ({ 
                        ...prev, 
                        lostStub: false, 
                        incorrectStub: false, 
                        differentStubNumber: false 
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3 flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Normal Check-out</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="checkoutType"
                      checked={checkoutData.lostStub}
                      onChange={() => setCheckoutData(prev => ({ 
                        ...prev, 
                        lostStub: !prev.lostStub,
                        incorrectStub: false,
                        differentStubNumber: false
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Lost Transportation Stub</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="checkoutType"
                      checked={checkoutData.incorrectStub}
                      onChange={() => setCheckoutData(prev => ({ 
                        ...prev, 
                        incorrectStub: !prev.incorrectStub,
                        lostStub: false,
                        differentStubNumber: false
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3 flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Incorrect Stub</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="checkoutType"
                      checked={checkoutData.differentStubNumber}
                      onChange={() => setCheckoutData(prev => ({ 
                        ...prev, 
                        differentStubNumber: !prev.differentStubNumber,
                        lostStub: false,
                        incorrectStub: false
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3 flex items-center">
                      <Hash className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="text-sm font-medium text-gray-700">Different Stub Number</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Different Stub Value Input */}
              {checkoutData.differentStubNumber && (
                <div>
                  <label htmlFor="differentStubValue" className="block text-sm font-medium text-gray-700 mb-1">
                    Different Stub Number Value
                  </label>
                  <input
                    id="differentStubValue"
                    type="text"
                    value={checkoutData.differentStubValue}
                    onChange={(e) => setCheckoutData(prev => ({ ...prev, differentStubValue: e.target.value }))}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter the different stub number..."
                    required
                  />
                </div>
              )}

              {/* Manual Form and Override Reason */}
              {(checkoutData.lostStub || checkoutData.incorrectStub || checkoutData.differentStubNumber) && (
                <div className="space-y-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={checkoutData.manualFormSigned}
                      onChange={(e) => setCheckoutData(prev => ({ ...prev, manualFormSigned: e.target.checked }))}
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
                      value={checkoutData.overrideReason}
                      onChange={(e) => setCheckoutData(prev => ({ ...prev, overrideReason: e.target.value }))}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter reason for override..."
                    />
                  </div>
                </div>
              )}

                {/* Check-out Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleCheckOut}
                    disabled={loading || (!memberJourney && !checkoutSearchResults) || !checkoutEnabled}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Processing...' : !checkoutEnabled ? 'Checkout Disabled' : 'Check Out Member'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Journey Details */}
          {memberJourney && (
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center mb-4">
                <Hash className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Journey Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Control Number:</span> {memberJourney.control_number}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {memberJourney.status}
                </div>
                <div>
                  <span className="font-medium">Check-in Time:</span> {new Date(memberJourney.check_in_time).toLocaleString()}
                </div>
                {memberJourney.check_out_time && (
                  <div>
                    <span className="font-medium">Check-out Time:</span> {new Date(memberJourney.check_out_time).toLocaleString()}
                  </div>
                )}
                <div>
                  <span className="font-medium">Meal Stub:</span> {memberJourney.meal_stub_issued ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Transportation Stub:</span> {memberJourney.transportation_stub_issued ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Check-in Result */}
      {checkInResult && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-900">Check-in Successful!</span>
              </div>
              
              <div className="bg-white border border-green-300 rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <Hash className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">Control Number</span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(checkInResult.control_number)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-lg font-mono font-bold text-green-900">
                  {checkInResult.control_number}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplifiedCheckIn;
