export const parseTimeInput = (timeStr: string): number | null => {
  const trimmed = timeStr.trim();
  
  // 1. 相対時間のパース
  const relativeMatch = trimmed.match(/^(\d+)(m|h|d)$/);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    
    if (unit === 'm') return Date.now() + value * 60 * 1000;
    if (unit === 'h') return Date.now() + value * 60 * 60 * 1000;
    if (unit === 'd') return Date.now() + value * 24 * 60 * 60 * 1000;
  }
  
  // 2. 絶対時間のパース (JSTとして解釈)
  // "2026/3/31" や "2026/03/31 15:00" など
  // タイムゾーン指定がない場合は JST (+09:00) を補完する
  const tzSuffix = (trimmed.includes('+') || trimmed.toUpperCase().includes('Z')) ? '' : ' GMT+0900';
  const parsedDate = new Date(trimmed + tzSuffix);
  
  if (!isNaN(parsedDate.getTime())) {
    // 過去の時間が指定された場合は null を返すか、そのまま返すか
    // ここではそのまま返して、すぐに通知される仕様にする
    return parsedDate.getTime();
  }

  return null;
};
