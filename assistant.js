(() => {
  const STORE = 'nabta-v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(STORE)) || { profile: null, goals: [] }; } catch { return { profile: null, goals: [] }; } };
  const write = state => localStorage.setItem(STORE, JSON.stringify(state));
  const adultEstimate = p => {
    if (!p || ![p.age, p.height, p.weight, p.activity].every(Number.isFinite)) return null;
    if (p.age < 18) return { young: true };
    const resting = Math.round(10 * p.weight + 6.25 * p.height - 5 * p.age - 161);
    return { resting, daily: Math.round(resting * p.activity / 10) * 10 };
  };
  const pages = [
    { keys: ['رئيسية', 'داشبورد', 'لوحة'], href: 'index.html', name: 'الرئيسية' },
    { keys: ['بيانات', 'جسمي', 'وزني'], href: 'body.html', name: 'بياناتي' },
    { keys: ['خطة', 'وجبات', 'اكل', 'أكل'], href: 'plan.html', name: 'الخطة الأسبوعية' },
    { keys: ['اهداف', 'أهداف', 'هدف'], href: 'goals.html', name: 'الأهداف' }
  ];
  const normalize = value => value.toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const medical = ['تشخيص', 'علاج', 'دواء', 'حامل', 'حمل', 'مرضع', 'سكري', 'سكر', 'ضغط', 'مرض', 'اضطراب', 'شراهة', 'قيء', 'تكميم', 'طفل', 'مراهق', 'انيميا', 'أنيميا', 'غدة', 'تكيس', 'حساسيه شديده', 'حساسية شديدة'];
  const mealIdeas = [
    'فطور: شوفان مع لبن أو زبادي وفاكهة، ويمكن تبديله ببيض وخبز وخضار.',
    'غداء: طبق يجمع خضارًا ومصدر بروتين تحبينه ونشويات متاحة، مثل أرز وعدس وسلطة.',
    'سناك بسيط: ثمرة فاكهة، أو زبادي، أو خضار مع حمص؛ اختاري ما يشبعك ويناسب يومك.',
    'لو صنف مش مناسب لك، بدّليه ببديل تفضلينه. ما فيش صنف إلزامي في أمثلة نَبتة.'
  ];
  let pendingDelete = null;
  const answer = message => {
    const text = normalize(message), state = read(), profile = state.profile, goals = state.goals || [];
    if (pendingDelete && (text === 'نعم' || text === 'أكد' || text === 'موافق')) {
      const id = pendingDelete; pendingDelete = null; state.goals = goals.filter(goal => goal.id !== id); write(state); return 'تم حذف الهدف. تقدري تضيفيه مرة ثانية من صفحة الأهداف لو احتجتِ.';
    }
    if (pendingDelete) { pendingDelete = null; return 'ألغيت الحذف. الهدف ما زال محفوظًا.'; }
    if (medical.some(k => text.includes(normalize(k)))) return 'أقدر أساعدك في استخدام نَبتة وعادات عامة، لكن ما أقدرش أشخّص أو أوصي بعلاج أو حمية لحالة صحية. في الحمل أو المرض أو الحساسية الشديدة، خدي الإرشاد من طبيبة أو أخصائية تغذية مؤهلة.';

    if (/(افتح|روح|اذهب|وديني|عايز اشوف|عايزة اشوف)/.test(text)) {
      const page = pages.find(item => item.keys.some(key => text.includes(normalize(key))));
      if (page) { setTimeout(() => { location.href = page.href; }, 350); return `حاضر، هفتح لك صفحة ${page.name} الآن.`; }
    }
    if (/(ضيف|اضف|أضف|سجل|سجلي|اعمل|أنشئ|ضيفي).*(هدف|عادة)/.test(text)) {
      const title = message.replace(/.*?(?:ضيف(?:ي)?|اضف|أضف|سجل(?:ي)?|اعمل|أنشئ)(?:لي)?\s*(?:هدف|عادة)?\s*[:：-]?\s*/i, '').trim();
      if (title.length > 2) {
        const goal = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, title: title.slice(0, 90), type: 'هدف شخصي', dueDate: '', target: '', progress: 0 };
        state.goals = [goal, ...goals]; write(state); setTimeout(() => { location.href = 'goals.html'; }, 500); return `أضفت «${goal.title}» إلى أهدافك وحفظته على هذا الجهاز. بفتح صفحة الأهداف عشان تتابعيه.`;
      }
      return 'اكتبي طلبك مثل: «ضيف هدف أمشي 20 دقيقة 3 أيام بالأسبوع»، وسأضيفه لقائمة أهدافك.';
    }
    if (/(احذف|امسح|الغ|إلغاء).*(هدف)/.test(text)) {
      const match = goals.find(goal => text.includes(normalize(goal.title)) || normalize(goal.title).includes(text.replace(/.*?(?:احذف|امسح|الغ|إلغاء)\s*/, '').trim()));
      if (!match) return 'ما لقيتش الهدف المقصود. افتحي صفحة أهدافي واستخدمي زر الحذف على البطاقة.';
      pendingDelete = match.id; return `هل أنتِ متأكدة من حذف «${match.title}»؟ اكتبي «نعم» للتأكيد أو أي رد آخر للإلغاء.`;
    }
    if (/(تقدم|انجاز|إنجاز|وصلت|حدث|حدّث)/.test(text) && /%|٪|لـ|للهدف|هدف/.test(text)) {
      const pct = text.match(/(100|[0-9]{1,2})\s*[%٪]/);
      const matched = goals.find(goal => text.includes(normalize(goal.title)));
      if (pct && matched) { matched.progress = Math.min(100, Number(pct[1])); write(state); return `حدّثت تقدم «${matched.title}» إلى ${matched.progress}%. ${matched.progress === 100 ? 'مبروك على إكمال الهدف! 🎉' : 'كل خطوة للأمام تُحسب 🌱'}`; }
      return 'لتحديث التقدم اكتبي مثلًا: «حدّث هدف أضيف خضار للغداء إلى 50%». لازم يكون الهدف محفوظًا أولًا.';
    }
    if (/(سعر|سعرة|كالوري|حرار|حساب)/.test(text)) {
      const estimate = adultEstimate(profile);
      if (!estimate) return profile?.age < 18 ? 'لأن المعادلة المستخدمة للبالغات لا تناسب من هن دون 18، لن أعرض رقمًا. اسألي ولي أمرك أو مختصة صحية عن التوجيه المناسب.' : 'أدخلي العمر والطول والوزن ومستوى النشاط في صفحة «بياناتي» أولًا؛ بعدها أحسب تقديرًا تقريبيًا لمعدل الراحة والاحتياج اليومي للمحافظة على الوزن.';
      return `بالمعادلة التقديرية للبالغات (Mifflin–St Jeor): طاقة الراحة المحسوبة قرابة ${estimate.resting} سعرة/يوم، والتقدير اليومي مع معامل النشاط المختار قرابة ${estimate.daily} سعرة/يوم للمحافظة على الوزن. هذه معادلة تنبؤية وليست قياسًا مباشرًا؛ الاحتياج الفعلي يختلف. لن أخصم أو أضيف سعرات تلقائيًا لهدف خسارة أو زيادة الوزن.`;
    }
    if (/(اقترح|اقتراح|نصيحه|نصيحة|اعمل ايه|أعمل إيه|ابدأ|زهق|مش عارف|مش عارفة)/.test(text)) {
      const unfinished = goals.filter(g => g.progress < 100);
      if (!profile) return 'اقتراحي الأول: احفظي بياناتك الأساسية لو كنتِ بالغة، أو ابدئي بهدف عادة صغيرة. اختاري شيئًا سهلًا مثل إضافة خضار لوجبة تحبينها، من غير ضغط أو كمال.';
      if (unfinished.length) return `اقتراحي لكِ: اختاري هدفًا واحدًا من أهدافك النشطة (${unfinished.slice(0, 2).map(g => `«${g.title}»`).join('، ')}) وخططي لخطوة صغيرة اليوم. لا يلزم إنجاز كل شيء دفعة واحدة.`;
      return 'اقتراح اليوم: اختاري وجبة تحبينها وأضيفي لها صنفًا متنوعًا، ثم خذي وقتًا لحركة مريحة تناسب يومك. لو تحبي، أقدر أقترح فكرة وجبة أو أساعدك تضيفي هدفًا.';
    }
    if (/(فطار|فطور|غدا|غداء|عشا|عشاء|سناك|وجبه|وجبة|اكل|أكل|طبخه|طبخة)/.test(text)) return mealIdeas[(new Date().getDay() + message.length) % mealIdeas.length];
    if (/(خطة|اسبوع|الأسبوع|وجبات)/.test(text)) return 'صفحة «الخطة الأسبوعية» فيها أمثلة للفطور والسناكات والغداء والعشاء لكل يوم. اضغطي «بدّلي الأفكار» لتجربة مجموعة ثانية، أو قولي لي «افتح الخطة». هذه أفكار مرنة وليست حمية علاجية.';
    if (/(هدف|اهداف|أهداف)/.test(text)) return goals.length ? `لديكِ ${goals.filter(g => g.progress < 100).length} أهداف نشطة من أصل ${goals.length}. يمكنك قول «حدّث هدف [اسم الهدف] إلى 50%» أو «افتح الأهداف».` : 'لسه ما أضفتي أهدافًا. قولي مثلًا «ضيف هدف أتناول فاكهة مع الفطور 3 أيام» وسأحفظه على هذا الجهاز.';
    if (/(بيانات|خصوص|تخزين|محلي|محفوظ|مزامن|بياناتي)/.test(text)) return 'بيانات نَبتة تُقرأ وتُحفظ في تخزين هذا المتصفح على جهازك (localStorage). المساعد لا يرسل رسائلك أو بياناتك إلى خدمة ذكاء اصطناعي، ولا تُحفظ المحادثة. التخزين المحلي ليس مشفرًا؛ من يستخدم ملف المتصفح نفسه قد يراه، ومسح بيانات المتصفح قد يحذفه.';
    if (/(نشاط|حركة|تمرين|رياضه|رياضة|مشي)/.test(text)) return 'اختاري حركة مريحة وتناسب قدرتك وجدولك، حتى لو كانت قصيرة، وزيديها تدريجيًا إذا كان ذلك مناسبًا لك. أوقفي النشاط واطلبي نصيحة مختصة عند وجود ألم أو حالة صحية تؤثر على الحركة.';
    if (/(ماء|ميه|مياه|اشرب)/.test(text)) return 'احتياج السوائل يختلف حسب الجو والحركة والحالة الصحية، لذلك ما أحدد لك كمية شخصية. خلي الشرب موزعًا خلال اليوم واتّبعي تعليمات مختصتك إن وجدت.';
    if (/(شكرا|شكرًا|تسلم|تمام)/.test(text)) return 'العفو 🌱 أقدر أفتح لك أي صفحة، أضيف هدفًا، أحدّث تقدمه، وأقترح فكرة عامة. قولي لي إيه تحبي تعملي.';
    return 'أقدر أساعدك داخل نَبتة: قولي «افتح الخطة»، «ضيف هدف أمشي 3 أيام»، «حدّث هدف [اسمه] إلى 50%»، أو اسأليني عن تقدير السعرات وأفكار الوجبات. إجاباتي محلية وإرشادية عامة.';
  };
  const mount = () => {
    const launcher = document.createElement('button'); launcher.className = 'assistant-launcher'; launcher.type = 'button'; launcher.setAttribute('aria-label', 'افتحي مساعد نَبتة'); launcher.innerHTML = '<span>✿</span><span>مساعد نَبتة</span>';
    const panel = document.createElement('section'); panel.className = 'assistant-panel'; panel.hidden = true; panel.setAttribute('aria-label', 'محادثة مساعد نَبتة');
    panel.innerHTML = '<div class="assistant-head"><div class="assistant-mark">ن</div><div><strong>مساعد نَبتة</strong><small><i></i> يعمل محليًا على جهازك</small></div><button type="button" class="assistant-close" aria-label="إغلاق المساعد">×</button></div><div class="assistant-messages" aria-live="polite"><div class="assistant-bubble bot">أهلًا 🌿 أقدر أساعدك في صفحات نَبتة، أهدافك، أفكار الوجبات والتقديرات العامة. بياناتك ورسائلك تبقى في هذا المتصفح.</div><div class="assistant-suggestions"><button type="button">اقترحي عليّ</button><button type="button">احسبي السعرات</button><button type="button">ضيف هدف</button><button type="button">افتح الخطة</button></div></div><form class="assistant-form"><label class="sr-only" for="assistant-input">اكتبي طلبك</label><input id="assistant-input" maxlength="300" placeholder="اسألي أو اطلبي إجراءً…" autocomplete="off" required><button type="submit" aria-label="إرسال">↑</button></form><div class="assistant-disclaimer">توجيه عام؛ ليس تشخيصًا أو علاجًا طبيًا.</div>';
    document.body.append(launcher, panel);
    const messages = panel.querySelector('.assistant-messages'), input = panel.querySelector('input');
    const send = text => { const clean = text.trim(); if (!clean) return; const user = document.createElement('div'); user.className = 'assistant-bubble user'; user.textContent = clean; messages.append(user); const bot = document.createElement('div'); bot.className = 'assistant-bubble bot'; bot.textContent = answer(clean); messages.append(bot); panel.querySelector('.assistant-suggestions')?.remove(); messages.scrollTop = messages.scrollHeight; };
    launcher.addEventListener('click', () => { panel.hidden = !panel.hidden; launcher.classList.toggle('is-open', !panel.hidden); if (!panel.hidden) input.focus(); });
    panel.querySelector('.assistant-close').addEventListener('click', () => { panel.hidden = true; launcher.classList.remove('is-open'); launcher.focus(); });
    panel.querySelector('.assistant-form').addEventListener('submit', event => { event.preventDefault(); send(input.value); input.value = ''; input.focus(); });
    panel.querySelector('.assistant-suggestions').addEventListener('click', event => { const button = event.target.closest('button'); if (button) send(button.textContent); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
