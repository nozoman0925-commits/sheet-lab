/* 桜美建設 業務管理の設定（Supabase のつなぎ先）。
   anonKey は公開してよい鍵です（記録は合言葉で入った人しか読めないよう、Supabase 側で守っています）。
   合言葉は1つだけ。入った人は全員同じことができます。 */
window.OUBI_CONFIG={
  url:'https://qnsfavxojxxbdeuwvyae.supabase.co',
  anonKey:'sb_publishable_nRuiMFCbdM3XD2_uf5qa6w_qJBi3TzN',
  // 合言葉を確かめるアカウント（Supabase の Authentication → Users で作るときと同じものにする）
  staffEmail:'oubi-staff@example.com',
  bossEmail:'oubi-staff@example.com'
};
