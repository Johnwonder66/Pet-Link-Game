export function isGoalComplete(goal, state) {
  switch (goal.type) {
    case 'clearAll':
      return state.remaining === 0;
    case 'clearCaptain':
      return state.captainPairsCleared >= goal.count;
    case 'breakIce':
      return state.iceBrokenCount >= goal.count;
    case 'score':
      return state.score >= goal.value;
    default:
      return false;
  }
}

export function isStarConditionMet(condition, state) {
  if (state.state !== 'won') return false;
  switch (condition.type) {
    case 'complete':
      return true;
    case 'timeLeft':
      return state.timeLeft >= condition.value;
    case 'noHint':
      return state.hintsUsed === 0;
    case 'noPowerup':
      return state.powerupsUsed === 0;
    case 'maxShuffles':
      return state.shufflesUsed <= condition.value;
    case 'clearShiny':
      return state.shinyPairsCleared >= condition.value;
    case 'clearIce':
      return state.iceBrokenCount >= condition.value;
    case 'clearCaptain':
      return state.captainPairsCleared >= condition.value;
    case 'score':
      return state.score >= condition.value;
    default:
      return false;
  }
}

export function starConditionLabel(condition) {
  switch (condition.type) {
    case 'complete': return '通关';
    case 'timeLeft': return `剩余≥${condition.value}秒`;
    case 'noHint': return '不使用提示';
    case 'noPowerup': return '不使用主动道具';
    case 'maxShuffles': return `洗牌≤${condition.value}次`;
    case 'clearShiny': return `共鸣${condition.value}对闪光萌宠`;
    case 'clearIce': return `击碎${condition.value}层霜晶`;
    case 'clearCaptain': return `送回${condition.value}对队长萌宠`;
    case 'score': return `得分≥${condition.value}`;
    default: return '未知任务';
  }
}

export function goalLabel(goal) {
  switch (goal.type) {
    case 'clearAll': return '消除全部萌宠';
    case 'clearCaptain': return `送回${goal.count}对队长萌宠`;
    case 'breakIce': return `击碎${goal.count}层霜晶`;
    case 'score': return `达到${goal.value}分`;
    default: return '完成本关目标';
  }
}
