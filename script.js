(() => {
  const STORE = 'nabta-v1';
  const read = () => { try { return JSON.parse(localStorage.getItem(STORE)) || { profile: null, goals: [] }; } catch { return { profile: null, goals: [] }; } };
  const save = state => localStorage.setItem(STORE, JSON.stringify(state));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const dateFmt = value => { if (!value) return ''; const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const calorieEstimate = profile => {
    if (!profile) return null;
    const { age, height, weight, activity } = profile;
    if (![age, height, weight, activity].every(Number.isFinite) || age < 18 || height < 130 || weight < 35) return null;
    // Mifflin-St Jeor estimate with the female constant; the activity multiplier is a broad approximation.
    const resting = Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    return { resting, maintenance: Math.round(resting * activity / 10) * 10 };
  };
  function setToday() { const el = document.querySelector('#today-label'); if (el) el.textContent = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function dashboard() {
    const state = read(), cals = calorieEstimate(state.profile), goals = state.goals || [];
    const put = (sel, value) => { const el = document.querySelector(sel); if (el) el.textContent = value; };
    put('#dashboard-calories', cals ? `${cals.maintenance} سعرة / يوم` : '— سعرة / يوم');
    put('#dashboard-goals', `${goals.filter(g => g.progress < 100).length} أهداف`);
    put('#dashboard-progress', `${goals.length ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length) : 0}%`);
    setToday();
  }
  function profilePage() {
    const form = document.querySelector('#body-form'); if (!form) return;
    const state = read();
    if (state.profile) Object.entries(state.profile).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; });
    function render() {
      const value = calorieEstimate(read().profile), result = document.querySelector('#calorie-result');
      if (result) result.innerHTML = value ? `<span>✨</span><div><strong>تقدير الطاقة اليومي</strong><p class="calorie-value">الراحة: ${value.resting.toLocaleString('ar-EG')}　|　مع النشاط: ${value.maintenance.toLocaleString('ar-EG')} سعرة/يوم</p><p>الأرقام تقريبية، والرقم مع النشاط تقدير للمحافظة على الوزن.</p></div>` : (read().profile?.age < 18 ? '<span>🌱</span><div><strong>التقدير غير متاح</strong><p>هذه المعادلة مخصصة للبالغات؛ لذلك لا نعرض حساب سعرات لمن هن دون 18.</p></div>' : '<span>✨</span><div><strong>تقدير السعرات اليومية</strong><p>احفظي بياناتك لعرض تقدير تقريبي هنا.</p></div>');
    }
    render();
    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const profile = { age: Number(data.age), height: Number(data.height), weight: Number(data.weight), activity: Number(data.activity), goal: data.goal };
      if (![profile.age, profile.height, profile.weight, profile.activity].every(Number.isFinite) || profile.age < 14 || profile.height < 130 || profile.weight < 35) return;
      const next = read(); next.profile = profile; save(next); render(); dashboard();
      const msg = document.querySelector('#body-saved'); if (msg) { msg.textContent = 'تم حفظ بياناتكِ بنجاح ✓'; setTimeout(() => msg.textContent = '', 3000); }
    });
  }
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const mealIdeas = [
    [['شوفان بالحليب والموز', 'بيض مع خبز أسمر وخيار', 'زبادي مع فاكهة ومكسرات'], ['ثمرة فاكهة', 'خيار وجزر مع حمص', 'حفنة مكسرات أو تمر'], ['أرز وخضار مع دجاج مشوي', 'عدس مع سلطة وخبز', 'سمك مشوي وبطاطا وخضار'], ['زبادي أو فاكهة', 'قطعة جبن وخيار', 'فاكهة موسمية'], ['ساندويتش تونة وسلطة', 'عجة خضار وخبز', 'فول وسلطة وخبز']],
    [['زبادي وشوفان وفاكهة', 'فول وخضار وخبز', 'جبنة قريش وخبز وطماطم'], ['برتقالة أو تفاحة', 'ذرة أو فشار منزلي', 'زبادي'], ['مكرونة بصلصة الطماطم وسلطة', 'دجاج وخضار وأرز', 'فاصوليا وخبز وسلطة'], ['تمر مع حليب', 'فاكهة ومكسرات', 'خضار مقطعة'], ['بطاطا مشوية وبيض وسلطة', 'شوربة خضار وسندويتش', 'سلطة تونة وخبز']]
  ];
  function planPage() {
    const host = document.querySelector('#meal-plan'); if (!host) return;
    let selected = 'all', seed = 0;
    const tabs = document.querySelector('#week-tabs');
    const render = () => {
      if (tabs) tabs.innerHTML = `<button class="${selected === 'all' ? 'active' : ''}" data-day="all">الأسبوع</button>` + days.map((day, i) => `<button class="${selected === String(i) ? 'active' : ''}" data-day="${i}">${day}</button>`).join('');
      const indices = selected === 'all' ? days.map((_, i) => i) : [Number(selected)];
      const ideas = mealIdeas[seed % mealIdeas.length];
      const types = ['الفطور', 'وجبة خفيفة', 'الغداء', 'وجبة خفيفة', 'العشاء'];
      host.innerHTML = indices.map((dayIndex, order) => `<article class="day-card"><div class="day-title">${days[dayIndex]} <span>اقتراحات مرنة</span></div>${types.map((type, mealIndex) => `<div class="meal"><div class="meal-label">${type}</div><div class="meal-name">${ideas[mealIndex][(dayIndex + order + seed) % ideas[mealIndex].length]}</div><div class="meal-note">يمكنكِ التبديل حسب المتاح</div></div>`).join('')}</article>`).join('');
    };
    tabs?.addEventListener('click', event => { const button = event.target.closest('button[data-day]'); if (!button) return; selected = button.dataset.day; render(); });
    document.querySelector('#shuffle-plan')?.addEventListener('click', () => { seed++; render(); });
    render();
  }
  function goalsPage() {
    const form = document.querySelector('#goal-form'); if (!form) return;
    const list = document.querySelector('#goal-list'), empty = document.querySelector('#goal-empty'), filter = document.querySelector('#goal-filter');
    const render = () => {
      const goals = read().goals || [], view = filter?.value || 'all';
      const shown = goals.filter(g => view === 'all' || (view === 'done' ? g.progress >= 100 : g.progress < 100));
      list.innerHTML = shown.map(g => `<article class="goal-card"><div class="goal-card-top"><span class="goal-kind">${esc(g.type)}</span><div class="goal-actions"><button data-edit="${esc(g.id)}">تعديل</button><button class="delete" data-delete="${esc(g.id)}">حذف</button></div></div><h3>${esc(g.title)}</h3><div class="goal-meta">${g.target ? `المعيار: ${esc(g.target)}　` : ''}${g.dueDate ? `الموعد: ${esc(dateFmt(g.dueDate))}` : 'بلا موعد محدد'}</div><div class="progress-head"><span>نسبة الإنجاز</span><strong>${g.progress}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${g.progress}%"></div></div><div class="progress-input"><label class="sr-only" for="progress-${esc(g.id)}">تحديث التقدم</label><input id="progress-${esc(g.id)}" type="range" min="0" max="100" step="5" value="${g.progress}" data-progress="${esc(g.id)}"><button data-save-progress="${esc(g.id)}">حفظ التقدم</button></div><span class="goal-status ${g.progress >= 100 ? 'done' : ''}">${g.progress >= 100 ? 'مكتمل 🎉' : 'قيد التقدم'}</span></article>`).join('');
      empty?.classList.toggle('show', shown.length === 0);
      const active = goals.filter(g => g.progress < 100).length;
      ['#goal-count', '#goal-heading-count'].forEach(sel => { const el = document.querySelector(sel); if (el) el.textContent = active; });
      dashboard();
    };
    const reset = () => { form.reset(); form.elements.id.value = ''; document.querySelector('#goal-form-title').innerHTML = 'أضيفي هدفًا جديدًا <span>✍️</span>'; document.querySelector('#goal-submit').textContent = 'حفظ الهدف'; document.querySelector('#cancel-edit').classList.add('hidden'); };
    form.addEventListener('submit', event => {
      event.preventDefault(); const data = Object.fromEntries(new FormData(form).entries()), next = read();
      const existing = next.goals.find(g => g.id === data.id);
      const goal = { id: data.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`), title: data.title.trim(), type: data.type, dueDate: data.dueDate, target: data.target.trim(), progress: existing?.progress ?? 0 };
      if (!goal.title) return;
      if (existing) next.goals = next.goals.map(g => g.id === goal.id ? goal : g); else next.goals.unshift(goal);
      save(next); reset(); render();
    });
    document.querySelector('#cancel-edit')?.addEventListener('click', reset);
    filter?.addEventListener('change', render);
    list?.addEventListener('click', event => {
      const id = event.target.dataset.edit || event.target.dataset.delete || event.target.dataset.saveProgress;
      if (!id) return;
      const state = read();
      if (event.target.dataset.delete) { state.goals = state.goals.filter(g => g.id !== id); save(state); render(); return; }
      if (event.target.dataset.edit) {
        const g = state.goals.find(item => item.id === id); if (!g) return;
        Object.entries({ id: g.id, title: g.title, type: g.type, dueDate: g.dueDate, target: g.target }).forEach(([key, value]) => form.elements[key].value = value);
        document.querySelector('#goal-form-title').innerHTML = 'تعديل الهدف ✍️'; document.querySelector('#goal-submit').textContent = 'حفظ التعديلات'; document.querySelector('#cancel-edit').classList.remove('hidden'); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); return;
      }
      if (event.target.dataset.saveProgress) { const input = list.querySelector(`[data-progress="${CSS.escape(id)}"]`), value = Number(input?.value); state.goals = state.goals.map(g => g.id === id ? { ...g, progress: Math.max(0, Math.min(100, value)) } : g); save(state); render(); }
    });
    render();
  }
  document.querySelector('.menu-toggle')?.addEventListener('click', () => document.querySelector('.nav')?.classList.toggle('open'));
  dashboard(); profilePage(); planPage(); goalsPage();
})();
