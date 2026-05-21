import re

filepath = 'src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Fix 1: Price rendering logic (Line 1087)
price_replace = "人均: {['cheap', 'mid', 'exp'].includes(loc.price) ? (loc.price === 'cheap' ? 'NT$ 200⬇' : loc.price === 'mid' ? 'NT$ 200~800' : 'NT$ 800⬆') : loc.price}"
content = re.sub(r'人均: \{loc\.price === \'cheap\' \? \'NT\$ 200⬇\' : loc\.price === \'mid\' \? \'NT\$ 200~800\' : \'NT\$ 800⬆\'\}', price_replace, content)


# Fix 2: Search override logic (Line 348 and 372)
# Change `if (activeRegionId === 'all' || searchQuery)` to `if (activeRegionId === 'all')` for allLocs
content = content.replace("if (activeRegionId === 'all' || searchQuery) {", "if (activeRegionId === 'all') {", 2)

# Ensure the second one (for sourceLocs) is also changed
# wait, the first replace changes both occurrences? Let's check.
# `content.replace("if (activeRegionId === 'all' || searchQuery) {", "if (activeRegionId === 'all') {")` replaces all occurrences.


# Fix 3 & 4: Prompt and Auto-jump logic
prompt_replace = """
  const handleAddStoreAI = () => {
    const storeTarget = newStoreName || searchQuery || "值得推荐的店面";
    const prompt = `作为专业的台湾旅游达人，请先通过网络搜索了解一下这家店(或相关推荐)："${storeTarget}"。
了解清楚它的特色、评价和营业时间后，请严格按照以下 JSON 格式输出结果，不要输出任何其他多余的文字或 markdown 标记（例如不要输出 \`\`\`json）：
{
  "n": "${newStoreName || '店名'}",
  "f": "店面特色、背景与必买简述",
  "do": "必做体验（一句话）",
  "eat": "必吃/必买推荐（逗号分隔）",
  "w": "避雷指南（如果有）",
  "r": "网络评价摘要",
  "tips": "实用提示（一句话）",
  "price": "消费预估",
  "minSpend": "低消限制",
  "zone": "所属区域（例如台北信义区、台西、或者是你认为最合适的区域名）",
  "cuisine": "菜系/类型",
  "hours": "营业时间（如 10:00 - 22:00）"
}`;
    navigator.clipboard.writeText(prompt).then(() => {
      alert('Prompt 已复制！\\n\\n请手动前往 Gemini (或其他 AI) 粘贴对话，获取 JSON 后回来进入第二步粘贴。');
      setAddStoreStep(2);
    }).catch(() => {
      alert('自动复制失败，请重试');
    });
  };
"""

content = re.sub(r'const handleAddStoreAI = \(\) => \{.*?alert\(\'自动复制失败，请重试\'\);\s*\}\);\s*\};', prompt_replace.strip(), content, flags=re.DOTALL)


with open(filepath, 'w') as f:
    f.write(content)

