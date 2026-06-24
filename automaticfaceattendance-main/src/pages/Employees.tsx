import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FaceCamera } from '@/components/FaceCamera';
import { Plus, User, Trash2, Camera, Edit, Search } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string | null;
  photo_url: string | null;
  face_descriptor: unknown;
  is_active: boolean;
  created_at: string;
}

export function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRegisterFaceOpen, setIsRegisterFaceOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!formData.name || !formData.email || !formData.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          name: formData.name,
          email: formData.email,
          department: formData.department,
          position: formData.position || null,
        })
        .select()
        .single();

      if (error) throw error;

      setEmployees([data, ...employees]);
      setFormData({ name: '', email: '', department: '', position: '' });
      setIsAddDialogOpen(false);
      toast.success('Employee added successfully');
    } catch (error: any) {
      console.error('Error adding employee:', error);
      if (error.code === '23505') {
        toast.error('An employee with this email already exists');
      } else {
        toast.error('Failed to add employee');
      }
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEmployees(employees.filter(e => e.id !== id));
      toast.success('Employee deleted');
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const handleRegisterFace = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsRegisterFaceOpen(true);
  };

  const handleFaceCapture = async (descriptor: Float32Array) => {
    if (!selectedEmployee) return;

    try {
      const descriptorArray = Array.from(descriptor);

      const { error } = await supabase
        .from('employees')
        .update({ face_descriptor: descriptorArray })
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      setEmployees(employees.map(e => 
        e.id === selectedEmployee.id 
          ? { ...e, face_descriptor: descriptorArray }
          : e
      ));

      setIsRegisterFaceOpen(false);
      setSelectedEmployee(null);
      toast.success('Face registered successfully!');
    } catch (error) {
      console.error('Error registering face:', error);
      toast.error('Failed to register face');
    }
  };

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Employees</h1>
          <p className="mt-1 text-muted-foreground">Manage employees and face registration</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Engineering"
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Software Engineer"
                />
              </div>
              <Button onClick={handleAddEmployee} className="w-full">
                Add Employee
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-sm"
        />
      </div>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 animate-pulse">
              <div className="h-16 w-16 rounded-full bg-muted mx-auto mb-4" />
              <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      ) : filteredEmployees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className="glass-card rounded-xl p-6 transition-all duration-300 hover:shadow-lg animate-fade-in"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center",
                  employee.face_descriptor ? "bg-success/10" : "bg-muted"
                )}>
                  {employee.photo_url ? (
                    <img 
                      src={employee.photo_url} 
                      alt={employee.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <User className={cn(
                      "h-7 w-7",
                      employee.face_descriptor ? "text-success" : "text-muted-foreground"
                    )} />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteEmployee(employee.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <h3 className="font-display font-semibold text-lg text-foreground">
                {employee.name}
              </h3>
              <p className="text-sm text-muted-foreground">{employee.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                  {employee.department}
                </span>
                {employee.position && (
                  <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
                    {employee.position}
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                {employee.face_descriptor ? (
                  <div className="flex items-center gap-2 text-success text-sm">
                    <Camera className="h-4 w-4" />
                    Face Registered
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegisterFace(employee)}
                    className="w-full gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Register Face
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 glass-card rounded-xl">
          <User className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Employees Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Try a different search term' : 'Add your first employee to get started'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          )}
        </div>
      )}

      {/* Face Registration Dialog */}
      <Dialog open={isRegisterFaceOpen} onOpenChange={setIsRegisterFaceOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register Face - {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-muted-foreground mb-4 text-center">
              Position your face in the camera and click "Capture Face" when ready
            </p>
            <FaceCamera
              mode="register"
              onCapture={handleFaceCapture}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
