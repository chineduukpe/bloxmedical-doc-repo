'use client';

import { useState, useEffect } from 'react';

interface User {
  id?: string;
  name: string;
  email: string;
  password?: string;
  disabled?: boolean;
  role?: 'ADMIN' | 'COLLABORATOR';
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (user: User) => void;
  user?: User | null;
  isEditing?: boolean;
}

export default function UserModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  isEditing = false,
}: UserModalProps) {
  const [formData, setFormData] = useState<User>({
    name: '',
    email: '',
    password: '',
    disabled: false,
    role: 'COLLABORATOR',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        disabled: user?.disabled || false,
        role: user?.role || 'COLLABORATOR',
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      setFormData({
        name: '',
        email: '',
        password: '',
        disabled: false,
        role: 'COLLABORATOR',
      });
      onClose();
    } catch (error) {
      console.error('Error submitting user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit User' : 'Add New User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#107EAA]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#107EAA]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEditing
                ? 'New Password (leave blank to keep current)'
                : 'Password'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#107EAA]"
              required={!isEditing}
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  role: e.target.value as 'ADMIN' | 'COLLABORATOR',
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#107EAA]"
            >
              <option value="COLLABORATOR">Collaborator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {isEditing && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="disabled"
                checked={formData.disabled}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    disabled: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-[#107EAA] focus:ring-[#107EAA] border-gray-300 rounded"
              />
              <label
                htmlFor="disabled"
                className="ml-2 block text-sm text-gray-700"
              >
                Disable this user
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#107EAA] text-white rounded-md hover:bg-[#0e6b8f] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Saving...'
                : isEditing
                ? 'Update User'
                : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
