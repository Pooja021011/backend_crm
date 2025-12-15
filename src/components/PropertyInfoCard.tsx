import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Home, MapPin, Ruler, Bed, Bath, DollarSign, Calendar } from 'lucide-react';

interface PropertyInfo {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;
  sqft?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  lotSize?: number;
  estimatedValue?: number;
  purchasePrice?: number;
}

interface PropertyInfoCardProps {
  property: PropertyInfo;
}

export function PropertyInfoCard({ property }: PropertyInfoCardProps) {
  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white p-2">
      <div className="flex items-center gap-1 mb-2">
        <Home className="w-3 h-3 text-slate-500" />
        <span className="text-xs font-medium text-slate-600">Property Information</span>
      </div>
      <div className="space-y-1">
        {/* Property Details Grid */}
        <div className="grid grid-cols-6 gap-1">
          <div>
            <p className="text-[10px] text-slate-500">Type</p>
            <p className="text-xs font-medium text-slate-800">{property.propertyType || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">SqFt</p>
            <p className="text-xs font-medium text-slate-800">{formatNumber(property.sqft)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Beds</p>
            <p className="text-xs font-medium text-slate-800">{property.bedrooms || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Baths</p>
            <p className="text-xs font-medium text-slate-800">{property.bathrooms || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Year</p>
            <p className="text-xs font-medium text-slate-800">{property.yearBuilt || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500">Est. Value</p>
            <p className="text-xs font-medium text-emerald-600">{formatCurrency(property.estimatedValue)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

