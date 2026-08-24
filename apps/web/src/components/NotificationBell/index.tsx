import type { InboxNotificationData } from '@liveblocks/client'
import { useClient } from '@liveblocks/react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useId, useRef, useState } from 'react'

import { BellIcon } from '@/components/icons'

type ActivityData = Record<string, string | number | boolean>
const NOTIFICATION_POLL_INTERVAL_MS = 3000

function mergeNotifications(
  current: InboxNotificationData[],
  updated: InboxNotificationData[],
  deletedIds: Set<string> = new Set(),
) {
  const byId = new Map(
    current
      .filter((notification) => !deletedIds.has(notification.id))
      .map((notification) => [notification.id, notification]),
  )
  for (const notification of updated) byId.set(notification.id, notification)
  return [...byId.values()].sort(
    (left, right) =>
      new Date(right.notifiedAt).getTime() -
      new Date(left.notifiedAt).getTime(),
  )
}

function useLiveInbox() {
  const client = useClient()
  const [inboxNotifications, setInboxNotifications] = useState<
    InboxNotificationData[]
  >([])
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const requestedAt = useRef<Date | null>(null)
  const isPolling = useRef(false)

  useEffect(() => {
    let active = true
    const abortController = new AbortController()

    const loadInitial = async () => {
      try {
        const [page, unreadCount] = await Promise.all([
          client.getInboxNotifications(),
          client.getUnreadInboxNotificationsCount({
            signal: abortController.signal,
          }),
        ])
        if (!active) return
        setInboxNotifications(page.inboxNotifications)
        setNextCursor(page.nextCursor)
        setCount(unreadCount)
        requestedAt.current = page.requestedAt
        setError(null)
      } catch (loadError) {
        if (active && !abortController.signal.aborted) setError(loadError)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    const poll = async () => {
      if (requestedAt.current === null || isPolling.current) return
      isPolling.current = true
      try {
        const delta = await client.getInboxNotificationsSince({
          since: requestedAt.current,
          signal: abortController.signal,
        })
        if (!active) return
        requestedAt.current = delta.requestedAt
        const deletedIds = new Set(
          delta.inboxNotifications.deleted.map(
            (notification) => notification.id,
          ),
        )
        if (
          delta.inboxNotifications.updated.length > 0 ||
          deletedIds.size > 0
        ) {
          setInboxNotifications((current) =>
            mergeNotifications(
              current,
              delta.inboxNotifications.updated,
              deletedIds,
            ),
          )
        }
        setCount(
          await client.getUnreadInboxNotificationsCount({
            signal: abortController.signal,
          }),
        )
      } catch {
        // Keep the last successful inbox visible and retry on the next pulse.
      } finally {
        isPolling.current = false
      }
    }

    void loadInitial()
    const interval = window.setInterval(
      () => void poll(),
      NOTIFICATION_POLL_INTERVAL_MS,
    )
    return () => {
      active = false
      abortController.abort()
      window.clearInterval(interval)
    }
  }, [client])

  const fetchMore = async () => {
    if (!nextCursor || isFetchingMore) return
    setIsFetchingMore(true)
    try {
      const page = await client.getInboxNotifications({ cursor: nextCursor })
      setInboxNotifications((current) =>
        mergeNotifications(current, page.inboxNotifications),
      )
      setNextCursor(page.nextCursor)
    } finally {
      setIsFetchingMore(false)
    }
  }

  const markAsRead = (notificationId: string) => {
    const readAt = new Date()
    const wasUnread = inboxNotifications.some(
      (notification) =>
        notification.id === notificationId && notification.readAt === null,
    )
    setInboxNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, readAt }
          : notification,
      ),
    )
    if (wasUnread) setCount((current) => Math.max(0, current - 1))
    void client.markInboxNotificationAsRead(notificationId)
  }

  const markAllAsRead = () => {
    const readAt = new Date()
    setInboxNotifications((current) =>
      current.map((notification) => ({ ...notification, readAt })),
    )
    setCount(0)
    void client.markAllInboxNotificationsAsRead()
  }

  return {
    count,
    inboxNotifications,
    isLoading,
    error,
    hasFetchedAll: nextCursor === null,
    fetchMore,
    isFetchingMore,
    markAsRead,
    markAllAsRead,
  }
}

function latestActivityData(notification: object): ActivityData {
  if (
    !('activities' in notification) ||
    !Array.isArray(notification.activities)
  ) {
    return {}
  }
  const activity = notification.activities.at(-1)
  if (!activity || typeof activity !== 'object' || !('data' in activity))
    return {}
  return activity.data as ActivityData
}

