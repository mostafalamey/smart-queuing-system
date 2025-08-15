import { useState } from 'react'
import { Users } from 'lucide-react'
import { Member, Branch } from '../shared/types'

interface MemberManagementProps {
  members: Member[]
  branches: Branch[]
  onUpdateMemberRole: (memberId: string, newRole: string) => void
  onUpdateMemberBranch: (memberId: string, branchId: string | null) => void
  onRemoveMember: (memberId: string) => void
  onInviteMember: () => void
  showInviteModal: boolean
  setShowInviteModal: (show: boolean) => void
  inviteEmail: string
  setInviteEmail: (email: string) => void
  inviteRole: string
  setInviteRole: (role: string) => void
  testMode: boolean
  setTestMode: (test: boolean) => void
  inviting: boolean
  onSubmitInvite: () => void
}

export const MemberManagement = ({
  members,
  branches,
  onUpdateMemberRole,
  onUpdateMemberBranch,
  onRemoveMember,
  onInviteMember,
  showInviteModal,
  setShowInviteModal,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  testMode,
  setTestMode,
  inviting,
  onSubmitInvite
}: MemberManagementProps) => {
  return (
    <>
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Organization Members ({members.length})</h2>
          </div>
          <button 
            onClick={onInviteMember}
            className="btn-primary"
          >
            <Users className="w-4 h-4 mr-2" />
            Invite Member
          </button>
        </div>
        <p className="text-gray-600 mb-6">
          Manage member roles, assignments to branches and departments
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Member</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Branch Assignment</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Department Assignment</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Joined</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-gray-100">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {member.name || 'Unknown'}
                          </p>
                          {!member.is_active && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={member.role}
                      onChange={(e) => onUpdateMemberRole(member.id, e.target.value)}
                      className="input-field text-sm"
                      aria-label="Member role"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="employee">Employee</option>
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={member.branch_id || ''}
                      onChange={(e) => onUpdateMemberBranch(member.id, e.target.value || null)}
                      className="input-field text-sm"
                      aria-label="Branch assignment"
                    >
                      <option value="">No Branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4 text-teal-500" />
                      <span className="text-sm text-gray-600">
                        {member.department_ids ? 'Assigned Departments' : 'No Department'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600">
                      {new Date(member.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => onRemoveMember(member.id)}
                        className="text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Invite New Member</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field"
                  placeholder="Enter email address"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="input-field"
                  aria-label="Select role for new member"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={testMode}
                  onChange={(e) => setTestMode(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">
                  Test mode (skip email sending, avoid rate limits)
                </span>
              </label>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
                  setInviteRole('employee')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={inviting}
              >
                Cancel
              </button>
              <button
                onClick={onSubmitInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
