import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Node, NodeFormData } from '../shared/types'
import { getNodeTypeLabel, validateNodeForm } from '../shared/utils'

interface NodeModalProps {
  isOpen: boolean
  node: Node | null
  nodeType: 'branch' | 'department' | 'service' | null
  parentNode: Node | null
  onClose: () => void
  onSubmit: (formData: NodeFormData) => void
}

export const NodeModal = ({
  isOpen,
  node,
  nodeType,
  parentNode,
  onClose,
  onSubmit
}: NodeModalProps) => {
  const [formData, setFormData] = useState<NodeFormData>({
    name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    estimated_time: undefined,
    is_active: true
  })
  const [errors, setErrors] = useState<string[]>([])

  const currentType = node?.type || nodeType
  const isEditing = !!node

  useEffect(() => {
    if (isOpen) {
      if (node) {
        // Editing existing node
        const nodeData = node as any
        setFormData({
          name: node.name || '',
          description: node.description || '',
          address: nodeData.address || '',
          phone: nodeData.phone || '',
          email: nodeData.email || '',
          estimated_time: nodeData.estimated_time || undefined,
          is_active: nodeData.is_active ?? true
        })
      } else {
        // Creating new node
        setFormData({
          name: '',
          description: '',
          address: '',
          phone: '',
          email: '',
          estimated_time: undefined,
          is_active: true
        })
      }
      setErrors([])
    }
  }, [isOpen, node])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentType) return

    const validationErrors = validateNodeForm(currentType, formData)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors([])
    onSubmit(formData)
  }

  if (!isOpen || !currentType) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit' : 'Create'} {getNodeTypeLabel(currentType)}
              {parentNode && (
                <span className="text-sm font-normal text-gray-500 block">
                  in {parentNode.name}
                </span>
              )}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm text-red-600">
                {errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="Enter name"
            />
          </div>

          {currentType !== 'branch' && (
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Enter description"
              />
            </div>
          )}

          {currentType === 'branch' && (
            <>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Email address"
                  />
                </div>
              </div>
            </>
          )}

          {currentType === 'service' && (
            <>
              <div>
                <label htmlFor="estimated_time" className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Time (minutes)
                </label>
                <input
                  id="estimated_time"
                  type="number"
                  value={formData.estimated_time || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    estimated_time: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="480"
                  placeholder="Minutes"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700">
                  Service is active
                </label>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
