'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SectionHeader } from '@/components/design-system/section-header'
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Save,
  Send,
  Trash2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { categories } from '@/lib/news-categories'

export default function EditNewsPage() {
  const params = useParams()
  const router = useRouter()
  const communitySlug = params.communityId as string
  const articleId = params.articleId as string

  const [communityId, setCommunityId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [originalStatus, setOriginalStatus] = useState<string>('draft')
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'general',
    pinned: false,
  })

  const supabase = createClient()

  useEffect(() => {
    initializePage()
  }, [communitySlug, articleId])

  const initializePage = async () => {
    setIsLoading(true)
    try {
      // Check if the value looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communitySlug)

      // First fetch community to get the ID
      let communityQuery = supabase
        .from('communities')
        .select('id')
        .eq('status', 'active')

      if (isUUID) {
        communityQuery = communityQuery.or(`slug.eq.${communitySlug},id.eq.${communitySlug}`)
      } else {
        communityQuery = communityQuery.eq('slug', communitySlug)
      }

      const { data: community } = await communityQuery.single()

      if (!community) {
        router.push('/')
        return
      }

      setCommunityId(community.id)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: member } = await supabase
        .from('community_members')
        .select('id, role')
        .eq('community_id', community.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!member || (member.role !== 'admin' && member.role !== 'moderator')) {
        toast.error('Admin access required')
        router.push(`/c/${communitySlug}/news`)
        return
      }

      // Fetch the article
      const { data: article, error: articleError } = await supabase
        .from('news')
        .select('*')
        .eq('id', articleId)
        .eq('community_id', community.id)
        .single()

      if (articleError || !article) {
        toast.error('Article not found')
        router.push(`/c/${communitySlug}/news`)
        return
      }

      // Populate form with existing data
      setFormData({
        title: article.title || '',
        excerpt: article.excerpt || '',
        content: article.content || '',
        category: article.category || 'general',
        pinned: article.pinned || false,
      })
      setImageUrl(article.image_url)
      setOriginalStatus(article.status)
    } catch (err) {
      console.error('Failed to initialize page:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setIsUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `news/${communityId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      setImageUrl(publicUrl)
      toast.success('Image uploaded')
    } catch (err: any) {
      console.error('Upload failed:', err)
      toast.error(err.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async (publish: boolean) => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (!formData.content.trim()) {
      toast.error('Please enter content')
      return
    }

    setIsSaving(true)
    try {
      const updateData: any = {
        title: formData.title.trim(),
        excerpt: formData.excerpt.trim() || formData.content.trim().slice(0, 200),
        content: formData.content.trim(),
        category: formData.category,
        image_url: imageUrl,
        pinned: formData.pinned,
        updated_at: new Date().toISOString(),
      }

      // If publishing for the first time
      if (publish && originalStatus === 'draft') {
        updateData.status = 'published'
        updateData.published_at = new Date().toISOString()
      } else if (!publish && originalStatus === 'published') {
        // Unpublishing - convert back to draft
        updateData.status = 'draft'
      }

      const { error } = await supabase
        .from('news')
        .update(updateData)
        .eq('id', articleId)

      if (error) throw error

      toast.success(publish ? 'Article updated!' : 'Changes saved')
      router.push(`/c/${communitySlug}/news/${articleId}`)
    } catch (err: any) {
      console.error('Save failed:', err)
      toast.error(err.message || 'Failed to save article')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', articleId)

      if (error) throw error

      toast.success('Article deleted')
      router.push(`/c/${communitySlug}/news`)
    } catch (err: any) {
      console.error('Delete failed:', err)
      toast.error(err.message || 'Failed to delete article')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/c/${communitySlug}/news/${articleId}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Article
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit News Post</h1>
        <p className="text-muted-foreground mt-1">
          Update your article
        </p>
      </div>

      {/* Featured Image */}
      <SectionHeader title="Cover Image" />
      <Card className="p-6 mb-6">
        {imageUrl ? (
          <div className="relative h-48 rounded-lg overflow-hidden">
            <Image
              src={imageUrl}
              alt="Cover"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => setImageUrl(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  Click to upload cover image
                </span>
                <span className="text-xs text-muted-foreground/70 mt-1">
                  Recommended: 1200 x 630 px
                </span>
                <span className="text-xs text-muted-foreground/70">
                  Max size: 5 MB (PNG, JPG, WebP)
                </span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>
        )}
      </Card>

      {/* Article Details */}
      <SectionHeader title="Article Details" />
      <Card className="p-6 mb-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter article title..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-6">
            <div>
              <p className="font-medium">Pin Article</p>
              <p className="text-sm text-muted-foreground">
                Show at top of news feed
              </p>
            </div>
            <Switch
              checked={formData.pinned}
              onCheckedChange={(checked) => setFormData({ ...formData, pinned: checked })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            placeholder="Brief summary (auto-generated if left empty)..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="Write your article content here..."
            rows={12}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Plain text formatting. Line breaks will be preserved.
          </p>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => handleSave(originalStatus === 'published')}
          disabled={isSaving}
          className="flex-1"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : originalStatus === 'published' ? (
            <>
              <Send className="mr-2 h-4 w-4" />
              Update
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Publish
            </>
          )}
        </Button>
        {originalStatus === 'published' && (
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            Unpublish
          </Button>
        )}
        {originalStatus === 'draft' && (
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
        )}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Article?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The article will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Article'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
