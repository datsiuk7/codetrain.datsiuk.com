import { sensors, getSensors, comparisons, defaultCondition } from './logic.mjs';
import { getLang, t } from './i18n.mjs';

export function createButton(text, action, locked = false) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.type = 'button';
  btn.disabled = locked;
  btn.onclick = () => {
    if (!locked) action();
  };
  return btn;
}

export function createSelect(options, value, onChange, label, locked = false) {
  const sel = document.createElement('select');
  sel.ariaLabel = label;
  sel.disabled = locked;
  for (const [id, name] of Object.entries(options)) {
    sel.add(new Option(name, id));
  }
  sel.value = value;
  sel.onchange = () => {
    onChange(sel.value);
  };
  return sel;
}

export function createNumberInput(value, onChange, label, locked = false) {
  const input = document.createElement('input');
  input.type = 'number';
  input.value = value;
  input.ariaLabel = label;
  input.disabled = locked;
  input.onchange = () => {
    onChange(input.value === '' ? NaN : Number(input.value));
  };
  return input;
}

export function createValueEditor({ expr, onChange, allowed = [], onRedraw, locked = false }) {
  const box = document.createElement('span');
  box.className = 'value-editor';

  const kinds = {
    number: 'Число',
    height: 'Висота клітинки',
    lit: 'Запалено ліхтарів',
    remaining: 'Залишилось ліхтарів',
    repairKits: 'Ремкомплекти',
    bulbs: 'Лампочки'
  };

  box.append(
    createSelect(kinds, expr.kind, (kind) => {
      onChange({
        kind,
        value: 1
      });
      onRedraw();
    }, 'Значення', locked)
  );

  if (expr.kind === 'number') {
    box.append(createNumberInput(expr.value, (v) => {
      expr.value = v;
      onChange?.(expr);
      onRedraw?.();
    }, 'Число', locked));
  }

  return box;
}

export function createConditionEditor({ condition, allowed = [], allowedSensors = null, onRedraw, onChange, locked = false }) {
  const wrap = document.createElement('div');
  wrap.className = 'condition-editor';

  const term = condition.terms?.[0] || condition;
  term.kind = 'sensor';

  const handleChange = () => {
    onRedraw?.();
    onChange?.(condition);
  };

  const lang = getLang();
  const notBtn = createButton(t('notBtn', lang), () => {
    term.not = !term.not;
    handleChange();
  }, locked);
  notBtn.className = 'not-btn' + (term.not ? ' selected' : '');
  notBtn.setAttribute('aria-pressed', String(!!term.not));
  wrap.append(notBtn);

  const activeSensorsDict = getSensors(lang);
  const availableSensors = Array.isArray(allowedSensors) && allowedSensors.length
    ? Object.fromEntries(Object.entries(activeSensorsDict).filter(([k]) => allowedSensors.includes(k)))
    : activeSensorsDict;

  const validKeys = Object.keys(availableSensors);
  if (!validKeys.includes(term.sensor) && validKeys.length) {
    term.sensor = validKeys[0];
  }

  wrap.append(
    createSelect(availableSensors, term.sensor || validKeys[0] || 'obstacleAhead', (v) => {
      term.sensor = v;
      handleChange();
    }, lang === 'en' ? 'Sensor' : 'Датчик', locked)
  );

  return wrap;
}
