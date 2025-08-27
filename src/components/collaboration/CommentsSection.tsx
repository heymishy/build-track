'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  PaperClipIcon,
  FaceSmileIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  HeartIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserCircleIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline'
import {
  HandThumbUpIcon as HandThumbUpIconSolid,
  HandThumbDownIcon as HandThumbDownIconSolid,
  HeartIcon as HeartIconSolid,
} from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { useCollaboration, Comment } from '@/lib/collaboration'

interface CommentsSectionProps {
  targetType: 'project' | 'invoice' | 'milestone' | 'task' | 'estimate'
  targetId: string
  targetName?: string
  className?: string
}

interface MentionSuggestion {
  id: string
  name: string
  email: string
}

export function CommentsSection({
  targetType,
  targetId,
  targetName = 'item',
  className = '',
}: CommentsSectionProps) {
  const { user } = useAuth()
  const {
    getComments,
    addComment,
    updateComment,
    deleteComment,
    addReaction,
    resolveComment,
    searchUsers,
    subscribe,
  } = useCollaboration()

  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([])
  const [mentionQuery, setMentionQuery] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchComments()

    // Subscribe to real-time updates
    const unsubscribeCommentAdded = subscribe('comment_added', (comment: Comment) => {
      if (comment.targetType === targetType && comment.targetId === targetId) {
        setComments(prev => [...prev, comment])
      }
    })

    const unsubscribeCommentUpdated = subscribe('comment_updated', (comment: Comment) => {
      if (comment.targetType === targetType && comment.targetId === targetId) {
        setComments(prev => prev.map(c => (c.id === comment.id ? comment : c)))
      }
    })

    const unsubscribeCommentDeleted = subscribe('comment_deleted', (commentId: string) => {
      setComments(prev => prev.filter(c => c.id !== commentId))
    })

    return () => {
      unsubscribeCommentAdded()
      unsubscribeCommentUpdated()
      unsubscribeCommentDeleted()
    }
  }, [targetType, targetId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const result = await getComments(targetType, targetId)

      if (result.success && result.data) {
        // Sort comments by creation date and build thread structure
        const sortedComments = result.data.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        setComments(sortedComments)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (content: string, parentId?: string) => {
    if (!content.trim() || !user) return

    try {
      setSubmitting(true)
      const result = await addComment(targetType, targetId, content, parentId, attachments)

      if (result.success) {
        if (parentId) {
          setReplyTo(null)
        } else {
          setNewComment('')
        }
        setAttachments([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (commentId: string, content: string) => {
    try {
      const result = await updateComment(commentId, content)
      if (result.success) {
        setEditingComment(null)
        setEditContent('')
      }
    } catch (error) {
      console.error('Error editing comment:', error)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const result = await deleteComment(commentId)
      if (result.success) {
        // Comment will be removed by real-time subscription
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
    }
  }

  const handleReaction = async (
    commentId: string,
    reactionType: 'like' | 'dislike' | 'heart' | 'thumbs_up' | 'thumbs_down'
  ) => {
    try {
      await addReaction(commentId, reactionType)
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const handleResolve = async (commentId: string) => {
    try {
      await resolveComment(commentId)
    } catch (error) {
      console.error('Error resolving comment:', error)
    }
  }

  const handleMentionSearch = async (query: string) => {
    if (query.length < 2) {
      setMentionSuggestions([])
      return
    }

    try {
      const result = await searchUsers(query)
      if (result.success && result.data) {
        setMentionSuggestions(result.data)
      }
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  const insertMention = (suggestion: MentionSuggestion) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = newComment
    const before = text.substring(0, start - mentionQuery.length - 1) // -1 for @
    const after = text.substring(end)

    const mention = `@[${suggestion.name}](${suggestion.id})`
    const newText = before + mention + after

    setNewComment(newText)
    setShowMentions(false)
    setMentionQuery('')

    // Focus back to textarea
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(before.length + mention.length, before.length + mention.length)
    }, 0)
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '@') {
      setShowMentions(true)
      setMentionQuery('')
    } else if (showMentions && e.key === 'Escape') {
      setShowMentions(false)
      setMentionQuery('')
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString()
  }

  const getReactionIcon = (type: string, hasReacted: boolean) => {
    const className = `h-4 w-4 ${hasReacted ? 'text-blue-600' : 'text-gray-500'}`

    switch (type) {
      case 'like':
      case 'thumbs_up':
        return hasReacted ? (
          <HandThumbUpIconSolid className={className} />
        ) : (
          <HandThumbUpIcon className={className} />
        )
      case 'dislike':
      case 'thumbs_down':
        return hasReacted ? (
          <HandThumbDownIconSolid className={className} />
        ) : (
          <HandThumbDownIcon className={className} />
        )
      case 'heart':
        return hasReacted ? (
          <HeartIconSolid className={className} />
        ) : (
          <HeartIcon className={className} />
        )
      default:
        return <HandThumbUpIcon className={className} />
    }
  }

  // Separate root comments and replies
  const rootComments = comments.filter(c => !c.parentId)
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId)

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <ChatBubbleLeftIcon className="h-5 w-5 mr-2 text-blue-600" />
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {rootComments.length === 0 ? (
          <div className="text-center py-8">
            <ChatBubbleLeftIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No comments yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Be the first to comment on this {targetName}
            </p>
          </div>
        ) : (
          rootComments.map(comment => (
            <div key={comment.id} className="space-y-2">
              <CommentItem
                comment={comment}
                currentUserId={user?.id || ''}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReaction={handleReaction}
                onResolve={handleResolve}
                onReply={() => setReplyTo(comment.id)}
              />

              {/* Replies */}
              {getReplies(comment.id).map(reply => (
                <div key={reply.id} className="ml-8 border-l-2 border-gray-100 pl-4">
                  <CommentItem
                    comment={reply}
                    currentUserId={user?.id || ''}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onReaction={handleReaction}
                    onResolve={handleResolve}
                    isReply
                  />
                </div>
              ))}

              {/* Reply Input */}
              {replyTo === comment.id && (
                <div className="ml-8 mt-2">
                  <CommentInput
                    placeholder={`Reply to ${comment.authorName}...`}
                    onSubmit={content => handleSubmit(content, comment.id)}
                    onCancel={() => setReplyTo(null)}
                    submitting={submitting}
                    isReply
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New Comment Input */}
      {user && !replyTo && (
        <div className="border-t border-gray-200 pt-6">
          <CommentInput
            placeholder="Add a comment..."
            onSubmit={content => handleSubmit(content)}
            submitting={submitting}
            allowAttachments
          />
        </div>
      )}
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  currentUserId: string
  onEdit: (id: string, content: string) => void
  onDelete: (id: string) => void
  onReaction: (id: string, type: 'like' | 'dislike' | 'heart' | 'thumbs_up' | 'thumbs_down') => void
  onResolve: (id: string) => void
  onReply?: () => void
  isReply?: boolean
}

function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onReaction,
  onResolve,
  onReply,
  isReply = false,
}: CommentItemProps) {
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)

  const isAuthor = comment.authorId === currentUserId
  const userReactions = comment.reactions?.filter(r => r.userId === currentUserId) || []

  const handleEditSubmit = () => {
    if (editContent.trim()) {
      onEdit(comment.id, editContent)
      setEditing(false)
    }
  }

  return (
    <div
      className={`bg-white rounded-lg border ${comment.resolved ? 'border-green-200 bg-green-50' : 'border-gray-200'} p-4`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <UserCircleIcon className="h-8 w-8 text-gray-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-medium text-gray-900">{comment.authorName}</h4>
              <span className="text-xs text-gray-500">
                {formatTime(new Date(comment.createdAt))}
              </span>
              {comment.resolved && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Resolved
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {!comment.resolved && onReply && !isReply && (
                <button
                  onClick={onReply}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Reply"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4" />
                </button>
              )}

              {isAuthor && (
                <button
                  onClick={() => setEditing(!editing)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title="Edit"
                >
                  <EllipsisVerticalIcon className="h-4 w-4" />
                </button>
              )}

              {!comment.resolved && !isReply && (
                <button
                  onClick={() => onResolve(comment.id)}
                  className="p-1 text-gray-400 hover:text-green-600 rounded"
                  title="Resolve"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2">
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex justify-end space-x-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleEditSubmit}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="text-sm text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: comment.content }}
              />
            )}
          </div>

          {/* Attachments */}
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {comment.attachments.map(attachment => (
                <div key={attachment.id} className="flex items-center space-x-2 text-xs">
                  <PaperClipIcon className="h-4 w-4 text-gray-400" />
                  <a
                    href={attachment.url}
                    className="text-blue-600 hover:text-blue-800"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {attachment.name}
                  </a>
                  <span className="text-gray-500">({(attachment.size / 1024).toFixed(1)} KB)</span>
                </div>
              ))}
            </div>
          )}

          {/* Reactions */}
          <div className="mt-3 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onReaction(comment.id, 'like')}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-blue-600"
              >
                {getReactionIcon(
                  'like',
                  userReactions.some(r => r.type === 'like')
                )}
                <span>{comment.reactions?.filter(r => r.type === 'like').length || 0}</span>
              </button>

              <button
                onClick={() => onReaction(comment.id, 'heart')}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-red-600"
              >
                {getReactionIcon(
                  'heart',
                  userReactions.some(r => r.type === 'heart')
                )}
                <span>{comment.reactions?.filter(r => r.type === 'heart').length || 0}</span>
              </button>
            </div>

            {isAuthor && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface CommentInputProps {
  placeholder: string
  onSubmit: (content: string) => void
  onCancel?: () => void
  submitting?: boolean
  isReply?: boolean
  allowAttachments?: boolean
}

function CommentInput({
  placeholder,
  onSubmit,
  onCancel,
  submitting = false,
  isReply = false,
  allowAttachments = false,
}: CommentInputProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content)
      setContent('')
      setAttachments([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={isReply ? 2 : 3}
        />

        {allowAttachments && (
          <div className="absolute bottom-3 left-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Attach files"
            >
              <PaperClipIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
            >
              <span className="truncate">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="ml-2 text-red-500 hover:text-red-700"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
          icon={<PaperAirplaneIcon className="h-4 w-4" />}
        >
          {submitting ? 'Posting...' : isReply ? 'Reply' : 'Comment'}
        </Button>
      </div>

      <p className="text-xs text-gray-500">Tip: Use Cmd/Ctrl + Enter to post quickly</p>
    </div>
  )
}
