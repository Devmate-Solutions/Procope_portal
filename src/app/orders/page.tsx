"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAllOrders } from '@/lib/aws-api'
import { AuthenticatedLayout } from '@/app/components/AuthenticatedLayout'
import {
  ShoppingBag,
  DollarSign,
  Calendar,
  Package,
  RefreshCw,
  Search,
  Filter,
  Download,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  X
} from 'lucide-react'

interface Order {
  totalAmount: string,
  isPickup: boolean,
  customerInfo: {
    phone: string
    email: string
    fullname: string
  }
  orderId: string
  shopifyOrderId: string
  billingAddress: {
    zip: string
    country: string
    province: string
    city: string
    phone: string
    address1: string
    last_name: string
    first_name: string
  }
  status: string
  createdAt: string
  clientId: string
  lineItems: Array<{
    quantity: string
    product_name: string
    price: string
    product_id: string
    option: string
  }>
  note: string
  shippingAddress: {
    zip: string
    country: string
    province: string
    city: string
    phone: string
    address1: string
    last_name: string
    first_name: string
  }
  orderSource: string
  updatedAt: string
  payment_status: string
  feedback: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [unpaidOrdersAlert, setUnpaidOrdersAlert] = useState(true)

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getAllOrders()
      console.log('Orders data format:', data)

