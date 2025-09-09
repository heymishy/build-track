/**
 * Notification Service
 * Handles notifications for project managers and other stakeholders
 */

import { prisma } from '@/lib/prisma'

export interface NotificationData {
  type: 'invoice_upload' | 'project_update' | 'milestone_complete' | 'system_alert'
  title: string
  message: string
  projectId?: string
  userId?: string
  metadata?: Record<string, any>
}

export interface EmailNotificationData extends NotificationData {
  to: string[]
  cc?: string[]
  bcc?: string[]
}

/**
 * Create an in-app notification
 */
export async function createNotification(data: NotificationData): Promise<void> {
  try {
    // Create notification record in database
    await prisma.notification.create({
      data: {
        type: data.type.toUpperCase(),
        title: data.title,
        message: data.message,
        projectId: data.projectId || null,
        userId: data.userId || null,
        metadata: JSON.stringify(data.metadata || {}),
        isRead: false,
        createdAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
    // Don't throw - notifications shouldn't break the main flow
  }
}

/**
 * Send email notification (placeholder implementation)
 * In production, integrate with email service (SendGrid, AWS SES, etc.)
 */
export async function sendEmailNotification(data: EmailNotificationData): Promise<boolean> {
  try {
    // For development, just log the email
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 Email Notification (Development):', {
        to: data.to,
        subject: data.title,
        message: data.message,
        metadata: data.metadata,
      })
      return true
    }

    // TODO: Implement actual email service integration
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // await sgMail.send({
    //   to: data.to,
    //   from: process.env.FROM_EMAIL,
    //   subject: data.title,
    //   text: data.message,
    //   html: generateEmailTemplate(data)
    // })

    console.warn('Email service not configured - notification not sent')
    return false
  } catch (error) {
    console.error('Failed to send email notification:', error)
    return false
  }
}

/**
 * Notify project managers about new invoice uploads
 */
export async function notifyProjectManagers(invoiceUpload: {
  id: string
  supplierEmail: string
  projectId: string | null
  fileName: string
  supplierName: string | null
  notes: string | null
}): Promise<void> {
  try {
    // Get project managers and admins who should be notified
    let recipients: string[] = []

    if (invoiceUpload.projectId) {
      // Get project-specific team members with appropriate roles
      const projectUsers = await prisma.projectUser.findMany({
        where: {
          projectId: invoiceUpload.projectId,
          role: { in: ['OWNER', 'CONTRACTOR'] },
        },
        include: {
          user: { select: { email: true, name: true } },
        },
      })
      recipients = projectUsers.map(pu => pu.user.email)
    }

    // Also notify all admin users
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
    })
    recipients.push(...adminUsers.map(u => u.email))

    // Remove duplicates
    recipients = [...new Set(recipients)]

    if (recipients.length === 0) {
      console.warn('No recipients found for invoice upload notification')
      return
    }

    const supplierName = invoiceUpload.supplierName || invoiceUpload.supplierEmail
    const projectInfo = invoiceUpload.projectId
      ? await prisma.project.findUnique({
          where: { id: invoiceUpload.projectId },
          select: { name: true },
        })
      : null

    // Create notification data
    const notificationData: EmailNotificationData = {
      type: 'invoice_upload',
      title: 'New Invoice Upload',
      message: `${supplierName} has uploaded a new invoice: ${invoiceUpload.fileName}${
        projectInfo ? ` for project "${projectInfo.name}"` : ''
      }${invoiceUpload.notes ? `. Notes: ${invoiceUpload.notes}` : ''}`,
      projectId: invoiceUpload.projectId,
      to: recipients,
      metadata: {
        uploadId: invoiceUpload.id,
        supplierEmail: invoiceUpload.supplierEmail,
        fileName: invoiceUpload.fileName,
      },
    }

    // Send email notification
    await sendEmailNotification(notificationData)

    // Create in-app notifications for each recipient
    for (const recipient of recipients) {
      const user = await prisma.user.findUnique({
        where: { email: recipient },
        select: { id: true },
      })

      if (user) {
        await createNotification({
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          projectId: notificationData.projectId,
          userId: user.id,
          metadata: notificationData.metadata,
        })
      }
    }
  } catch (error) {
    console.error('Failed to notify project managers:', error)
    // Don't throw - notifications shouldn't break the main upload flow
  }
}

/**
 * Send milestone completion notifications
 */
export async function notifyMilestoneCompletion(milestone: {
  id: string
  name: string
  projectId: string
  paymentAmount: number | null
}): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: milestone.projectId },
      include: {
        projectUsers: {
          include: { user: { select: { email: true } } },
        },
      },
    })

    if (!project) return

    const recipients = project.projectUsers.map(pu => pu.user.email)

    const notificationData: EmailNotificationData = {
      type: 'milestone_complete',
      title: `Milestone Completed: ${milestone.name}`,
      message: `Milestone "${milestone.name}" has been completed for project "${project.name}".${
        milestone.paymentAmount
          ? ` Payment amount: $${milestone.paymentAmount.toLocaleString()}`
          : ''
      }`,
      projectId: milestone.projectId,
      to: recipients,
      metadata: {
        milestoneId: milestone.id,
        projectId: milestone.projectId,
        paymentAmount: milestone.paymentAmount,
      },
    }

    await sendEmailNotification(notificationData)
  } catch (error) {
    console.error('Failed to send milestone notification:', error)
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: string, limit = 20) {
  try {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        project: { select: { name: true } },
      },
    })
  } catch (error) {
    console.error('Failed to get user notifications:', error)
    return []
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  try {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: { isRead: true },
    })
    return true
  } catch (error) {
    console.error('Failed to mark notification as read:', error)
    return false
  }
}
