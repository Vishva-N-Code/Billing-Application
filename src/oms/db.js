/**
 * OMS Data Access Layer
 * All database operations for the Operator Management System
 * Uses the separate OMS Supabase project
 */
import { supabaseOMS, OMS_BUSINESS_ID } from '../supabaseOMS';

const BID = OMS_BUSINESS_ID;

// ─────────────────────────────────────────────────────────────
// UTILITY: Generate sequential codes like OP001, FL001, CUS001
// ─────────────────────────────────────────────────────────────
async function generateCode(table, codeField, prefix) {
  const { data } = await supabaseOMS
    .from(table)
    .select(codeField)
    .eq('business_id', BID)
    .order(codeField, { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return `${prefix}001`;
  const last = data[0][codeField] || `${prefix}000`;
  const num = parseInt(last.replace(prefix, ''), 10) + 1;
  return `${prefix}${String(num).padStart(3, '0')}`;
}

// ─────────────────────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────────────────────
export async function addAuditLog(action, entityType, entityId, prevValue, newValue, userName = 'ADMIN') {
  try {
    await supabaseOMS.from('oms_audit_logs').insert({
      business_id: BID,
      user_name: userName,
      action,
      entity_type: entityType,
      entity_id: String(entityId),
      previous_value: prevValue ? JSON.parse(JSON.stringify(prevValue)) : null,
      new_value: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
    });
  } catch (e) {
    console.warn('Audit log failed:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────
// BUSINESS SETTINGS
// ─────────────────────────────────────────────────────────────
export async function getSettings() {
  const { data, error } = await supabaseOMS
    .from('oms_business_settings')
    .select('*')
    .eq('business_id', BID);
  if (error) throw error;
  const settings = {};
  (data || []).forEach(row => { settings[row.setting_key] = row.setting_value; });
  return settings;
}

export async function updateSetting(key, value) {
  const { error } = await supabaseOMS
    .from('oms_business_settings')
    .upsert(
      { business_id: BID, setting_key: key, setting_value: String(value), updated_at: new Date().toISOString() },
      { onConflict: 'business_id,setting_key' }
    );
  if (error) throw error;
  await addAuditLog('SETTINGS_CHANGE', 'SETTINGS', key, null, { key, value });
}

export async function updateSettings(settingsObj) {
  const rows = Object.entries(settingsObj).map(([k, v]) => ({
    business_id: BID,
    setting_key: k,
    setting_value: String(v),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabaseOMS
    .from('oms_business_settings')
    .upsert(rows, { onConflict: 'business_id,setting_key' });
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// OPERATORS
// ─────────────────────────────────────────────────────────────
export async function getOperators(filters = {}) {
  let query = supabaseOMS
    .from('oms_operators')
    .select('*')
    .eq('business_id', BID)
    .order('operator_code');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.search) query = query.ilike('full_name', `%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getOperatorById(id) {
  const { data, error } = await supabaseOMS
    .from('oms_operators')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function addOperator(op) {
  const code = await generateCode('oms_operators', 'operator_code', 'OP');
  const { data, error } = await supabaseOMS
    .from('oms_operators')
    .insert({ ...op, business_id: BID, operator_code: code })
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('CREATE', 'OPERATOR', data.id, null, data);
  return data;
}

export async function updateOperator(id, updates) {
  const prev = await getOperatorById(id);
  const { data, error } = await supabaseOMS
    .from('oms_operators')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('UPDATE', 'OPERATOR', id, prev, data);
  return data;
}

export async function deleteOperator(id) {
  const prev = await getOperatorById(id);
  const { error } = await supabaseOMS
    .from('oms_operators')
    .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await addAuditLog('DELETE', 'OPERATOR', id, prev, { status: 'INACTIVE' });
}

// ─────────────────────────────────────────────────────────────
// OPERATOR DOCUMENTS
// ─────────────────────────────────────────────────────────────
export async function getDocuments(operatorId = null, filters = {}) {
  let query = supabaseOMS
    .from('oms_operator_documents')
    .select(`*, operator:oms_operators(full_name, operator_code)`)
    .eq('business_id', BID)
    .order('upload_date', { ascending: false });
  if (operatorId) query = query.eq('operator_id', operatorId);
  if (filters.document_type) query = query.eq('document_type', filters.document_type);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addDocument(doc) {
  const { data, error } = await supabaseOMS
    .from('oms_operator_documents')
    .insert({ ...doc, business_id: BID })
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('CREATE', 'DOCUMENT', data.id, null, data);
  return data;
}

export async function deleteDocument(id) {
  const { error } = await supabaseOMS.from('oms_operator_documents').delete().eq('id', id);
  if (error) throw error;
  await addAuditLog('DELETE', 'DOCUMENT', id, null, null);
}

export async function getExpiringDocuments(days = 30) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  const { data, error } = await supabaseOMS
    .from('oms_operator_documents')
    .select(`*, operator:oms_operators(full_name, operator_code)`)
    .eq('business_id', BID)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', futureDate.toISOString().split('T')[0])
    .order('expiry_date');
  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────────
// VEHICLES
// ─────────────────────────────────────────────────────────────
export async function getVehicles(filters = {}) {
  let query = supabaseOMS
    .from('oms_vehicles')
    .select('*')
    .eq('business_id', BID)
    .order('vehicle_code');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.type) query = query.eq('vehicle_type', filters.type);
  if (filters.search) query = query.ilike('vehicle_code', `%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getVehicleById(id) {
  const { data, error } = await supabaseOMS
    .from('oms_vehicles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function addVehicle(vehicle) {
  const prefix = vehicle.vehicle_type === 'CRANE' ? 'CR' : 'FL';
  const code = vehicle.vehicle_code?.trim() || await generateCode('oms_vehicles', 'vehicle_code', prefix);
  const { data, error } = await supabaseOMS
    .from('oms_vehicles')
    .insert({ ...vehicle, business_id: BID, vehicle_code: code })
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('CREATE', 'VEHICLE', data.id, null, data);
  return data;
}

export async function updateVehicle(id, updates) {
  const prev = await getVehicleById(id);
  const { data, error } = await supabaseOMS
    .from('oms_vehicles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('UPDATE', 'VEHICLE', id, prev, data);
  return data;
}

export async function deleteVehicle(id) {
  const prev = await getVehicleById(id);
  const { error } = await supabaseOMS
    .from('oms_vehicles')
    .update({ status: 'INACTIVE', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await addAuditLog('DELETE', 'VEHICLE', id, prev, { status: 'INACTIVE' });
}

// ─────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────
export async function getCustomers(filters = {}) {
  let query = supabaseOMS
    .from('oms_customers')
    .select('*')
    .eq('business_id', BID)
    .order('company_name');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.search) query = query.ilike('company_name', `%${filters.search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getCustomerById(id) {
  const { data, error } = await supabaseOMS
    .from('oms_customers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function addCustomer(customer) {
  const code = await generateCode('oms_customers', 'customer_code', 'CUS');
  const { data, error } = await supabaseOMS
    .from('oms_customers')
    .insert({ ...customer, business_id: BID, customer_code: code })
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('CREATE', 'CUSTOMER', data.id, null, data);
  return data;
}

export async function updateCustomer(id, updates) {
  const prev = await getCustomerById(id);
  const { data, error } = await supabaseOMS
    .from('oms_customers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('UPDATE', 'CUSTOMER', id, prev, data);
  return data;
}

export async function deleteCustomer(id) {
  const prev = await getCustomerById(id);
  const { error } = await supabaseOMS
    .from('oms_customers')
    .delete()
    .eq('id', id);
  if (error) throw error;
  await addAuditLog('DELETE', 'CUSTOMER', id, prev, null);
}

// ─────────────────────────────────────────────────────────────
// RENTAL ASSIGNMENTS
// ─────────────────────────────────────────────────────────────
export async function getRentals(filters = {}) {
  let query = supabaseOMS
    .from('oms_rental_assignments')
    .select(`
      *,
      vehicle:oms_vehicles(vehicle_code, vehicle_type),
      customer:oms_customers(company_name, customer_code),
      operator:oms_operators(full_name, operator_code)
    `)
    .eq('business_id', BID)
    .order('start_date', { ascending: false });
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.rental_type) query = query.eq('rental_type', filters.rental_type);
  if (filters.operator_id) query = query.eq('operator_id', filters.operator_id);
  if (filters.vehicle_id) query = query.eq('vehicle_id', filters.vehicle_id);
  if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addRental(rental) {
  const code = await generateCode('oms_rental_assignments', 'assignment_code', 'ASN');
  const { data, error } = await supabaseOMS
    .from('oms_rental_assignments')
    .insert({ ...rental, business_id: BID, assignment_code: code })
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('CREATE', 'RENTAL', data.id, null, data);
  return data;
}

export async function updateRental(id, updates) {
  const { data, error } = await supabaseOMS
    .from('oms_rental_assignments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('UPDATE', 'RENTAL', id, null, data);
  return data;
}

// ─────────────────────────────────────────────────────────────
// WORK LOGS  ← Most critical — NO unique constraint on operator+date
// ─────────────────────────────────────────────────────────────
export async function getWorkLogs(filters = {}) {
  let query = supabaseOMS
    .from('oms_work_logs')
    .select(`
      *,
      operator:oms_operators(id, full_name, operator_code),
      vehicle:oms_vehicles(id, vehicle_code, vehicle_type),
      customer:oms_customers(id, company_name, customer_code)
    `)
    .eq('business_id', BID)
    .order('work_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.date) query = query.eq('work_date', filters.date);
  if (filters.operator_id) query = query.eq('operator_id', filters.operator_id);
  if (filters.vehicle_id) query = query.eq('vehicle_id', filters.vehicle_id);
  if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
  if (filters.work_status) query = query.eq('work_status', filters.work_status);
  if (filters.rental_type) query = query.eq('rental_type', filters.rental_type);
  if (filters.month) {
    const [year, month] = filters.month.split('-');
    const start = `${year}-${month}-01`;
    const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
    query = query.gte('work_date', start).lte('work_date', end);
  }
  if (filters.from) query = query.gte('work_date', filters.from);
  if (filters.to) query = query.lte('work_date', filters.to);
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getWorkLogsByOperatorDate(operatorId, date) {
  const { data, error } = await supabaseOMS
    .from('oms_work_logs')
    .select('*')
    .eq('business_id', BID)
    .eq('operator_id', operatorId)
    .eq('work_date', date);
  if (error) throw error;
  return data || [];
}

export async function addWorkLog(log) {
  // Enforce absent logic FIRST before computing OT amount
  if (log.work_status === 'ABSENT') {
    log.shift_count = 0;
    log.ot_hours = 0;
    log.ot_rate = 0;
  }
  if (log.work_status === 'PRESENT' && parseFloat(log.shift_count || 0) < 1) {
    log.shift_count = 1;
  }
  // Calculate OT amount after overrides are applied
  const otAmount = parseFloat(log.ot_hours || 0) * parseFloat(log.ot_rate || 0);

  const { data, error } = await supabaseOMS
    .from('oms_work_logs')
    .insert({ ...log, business_id: BID, ot_amount: otAmount })
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('CREATE', 'WORK_LOG', data.id, null, data);
  return data;
}

export async function updateWorkLog(id, updates) {
  // Enforce absent logic FIRST before computing OT amount
  if (updates.work_status === 'ABSENT') {
    updates.shift_count = 0;
    updates.ot_hours = 0;
    updates.ot_rate = 0;
  }
  // Calculate OT amount after overrides are applied
  const otAmount = parseFloat(updates.ot_hours || 0) * parseFloat(updates.ot_rate || 0);
  const { data, error } = await supabaseOMS
    .from('oms_work_logs')
    .update({ ...updates, ot_amount: otAmount, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('UPDATE', 'WORK_LOG', id, null, data);
  return data;
}

export async function deleteWorkLog(id) {
  const { error } = await supabaseOMS.from('oms_work_logs').delete().eq('id', id);
  if (error) throw error;
  await addAuditLog('DELETE', 'WORK_LOG', id, null, null);
}

// Check today's work log completion
export async function getTodayWorkSummary(date) {
  const { data, error } = await supabaseOMS
    .from('oms_work_logs')
    .select('*')
    .eq('business_id', BID)
    .eq('work_date', date);
  if (error) throw error;
  const logs = data || [];
  const presentEntries = logs.filter(l => l.work_status === 'PRESENT');
  const absentEntries = logs.filter(l => l.work_status === 'ABSENT');
  const totalShifts = logs.reduce((sum, l) => sum + parseFloat(l.shift_count || 0), 0);
  const totalOTHours = logs.reduce((sum, l) => sum + parseFloat(l.ot_hours || 0), 0);
  const totalOTAmount = logs.reduce((sum, l) => sum + parseFloat(l.ot_amount || 0), 0);
  return { logs, presentEntries, absentEntries, totalShifts, totalOTHours, totalOTAmount, count: logs.length };
}

// ─────────────────────────────────────────────────────────────
// PAYROLL
// ─────────────────────────────────────────────────────────────
export async function getPayrollRecords(filters = {}) {
  let query = supabaseOMS
    .from('oms_payroll_records')
    .select(`*, operator:oms_operators(full_name, operator_code)`)
    .eq('business_id', BID)
    .order('month', { ascending: false });
  if (filters.month) query = query.eq('month', filters.month);
  if (filters.operator_id) query = query.eq('operator_id', filters.operator_id);
  if (filters.status) query = query.eq('status', filters.status);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getPayrollByOperatorMonth(operatorId, month) {
  const { data } = await supabaseOMS
    .from('oms_payroll_records')
    .select('*')
    .eq('business_id', BID)
    .eq('operator_id', operatorId)
    .eq('month', month)
    .single();
  return data;
}

export async function calculatePayroll(operatorId, month, settings) {
  // Get all work logs for this operator this month
  const logs = await getWorkLogs({ operator_id: operatorId, month });
  const operator = await getOperatorById(operatorId);

  const totalShifts = logs.reduce((s, l) => s + parseFloat(l.shift_count || 0), 0);
  const otHours = logs.reduce((s, l) => s + parseFloat(l.ot_hours || 0), 0);
  const otAmount = logs.reduce((s, l) => s + parseFloat(l.ot_amount || 0), 0);

  // Derive the effective OT rate from actual log data (weighted average).
  // Falls back to the settings rate if no OT hours were logged.
  const settingsOtRate = parseFloat(settings.ot_rate_per_hour || 500);
  const effectiveOtRate = otHours > 0
    ? parseFloat((otAmount / otHours).toFixed(2))
    : settingsOtRate;

  // Base salary is ALWAYS the full monthly salary (compulsory)
  const baseEarnings = parseFloat(operator.salary || 0);

  const grossEarnings = baseEarnings + otAmount;

  // Get outstanding advance balance (all time advance minus all recoveries)
  const advanceSummary = await getOperatorAdvanceSummary(operatorId);
  const outstandingAdvance = Math.max(0, advanceSummary.outstanding);

  const finalPayable = grossEarnings - outstandingAdvance;

  return {
    operator_id: operatorId,
    month,
    total_shifts: totalShifts,
    ot_hours: parseFloat(otHours.toFixed(2)),
    ot_rate_snapshot: effectiveOtRate,
    ot_amount: parseFloat(otAmount.toFixed(2)),
    base_earnings: parseFloat(baseEarnings.toFixed(2)),
    allowances: 0,
    advance_recovery: parseFloat(outstandingAdvance.toFixed(2)),
    other_deductions: 0,
    gross_earnings: parseFloat(grossEarnings.toFixed(2)),
    final_payable: parseFloat(finalPayable.toFixed(2)),
    status: 'DRAFT',
  };
}

export async function savePayroll(payrollData) {
  const { data, error } = await supabaseOMS
    .from('oms_payroll_records')
    .upsert(
      { ...payrollData, business_id: BID, updated_at: new Date().toISOString() },
      { onConflict: 'operator_id,month' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function generatePayroll(operatorId, month) {
  const settings = await getSettings();
  const payrollData = await calculatePayroll(operatorId, month, settings);
  return await savePayroll(payrollData);
}

export async function updatePayroll(id, updates) {
  const { data, error } = await supabaseOMS
    .from('oms_payroll_records')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('UPDATE', 'PAYROLL', id, null, data);
  return data;
}

// When advance recovery is deferred (set to 0), log a RECOVERY of 0 — outstanding stays intact
// The recovery amount is actually written when finalizePayroll is called with advance_recovery > 0
export async function finalizePayrollWithAdvance(id, advanceRecovery) {
  const prev = await supabaseOMS.from('oms_payroll_records').select('*').eq('id', id).single();
  const prevData = prev.data;
  const grossEarnings = parseFloat(prevData.gross_earnings || 0);
  const actualRecovery = parseFloat(advanceRecovery || 0);
  const finalPayable = grossEarnings - actualRecovery;

  // If any advance was actually recovered, log it as a RECOVERY transaction
  if (actualRecovery > 0) {
    await supabaseOMS.from('oms_advance_transactions').insert({
      business_id: BID,
      operator_id: prevData.operator_id,
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'RECOVERY',
      amount: actualRecovery,
      reason: `Payroll deduction — ${prevData.month}`,
    });
  }

  const { data, error } = await supabaseOMS
    .from('oms_payroll_records')
    .update({
      advance_recovery: actualRecovery,
      final_payable: parseFloat(finalPayable.toFixed(2)),
      status: 'FINALIZED',
      finalized_at: new Date().toISOString(),
      finalized_by: 'ADMIN',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('FINALIZE', 'PAYROLL', id, prevData, data);
  return data;
}

// ─────────────────────────────────────────────────────────────
// ADVANCES
// ─────────────────────────────────────────────────────────────
export async function getAdvances(filters = {}) {
  let query = supabaseOMS
    .from('oms_advance_transactions')
    .select(`*, operator:oms_operators(full_name, operator_code)`)
    .eq('business_id', BID)
    .order('transaction_date', { ascending: false });
  if (filters.operator_id) query = query.eq('operator_id', filters.operator_id);
  if (filters.type) query = query.eq('transaction_type', filters.type);
  if (filters.month) {
    const [year, month] = filters.month.split('-');
    const start = `${year}-${month}-01`;
    const end = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
    query = query.gte('transaction_date', start).lte('transaction_date', end);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getOperatorAdvanceSummary(operatorId) {
  const { data, error } = await supabaseOMS
    .from('oms_advance_transactions')
    .select('transaction_type, amount')
    .eq('business_id', BID)
    .eq('operator_id', operatorId);
  if (error) throw error;
  const transactions = data || [];
  const totalAdvance = transactions.filter(t => t.transaction_type === 'ADVANCE').reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalRecovered = transactions.filter(t => t.transaction_type === 'RECOVERY').reduce((s, t) => s + parseFloat(t.amount), 0);
  return { totalAdvance, totalRecovered, outstanding: totalAdvance - totalRecovered };
}

export async function addAdvance(advance) {
  const { data, error } = await supabaseOMS
    .from('oms_advance_transactions')
    .insert({ ...advance, business_id: BID })
    .select()
    .single();
  if (error) throw error;
  await addAuditLog('CREATE', 'ADVANCE', data.id, null, data);
  return data;
}

export async function deleteAdvance(id) {
  const { error } = await supabaseOMS.from('oms_advance_transactions').delete().eq('id', id);
  if (error) throw error;
  await addAuditLog('DELETE', 'ADVANCE', id, null, null);
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
export async function getNotifications(limit = 50) {
  const { data, error } = await supabaseOMS
    .from('oms_notifications')
    .select('*')
    .eq('business_id', BID)
    .order('triggered_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function addNotification(type, title, message) {
  const { data, error } = await supabaseOMS
    .from('oms_notifications')
    .insert({ business_id: BID, notification_type: type, title, message })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markNotificationRead(id) {
  const { error } = await supabaseOMS
    .from('oms_notifications')
    .update({ status: 'READ' })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { error } = await supabaseOMS
    .from('oms_notifications')
    .update({ status: 'READ' })
    .eq('business_id', BID)
    .eq('status', 'UNREAD');
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────────────────────────
export async function getAuditLogs(filters = {}) {
  let query = supabaseOMS
    .from('oms_audit_logs')
    .select('*')
    .eq('business_id', BID)
    .order('created_at', { ascending: false });
  if (filters.entity_type) query = query.eq('entity_type', filters.entity_type);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.limit) query = query.limit(filters.limit);
  else query = query.limit(200);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────
export async function getDashboardStats(today) {
  const [
    { count: opCount },
    { count: vehCount },
    { count: activeRentals },
    todaySummary,
    expiringDocs,
  ] = await Promise.all([
    supabaseOMS.from('oms_operators').select('*', { count: 'exact', head: true }).eq('business_id', BID).eq('status', 'ACTIVE'),
    supabaseOMS.from('oms_vehicles').select('*', { count: 'exact', head: true }).eq('business_id', BID).neq('status', 'INACTIVE'),
    supabaseOMS.from('oms_rental_assignments').select('*', { count: 'exact', head: true }).eq('business_id', BID).eq('status', 'ACTIVE'),
    getTodayWorkSummary(today),
    getExpiringDocuments(30),
  ]);
  return {
    totalOperators: opCount || 0,
    totalVehicles: vehCount || 0,
    activeRentals: activeRentals || 0,
    todaySummary,
    expiringDocs,
  };
}

