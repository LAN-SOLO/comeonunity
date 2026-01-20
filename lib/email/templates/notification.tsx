import * as React from 'react'
import { BaseEmail } from './base'

interface NotificationEmailProps {
  title: string
  message: string
  actionUrl?: string
  actionText?: string
  communityName?: string
}

export function NotificationEmail({
  title,
  message,
  actionUrl,
  actionText = 'View Details',
  communityName,
}: NotificationEmailProps) {
  return (
    <BaseEmail previewText={title}>
      {communityName && (
        <p className="text-muted" style={{ marginBottom: 8 }}>
          {communityName}
        </p>
      )}
      <h1>{title}</h1>
      <p>{message}</p>
      {actionUrl && (
        <p style={{ textAlign: 'center', marginTop: 24 }}>
          <a href={actionUrl} className="button">
            {actionText}
          </a>
        </p>
      )}
    </BaseEmail>
  )
}

/**
 * Common notification types with pre-configured content
 */
export const notificationTemplates = {
  memberJoined: (memberName: string, communityName: string, communityUrl: string) => ({
    title: 'New member joined',
    message: `${memberName} has joined ${communityName}.`,
    actionUrl: communityUrl,
    actionText: 'View Community',
    communityName,
  }),

  itemBorrowed: (
    itemName: string,
    borrowerName: string,
    communityName: string,
    itemUrl: string
  ) => ({
    title: 'Your item was borrowed',
    message: `${borrowerName} has borrowed "${itemName}" from you.`,
    actionUrl: itemUrl,
    actionText: 'View Item',
    communityName,
  }),

  borrowRequestApproved: (
    itemName: string,
    ownerName: string,
    communityName: string,
    itemUrl: string
  ) => ({
    title: 'Borrow request approved',
    message: `${ownerName} has approved your request to borrow "${itemName}".`,
    actionUrl: itemUrl,
    actionText: 'View Details',
    communityName,
  }),

  borrowRequestDeclined: (
    itemName: string,
    ownerName: string,
    communityName: string,
    reason?: string
  ) => ({
    title: 'Borrow request declined',
    message: `${ownerName} has declined your request to borrow "${itemName}".${reason ? ` Reason: ${reason}` : ''}`,
    communityName,
  }),

  newEvent: (
    eventTitle: string,
    communityName: string,
    eventDate: string,
    eventUrl: string
  ) => ({
    title: 'New event in your community',
    message: `A new event "${eventTitle}" has been scheduled for ${eventDate}.`,
    actionUrl: eventUrl,
    actionText: 'View Event',
    communityName,
  }),

  eventReminder: (
    eventTitle: string,
    communityName: string,
    eventDate: string,
    eventUrl: string
  ) => ({
    title: 'Event reminder',
    message: `Don't forget! "${eventTitle}" is coming up on ${eventDate}.`,
    actionUrl: eventUrl,
    actionText: 'View Event',
    communityName,
  }),

  newNews: (
    newsTitle: string,
    communityName: string,
    newsUrl: string
  ) => ({
    title: 'New announcement',
    message: `A new announcement has been posted: "${newsTitle}"`,
    actionUrl: newsUrl,
    actionText: 'Read More',
    communityName,
  }),
}
