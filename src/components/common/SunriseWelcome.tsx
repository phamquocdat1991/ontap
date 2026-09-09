import React from 'react';
import { ArrowRight, BookOpen, Sparkles } from 'lucide-react';

export function SunriseWelcome({ teacher = false, onStart }: { teacher?: boolean; onStart?: () => void }) {
  return <section className="sunrise-welcome" aria-label="Chào ngày mới">
    <div className="sunrise-copy">
      <span className="sunrise-eyebrow"><Sparkles size={16} /> Mỗi ngày một bước tiến</span>
      <h1>Ôn tập hiệu quả hơn<br /><em>Mỗi ngày</em></h1>
      <p>{teacher ? 'Soạn bài thông minh, tạo đề theo năng lực và đồng hành cùng học sinh.' : 'Học nhẹ nhàng, luyện tập vững vàng. Bắt đầu từ một bài học nhỏ hôm nay.'}</p>
      {onStart && <button className="sunrise-primary" onClick={onStart}><BookOpen size={18} />{teacher ? 'Tạo đề ôn tập' : 'Tiếp tục học tập'}<ArrowRight size={18} /></button>}
    </div>
  </section>;
}
