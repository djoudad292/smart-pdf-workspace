/**
 * Two short, realistic documents pre-seeded into every guest sandbox so a
 * visitor can ask questions the moment the session opens. Plain text — no
 * binary fixtures, no network fetch, fully isolated per sandbox.
 */

export interface GuestSample {
  title: string;
  filename: string;
  content: string;
}

export const GUEST_SAMPLES: GuestSample[] = [
  {
    title: 'Northwind Field Service Agreement (sample)',
    filename: 'northwind-service-agreement.txt',
    content: [
      'Field Service Agreement. This agreement is between Northwind Systems and the client named on the order form. It covers installation, maintenance and repair of the appliances listed in Schedule A.',
      'Scope of work. Northwind will install each appliance within ten business days of delivery. Installation includes unpacking, placement, connection to the existing power and water supply, and a twenty-minute handover walkthrough with the site contact.',
      'Service levels. Remote support is available 07:00 to 20:00 CET, Monday to Friday. Severity 1 faults, meaning the appliance is unusable, receive a response within two hours. Severity 2 faults receive a response within one business day. Planned preventive maintenance visits happen twice a year unless the order form states otherwise.',
      'Charges. Installation is included in the purchase price. Parts outside the warranty period are billed at list price. Travel is charged at forty euros per hour for visits more than fifty kilometres from the nearest service depot, and is waived for warranty work.',
      'Warranty. Appliances carry a twenty-four month warranty from the delivery date, covering manufacturing defects in parts and labour. The warranty does not cover damage caused by incorrect voltage, by third-party modifications, or by failure to follow the maintenance schedule in the manual.',
      'Term and termination. The agreement runs for twenty-four months and renews for successive twelve-month periods unless either party gives ninety days written notice. Either party may terminate immediately if the other enters insolvency proceedings.',
      'Data and confidentiality. Northwind stores service records for seven years to satisfy audit obligations. Those records are not shared with third parties. Northwind treats all information about the client site as confidential and discloses it only where the law requires it.',
      'Governing law. The agreement is governed by the laws of France. Disputes go first to good-faith negotiation for thirty days, then to the courts of Paris.',
    ].join('\n\n'),
  },
  {
    title: 'Brightlake Employee Handbook (sample)',
    filename: 'brightlake-employee-handbook.txt',
    content: [
      'Employee handbook. This handbook describes how Brightlake works. It applies to all full-time staff and to contractors working more than three days a week. Where local law offers more protection than this handbook, local law wins.',
      'Working hours. The standard week is thirty-seven and a half hours, Monday to Friday, with a one-hour lunch break. Core hours, when everyone must be reachable, run from 10:00 to 16:00. Outside core hours you are not expected to reply to messages.',
      'Annual leave. Full-time staff accrue twenty-five days of paid leave a year, accruing monthly from the first day of employment. Part-time staff accrue the same amount pro rata. A maximum of five unused days may carry into the next year, and they must be used before the following March.',
      'Sick leave. Staff receive ten days of fully paid sick leave a year. From the fourth consecutive day, a medical certificate is required. Contact your manager as early as you can so the team can cover your work.',
      'Remote work. You may work from home up to three days a week with your manager agreement. You are responsible for a safe setup and for your own equipment. Company laptops are refreshed every three years and must be returned within five working days of your last day.',
      'Expenses. Business travel is booked through the company travel tool. Rail and flights are booked in economy. Meals are reimbursed up to twenty euros per day. Keep the receipt and file the claim within thirty days or it will not be paid.',
      'Learning budget. Each employee has a budget of one thousand two hundred euros a year for courses, books and conferences. Submit the request to your manager first; anything over six hundred euros needs a second approval from your department lead.',
      'Conduct. We expect respectful behaviour, no harassment of any kind, and care with customer data. Concerns can be raised with your manager, with People Operations, or through the anonymous line, which is not traced back to the person reporting.',
    ].join('\n\n'),
  },
];
