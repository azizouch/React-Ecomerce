import { useLanguage } from '../../contexts/LanguageContext';
import { t } from '../../lib/translations';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const data = [
  { name: 'Mon', sales: 400, orders: 24 },
  { name: 'Tue', sales: 300, orders: 13 },
  { name: 'Wed', sales: 500, orders: 28 },
  { name: 'Thu', sales: 450, orders: 39 },
  { name: 'Fri', sales: 600, orders: 45 },
  { name: 'Sat', sales: 800, orders: 52 },
  { name: 'Sun', sales: 550, orders: 38 },
];

const pieData = [
  { name: 'Completed', value: 60 },
  { name: 'Pending', value: 25 },
  { name: 'Cancelled', value: 15 },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

export default function VendorAnalytics() {
  const { language } = useLanguage();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Store Analytics</h1>
        <p className="text-gray-600">Monitor your store performance this week</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">This Week Revenue</p>
          <p className="text-3xl font-bold">$3,650</p>
          <p className="text-green-600 text-sm mt-2">+5.2% from last week</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Orders</p>
          <p className="text-3xl font-bold">187</p>
          <p className="text-green-600 text-sm mt-2">+12% from last week</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Products Sold</p>
          <p className="text-3xl font-bold">342</p>
          <p className="text-green-600 text-sm mt-2">+8.5% from last week</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Store Views</p>
          <p className="text-3xl font-bold">4.2K</p>
          <p className="text-green-600 text-sm mt-2">+18% from last week</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Daily Sales This Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Daily Orders This Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="orders" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Top 5 Products</h3>
          <div className="space-y-4">
            {[
              { name: 'Product A', sales: 45, revenue: '$1,350' },
              { name: 'Product B', sales: 38, revenue: '$1,140' },
              { name: 'Product C', sales: 32, revenue: '$960' },
              { name: 'Product D', sales: 28, revenue: '$840' },
              { name: 'Product E', sales: 22, revenue: '$660' },
            ].map((product, index) => (
              <div key={index} className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{product.sales} sales</p>
                </div>
                <p className="font-semibold">{product.revenue}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
