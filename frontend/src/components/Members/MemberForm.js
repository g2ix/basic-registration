import React, { useState, useEffect } from 'react';
import { membersAPI } from '../../services/api';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

const MemberForm = ({ member, onCancel, onSubmit }) => {
  const [formData, setFormData] = useState({
    cooperative_id: '',
    first_name: '',
    middle_initial: '',
    last_name: '',
    work_email: '',
    personal_email: '',
    status: 'active',
    eligibility: 'eligible',
    member_type: 'Regular'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        cooperative_id: member.cooperative_id || '',
        first_name: member.first_name || '',
        middle_initial: member.middle_initial || '',
        last_name: member.last_name || '',
        work_email: member.work_email || '',
        personal_email: member.personal_email || '',
        status: member.status || 'active',
        eligibility: member.eligibility || 'eligible',
        member_type: member.member_type || 'Regular'
      });
    }
  }, [member]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (member) {
        await membersAPI.update(member.member_id, formData);
        toast.success('Member updated successfully');
      } else {
        await membersAPI.create(formData);
        toast.success('Member created successfully');
      }
      onSubmit();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error saving member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {member ? 'Edit Member' : 'Add New Member'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cooperative ID */}
            <div>
              <label htmlFor="cooperative_id" className="block text-sm font-medium text-gray-700">
                Cooperative ID *
              </label>
              <input
                type="text"
                name="cooperative_id"
                id="cooperative_id"
                required
                value={formData.cooperative_id}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., COOP-001"
              />
            </div>

            {/* Member Type */}
            <div>
              <label htmlFor="member_type" className="block text-sm font-medium text-gray-700">
                Member Type *
              </label>
              <select
                name="member_type"
                id="member_type"
                required
                value={formData.member_type}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="Regular">Regular Member</option>
                <option value="Associate">Associate Member</option>
              </select>
            </div>

            {/* First Name */}
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                First Name *
              </label>
              <input
                type="text"
                name="first_name"
                id="first_name"
                required
                value={formData.first_name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter first name"
              />
            </div>

            {/* Middle Initial */}
            <div>
              <label htmlFor="middle_initial" className="block text-sm font-medium text-gray-700">
                Middle Initial
              </label>
              <input
                type="text"
                name="middle_initial"
                id="middle_initial"
                maxLength="1"
                value={formData.middle_initial}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="M"
              />
            </div>

            {/* Last Name */}
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Last Name *
              </label>
              <input
                type="text"
                name="last_name"
                id="last_name"
                required
                value={formData.last_name}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter last name"
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status *
              </label>
              <select
                name="status"
                id="status"
                required
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="dormant">Dormant</option>
              </select>
            </div>

            {/* Work Email */}
            <div>
              <label htmlFor="work_email" className="block text-sm font-medium text-gray-700">
                Work Email
              </label>
              <input
                type="email"
                name="work_email"
                id="work_email"
                value={formData.work_email}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="work@company.com"
              />
            </div>

            {/* Personal Email */}
            <div>
              <label htmlFor="personal_email" className="block text-sm font-medium text-gray-700">
                Personal Email
              </label>
              <input
                type="email"
                name="personal_email"
                id="personal_email"
                value={formData.personal_email}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="personal@email.com"
              />
            </div>

            {/* Eligibility */}
            <div>
              <label htmlFor="eligibility" className="block text-sm font-medium text-gray-700">
                Eligibility *
              </label>
              <select
                name="eligibility"
                id="eligibility"
                required
                value={formData.eligibility}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="eligible">Eligible</option>
                <option value="not_eligible">Not Eligible</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (member ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberForm;
