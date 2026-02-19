import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

// Replicate exact logic from getLeadDealFlowLast12Months
const end = dayjs.utc().endOf('month');
const start = end.subtract(11, 'month').startOf('month');

console.log('📅 Date Range:');
console.log(`   Start: ${start.format('YYYY-MM-DD HH:mm:ss')} UTC`);
console.log(`   End: ${end.format('YYYY-MM-DD HH:mm:ss')} UTC\n`);

// Pre-build 12 months buckets
const months: any[] = [];
for (let i = 0; i < 12; i++) {
  const m = start.add(i, 'month');
  months.push({ name: m.format('MMM'), totalLeads: 0, index: i });
  console.log(`   Month ${i}: ${m.format('MMM YYYY')} (${m.format('YYYY-MM-DD')})`);
}

console.log('\n📊 Testing February 2026 leads:');
const febDates = [
  '2026-02-03T15:52:30Z',
  '2026-02-03T15:53:17Z',
  '2026-02-03T15:54:54Z',
  '2026-02-05T05:25:22Z',
  '2026-02-05T10:30:11Z',
  '2026-02-06T08:23:35Z',
  '2026-02-06T08:26:13Z',
  '2026-02-09T10:14:15Z',
  '2026-02-11T08:08:14Z',
  '2026-02-13T11:00:28Z',
];

febDates.forEach((dateStr, idx) => {
  const leadDate = dayjs.utc(dateStr);
  const leadMonth = leadDate.startOf('month');
  const idx_calc = leadMonth.diff(start, 'month');
  
  console.log(`\n   Lead ${idx + 1}: ${dateStr}`);
  console.log(`      Lead Month: ${leadMonth.format('YYYY-MM-DD')}`);
  console.log(`      Calculated Index: ${idx_calc}`);
  console.log(`      Month Name: ${leadMonth.format('MMM')}`);
  
  if (idx_calc >= 0 && idx_calc < months.length) {
    months[idx_calc].totalLeads += 1;
    console.log(`      ✅ Added to bucket: ${months[idx_calc].name}`);
  } else {
    console.log(`      ❌ Index out of range!`);
  }
});

console.log('\n📊 Final Month Buckets:');
months.forEach(m => {
  console.log(`   ${m.name}: ${m.totalLeads} leads`);
});

// Test sorting
console.log('\n📊 After Sorting:');
const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
months.sort((a, b) => monthOrder.indexOf(a.name) - monthOrder.indexOf(b.name));
months.forEach(m => {
  console.log(`   ${m.name}: ${m.totalLeads} leads`);
});

