import { useMemo } from 'react'
import { useInvoices } from './useInvoices'

const toDateKey = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function useDailyAccounting(selectedDate) {
  const { data: invoices = [], isLoading } = useInvoices()

  return useMemo(() => {
    const targetDate = toDateKey(selectedDate || new Date())
    if (!targetDate) {
      return {
        isLoading,
        invoices: [],
        summary: {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalSenderPaid: 0,
          totalRecipientPaid: 0,
          totalRemaining: 0,
          paidCount: 0,
          partialCount: 0,
          unpaidCount: 0,
        },
      }
    }

    const dayStart = new Date(targetDate)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    const filteredInvoices = invoices.filter((invoice) => {
      const createdAt = new Date(invoice.createdAt)
      return !Number.isNaN(createdAt.getTime()) && createdAt >= dayStart && createdAt <= dayEnd
    })

    const summary = filteredInvoices.reduce(
      (acc, invoice) => {
        const total = Number(invoice.total || 0)
        const senderPaid = Number(invoice.senderPaid || 0)
        const recipientPaid = Number(invoice.recipientPaid || 0)
        const montantPaye = Number(invoice.montantPaye || 0)
        const remaining = Math.max(0, total - montantPaye)

        acc.totalInvoices += 1
        acc.totalAmount += total
        acc.totalPaid += montantPaye
        acc.totalSenderPaid += senderPaid
        acc.totalRecipientPaid += recipientPaid
        acc.totalRemaining += remaining

        if (invoice.status === 'paid') acc.paidCount += 1
        if (invoice.status === 'partially_paid') acc.partialCount += 1
        if (invoice.status === 'draft' || invoice.status === 'overdue') acc.unpaidCount += 1

        return acc
      },
      {
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalSenderPaid: 0,
        totalRecipientPaid: 0,
        totalRemaining: 0,
        paidCount: 0,
        partialCount: 0,
        unpaidCount: 0,
      }
    )

    return {
      isLoading,
      invoices: filteredInvoices,
      summary,
    }
  }, [invoices, selectedDate, isLoading])
}