      // Handle different response formats
      if (Array.isArray(data)) {
        setOrders(data)
      } else if (data && Array.isArray(data.orders)) {
        setOrders(data.orders)
      } else if (data && Array.isArray(data.data)) {
        setOrders(data.data)
      } else {
        setOrders([])
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh every minute
  useEffect(() => {
    fetchOrders()

    // Set up auto-refresh interval
    const interval = setInterval(() => {
      fetchOrders()
    }, 60000) // 60 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval)
  }, [])

  // Function to check if order is older than 30 minutes in US Eastern timezone
  const isOrderOlderThan30Minutes = (createdAt: string): boolean => {
    try {
      const orderDate = new Date(createdAt)
      const now = new Date()

      // Convert to US Eastern timezone
      const easternOrderTime = new Date(orderDate.toLocaleString("en-US", {timeZone: "America/New_York"}))
      const easternNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))

      const diffMinutes = (easternNow.getTime() - easternOrderTime.getTime()) / (1000 * 60)
      return diffMinutes > 30
    } catch {
      return false
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'created':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'refunded':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount || '0').toFixed(2)}`
  }

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase()

    const matchesSearch = searchTerm === '' || (
      (order.customerInfo?.fullname?.toLowerCase()?.includes(searchLower)) ||
      (order.orderId?.toLowerCase()?.includes(searchLower)) ||
      (order.customerInfo?.email?.toLowerCase()?.includes(searchLower)) ||
      (order.shopifyOrderId?.toLowerCase()?.includes(searchLower))
    )

    let matchesStatus = false
    if (statusFilter === 'all') {
      matchesStatus = true
    } else if (statusFilter === 'not_completed') {
      // Show orders that are "created" and older than 30 minutes
      matchesStatus = order.status &&
                     order.status.toLowerCase() === 'created' &&
                     order.createdAt &&
                     isOrderOlderThan30Minutes(order.createdAt)
    } else {
      matchesStatus = order.status && order.status.toLowerCase() === statusFilter.toLowerCase()
    }

    return matchesSearch && matchesStatus
  })

  // Get unpaid orders older than 30 minutes (always from all orders, not filtered)
  const unpaidOldOrders = orders.filter(order =>
    order.status &&
    order.status.toLowerCase() === 'created' &&
    order.createdAt &&
    isOrderOlderThan30Minutes(order.createdAt)
  )

  // Get unpaid orders that match current filter
  const filteredUnpaidOrders = filteredOrders.filter(order =>
    order.status &&
    order.status.toLowerCase() === 'created' &&
    order.createdAt &&
    isOrderOlderThan30Minutes(order.createdAt)
  )

  if (loading) {
    return (
      <AuthenticatedLayout requiredPage="orders">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading orders...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout requiredPage="orders">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center mt-10 justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-blue-600" />
              Orders Management
              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Auto-refresh: 1min
              </span>
            </h1>
            <p className="text-gray-600 mt-2">Atlanta Flower Shop - Order Dashboard</p>
          </div>
          <Button onClick={fetchOrders} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{orders.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      orders.reduce((sum, order) => {
                        const amount = parseFloat(order.totalAmount || '0')
                        return sum + (isNaN(amount) ? 0 : amount)
                      }, 0).toString()
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ShoppingBag className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">New Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {orders.filter(order => order.status && order.status.toLowerCase() === 'created').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {orders.filter(order => {
                      if (!order.createdAt) return false
                      try {
                        const orderDate = new Date(order.createdAt)
                        const weekAgo = new Date()
                        weekAgo.setDate(weekAgo.getDate() - 7)
                        return orderDate > weekAgo
                      } catch {
                        return false
                      }
                    }).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Controls */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by customer, order ID, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="not_completed">
                    Order not completed – {unpaidOldOrders.length} client{unpaidOldOrders.length !== 1 ? 's have' : ' has'} not paid yet
                  </option>
                  <option value="created">Created</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="text-center text-red-600">
                <p className="text-lg font-semibold mb-2">Error Loading Orders</p>
                <p>{error}</p>
                <Button onClick={fetchOrders} className="mt-4 bg-red-600 hover:bg-red-700">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        {filteredOrders.length === 0 && !error ? (
          <Card>
            <CardContent className="p-12">
              <div className="text-center text-gray-500">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No orders found</p>
                <p className="text-sm">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Orders will appear here when customers place them.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Orders ({filteredOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left p-4 font-medium text-gray-900 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          Order ID
                          <ArrowUpDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 border-r border-gray-200">Customer</th>
                      <th className="text-left p-4 font-medium text-gray-900 border-r border-gray-200">Product</th>
                      <th className="text-left p-4 font-medium text-gray-900 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          Amount
                          <ArrowUpDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 border-r border-gray-200">Status</th>
                      <th className="text-left p-4 font-medium text-gray-900 border-r border-gray-200">
                        <div className="flex items-center gap-2">
                          Date
                          <ArrowUpDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </th>
                      <th className="text-left p-4 font-medium text-gray-900 border-r border-gray-200">Payment Status</th>
                      <th className="text-left p-4 font-medium text-gray-900 border-r border-gray-200">Delivery Method</th>
                      <th className="text-left p-4 font-medium text-gray-900 border-r border-gray-200">Contact</th>
                      <th className="text-left p-4 font-medium text-gray-900 border-r border-gray-200">Address</th>
                      <th className="text-left p-4 font-medium text-gray-900">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, index) => {
                      const isOldUnpaid = order.status?.toLowerCase() === 'created' &&
                                         order.createdAt &&
                                         isOrderOlderThan30Minutes(order.createdAt)

                      return (
                        <tr
                          key={order.orderId || index}
                          className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                            isOldUnpaid ? 'bg-orange-25 border-orange-200' : ''
                          }`}
                        >
                        <td className="p-4 border-r border-gray-100">
                          <div className="font-mono text-sm text-blue-600">
                            #{order.orderId?.slice(-8) || `${index.toString().padStart(8, '0')}`}
                          </div>
                          {order.shopifyOrderId && (
                            <div className="text-xs text-gray-500">
                              Shopify: {order.shopifyOrderId}
                            </div>
                          )}
                        </td>
                        <td className="p-4 border-r border-gray-100">
                          <div className="font-medium text-gray-900">
                            {order.customerInfo?.fullname || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.customerInfo?.email || 'N/A'}
                          </div>
                        </td>
                        <td className="p-4 border-r border-gray-100">
                          <div className="space-y-1">
                            {order.lineItems && order.lineItems.length > 0 ? (
                              <>
                                {order.lineItems.slice(0, 2).map((item, itemIndex) => (
                                  <div key={itemIndex} className="text-sm">
                                    <span className="font-medium">{item.product_name || 'Product'}</span>
                                    <span className="text-gray-500 ml-2">
                                      ({item.option || 'Standard'}, Qty: {item.quantity || 1})
                                    </span>
                                  </div>
                                ))}
                                {order.lineItems.length > 2 && (
                                  <div className="text-xs text-gray-400">
                                    +{order.lineItems.length - 2} more items
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-gray-500">No items</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 border-r border-gray-100">
                          <div className="font-bold text-gray-900">
                            {formatCurrency(order.totalAmount || '0')}
                          </div>
                        </td>
                        <td className="p-4 border-r border-gray-100">
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusColor(order.status || 'unknown')} border px-2 py-1`}>
                              {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                            </Badge>
                            {isOldUnpaid && (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 border-r border-gray-100">
                          <div className="text-sm text-gray-900">
                            {order.createdAt ? formatDate(order.createdAt) : 'N/A'}
                          </div>
                        </td>
                        <td className="p-4 border-r border-gray-100">
                          <Badge className={`${getPaymentStatusColor(order.payment_status || 'unknown')} border px-2 py-1`}>
                            {order.payment_status ? order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1) : 'Unknown'}
                          </Badge>
                        </td>
                        <td className="p-4 border-r border-gray-100">
                          <div className="text-sm text-gray-600">
                            {order.isPickup ? 'Pickup' : 'Delivery'}
                          </div>
                        </td>
                        <td className="p-4 border-r border-gray-100">
                          <div className="text-sm space-y-1">
                            <div className="text-gray-900">{order.customerInfo?.phone || 'N/A'}</div>
                            <div className="text-gray-500 truncate max-w-[150px]">
                              {order.customerInfo?.email || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 border-r border-gray-100">
                          <div className="text-sm text-gray-600 max-w-[200px]">
                            {order.shippingAddress ? (
                              <>
                                <div>{order.shippingAddress.address1 || 'N/A'}</div>
                                <div>
                                  {order.shippingAddress.city || 'N/A'}, {order.shippingAddress.province || 'N/A'} {order.shippingAddress.zip || ''}
                                </div>
                              </>
                            ) : (
                              <div>No address provided</div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-600 max-w-[200px]">
                            {order.feedback ? (
                              <div className="truncate" title={order.feedback}>
                                {order.feedback}
                              </div>
                            ) : (
                              <div className="text-gray-400 italic">No feedback</div>
                            )}
                          </div>
                        </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  )
}