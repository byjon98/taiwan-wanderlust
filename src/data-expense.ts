export interface Expense {
  id: string;
  subject: string;
  amount: number; 
  currency: 'TWD' | 'MYR';
  paymentMethod: 'cash_jon' | 'cash_june' | 'card' | 'myr_cash' | 'easycard_jon' | 'easycard_june';
  
  // Exactly how much was advanced by each person
  paidByJon: number;
  paidByJune: number;
  
  // Exactly how much EACH person should bear for this expense
  forJon: number;
  forJune: number;

  category: string;
  zone: string;
  timestamp: number;
  day: number;
  
  isTransfer?: boolean;
  transferTo?: 'easycard_jon' | 'easycard_june';
  isSettlement?: boolean;
}

export const PAYMENT_METHODS = [
  { id: 'cash_jon', icon: '👦🏻💵', label: 'Jon 现金', desc: '扣 Jon 实体台币' },
  { id: 'cash_june', icon: '👧🏻💵', label: 'June 现金', desc: '扣 June 实体台币' },
  { id: 'card', icon: '💳', label: '信用卡/Apple Pay', desc: '扣备用金' },
  { id: 'easycard_jon', icon: '👦🏻🚇', label: 'Jon 悠游卡', desc: '扣 Jon 悠游卡' },
  { id: 'easycard_june', icon: '👧🏻🚇', label: 'June 悠游卡', desc: '扣 June 悠游卡' },
  { id: 'myr_cash', icon: '🇲🇾', label: '实体马币', desc: '扣马币现金' },
];

export const CATEGORIES = [
  { group: '饮食组', items: [
    { id: 'nightmarket', icon: '🍢', label: '夜市小吃' },
    { id: 'restaurant', icon: '🍱', label: '正餐/餐厅' },
    { id: 'drinks', icon: '🧋', label: '甜点与饮品' },
    { id: 'convenience', icon: '🏪', label: '超商/超市补给' },
  ]},
  { group: '交通组', items: [
    { id: 'uber', icon: '🚕', label: 'Uber / 计程车' },
    { id: 'bus', icon: '🚌', label: '客运/公车' },
    { id: 'rail', icon: '🚄', label: '高铁 / 台铁' },
    { id: 'transit', icon: '🚇', label: '捷运 / 游船 / 缆车' },
  ]},
  { group: '采买与伴手礼组', items: [
    { id: 'souvenir_food', icon: '🥮', label: '食品伴手礼' },
    { id: 'shopping_life', icon: '🛍️', label: '服饰与杂货' },
    { id: 'tech', icon: '⚙️', label: '3C 硬件装甲' },
  ]},
  { group: '杂项组', items: [
    { id: 'hotel_cash', icon: '🏨', label: '住宿现金尾款' },
    { id: 'tickets', icon: '🎫', label: '门票与体验' },
    { id: 'medical', icon: '💊', label: '医疗保健' },
    { id: 'misc', icon: '🧺', label: '洗衣/杂费' },
  ]}
];

export const BENEFICIARIES = [
  { id: 'split_50', icon: '👫', label: '50/50 平摊' },
  { id: 'jon_100', icon: '👦🏻', label: '100% Jon' },
  { id: 'june_100', icon: '👧🏻', label: '100% June' },
  { id: 'custom', icon: '⚖️', label: '自定义额度' },
];

export const ZONES = [
  { id: 'taichung', icon: '📍', label: '台中战区' },
  { id: 'nantou', icon: '📍', label: '南投/日月潭' },
  { id: 'taipei', icon: '📍', label: '大台北战区' },
  { id: 'taoyuan', icon: '📍', label: '桃园战区' },
  { id: 'malaysia', icon: '🇲🇾', label: 'Malaysia' },
  { id: 'custom', icon: '✏️', label: '自己填' },
];

export const CONSTANTS = {
  JON_CASH_TWD: 17000,
  JUNE_CASH_TWD: 16000,
  JON_EASYCARD_TWD: 0,
  JUNE_EASYCARD_TWD: 0,
  CARD_RESERVE_MYR: 1852,
  LOCKED_HOTEL_TWD: 1652,
  TOTAL_DAYS: 10
};

// Based on desktop files injected initially
export const INITIAL_SUNK_COSTS: Expense[] = [
  { id: 'sunk_1', subject: '中华航空双人来回', amount: 2189.64, currency: 'MYR', paymentMethod: 'card', category: 'tickets', paidByJon: 1094.82, paidByJune: 1094.82, forJon: 1094.82, forJune: 1094.82, zone: 'malaysia', timestamp: 1, day: 1 },
  { id: 'sunk_2', subject: 'Hotel East 台中 (2晚)', amount: 551.28, currency: 'MYR', paymentMethod: 'card', category: 'hotel_cash', paidByJon: 275.64, paidByJune: 275.64, forJon: 275.64, forJune: 275.64, zone: 'taichung', timestamp: 2, day: 1 },
  { id: 'sunk_3', subject: '城市商旅北门馆 (5晚)', amount: 1308.47, currency: 'MYR', paymentMethod: 'card', category: 'hotel_cash', paidByJon: 654.235, paidByJune: 654.235, forJon: 654.235, forJune: 654.235, zone: 'taipei', timestamp: 3, day: 1 },
  { id: 'sunk_4', subject: '城市商旅航空馆 (1晚)', amount: 312.59, currency: 'MYR', paymentMethod: 'card', category: 'hotel_cash', paidByJon: 156.295, paidByJune: 156.295, forJon: 156.295, forJune: 156.295, zone: 'taoyuan', timestamp: 4, day: 1 },
  { id: 'sunk_5', subject: 'Klook 九族票+游船', amount: 263.58, currency: 'MYR', paymentMethod: 'card', category: 'tickets', paidByJon: 131.79, paidByJune: 131.79, forJon: 131.79, forJune: 131.79, zone: 'nantou', timestamp: 5, day: 1 },
  { id: 'sunk_6', subject: 'eSIM (Jon私账)', amount: 90.00, currency: 'MYR', paymentMethod: 'card', category: 'tickets', paidByJon: 90.0, paidByJune: 0, forJon: 90.0, forJune: 0, zone: 'malaysia', timestamp: 6, day: 1 }
];
