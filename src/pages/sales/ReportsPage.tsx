import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { DataTable } from '@/components/dashboard/DataTable';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { Download, Filter, TrendingUp, DollarSign, Package, Users } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/export';

interface Order {
  id: string;
  order_number: string;
  dealer_id: string;
  order_date: string;
  status: string;
  net_amount: number;
}

interface Dealer {
  id: string;
  name: string;
  business_name: string | null;
  city: string | null;
  state: string | null;
}

export default function SalesReportsPage() {
  const [dateRange, setDateRange] = useState('this_month');
  const [fromDate, setFromDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [toDate, setToDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: orders = [] } = useSupabaseQuery<Order>('orders');
  const { data: dealers = [] } = useSupabaseQuery<Dealer>('dealers');

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    const now = new Date();
    switch (value) {
      case 'this_month':
        setFromDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setToDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        setFromDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setToDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'last_3_months':
        setFromDate(format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'));
        setToDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
    }
  };

  const filteredOrders = orders.filter(o => {
    if (!o.order_date) return false;
    const orderDate = new Date(o.order_date);
    return orderDate >= new Date(fromDate) && orderDate <= new Date(toDate);
  });

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.net_amount || 0), 0);
  const totalOrders = filteredOrders.length;
  const deliveredOrders = filteredOrders.filter(o => o.status === 'delivered').length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Monthly sales data for chart
  const monthlyData = [
    { month: 'Jan', revenue: 4500000, orders: 145 },
    { month: 'Feb', revenue: 5200000, orders: 168 },
    { month: 'Mar', revenue: 6100000, orders: 192 },
    { month: 'Apr', revenue: 5800000, orders: 178 },
    { month: 'May', revenue: 7200000, orders: 215 },
    { month: 'Jun', revenue: 6800000, orders: 198 },
  ];

  // Top dealers
  const dealerSales = dealers.map(d => {
    const dealerOrders = filteredOrders.filter(o => o.dealer_id === d.id);
    return {
      ...d,
      orderCount: dealerOrders.length,
      totalSales: dealerOrders.reduce((sum, o) => sum + (o.net_amount || 0), 0),
    };
  }).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10);

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const columns = [
      { key: 'order_number' as const, label: 'Order #' },
      { key: 'order_date' as const, label: 'Date' },
      { key: 'status' as const, label: 'Status' },
      { key: 'net_amount' as const, label: 'Amount' },
    ];
    if (format === 'csv') exportToCSV(filteredOrders, 'sales_report', columns);
    else if (format === 'excel') exportToExcel(filteredOrders, 'sales_report', columns);
    else exportToPDF(filteredOrders, 'sales_report', columns, 'Sales Report');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Sales Reports</h1>
          <p className="text-muted-foreground mt-1">Analyze sales performance and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {dateRange === 'custom' && (
            <>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36" />
              <span className="text-muted-foreground">to</span>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36" />
            </>
          )}
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">₹{(totalRevenue / 100000).toFixed(2)}L</p>
              </div>
              <DollarSign className="w-8 h-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
              <Package className="w-8 h-8 text-info opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered Orders</p>
                <p className="text-2xl font-bold">{deliveredOrders}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Order Value</p>
                <p className="text-2xl font-bold">₹{avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <Users className="w-8 h-8 text-warning opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Monthly Revenue Trend"
          subtitle="Revenue in Lakhs"
          type="area"
          data={monthlyData}
          xAxisKey="month"
          dataKeys={[{ key: 'revenue', color: 'hsl(var(--success))', name: 'Revenue' }]}
        />
        <ChartCard
          title="Order Volume"
          subtitle="Number of orders per month"
          type="bar"
          data={monthlyData}
          xAxisKey="month"
          dataKeys={[{ key: 'orders', color: 'hsl(var(--info))', name: 'Orders' }]}
        />
      </div>

      {/* Top Dealers Table */}
      <DataTable
        title="Top Dealers by Sales"
        data={dealerSales}
        columns={[
          { key: 'name', label: 'Dealer Name', sortable: true },
          { key: 'business_name', label: 'Business', sortable: true, render: (v) => v || '-' },
          { key: 'city', label: 'City', sortable: true },
          { key: 'orderCount', label: 'Orders', sortable: true },
          {
            key: 'totalSales',
            label: 'Total Sales',
            sortable: true,
            render: (v) => `₹${(v / 1000).toFixed(1)}K`,
          },
        ]}
      />
    </div>
  );
}
