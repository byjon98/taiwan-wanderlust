export interface Expense {
  id: string;
  subject: string;
  amount: number;
  currency: 'TWD' | 'MYR';
  paymentMethod: 'cash' | 'card' | 'easycard' | 'sunk';
  category: string;
  payer: 'jon' | 'june' | 'shared';
  zone: string;
  timestamp: number;
}

export const PAYMENT_METHODS = [
  { id: 'cash', icon: '💵', label: '实体台币', desc: '扣除 NT$33k 现金池' },
  { id: 'card', icon: '💳', label: '信用卡/Apple Pay', desc: '扣除 MYR 1,852 备用金' },
  { id: 'easycard', icon: '🚇', label: '悠游卡', desc: '扣除卡内余额' },
  { id: 'sunk', icon: '✅', label: '预付/沉没成本', desc: '仅记录，不扣当前资金' },
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

export const PAYERS = [
  { id: 'jon', icon: '👦🏻', label: 'Jon 先垫付' },
  { id: 'june', icon: '👧🏻', label: 'June 先垫付' },
  { id: 'shared', icon: '👫', label: '共同基金直接支付' },
];

export const ZONES = [
  { id: 'taichung', icon: '📍', label: '台中战区' },
  { id: 'nantou', icon: '📍', label: '南投/日月潭战区' },
  { id: 'taipei', icon: '📍', label: '大台北战区' },
  { id: 'taoyuan', icon: '📍', label: '桃园战区' },
];

export const CONSTANTS = {
  SUNK_COST_MYR: 4000,
  CASH_POOL_TWD: 33000,
  CARD_RESERVE_MYR: 1852,
  LOCKED_HOTEL_TWD: 1652,
  TOTAL_DAYS: 10
};
