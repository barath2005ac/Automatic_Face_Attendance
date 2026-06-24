import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FaceCamera } from '@/components/FaceCamera';
import { Plus, User, Trash2, Camera, Search, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  roll_number: string | null;
  photo_url: string | null;
  face_descriptor: unknown;
  is_active: boolean;
  created_at: string;
}

export function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRegisterFaceOpen, setIsRegisterFaceOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    roll_number: '',
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!formData.name || !formData.email || !formData.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .insert({
          name: formData.name,
          email: formData.email,
          department: formData.department,
          roll_number: formData.roll_number || null,
        })
        .select()
        .single();

      if (error) throw error;

      setStudents([data, ...students]);
      setFormData({ name: '', email: '', department: '', roll_number: '' });
      setIsAddDialogOpen(false);
      toast.success('Student added successfully');
    } catch (error: any) {
      console.error('Error adding student:', error);
      if (error.code === '23505') {
        toast.error('A student with this email already exists');
      } else {
        toast.error('Failed to add student');
      }
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStudents(students.filter(s => s.id !== id));
      toast.success('Student deleted');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    }
  };

  const handleRegisterFace = (student: Student) => {
    setSelectedStudent(student);
    setIsRegisterFaceOpen(true);
  };

  const handleFaceCapture = async (descriptor: Float32Array) => {
    if (!selectedStudent) return;

    try {
      const descriptorArray = Array.from(descriptor);

      const { error } = await supabase
        .from('students')
        .update({ face_descriptor: descriptorArray })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      setStudents(students.map(s => 
        s.id === selectedStudent.id 
          ? { ...s, face_descriptor: descriptorArray }
          : s
      ));

      setIsRegisterFaceOpen(false);
      setSelectedStudent(null);
      toast.success('Face registered successfully!');
    } catch (error) {
      console.error('Error registering face:', error);
      toast.error('Failed to register face');
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.roll_number && s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Students</h1>
          <p className="mt-1 text-muted-foreground">Manage students and face registration</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
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
                  placeholder="john@university.edu"
                />
              </div>
              <div>
                <Label htmlFor="department">Department *</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Computer Science"
                />
              </div>
              <div>
                <Label htmlFor="roll_number">Roll Number</Label>
                <Input
                  id="roll_number"
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  placeholder="CS2024001"
                />
              </div>
              <Button onClick={handleAddStudent} className="w-full">
                Add Student
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 max-w-sm"
        />
      </div>

      {/* Student Grid */}
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
      ) : filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="glass-card rounded-xl p-6 transition-all duration-300 hover:shadow-lg animate-fade-in"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "h-14 w-14 rounded-full flex items-center justify-center",
                  student.face_descriptor ? "bg-success/10" : "bg-muted"
                )}>
                  {student.photo_url ? (
                    <img 
                      src={student.photo_url} 
                      alt={student.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <GraduationCap className={cn(
                      "h-7 w-7",
                      student.face_descriptor ? "text-success" : "text-muted-foreground"
                    )} />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteStudent(student.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <h3 className="font-display font-semibold text-lg text-foreground">
                {student.name}
              </h3>
              <p className="text-sm text-muted-foreground">{student.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                  {student.department}
                </span>
                {student.roll_number && (
                  <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
                    {student.roll_number}
                  </span>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                {student.face_descriptor ? (
                  <div className="flex items-center gap-2 text-success text-sm">
                    <Camera className="h-4 w-4" />
                    Face Registered
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegisterFace(student)}
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
          <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? 'Try a different search term' : 'Add your first student to get started'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          )}
        </div>
      )}

      {/* Face Registration Dialog */}
      <Dialog open={isRegisterFaceOpen} onOpenChange={setIsRegisterFaceOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register Face - {selectedStudent?.name}</DialogTitle>
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