function notificationCopy(kind: string, data: ActivityData) {
  if (kind === '$newApplication') {
    return {
      title: 'New application',
      body: `${String(data.applicantName)} applied to ${String(data.jobTitle)}.`,
    }
  }
  if (kind === '$jobOffer') {
    return {
      title: 'New job offer',
      body: `${String(data.recruiterName)} invited you to apply for ${String(data.jobTitle)}. ${String(data.message)}`,
    }
  }
  if (kind === '$jobClosed') {
    return {
      title: 'Job closed',
      body: `${String(data.jobTitle)} has been closed.`,
    }
  }
  if (kind === '$applicationStatusChanged') {
    const status = String(data.status)
    const labels: Record<string, string> = {
      submitted: 'submitted',
      reviewing: 'in review',
      accepted: 'accepted',
      rejected: 'not selected',
      removed: 'removed from the process',
    }
    return {
      title:
        status === 'removed' ? 'Application removed' : 'Application updated',
      body: `${String(data.jobTitle)} is now ${labels[status] ?? status}.`,
    }
  }
  return { title: 'Notification', body: 'You have a new notification.' }
}

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [toast, setToast] = useState<InboxNotificationData | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const knownNotificationIds = useRef<Set<string> | null>(null)
  const newestKnownNotificationTime = useRef(0)
  const panelId = useId()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    count,
    inboxNotifications = [],
    isLoading,
    error,
    hasFetchedAll,
    fetchMore,
    isFetchingMore,
    markAsRead,
    markAllAsRead,
  } = useLiveInbox()

  useEffect(() => {
    if (isLoading) return
    const ids = new Set(
      inboxNotifications.map((notification) => notification.id),
    )
    const newestTime = inboxNotifications.reduce(
      (latest, notification) =>
        Math.max(latest, new Date(notification.notifiedAt).getTime()),
      0,
    )

    if (knownNotificationIds.current === null) {
      knownNotificationIds.current = ids
      newestKnownNotificationTime.current = newestTime
      return
    }

    const arrivals = inboxNotifications.filter(
      (notification) =>
        !knownNotificationIds.current?.has(notification.id) &&
        new Date(notification.notifiedAt).getTime() >=
          newestKnownNotificationTime.current,
    )
    knownNotificationIds.current = ids
    newestKnownNotificationTime.current = Math.max(
      newestKnownNotificationTime.current,
      newestTime,
    )
    if (arrivals.length > 0) setToast(arrivals[0])
  }, [inboxNotifications, isLoading])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 6500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node))
        setIsOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const openNotification = async (
    notification: (typeof inboxNotifications)[number],
  ) => {
    const data = latestActivityData(notification)
    markAsRead(notification.id)
    setToast(null)
    setIsOpen(false)
    if (notification.kind === '$newApplication') {
      await navigate({
        to: '/recruiter',
        search: {
          job: Number(data.jobId),
          application: Number(data.applicationId),
        },
      })
    } else if (
      notification.kind === '$jobOffer' ||
      notification.kind === '$jobClosed' ||
      notification.kind === '$applicationStatusChanged'
    ) {
      if (notification.kind === '$applicationStatusChanged') {
        await queryClient.invalidateQueries({ queryKey: ['catalog-jobs'] })
      }
      await navigate({
        to: '/dashboard',
        search: { job: Number(data.jobId) },
      })
    }
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      {toast ? (
        <aside
          role="status"
          aria-live="assertive"
          className="fixed inset-x-4 top-4 z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:right-6 sm:w-96"
        >
          <div className="h-1 bg-primary" />
          <div className="flex items-start gap-3 p-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <BellIcon className="size-5" />
            </span>
            <button
              type="button"
              onClick={() => void openNotification(toast)}
              className="min-w-0 flex-1 cursor-pointer text-left"
            >
              <span className="block text-sm font-semibold text-card-foreground">
                {notificationCopy(toast.kind, latestActivityData(toast)).title}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {notificationCopy(toast.kind, latestActivityData(toast)).body}
              </span>
              <span className="mt-2 block text-sm font-semibold text-primary">
                View
              </span>
            </button>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-xl text-muted-foreground transition hover:bg-muted hover:text-card-foreground"
            >
              ×
            </button>
          </div>
        </aside>
      ) : null}
      <button
        type="button"
        aria-label={
          count > 0 ? `Notifications, ${count} unread` : 'Notifications'
        }
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((value) => !value)}
        className="relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-card-foreground transition hover:bg-muted"
      >
        <BellIcon className="size-5" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-5 text-primary-foreground">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <section
          id={panelId}
          aria-label="Notifications"
          className="absolute right-0 top-13 z-50 flex max-h-[32rem] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold text-card-foreground">
              Notifications
            </h2>
            <button
              type="button"
              disabled={count === 0}
              onClick={() => markAllAsRead()}
              className="cursor-pointer text-xs font-medium text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark all as read
            </button>
          </div>

          <div className="overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">
                Loading notifications…
              </p>
            ) : error ? (
              <p role="alert" className="p-4 text-sm text-destructive">
                Notifications could not be loaded.
              </p>
            ) : inboxNotifications.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                You are all caught up.
              </p>
            ) : (
              <ul>
                {inboxNotifications.map((notification) => {
                  const data = latestActivityData(notification)
                  const copy = notificationCopy(notification.kind, data)
                  const unread = notification.readAt == null
                  return (
                    <li
                      key={notification.id}
                      className="border-b border-border last:border-0"
                    >
                      <button
                        type="button"
                        onClick={() => void openNotification(notification)}
                        className={`block w-full cursor-pointer px-4 py-3 text-left transition hover:bg-muted ${unread ? 'bg-primary/5' : ''}`}
                      >
                        <span className="flex items-start gap-3">
                          <span
                            aria-hidden="true"
                            className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? 'bg-primary' : 'bg-transparent'}`}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-card-foreground">
                              {copy.title}
                            </span>
                            <span className="mt-1 block text-sm text-muted-foreground">
                              {copy.body}
                            </span>
                            <time className="mt-2 block text-xs text-muted-foreground">
                              {new Date(
                                notification.notifiedAt,
                              ).toLocaleString()}
                            </time>
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          {!hasFetchedAll && !isLoading ? (
            <button
              type="button"
              disabled={isFetchingMore}
              onClick={() => void fetchMore()}
              className="cursor-pointer border-t border-border px-4 py-3 text-sm font-medium text-primary disabled:opacity-50"
            >
              {isFetchingMore ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
