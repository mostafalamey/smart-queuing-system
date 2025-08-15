import { Building2 } from 'lucide-react'
import { Organization } from '../shared/types'

interface OrganizationHeaderProps {
  organization: Organization | null
}

export const OrganizationHeader = ({ organization }: OrganizationHeaderProps) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
      
      <div className="relative flex items-center space-x-4">
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm"></div>
          <div className="relative w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
            <Building2 className="w-6 h-6 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Management</h1>
          <p className="text-white/80">Configure settings for {organization?.name || 'your organization'}</p>
        </div>
      </div>
    </div>
  )
}
