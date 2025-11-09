'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/axios';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Plus, Edit, Trash2, GripVertical } from 'lucide-react';

interface SalaryComponent {
  id?: number;
  name: string;
  computation_type: 'percentage' | 'fixed';
  base: 'wage' | 'basic';
  percentage?: number;
  fixed_amount?: number;
  description: string;
  display_order?: number;
  is_required?: boolean;
}

export default function SalaryStructurePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [wageType, setWageType] = useState<'monthly' | 'yearly'>('monthly');
  const [monthlyWage, setMonthlyWage] = useState<number>(0);
  const [yearlyWage, setYearlyWage] = useState<number>(0);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<number>(5);
  const [pfPercentage, setPfPercentage] = useState<number>(12);
  const [professionalTax, setProfessionalTax] = useState<number>(200);
  
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [templates, setTemplates] = useState<SalaryComponent[]>([]);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (templates.length > 0) {
      initializeComponents();
    }
  }, [templates, monthlyWage, yearlyWage, wageType]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users?is_active=true');
      setUsers(response.data.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/admin/salary-component-templates?is_active=true');
      setTemplates(response.data.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const initializeComponents = () => {
    const wage = wageType === 'monthly' ? monthlyWage : yearlyWage / 12;
    
    if (wage <= 0) {
      setComponents(templates.map(t => ({ ...t, fixed_amount: 0 })));
      return;
    }

    const initialized = templates.map((template, index) => {
      let fixedAmount = 0;
      
      if (template.computation_type === 'percentage') {
        if (template.base === 'wage') {
          fixedAmount = wage * (template.percentage! / 100);
        } else if (template.base === 'basic') {
          // Find basic salary component
          const basicComponent = templates.find(t => t.name.toLowerCase().includes('basic'));
          const basicSalary = basicComponent ? wage * (basicComponent.percentage! / 100) : wage * 0.5;
          fixedAmount = basicSalary * (template.percentage! / 100);
        }
      } else {
        fixedAmount = template.fixed_amount || 0;
      }
      
      return { ...template, fixed_amount: fixedAmount };
    });

    // Calculate the last component (usually Fixed Allowance) to balance
    const lastIndex = initialized.length - 1;
    if (lastIndex >= 0 && !initialized[lastIndex].is_required) {
      const totalSoFar = initialized.slice(0, lastIndex).reduce((sum, c) => sum + (c.fixed_amount || 0), 0);
      const remaining = Math.max(0, wage - totalSoFar);
      initialized[lastIndex] = {
        ...initialized[lastIndex],
        fixed_amount: remaining,
        percentage: wage > 0 ? (remaining / wage) * 100 : 0
      };
    }

    setComponents(initialized);
  };

  const handleWageChange = (value: number) => {
    if (wageType === 'monthly') {
      setMonthlyWage(value);
      setYearlyWage(value * 12);
    } else {
      setYearlyWage(value);
      setMonthlyWage(value / 12);
    }
  };

  const handleComponentChange = (index: number, field: string, value: any) => {
    const updated = [...components];
    if (field === 'computation_type') {
      updated[index] = { ...updated[index], computation_type: value };
    } else if (field === 'base') {
      updated[index] = { ...updated[index], base: value };
    } else if (field === 'percentage') {
      updated[index] = { ...updated[index], percentage: parseFloat(value) || 0 };
    } else if (field === 'fixed_amount') {
      updated[index] = { ...updated[index], fixed_amount: parseFloat(value) || 0 };
    }
    setComponents(updated);
    // Recalculate after change
    setTimeout(() => initializeComponents(), 100);
  };

  const handleAddComponent = () => {
    setEditingComponent({
      name: '',
      computation_type: 'percentage',
      base: 'wage',
      percentage: 0,
      description: '',
    });
    setIsDialogOpen(true);
  };

  const handleEditComponent = (component: SalaryComponent) => {
    setEditingComponent({ ...component });
    setIsDialogOpen(true);
  };

  const handleSaveComponent = async () => {
    if (!editingComponent) return;

    if (!editingComponent.name || !editingComponent.computation_type || !editingComponent.base) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate percentage for percentage-based components
    if (editingComponent.computation_type === 'percentage' && (!editingComponent.percentage || editingComponent.percentage <= 0)) {
      alert('Please enter a valid percentage (greater than 0)');
      return;
    }

    // Validate fixed amount for fixed components
    if (editingComponent.computation_type === 'fixed' && (!editingComponent.fixed_amount || editingComponent.fixed_amount < 0)) {
      alert('Please enter a valid fixed amount (0 or greater)');
      return;
    }

    try {
      const payload: any = {
        name: editingComponent.name,
        computation_type: editingComponent.computation_type,
        base: editingComponent.base,
        description: editingComponent.description || '',
      };

      if (editingComponent.computation_type === 'percentage') {
        payload.percentage = editingComponent.percentage;
        payload.fixed_amount = null;
      } else {
        payload.fixed_amount = editingComponent.fixed_amount;
        payload.percentage = null;
      }

      if (editingComponent.id) {
        // Update existing template
        const response = await api.put(`/admin/salary-component-templates/${editingComponent.id}`, payload);
        if (response.data.success) {
          alert('Component updated successfully');
        }
      } else {
        // Create new template
        const maxOrder = Math.max(...templates.map(t => t.display_order || 0), 0);
        const response = await api.post('/admin/salary-component-templates', {
          ...payload,
          display_order: maxOrder + 1,
        });
        if (response.data.success) {
          alert('Component created successfully');
        }
      }
      
      await fetchTemplates();
      setIsDialogOpen(false);
      setEditingComponent(null);
    } catch (error: any) {
      console.error('Error saving component:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save component';
      alert(errorMessage);
    }
  };

  const handleDeleteComponent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this component? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/admin/salary-component-templates/${id}`);
      if (response.data.success) {
        alert('Component deleted successfully');
        await fetchTemplates();
      } else {
        alert(response.data.message || 'Failed to delete component');
      }
    } catch (error: any) {
      console.error('Error deleting component:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete component';
      alert(errorMessage);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      alert('Please select an employee');
      return;
    }

    if (monthlyWage <= 0) {
      alert('Please enter a valid wage amount');
      return;
    }

    const totalComponents = components.reduce((sum, c) => sum + (c.fixed_amount || 0), 0);
    if (Math.abs(totalComponents - monthlyWage) > 0.01) {
      alert(`Total components (${formatCurrency(totalComponents)}) must equal monthly wage (${formatCurrency(monthlyWage)})`);
    
    }
    
    setLoading(true);
    console.log("🚀 ~ handleSubmit ~ totalComponents:", totalComponents)
    try {
      // Find components by name (case-insensitive)
      const basicSalary = components.find(c => 
        c.name.toLowerCase().includes('basic') && !c.name.toLowerCase().includes('allowance')
      )?.fixed_amount || 0;
      
      const hra = components.find(c => 
        c.name.toLowerCase().includes('hra') || c.name.toLowerCase().includes('house rent')
      )?.fixed_amount || 0;
      
      const standardAllowance = components.find(c => 
        c.name.toLowerCase().includes('standard')
      )?.fixed_amount || 0;
      
      const performanceBonus = components.find(c => 
        c.name.toLowerCase().includes('performance')
      )?.fixed_amount || 0;
      
      const lta = components.find(c => 
        c.name.toLowerCase().includes('travel') || c.name.toLowerCase().includes('lta')
      )?.fixed_amount || 0;
      
      const fixedAllowance = components.find(c => 
        c.name.toLowerCase().includes('fixed') && c.name.toLowerCase().includes('allowance')
      )?.fixed_amount || 0;
      
      // Calculate other allowances (all components except basic, hra, and standard)
      const excludedNames = ['basic', 'hra', 'house rent', 'standard'];
      const otherAllowances = components
        .filter(c => {
          const nameLower = c.name.toLowerCase();
          return !excludedNames.some(excluded => nameLower.includes(excluded));
        })
        .reduce((sum, c) => sum + (c.fixed_amount || 0), 0);

      // Validate basic salary
      if (basicSalary <= 0) {
        alert('Basic salary must be greater than 0. Please ensure a Basic Salary component exists.');
        setLoading(false);
        return;
      }

      const salaryData = {
        user_id: selectedUser.id,
        basic_salary: basicSalary,
        hra: hra || 0,
        transport_allowance: 0,
        medical_allowance: standardAllowance || 0,
        other_allowances: otherAllowances || 0,
        pf_percentage: pfPercentage,
        professional_tax: professionalTax,
        effective_from: new Date().toISOString().split('T')[0],
      };

      console.log('Saving salary structure:', salaryData);

      const response = await api.post('/admin/salary-structures', salaryData);
      console.log("🚀 ~ handleSubmit ~ response:", response)
      
      if (response.data.success) {
        alert('Salary structure created successfully');
        
        // Reset form
        setSelectedUser(null);
        setMonthlyWage(0);
        setYearlyWage(0);
        setComponents(templates.map(t => ({ ...t, fixed_amount: 0 })));
      } else {
        alert(response.data.message || 'Failed to create salary structure');
      }
    } catch (error: any) {
      console.error('Error saving salary structure:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create salary structure';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalComponents = components.reduce((sum, c) => sum + (c.fixed_amount || 0), 0);
  const basicSalary = components.find(c => c.name.toLowerCase().includes('basic'))?.fixed_amount || 0;
  const employeePF = basicSalary * (pfPercentage / 100);
  const employerPF = basicSalary * (pfPercentage / 100);

  if (loadingTemplates) {
    return <div className="p-8">Loading salary components...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Salary Structure Management</h1>
        <Button onClick={handleAddComponent} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Component
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent onClose={() => setIsDialogOpen(false)}>
            <DialogHeader>
              <DialogTitle>{editingComponent?.id ? 'Edit Component' : 'Add Component'}</DialogTitle>
            </DialogHeader>
            {editingComponent && (
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={editingComponent.name}
                    onChange={(e) => setEditingComponent({ ...editingComponent, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={editingComponent.description || ''}
                    onChange={(e) => setEditingComponent({ ...editingComponent, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Computation Type *</Label>
                  <Select
                    value={editingComponent.computation_type}
                    onChange={(e) => setEditingComponent({ ...editingComponent, computation_type: e.target.value as any })}
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </Select>
                </div>
                <div>
                  <Label>Base *</Label>
                  <Select
                    value={editingComponent.base}
                    onChange={(e) => setEditingComponent({ ...editingComponent, base: e.target.value as any })}
                  >
                    <option value="wage">Wage</option>
                    <option value="basic">Basic</option>
                  </Select>
                </div>
                {editingComponent.computation_type === 'percentage' ? (
                  <div>
                    <Label>Percentage *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingComponent.percentage || 0}
                      onChange={(e) => setEditingComponent({ ...editingComponent, percentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Fixed Amount *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingComponent.fixed_amount || 0}
                      onChange={(e) => setEditingComponent({ ...editingComponent, fixed_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
                <Button onClick={handleSaveComponent} className="w-full">
                  Save Component
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Wage Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Wage Configuration</CardTitle>
              <CardDescription>Define the employee's wage type and amount</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="employee">Select Employee *</Label>
                <Select
                  id="employee"
                  value={selectedUser?.id || ''}
                  onChange={(e) => {
                    const user = users.find(u => u.id === parseInt(e.target.value));
                    setSelectedUser(user || null);
                  }}
                >
                  <option value="">Select Employee</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.employee_id})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wage_type">Wage Type</Label>
                  <Select
                    id="wage_type"
                    value={wageType}
                    onChange={(e) => {
                      setWageType(e.target.value as 'monthly' | 'yearly');
                      if (e.target.value === 'yearly' && monthlyWage > 0) {
                        setYearlyWage(monthlyWage * 12);
                      } else if (e.target.value === 'monthly' && yearlyWage > 0) {
                        setMonthlyWage(yearlyWage / 12);
                      }
                    }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="wage_amount">
                    {wageType === 'monthly' ? 'Monthly Wage' : 'Yearly Wage'} *
                  </Label>
                  <Input
                    id="wage_amount"
                    type="number"
                    step="0.01"
                    value={wageType === 'monthly' ? monthlyWage : yearlyWage}
                    onChange={(e) => handleWageChange(parseFloat(e.target.value) || 0)}
                    placeholder={wageType === 'monthly' ? 'e.g., 50000' : 'e.g., 600000'}
                  />
                </div>
              </div>

              {wageType === 'monthly' && monthlyWage > 0 && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm">
                    <strong>Yearly Wage:</strong> {formatCurrency(monthlyWage * 12)}
                  </p>
                </div>
              )}
              {wageType === 'yearly' && yearlyWage > 0 && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm">
                    <strong>Monthly Wage:</strong> {formatCurrency(yearlyWage / 12)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Salary Components */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Salary Components
              </CardTitle>
              <CardDescription>
                Components are automatically calculated based on wage. Total must equal monthly wage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {components.map((component, index) => {
                const isBasic = component.name.toLowerCase().includes('basic');
                const isHRA = component.name.toLowerCase().includes('hra');
                const isLast = index === components.length - 1;
                
                return (
                  <div key={component.id || index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <h4 className="font-semibold">{component.name}</h4>
                          {component.is_required && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Required</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{component.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatCurrency(component.fixed_amount || 0)}</div>
                        {component.percentage && (
                          <div className="text-sm text-muted-foreground">
                            {/* {component.percentage.toFixed(2)}% */}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isLast && (
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <Label className="text-xs">Computation Type</Label>
                          <Select
                            value={component.computation_type}
                            onChange={(e) => handleComponentChange(index, 'computation_type', e.target.value)}
                            disabled={isBasic || component.is_required}
                          >
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed Amount</option>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Base</Label>
                          <Select
                            value={component.base}
                            onChange={(e) => handleComponentChange(index, 'base', e.target.value)}
                            disabled={isBasic || isHRA || component.is_required}
                          >
                            <option value="wage">Wage</option>
                            <option value="basic">Basic</option>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Percentage</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={component.percentage || 0}
                            onChange={(e) => handleComponentChange(index, 'percentage', e.target.value)}
                            disabled={component.computation_type === 'fixed' || component.is_required}
                          />
                        </div>
                      </div>
                    )}

                    {!component.is_required && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditComponent(component)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => component.id && handleDeleteComponent(component.id!)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Components:</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(totalComponents)} / {formatCurrency(monthlyWage)}
                  </span>
                </div>
                {Math.abs(totalComponents - monthlyWage) > 0.01 && (
                  <p className="text-sm text-red-600 mt-2">
                    ⚠️ Total components must equal monthly wage
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - PF, Tax, and Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Provident Fund (PF)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pf_percentage">PF Percentage</Label>
                <Input
                  id="pf_percentage"
                  type="number"
                  step="0.01"
                  value={pfPercentage}
                  onChange={(e) => setPfPercentage(parseFloat(e.target.value) || 12)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PF is calculated based on the basic salary
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Employee PF:</span>
                  <span className="font-semibold">{formatCurrency(employeePF)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Employer PF:</span>
                  <span className="font-semibold">{formatCurrency(employerPF)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Total PF:</span>
                  <span className="font-bold">{formatCurrency(employeePF + employerPF)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Deductions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="professional_tax">Professional Tax</Label>
                <Input
                  id="professional_tax"
                  type="number"
                  step="0.01"
                  value={professionalTax}
                  onChange={(e) => setProfessionalTax(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Professional Tax deducted from the gross salary
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Gross Salary:</span>
                <span className="font-semibold">{formatCurrency(monthlyWage)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Deductions:</span>
                <span className="font-semibold">
                  {formatCurrency(employeePF + professionalTax)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Net Salary:</span>
                <span className="font-bold text-lg">
                  {formatCurrency(monthlyWage - employeePF - professionalTax)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedUser || monthlyWage <= 0}
            className="w-full"
            size="lg"
          >
            {loading ? 'Saving...' : 'Save Salary Structure'}
          </Button>
        </div>
      </div>
    </div>
  );
}
