'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Building2, Plus, ClipboardList, Edit, Trash2, MapPin, Phone, Mail, RefreshCw, MoreVertical, X } from 'lucide-react'
import { useAppToast } from '@/hooks/useAppToast'
import EditBranchModal from '@/components/EditBranchModal'
import EditDepartmentModal from '@/components/EditDepartmentModal'
import ActionDropdown from '@/components/ActionDropdown'

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

interface Branch {
  id: string
  organization_id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  created_at: string
  updated_at: string
}

interface Department {
  id: string
  branch_id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  branches?: {
    name: string
  }
}

export default function ManagePage() {
  const { userProfile } = useAuth()
  const { showSuccess, showError, showWarning, showInfo } = useAppToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddBranch, setShowAddBranch] = useState(false)
  const [showAddDepartment, setShowAddDepartment] = useState(false)

  // Edit modal state
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [showEditBranchModal, setShowEditBranchModal] = useState(false)
  const [showEditDepartmentModal, setShowEditDepartmentModal] = useState(false)

  // Branch form state
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: ''
  })

  // Department form state
  const [departmentForm, setDepartmentForm] = useState({
    branch_id: '',
    name: '',
    description: ''
  })

  useEffect(() => {
    if (userProfile?.organization_id) {
      fetchBranches()
      fetchDepartments()
    }
  }, [userProfile])

  const fetchBranches = async () => {
    if (!userProfile?.organization_id) return;
    
    try {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .order('created_at', { ascending: false })
      
      setBranches(data || [])
    } catch (error) {
      // Debug log removed
    }
  }

  const fetchDepartments = async () => {
    if (!userProfile?.organization_id) return;
    
    try {
      const { data } = await supabase
        .from('departments')
        .select(`
          *,
          branches (
            name
          )
        `)
        .eq('branches.organization_id', userProfile.organization_id)
        .order('created_at', { ascending: false })
      
      setDepartments(data || [])
    } catch (error) {
      // Debug log removed
    }
  }

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!branchForm.name.trim() || !userProfile?.organization_id) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('branches')
        .insert({
          organization_id: userProfile.organization_id,
          name: branchForm.name,
          address: branchForm.address || null,
          phone: branchForm.phone || null,
          email: branchForm.email || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (!error) {
        setBranchForm({ name: '', address: '', phone: '', email: '' })
        setShowAddBranch(false)
        await fetchBranches()
        
        // Show success toast
        showSuccess(
          'Branch Created Successfully!',
          `${branchForm.name} has been added to your organization.`,
          {
            label: 'Add Department',
            onClick: () => setShowAddDepartment(true)
          }
        )
      } else {
        // Show error toast
        showError(
          'Failed to Create Branch',
          'Unable to create the branch. Please check your input and try again.'
        )
      }
    } catch (error) {
      // Show error toast for exceptions
      showError(
        'Error Creating Branch',
        'An unexpected error occurred. Please try again later.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!departmentForm.name.trim() || !departmentForm.branch_id) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('departments')
        .insert({
          branch_id: departmentForm.branch_id,
          name: departmentForm.name,
          description: departmentForm.description || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (!error) {
        setDepartmentForm({ branch_id: '', name: '', description: '' })
        setShowAddDepartment(false)
        await fetchDepartments()
        
        // Show success toast
        showSuccess(
          'Department Created Successfully!',
          `${departmentForm.name} has been added and is now active.`,
          {
            label: 'View Queues',
            onClick: () => window.location.href = '/dashboard'
          }
        )
      } else {
        // Show error toast
        showError(
          'Failed to Create Department',
          'Unable to create the department. Please check your input and try again.'
        )
      }
    } catch (error) {
      // Show error toast for department creation exceptions
      showError(
        'Error Creating Department',
        'An unexpected error occurred while creating the department.'
      )
    } finally {
      setLoading(false)
    }
  }

  const deleteBranch = async (branchId: string) => {
    // First show a warning toast asking for confirmation
    const branch = branches.find(b => b.id === branchId)
    const branchName = branch?.name || 'this branch'
    
    showWarning(
      'Confirm Branch Deletion',
      `Are you sure you want to delete "${branchName}"? This will also delete all associated departments and cannot be undone.`,
      {
        label: 'Delete Branch',
        onClick: async () => {
          try {
            // First delete all departments in this branch
            await supabase
              .from('departments')
              .delete()
              .eq('branch_id', branchId)

            // Then delete the branch
            const { error } = await supabase
              .from('branches')
              .delete()
              .eq('id', branchId)

            if (!error) {
              await fetchBranches()
              await fetchDepartments()
              
              showSuccess(
                'Branch Deleted!',
                `"${branchName}" and all its departments have been successfully removed.`
              )
            } else {
              showError(
                'Deletion Failed',
                'Unable to delete the branch. Please try again.',
                {
                  label: 'Retry',
                  onClick: () => deleteBranch(branchId)
                }
              )
            }
          } catch (error) {
            showError(
              'Deletion Error',
              'An unexpected error occurred while deleting the branch.',
              {
                label: 'Try Again',
                onClick: () => deleteBranch(branchId)
              }
            )
          }
        }
      }
    )
  }

  const deleteDepartment = async (departmentId: string) => {
    // First show a warning toast asking for confirmation
    const department = departments.find(d => d.id === departmentId)
    const departmentName = department?.name || 'this department'
    
    showWarning(
      'Confirm Department Deletion',
      `Are you sure you want to delete "${departmentName}"? This action cannot be undone.`,
      {
        label: 'Delete Department',
        onClick: async () => {
          try {
            const { error } = await supabase
              .from('departments')
              .delete()
              .eq('id', departmentId)

            if (!error) {
              await fetchDepartments()
              
              showSuccess(
                'Department Deleted!',
                `"${departmentName}" has been successfully removed.`
              )
            } else {
              showError(
                'Deletion Failed',
                'Unable to delete the department. Please try again.',
                {
                  label: 'Retry',
                  onClick: () => deleteDepartment(departmentId)
                }
              )
            }
          } catch (error) {
            showError(
              'Deletion Error',
              'An unexpected error occurred while deleting the department.',
              {
                label: 'Try Again',
                onClick: () => deleteDepartment(departmentId)
              }
            )
          }
        }
      }
    )
  }

  // Edit functions
  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch)
    setShowEditBranchModal(true)
  }

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department)
    setShowEditDepartmentModal(true)
  }

  const updateBranch = async (id: string, name: string, address: string, phone: string, email: string) => {
    const { error } = await supabase
      .from('branches')
      .update({
        name,
        address,
        phone: phone || null,
        email: email || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    await fetchBranches()
  }

  const updateDepartment = async (id: string, name: string, description: string) => {
    const { error } = await supabase
      .from('departments')
      .update({
        name,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    await fetchDepartments()
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        {/* Enhanced Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-yellow-green-500 via-citrine-500 to-caramel-500 rounded-2xl p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-10 -translate-x-10"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-2xl blur-sm"></div>
                <div className="relative w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Branch & Department Management</h1>
                <p className="text-white/80 text-lg">Organize departments under branches for better management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  fetchBranches()
                  fetchDepartments()
                }}
                className="group relative overflow-hidden bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 border border-white/30"
              >
                <div className="absolute inset-0 bg-white/10 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
                  <span>Refresh</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add New Branch */}
          <div className="card p-6 hover-lift border-0 bg-gradient-to-br from-white to-celestial-50 shadow-lg border-l-4 border-l-celestial-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-celestial-500 to-french-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-celestial-700">Add New Branch</h2>
            </div>

            <form onSubmit={handleAddBranch} className="space-y-6">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-celestial-600">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-celestial-500 focus:border-celestial-500 transition-all duration-200 hover:border-celestial-300"
                  placeholder="Enter branch name"
                  required
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-celestial-600">
                  Address
                </label>
                <input
                  type="text"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-celestial-500 focus:border-celestial-500 transition-all duration-200 hover:border-celestial-300"
                  placeholder="Enter branch address"
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-celestial-600">
                  Phone
                </label>
                <input
                  type="tel"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-celestial-500 focus:border-celestial-500 transition-all duration-200 hover:border-celestial-300"
                  placeholder="Enter phone number"
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-celestial-600">
                  Email
                </label>
                <input
                  type="email"
                  value={branchForm.email}
                  onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-celestial-500 focus:border-celestial-500 transition-all duration-200 hover:border-celestial-300"
                  placeholder="Enter email address"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !branchForm.name.trim()}
                className="w-full relative overflow-hidden bg-gradient-to-r from-celestial-500 to-french-500 hover:from-celestial-600 hover:to-french-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none flex items-center justify-center group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Plus className="w-5 h-5 mr-2 relative z-10 group-hover:rotate-90 transition-transform duration-200" />
                <span className="relative z-10">{loading ? 'Adding Branch...' : 'Add Branch'}</span>
              </button>
            </form>
          </div>

          {/* Add New Department */}
          <div className="card p-6 hover-lift border-0 bg-gradient-to-br from-white to-yellowgreen-50 shadow-lg border-l-4 border-l-yellowgreen-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-yellowgreen-500 to-citrine-500 rounded-xl flex items-center justify-center shadow-lg">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-yellowgreen-700">Add New Department</h2>
            </div>

            <form onSubmit={handleAddDepartment} className="space-y-6">
              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-yellowgreen-600">
                  Select Branch *
                </label>
                <select
                  value={departmentForm.branch_id}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, branch_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellowgreen-500 focus:border-yellowgreen-500 transition-all duration-200 hover:border-yellowgreen-300 bg-white"
                  required
                  aria-label="Select Branch"
                >
                  <option value="">Choose a branch...</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-yellowgreen-600">
                  Department Name *
                </label>
                <input
                  type="text"
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellowgreen-500 focus:border-yellowgreen-500 transition-all duration-200 hover:border-yellowgreen-300"
                  placeholder="Enter department name"
                  required
                />
              </div>

              <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-yellowgreen-600">
                  Description
                </label>
                <textarea
                  value={departmentForm.description}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellowgreen-500 focus:border-yellowgreen-500 transition-all duration-200 hover:border-yellowgreen-300 resize-none"
                  rows={3}
                  placeholder="Enter department description"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !departmentForm.name.trim() || !departmentForm.branch_id}
                className="w-full relative overflow-hidden bg-gradient-to-r from-yellowgreen-500 to-citrine-500 hover:from-yellowgreen-600 hover:to-citrine-600 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:transform-none disabled:shadow-none flex items-center justify-center group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Plus className="w-5 h-5 mr-2 relative z-10 group-hover:rotate-90 transition-transform duration-200" />
                <span className="relative z-10">{loading ? 'Adding Department...' : 'Add Department'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Branches & Departments List */}
        <div className="card p-6 hover-lift border-0 bg-gradient-to-br from-white to-caramel-50 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-caramel-500 to-citrine-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-caramel-700">
                Branches & Departments ({branches.length} branches)
              </h2>
            </div>
            <button
              onClick={() => {
                fetchBranches()
                fetchDepartments()
              }}
              className="relative overflow-hidden px-4 py-2 bg-gradient-to-r from-caramel-100 to-citrine-100 text-caramel-700 rounded-lg hover:shadow-lg transition-all duration-200 shadow-sm flex items-center group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-caramel-200 to-citrine-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              <RefreshCw className="w-4 h-4 mr-2 relative z-10 group-hover:rotate-180 transition-transform duration-500" />
              <span className="relative z-10">Refresh</span>
            </button>
          </div>

          <div className="space-y-6">
            {branches.map((branch) => {
              const branchDepartments = departments.filter(d => d.branch_id === branch.id)
              
              return (
                <div key={branch.id} className="border-0 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-6 hover-lift">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-celestial-500 to-french-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{branch.name}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          {branch.address && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4 text-celestial-500" />
                              <span>{branch.address}</span>
                            </div>
                          )}
                          {branch.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-4 h-4 text-celestial-500" />
                              <span>{branch.phone}</span>
                            </div>
                          )}
                          {branch.email && (
                            <div className="flex items-center space-x-1">
                              <Mail className="w-4 h-4 text-celestial-500" />
                              <span>{branch.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-green-200 text-green-800 text-xs font-semibold rounded-full shadow-sm">
                        ACTIVE
                      </span>
                      <ActionDropdown
                        onEdit={() => handleEditBranch(branch)}
                        onDelete={() => deleteBranch(branch.id)}
                      />
                    </div>
                  </div>

                  {/* Departments for this branch */}
                  <div className="ml-16 mt-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellowgreen-500 to-citrine-500 rounded-lg flex items-center justify-center shadow-sm">
                        <ClipboardList className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        Departments ({branchDepartments.length})
                      </span>
                    </div>

                    {branchDepartments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {branchDepartments.map((department) => (
                          <div
                            key={department.id}
                            className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-yellowgreen-100 to-citrine-100 rounded-lg flex items-center justify-center border border-yellowgreen-200">
                                <span className="text-yellowgreen-700 text-sm font-bold">
                                  {department.name.substring(0, 2).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{department.name}</div>
                                {department.description && (
                                  <div className="text-sm text-gray-600 mt-1">{department.description}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-green-200 text-green-800 text-xs font-semibold rounded-full shadow-sm">
                                ACTIVE
                              </span>
                              <ActionDropdown
                                onEdit={() => handleEditDepartment(department)}
                                onDelete={() => deleteDepartment(department.id)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 px-4 bg-gradient-to-br from-yellowgreen-50 to-citrine-50 rounded-lg border border-yellowgreen-200">
                        <div className="text-sm text-gray-600 italic">
                          No departments in this branch yet
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {branches.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Building2 className="w-10 h-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">No branches yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first branch to start organizing your departments and managing your queues effectively.
                </p>
                <div className="w-16 h-1 bg-gradient-to-r from-celestial-blue-500 to-french-blue-600 rounded mx-auto"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modals */}
      <EditBranchModal
        isOpen={showEditBranchModal}
        onClose={() => {
          setShowEditBranchModal(false)
          setEditingBranch(null)
        }}
        branch={editingBranch ? {
          id: editingBranch.id,
          name: editingBranch.name,
          address: editingBranch.address || '',
          phone: editingBranch.phone || '',
          email: editingBranch.email || ''
        } : null}
        onSave={updateBranch}
      />

      <EditDepartmentModal
        isOpen={showEditDepartmentModal}
        onClose={() => {
          setShowEditDepartmentModal(false)
          setEditingDepartment(null)
        }}
        department={editingDepartment ? {
          id: editingDepartment.id,
          name: editingDepartment.name,
          description: editingDepartment.description || ''
        } : null}
        onSave={updateDepartment}
      />
    </DashboardLayout>
  )
}
