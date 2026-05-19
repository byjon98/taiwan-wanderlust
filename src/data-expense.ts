export interface Expense {
  id: string;
  subject: string;
  amount: number; // total amount of the transaction
  currency: 'TWD' | 'MYR';
  paymentMethod: 'cash' | 'card' | 'easycard' | 'myr_cash';
  category: string;
  payerType: 'jon_full' | 'june_full' | 'split_50' | 'split_custom';
  jonPaid: number; // exact amount Jon paid (in the currency)
  junePaid: number; // exact amount June paid (in the currency)
  zone: string;
  timestamp: number;
}

export const PAYMENT_METHODS = [
  { id: 'cash', icon: '💵', label: '实体台币', desc: '扣除 NT$现金池' },
  { id: 'card', icon: '💳', label: '信用卡/Apple Pay', desc: '扣除 MYR 1,852 备用金' },
  { id: 'easycard', icon: '🚇', label: '悠游卡', desc: '扣除卡内余额' },
  { id: 'myr_cash', icon: '🇲🇾', label: '实体马币', desc: '扣除马币现金' },
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
    { id: 'misc', icon: '🧺', label: '洗衣/杂费' },
  ]}
];

export const PAYER_TYPES = [
  { id: 'split_50', icon: '👫', label: '50/50 平摊' },
  { id: 'jon_full', icon: '👦🏻', label: 'Jon 全付' },
  { id: 'june_full', icon: '👧🏻', label: 'June 全付' },
  { id: 'split_custom', icon: '⚖️', label: '自定义比例' },
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
  CARD_RESERVE_MYR: 1852,
  LOCKED_HOTEL_TWD: 1652,
  TOTAL_DAYS: 10
};

// Based on desktop files injected initially
export const INITIAL_SUNK_COSTS: Expense[] = [
  { id: 'sunk_1', subject: '中华航空双人来回', amount: 2189.64, currency: 'MYR', paymentMethod: 'card', category: 'tickets', payerType: 'split_50', jonPaid: 1094.82, junePaid: 1094.82, zone: 'malaysia', timestamp: 1 },
  { id: 'sunk_2', subject: 'Hotel East 台中 (2晚)', amount: 551.28, currency: 'MYR', paymentMethod: 'card', category: 'hotel_cash', payerType: 'split_50', jonPaid: 275.64, junePaid: 275.64, zone: 'taichung', timestamp: 2 },
  { id: 'sunk_3', subject: '城市商旅北门馆 (5晚)', amount: 1308.47, currency: 'MYR', paymentMethod: 'card', category: 'hotel_cash', payerType: 'split_50', jonPaid: 654.235, junePaid: 654.235, zone: 'taipei', timestamp: 3 },
  { id: 'sunk_4', subject: '城市商旅航空馆 (1晚)', amount: 312.59, currency: 'MYR', paymentMethod: 'card', category: 'hotel_cash', payerType: 'split_50', jonPaid: 156.295, junePaid: 156.295, zone: 'taoyuan', timestamp: 4 },
  { id: 'sunk_5', subject: 'Klook 九族票+游船', amount: 263.58, currency: 'MYR', paymentMethod: 'card', category: 'tickets', payerType: 'split_50', jonPaid: 131.79, junePaid: 131.79, zone: 'nantou', timestamp: 5 },
  { id: 'sunk_6', subject: 'eSIM (10天双人)', amount: 90.00, currency: 'MYR', paymentMethod: 'card', category: 'tickets', payerType: 'split_50', jonPaid: 45.0, junePaid: 45.0, zone: 'malaysia', timestamp: 6 }
];
