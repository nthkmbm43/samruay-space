const { Room, Tenant, Invoice, MaintenanceRequest, Contract, Payment } = require('../models');
const { Op } = require('sequelize');

// Helper function to calculate stats for a specific month and year
const getStatsForMonth = async (property_id, year, month) => {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0); // Last day of month

  // 1. Revenue: sum of paid_amount for invoices in this period
  const invoices = await Invoice.findAll({
    where: {
      property_id,
      period_month: month,
      period_year: year
    }
  });

  const revenue = invoices
    .filter(inv => inv.status === 'paid' || inv.status === 'partial')
    .reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);

  // 2. Overdue Amount: sum of unpaid amount (total - paid_amount) for invoices in this period that are past due_date
  // We check if due_date has passed compared to now
  const now = new Date();
  const overdue = invoices
    .filter(inv => (inv.status === 'pending' || inv.status === 'partial') && new Date(inv.due_date) < now)
    .reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.paid_amount || 0)), 0);

  // 3. Occupancy Rate: rooms with active contracts during M/Y
  const totalRooms = await Room.count({ where: { property_id } });
  
  let occupiedRoomsCount = 0;
  if (totalRooms > 0) {
    const rooms = await Room.findAll({ where: { property_id }, attributes: ['id'] });
    const roomIds = rooms.map(r => r.id);

    const activeContracts = await Contract.findAll({
      where: {
        room_id: { [Op.in]: roomIds },
        start_date: { [Op.lte]: endOfMonth },
        [Op.or]: [
          { move_out_date: null },
          { move_out_date: { [Op.gte]: startOfMonth } }
        ],
        status: 'active'
      }
    });

    const occupiedRoomIds = new Set(activeContracts.map(c => c.room_id));
    occupiedRoomsCount = occupiedRoomIds.size;

    // Fallback for current month: count by current room status if contracts are not fully populated
    if (year === now.getFullYear() && month === (now.getMonth() + 1)) {
      const currentOccupied = await Room.count({ where: { property_id, status: 'occupied' } });
      occupiedRoomsCount = Math.max(occupiedRoomsCount, currentOccupied);
    }
  }

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRoomsCount / totalRooms) * 100) : 0;

  return {
    revenue,
    overdue,
    occupancyRate,
    occupiedRooms: occupiedRoomsCount,
    totalRooms
  };
};

