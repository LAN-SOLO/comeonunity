'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FileText,
  Plus,
  Lock,
  Eye,
  Trash2,
  Loader2,
  Shield,
  Calendar,
} from 'lucide-react';

interface Doc {
  id: string;
  title: string;
  content?: string;
  category: string;
  is_sensitive: boolean;
  created_at: string;
  updated_at: string;
}

interface SecureDocsClientProps {
  initialDocs: Doc[];
}

export function SecureDocsClient({ initialDocs }: SecureDocsClientProps) {
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [viewingContent, setViewingContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  const handleCreate = async () => {
    if (!newTitle || !newContent) {
      toast.error('Title and content are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/dev/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
          category: newCategory,
          isSensitive: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create doc');
      }

      const { docId } = await response.json();

      // Refresh docs list
      const listResponse = await fetch('/api/dev/docs');
      const { docs: newDocs } = await listResponse.json();
      setDocs(newDocs);

      setNewTitle('');
      setNewContent('');
      setNewCategory('general');
      setCreateDialogOpen(false);

      toast.success('Document created and encrypted');
    } catch (error) {
      toast.error('Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (docId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dev/docs/${docId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch doc');
      }

      const { doc } = await response.json();
      setSelectedDoc(doc);
      setViewingContent(doc.content);
    } catch (error) {
      toast.error('Failed to decrypt document');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/dev/docs/${docId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete doc');
      }

      setDocs((prev) => prev.filter((d) => d.id !== docId));
      setSelectedDoc(null);
      setViewingContent(null);

      toast.success('Document deleted');
    } catch (error) {
      toast.error('Failed to delete document');
    } finally {
      setLoading(false);
    }
  };

  const closeViewer = () => {
    setSelectedDoc(null);
    setViewingContent(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-orange-500" />
            Secure Documentation
          </h1>
          <p className="text-muted-foreground mt-2">
            Encrypted storage for sensitive development notes and documentation
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-orange-500" />
                Create Encrypted Document
              </DialogTitle>
              <DialogDescription>
                Content will be encrypted with AES-256 before storage.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="api-keys">API Keys</SelectItem>
                    <SelectItem value="credentials">Credentials</SelectItem>
                    <SelectItem value="notes">Dev Notes</SelectItem>
                    <SelectItem value="config">Configuration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter sensitive content..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Lock className="mr-2 h-4 w-4" />
                Encrypt & Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Security Notice */}
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-orange-500" />
            <div className="text-sm">
              <p className="font-medium">End-to-End Encryption</p>
              <p className="text-muted-foreground">
                All documents are encrypted with AES-256-GCM using your server&apos;s encryption key.
                Content is decrypted only when viewed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Viewer */}
      {selectedDoc && viewingContent && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-500" />
                  {selectedDoc.title}
                  <Badge variant="secondary">{selectedDoc.category}</Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(selectedDoc.updated_at).toLocaleString('de-DE')}
                  </span>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={closeViewer}>
                  Close
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(selectedDoc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
              {viewingContent}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            {docs.length} encrypted document{docs.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No documents yet</p>
              <p className="text-sm">Create your first encrypted document</p>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {doc.category}
                        </Badge>
                        <span>•</span>
                        <span>{new Date(doc.updated_at).toLocaleDateString('de-DE')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(doc.id)}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleDelete(doc.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
