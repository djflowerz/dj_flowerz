import re

with open('context/DataContext.tsx', 'r') as f:
    lines = f.readlines()

def replace_function(lines, func_name, new_body):
    start = -1
    for i, line in enumerate(lines):
        if line.strip().startswith(f"const {func_name} ="):
            start = i
            break
            
    if start == -1: return lines
    
    # find end (count braces)
    brace_count = 0
    end = -1
    for i in range(start, len(lines)):
        brace_count += lines[i].count('{')
        brace_count -= lines[i].count('}')
        if brace_count == 0 and ';' in lines[i]:
            end = i
            break
            
    if end != -1:
        return lines[:start] + [new_body + "\n"] + lines[end+1:]
    return lines

c_fetchTgConfig = """  const fetchTgConfig = async () => {
    try {
      const tgConfigs = await fetchFromR2<any>('telegram_config');
      const data = tgConfigs.find((t: any) => t.id === 'main');
      if (data) {
        setTelegramConfig({
          botToken: data.bot_token || '',
          botUsername: data.bot_username || '',
          status: data.status || 'Disconnected'
        });
      }
    } catch(err) { console.error('Error fetching tg config:', err); }
  };"""

lines = replace_function(lines, "fetchTgConfig", c_fetchTgConfig)

c_fetchRefSettings = """  const fetchRefSettings = async () => {
    try {
      const sets = await fetchFromR2<any>('settings');
      const data = sets.find((s: any) => s.id === 'referralSettings');
      if (data && data.data) {
        setReferralSettings(data.data as ReferralSettings);
      }
    } catch(err) { console.error('Error fetching referral settings', err); }
  };"""
  
lines = replace_function(lines, "fetchRefSettings", c_fetchRefSettings)

c_fetchReferralLogs = """  const fetchReferralLogs = async () => {
    try {
      const data = await fetchFromR2<any>('referral_logs');
      if (data) {
        setReferralLogs(data.map((l: any) => ({
          id: l.id,
          referrerId: l.referrer_id,
          refereeId: l.referee_id,
          referrerName: l.referrer_name,
          refereeName: l.referee_name,
          planPurchased: l.plan_purchased,
          discountApplied: l.discount_applied,
          rewardIssued: l.reward_issued,
          createdAt: l.created_at,
          status: l.status
        })));
      }
    } catch(err) { console.error('Error fetching referral logs', err); }
  };"""

lines = replace_function(lines, "fetchReferralLogs", c_fetchReferralLogs)

c_updateReferralSettings = """  const updateReferralSettings = async (settings: Partial<ReferralSettings>) => {
    const newSettings = { ...referralSettings, ...settings };
    try {
        const allSettings = await fetchFromR2<any>('settings');
        const updated = allSettings.filter((s: any) => s.id !== 'referralSettings');
        updated.push({ id: 'referralSettings', data: newSettings, updated_at: new Date().toISOString() });
        await saveToR2('settings', updated);
        setReferralSettings(newSettings);
    } catch(err) { console.error('Error updating referral settings', err); }
  };"""

lines = replace_function(lines, "updateReferralSettings", c_updateReferralSettings)

with open('context/DataContext.tsx', 'w') as f:
    f.writelines(lines)
print("Updated fetchTgConfig, fetchRefSettings, fetchReferralLogs, updateReferralSettings.")