exports.getDashboardData = async (req, res) => {
  try {
    const property_id = req.query.property_id;
    if (!property_id) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Revenue
    const invoices = await Invoice.findAll({
      where: {
        property_id,
        period_month: currentMonth,
        period_year: currentYear
      }
    });

    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid' || inv.status === 'partial')
      .reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);

    const pendingRevenue = invoices
      .filter(inv => inv.status === 'pending' || inv.status === 'partial')
      .reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.paid_amount || 0)), 0);

    // 2. Occupancy
    const totalRooms = await Room.count({ where: { property_id } });
    const occupiedRooms = await Room.count({ where: { property_id, status: 'occupied' } });
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    // 3. Maintenance
    const pendingMaintenances = await MaintenanceRequest.count({
      where: { property_id, status: 'pending' }
    });

    // 4. Overdue Invoices
    const overdueInvoices = await Invoice.count({
      where: {
        property_id,
        status: 'pending',
        due_date: { [Op.lt]: now }
      }
    });

    res.json({
      revenue: {
        total: totalRevenue,
        pending: pendingRevenue
      },
      occupancy: {
        rate: occupancyRate,
        occupied: occupiedRooms,
        total: totalRooms
      },
      maintenance: {
        pending: pendingMaintenances
      },
      invoices: {
        overdue: overdueInvoices
      }
    });
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getReportsStatistics = async (req, res) => {
  try {
    const property_id = req.query.property_id;
    if (!property_id) {
      return res.status(400).json({ message: 'Property ID is required' });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevYear = prevMonthDate.getFullYear();

    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const startOfPeriod = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth(), 1);
    const endOfPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Fetch rooms and count
    const rooms = await Room.findAll({ where: { property_id }, attributes: ['id', 'status'] });
    const totalRooms = rooms.length;

    // 2. Fetch all invoices in the 12-month window
    const allInvoices = await Invoice.findAll({
      where: {
        property_id,
        [Op.or]: [
          {
            period_year: { [Op.gt]: twelveMonthsAgo.getFullYear() }
          },
          {
            period_year: twelveMonthsAgo.getFullYear(),
            period_month: { [Op.gte]: twelveMonthsAgo.getMonth() + 1 }
          }
        ]
      }
    });

    // 3. Fetch all active contracts in the 12-month window
    const roomIds = rooms.map(r => r.id);
    const allContracts = totalRooms > 0 ? await Contract.findAll({
      where: {
        room_id: { [Op.in]: roomIds },
        start_date: { [Op.lte]: endOfPeriod },
        [Op.or]: [
          { move_out_date: null },
          { move_out_date: { [Op.gte]: startOfPeriod } }
        ],
        status: 'active'
      }
    }) : [];

    // Helper in-memory calculator for stats of a given month
    const calculateStatsInMemory = (year, month) => {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);

      // Invoices
      const monthlyInvoices = allInvoices.filter(inv => inv.period_month === month && inv.period_year === year);
      const revenue = monthlyInvoices
        .filter(inv => inv.status === 'paid' || inv.status === 'partial')
        .reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);

      const overdue = monthlyInvoices
        .filter(inv => (inv.status === 'pending' || inv.status === 'partial') && new Date(inv.due_date) < now)
        .reduce((sum, inv) => sum + (Number(inv.total) - Number(inv.paid_amount || 0)), 0);

      // Occupancy
      let occupiedRoomsCount = 0;
      if (totalRooms > 0) {
        const activeContracts = allContracts.filter(c => {
          const start = new Date(c.start_date);
          const end = c.move_out_date ? new Date(c.move_out_date) : null;
          return start <= endOfMonth && (end === null || end >= startOfMonth);
        });
        const occupiedRoomIds = new Set(activeContracts.map(c => c.room_id));
        occupiedRoomsCount = occupiedRoomIds.size;

        // Fallback for current month
        if (year === now.getFullYear() && month === (now.getMonth() + 1)) {
          const currentOccupied = rooms.filter(r => r.status === 'occupied').length;
          occupiedRoomsCount = Math.max(occupiedRoomsCount, currentOccupied);
        }
      }
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRoomsCount / totalRooms) * 100) : 0;

      return {
        revenue,
        overdue,
        occupancyRate,
        occupiedRooms: occupiedRoomsCount,
        totalRooms
      };
    };

    // Calculate KPI for current and previous months
    const currentStats = calculateStatsInMemory(currentYear, currentMonth);
    const prevStats = calculateStatsInMemory(prevYear, prevMonth);

    // Growth rates
    const revenueGrowth = prevStats.revenue > 0
      ? ((currentStats.revenue - prevStats.revenue) / prevStats.revenue) * 100
      : 0;

    const occupancyGrowth = prevStats.occupancyRate > 0
      ? ((currentStats.occupancyRate - prevStats.occupancyRate) / prevStats.occupancyRate) * 100
      : 0;

    const overdueGrowth = prevStats.overdue > 0
      ? ((currentStats.overdue - prevStats.overdue) / prevStats.overdue) * 100
      : 0;

    // Generate trends
    const revenueTrend = [];
    const occupancyTrend = [];
    const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                       'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();

      const stats = calculateStatsInMemory(y, m);

      revenueTrend.push({
        month: MONTHS_TH[d.getMonth()],
        value: stats.revenue
      });

      occupancyTrend.push({
        month: MONTHS_TH[d.getMonth()],
        rate: stats.occupancyRate
      });
    }

    res.json({
      kpi: {
        revenue: {
          value: currentStats.revenue,
          growth: Number(revenueGrowth.toFixed(1))
        },
        occupancy: {
          value: currentStats.occupancyRate,
          growth: Number(occupancyGrowth.toFixed(1))
        },
        overdue: {
          value: currentStats.overdue,
          growth: Number(overdueGrowth.toFixed(1))
        }
      },
      charts: {
        revenueTrend,
        occupancyTrend
      }
    });
  } catch (error) {
    console.error('Reports statistics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

