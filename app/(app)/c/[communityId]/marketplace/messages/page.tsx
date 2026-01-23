'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  MessageCircle,
  Send,
  Package,
  DollarSign,
  Check,
  CheckCheck,
  MoreVertical,
  Archive,
  Trash2,
  ChevronLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  type ConversationWithDetails,
  type MessageWithSender,
} from '@/lib/types/marketplace'

export default function MessagesPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const communityId = params.communityId as string
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [messages, setMessages] = useState<MessageWithSender[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Mobile view state
  const [showConversationList, setShowConversationList] = useState(true)

  useEffect(() => {
    loadCurrentMember()
  }, [communityId])

  useEffect(() => {
    if (currentMemberId) {
      loadConversations()
    }
  }, [currentMemberId])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages()
      markAsRead()
      setShowConversationList(false)
    }
  }, [selectedConversation?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Subscribe to new messages
  useEffect(() => {
    if (!selectedConversation) return

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        async (payload) => {
          const { data: newMsg } = await supabase
            .from('marketplace_messages')
            .select(`
              *,
              sender:community_members!sender_id(
                id,
                display_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (newMsg) {
            setMessages((prev) => [...prev, newMsg as MessageWithSender])
            markAsRead()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConversation?.id])

  const loadCurrentMember = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: member } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (member) {
      setCurrentMemberId(member.id)
    } else {
      toast.error('You must be a community member')
      router.push(`/c/${communityId}/marketplace`)
    }
  }

  const loadConversations = async () => {
    if (!currentMemberId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('marketplace_conversations')
        .select(`
          *,
          listing:marketplace_listings!listing_id(
            id,
            title,
            price,
            images,
            status
          ),
          buyer:community_members!buyer_id(
            id,
            display_name,
            avatar_url
          ),
          seller:community_members!seller_id(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('community_id', communityId)
        .or(`buyer_id.eq.${currentMemberId},seller_id.eq.${currentMemberId}`)
        .neq('status', 'blocked')
        .order('last_message_at', { ascending: false })

      if (error) throw error

      // Get last message for each conversation
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: lastMsg } = await supabase
            .from('marketplace_messages')
            .select('id, content, sender_id, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...conv,
            last_message: lastMsg || undefined,
          } as ConversationWithDetails
        })
      )

      setConversations(conversationsWithLastMessage)

      // Auto-select first conversation if on desktop
      if (conversationsWithLastMessage.length > 0 && window.innerWidth >= 768) {
        const conversationId = searchParams.get('conversation')
        const selected = conversationId
          ? conversationsWithLastMessage.find(c => c.id === conversationId)
          : conversationsWithLastMessage[0]
        if (selected) {
          setSelectedConversation(selected)
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!selectedConversation) return

    setLoadingMessages(true)
    try {
      const { data, error } = await supabase
        .from('marketplace_messages')
        .select(`
          *,
          sender:community_members!sender_id(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data as MessageWithSender[] || [])
    } catch (error) {
      console.error('Error loading messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  const markAsRead = async () => {
    if (!selectedConversation || !currentMemberId) return

    const isBuyer = selectedConversation.buyer_id === currentMemberId

    // Update unread count
    await supabase
      .from('marketplace_conversations')
      .update({
        [isBuyer ? 'buyer_unread_count' : 'seller_unread_count']: 0,
      })
      .eq('id', selectedConversation.id)

    // Mark messages as read
    await supabase
      .from('marketplace_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', selectedConversation.id)
      .neq('sender_id', currentMemberId)
      .eq('is_read', false)
  }

  const sendMessage = async () => {
    if (!selectedConversation || !currentMemberId || !newMessage.trim()) return

    setSending(true)
    try {
      const { error } = await supabase.from('marketplace_messages').insert({
        conversation_id: selectedConversation.id,
        sender_id: currentMemberId,
        content: newMessage.trim(),
        message_type: 'text',
      })

      if (error) throw error

      setNewMessage('')
      inputRef.current?.focus()
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const formatMessageTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getOtherParticipant = (conv: ConversationWithDetails) => {
    return conv.buyer_id === currentMemberId ? conv.seller : conv.buyer
  }

  const getUnreadCount = (conv: ConversationWithDetails) => {
    return conv.buyer_id === currentMemberId ? conv.buyer_unread_count : conv.seller_unread_count
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-4">
        <Link
          href={`/c/${communityId}/marketplace`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Messages</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${
            showConversationList ? 'block' : 'hidden md:flex'
          }`}
        >
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-12 h-12 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No messages yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start a conversation by contacting a seller
                </p>
                <Link href={`/c/${communityId}/marketplace`}>
                  <Button variant="outline">Browse Listings</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => {
                const other = getOtherParticipant(conv)
                const unread = getUnreadCount(conv)
                const isSelected = selectedConversation?.id === conv.id

                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors flex gap-3 ${
                      isSelected ? 'bg-muted' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {other?.avatar_url ? (
                          <img
                            src={other.avatar_url}
                            alt=""
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          other?.display_name?.[0]?.toUpperCase() || '?'
                        )}
                      </div>
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-medium truncate ${unread > 0 ? 'text-foreground' : ''}`}>
                          {other?.display_name || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.listing?.title}
                      </p>
                      {conv.last_message && (
                        <p
                          className={`text-sm truncate ${
                            unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                          }`}
                        >
                          {conv.last_message.sender_id === currentMemberId ? 'You: ' : ''}
                          {conv.last_message.content}
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Message Thread */}
        <div
          className={`flex-1 flex flex-col ${
            !showConversationList ? 'block' : 'hidden md:flex'
          }`}
        >
          {selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setShowConversationList(true)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                <Link
                  href={`/c/${communityId}/marketplace/${selectedConversation.listing?.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0">
                    {selectedConversation.listing?.images?.[0] ? (
                      <img
                        src={selectedConversation.listing.images[0]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">
                      {getOtherParticipant(selectedConversation)?.display_name || 'Unknown'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {selectedConversation.listing?.title} • $
                      {selectedConversation.listing?.price?.toFixed(2)}
                    </p>
                  </div>
                </Link>

                {selectedConversation.listing?.status === 'sold' && (
                  <Badge variant="secondary">Sold</Badge>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwn = msg.sender_id === currentMemberId
                    const showAvatar =
                      index === 0 || messages[index - 1]?.sender_id !== msg.sender_id

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        {showAvatar && !isOwn ? (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {msg.sender?.avatar_url ? (
                              <img
                                src={msg.sender.avatar_url}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              msg.sender?.display_name?.[0]?.toUpperCase() || '?'
                            )}
                          </div>
                        ) : (
                          <div className="w-8" />
                        )}

                        <div
                          className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                          {msg.message_type === 'offer' ? (
                            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                                <DollarSign className="h-4 w-4" />
                                <span className="font-medium">
                                  Offer: ${msg.offer_amount?.toFixed(2)}
                                </span>
                              </div>
                              {msg.content && (
                                <p className="text-sm mt-1">{msg.content}</p>
                              )}
                            </div>
                          ) : msg.message_type === 'system' ? (
                            <div className="text-center text-sm text-muted-foreground">
                              {msg.content}
                            </div>
                          ) : (
                            <div
                              className={`p-3 rounded-lg ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                          )}

                          <div
                            className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${
                              isOwn ? 'justify-end' : ''
                            }`}
                          >
                            <span>{formatMessageTime(msg.created_at)}</span>
                            {isOwn && (
                              msg.is_read ? (
                                <CheckCheck className="h-3 w-3 text-blue-500" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                  className="flex gap-2"
                >
                  <Input
                    ref={inputRef}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={sending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">
                  Choose a conversation from the list to view messages
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
