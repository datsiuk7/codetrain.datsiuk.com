import {
  commands,
  getCommandInfo,
  blockCount,
  childLists,
  defaultCondition
} from './logic.mjs';
import { getLang, t } from './i18n.mjs';
import { iconMarkup } from './program-icons.js';
import {
  createButton,
  createSelect,
  createNumberInput,
  createValueEditor,
  createConditionEditor
} from './program-blocks.js';
import { ProgramDnd } from './program-dnd.js';

let serial = 0;

export class ProgramEditor {
  constructor(palette, host, count, level, trash, theme = 'dark', initialProgram = null) {
    Object.assign(this, {
      palette,
      host,
      count,
      level,
      trash,
      theme,
      blocks: [],
      locked: false,
      selected: null,
      active: null
    });

    this.functions = [];
    this.dnd = new ProgramDnd(this);

    this.library = document.createElement('div');
    this.library.className = 'code-library';
    this.palette.after(this.library);

    this.host.ondragleave = (e) => {
      const r = this.host.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
        this.dnd.clearPreview();
      }
    };

    this.host.onclick = (e) => {
      if (e.target === this.host) {
        this.selected = 'root';
        this.draw();
      }
    };

    if (initialProgram) {
      this.blocks = Array.isArray(initialProgram.blocks)
        ? this.sanitizeBlocks(structuredClone(initialProgram.blocks))
        : [];
      this.functions = Array.isArray(initialProgram.functions)
        ? structuredClone(initialProgram.functions)
        : [];
      this.updateSerial();
    }

    this.draw();
  }

  setTheme(theme) {
    this.theme = theme;
    this.draw();
  }

  sanitizeBlocks(list) {
    if (!Array.isArray(list)) return [];
    return list.filter((b) => {
      if (!b || !b.type) return false;
      if (!this.level.allowed.includes(b.type)) return false;
      if (Array.isArray(b.body)) b.body = this.sanitizeBlocks(b.body);
      if (Array.isArray(b.elseBody)) b.elseBody = this.sanitizeBlocks(b.elseBody);
      return true;
    });
  }

  updateSerial() {
    const scan = (item) => {
      if (!item) return;
      if (item.id) {
        const n = parseInt(String(item.id).replace(/\D+/g, ''), 10);
        if (!isNaN(n) && n > serial) serial = n;
      }
      if (Array.isArray(item.body)) item.body.forEach(scan);
      if (Array.isArray(item.elseBody)) item.elseBody.forEach(scan);
    };

    this.blocks.forEach(scan);
    this.functions.forEach((f) => {
      scan(f);
      if (Array.isArray(f.body)) f.body.forEach(scan);
    });
  }

  getProgram() {
    return {
      blocks: structuredClone(this.blocks),
      functions: structuredClone(this.functions)
    };
  }

  setProgram(data) {
    if (!data) return;
    this.blocks = Array.isArray(data.blocks)
      ? this.sanitizeBlocks(structuredClone(data.blocks))
      : [];
    this.functions = Array.isArray(data.functions)
      ? structuredClone(data.functions)
      : [];
    this.selected = null;
    this.updateSerial();
    this.draw();
  }

  clear() {
    this.blocks = [];
    this.selected = null;
    this.draw();
    this.notifyChange();
  }

  notifyChange() {
    this.onChange?.(this.getProgram());
  }

  make(type) {
    const b = { id: `b${++serial}`, type };
    if (type === 'loop') Object.assign(b, { times: 2, body: [] });
    if (type === 'while') Object.assign(b, { condition: defaultCondition(this.level?.allowedSensors), body: [] });
    if (type === 'if') Object.assign(b, { condition: defaultCondition(this.level?.allowedSensors), body: [] });
    if (type === 'call') {
      if (!this.functions.length) this.addFunction();
      b.functionId = this.functions[0].id;
    }
    return b;
  }

  addFunction() {
    this.functions.push({
      id: `f${++serial}`,
      name: t('functionDefaultName') + (this.functions.length + 1),
      body: []
    });
    this.notifyChange();
  }

  allLists() {
    const result = [];
    const visit = (list) => {
      result.push(list);
      for (const b of list) childLists(b).forEach(visit);
    };
    visit(this.blocks);
    this.functions.forEach((f) => visit(f.body));
    return result;
  }

  find(id) {
    for (const list of this.allLists()) {
      const block = list.find((b) => b.id === id);
      if (block) return { block, list };
    }
    return null;
  }

  getLastLoopTarget(list) {
    if (!Array.isArray(list) || !list.length) return null;
    const last = list[list.length - 1];
    if (last && (last.type === 'loop' || last.type === 'while') && Array.isArray(last.body)) {
      return this.getLastLoopTarget(last.body) || last.body;
    }
    if (last && last.type === 'if') {
      if (Array.isArray(last.elseBody)) {
        return this.getLastLoopTarget(last.elseBody) || last.elseBody;
      }
      if (Array.isArray(last.branches) && last.branches.length) {
        const lastBranchBody = last.branches[last.branches.length - 1]?.body;
        if (Array.isArray(lastBranchBody)) {
          return this.getLastLoopTarget(lastBranchBody) || lastBranchBody;
        }
      }
      if (Array.isArray(last.body)) {
        return this.getLastLoopTarget(last.body) || last.body;
      }
    }
    return null;
  }

  resolveSelectedList() {
    if (!this.selected || this.selected === 'root') return null;
    if (typeof this.selected === 'string') {
      if (this.selected.endsWith(':else')) {
        const id = this.selected.slice(0, -5);
        const entry = this.find(id);
        if (entry && Array.isArray(entry.block.elseBody)) {
          return this.getLastLoopTarget(entry.block.elseBody) || entry.block.elseBody;
        }
      }
      const branchMatch = this.selected.match(/^(.+):branch:(\d+)$/);
      if (branchMatch) {
        const entry = this.find(branchMatch[1]);
        const idx = Number(branchMatch[2]);
        const branch = entry?.block?.branches?.[idx];
        if (branch && Array.isArray(branch.body)) {
          return this.getLastLoopTarget(branch.body) || branch.body;
        }
      }
    }
    const entry = this.find(this.selected);
    if (entry) {
      if (Array.isArray(entry.block.body)) {
        return this.getLastLoopTarget(entry.block.body) || entry.block.body;
      }
      if (Array.isArray(entry.block.branches?.[0]?.body)) {
        const b0 = entry.block.branches[0].body;
        return this.getLastLoopTarget(b0) || b0;
      }
    }
    const fn = this.functions.find((f) => f.id === this.selected);
    if (fn && Array.isArray(fn.body)) {
      return this.getLastLoopTarget(fn.body) || fn.body;
    }
    return null;
  }

  targetList() {
    if (this.selected === 'root') {
      return this.blocks;
    }
    const resolved = this.resolveSelectedList();
    if (resolved) return resolved;
    return this.getLastLoopTarget(this.blocks) || this.blocks;
  }

  insert(type, list = this.targetList(), index = list.length) {
    if (this.locked) return;
    const newBlock = this.make(type);
    list.splice(Math.min(index, list.length), 0, newBlock);
    if (this.selected === 'root') this.selected = null;
    this.justAddedId = newBlock.id;
    this.draw();
    this.scrollToBlock(newBlock.id, list === this.blocks && index >= this.blocks.length - 1);
    this.notifyChange();
    setTimeout(() => {
      if (this.justAddedId === newBlock.id) this.justAddedId = null;
    }, 300);
  }

  scrollToBlock(blockId, isAppendedAtRootEnd = false) {
    if (!blockId || !this.host) return;
    const blocks =
      this.palette?.parentElement?.querySelectorAll?.('.block') ||
      this.host.querySelectorAll?.('.block') ||
      [];
    let targetEl = null;
    for (const el of blocks) {
      if (el.dataset?.block === blockId) {
        targetEl = el;
        break;
      }
    }
    if (!targetEl && typeof this.host.querySelector === 'function') {
      targetEl = this.host.querySelector(`[data-block="${blockId}"]`);
    }
    if (targetEl && typeof targetEl.scrollIntoView === 'function') {
      try {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      } catch {
        targetEl.scrollIntoView(false);
      }
    } else if (isAppendedAtRootEnd && typeof this.host.scrollHeight === 'number') {
      this.host.scrollTop = this.host.scrollHeight;
    }
  }

  renderPalette() {
    this.palette.replaceChildren();
    for (const type of this.level.allowed) {
      const [icon, name] = getCommandInfo(type, this.theme);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `command command-${type}`;
      btn.innerHTML = `<span class="icon">${iconMarkup(type, this.theme)}</span><span class="command-label">${name}</span><span class="command-grip" aria-hidden="true">⠿</span>`;
      btn.setAttribute('aria-label', name);
      btn.title = name;
      btn.disabled = this.locked || Boolean(this.level.limit && this.used() >= this.level.limit);
      btn.onclick = () => this.insert(type, this.targetList());
      this.dnd.attachPalette(btn, type);
      this.palette.append(btn);
    }
  }

  zone(el, list) {
    this.dnd.attachZone(el, list);
  }

  used() {
    return blockCount(this.blocks) + this.functions.reduce((n, f) => n + blockCount(f.body), 0);
  }

  draw() {
    const prevScrollTop = this.host.scrollTop || 0;
    const prevLibScrollTop = this.library.scrollTop || 0;
    this.renderPalette();
    this.host.replaceChildren();
    const count = this.used();
    const lang = getLang();
    if (this.level.limit) {
      const remaining = Math.max(0, this.level.limit - count);
      this.count.textContent = `${t('blocksRemaining', lang)} ${remaining}/${this.level.limit}`;
    } else {
      this.count.textContent = `${t('blocksCount', lang)}: ${count}`;
    }
    this.count.parentElement?.classList.toggle('over-limit', Boolean(this.level.limit && count > this.level.limit));

    this.renderList(this.blocks, this.host);
    this.renderDropRow(lang);
    this.zone(this.host, this.blocks);
    this.renderLibrary();
    if (prevScrollTop > 0 && this.host.scrollTop !== prevScrollTop) {
      if (this.host.style) this.host.style.scrollBehavior = 'auto';
      this.host.scrollTop = prevScrollTop;
      if (this.host.style) this.host.style.scrollBehavior = '';
    }
    if (prevLibScrollTop > 0 && this.library.scrollTop !== prevLibScrollTop) {
      if (this.library.style) this.library.style.scrollBehavior = 'auto';
      this.library.scrollTop = prevLibScrollTop;
      if (this.library.style) this.library.style.scrollBehavior = '';
    }
    this.highlight(this.active);
  }

  renderDropRow(lang = getLang()) {
    const dropRow = document.createElement('div');
    dropRow.className = 'program-drop-row';

    const dropSlot = document.createElement('div');
    dropSlot.className = 'program-drop-slot' + (this.selected === 'root' ? ' selected' : '');
    dropSlot.textContent = `＋ ${t('dropHere', lang)}`;
    dropSlot.onclick = (e) => {
      e.stopPropagation();
      this.selected = this.selected === 'root' ? null : 'root';
      this.draw();
    };
    dropRow.append(dropSlot);

    if (this.trash) {
      this.trash.disabled = this.locked;
      this.trash.classList?.toggle?.('is-empty', !this.blocks.length);
      dropRow.append(this.trash);
    }

    this.host.append(dropRow);
  }

  renderList(list, host) {
    for (const [index, b] of list.entries()) {
      const cmdInfo = getCommandInfo(b.type, this.theme);
      const name = cmdInfo[1];
      const isPopIn = this.justAddedId === b.id;
      const row = document.createElement('div');
      row.className = `block command-${b.type}` + (b.type === 'loop' ? ' loop' : '') + (this.active === b.id ? ' active' : '') + (isPopIn ? ' block-pop-in' : '');
      row.dataset.block = b.id;
      row.tabIndex = this.locked ? -1 : 0;
      row.setAttribute('aria-label', name);

      if (['if', 'while', 'call'].includes(b.type)) {
        row.classList.add('advanced-block');
      }

      const head = document.createElement('div');
      head.className = 'block-head';

      const iconSpan = document.createElement('span');
      iconSpan.className = `icon${b.type === 'loop' ? ' loop-icon' : ''}`;
      iconSpan.innerHTML = iconMarkup(b.type, this.theme);

      if (b.type === 'if') {
        const branches = b.branches || [{ condition: b.condition, body: b.body || [] }];
        b.branches = branches;
        delete b.condition;
        delete b.body;

        head.append(iconSpan);
        head.append(this.conditionEditor(branches[0].condition));
      } else if (b.type === 'while') {
        head.append(iconSpan);
        head.append(this.conditionEditor(b.condition));
      } else {
        const label = document.createElement('span');
        label.className = 'command-label';
        label.textContent = name;
        head.append(iconSpan, label);
      }

      if (b.type === 'loop') {
        const times = document.createElement('span');
        times.className = 'loop-times';
        const minus = document.createElement('button');
        minus.type = 'button';
        minus.textContent = '−';
        minus.ariaLabel = 'Зменшити кількість повторень';
        const value = document.createElement('span');
        value.textContent = `${b.times}×`;
        value.ariaLabel = `Кількість повторень ${b.times}`;
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.textContent = '+';
        plus.ariaLabel = 'Збільшити кількість повторень';
        minus.disabled = this.locked;
        plus.disabled = this.locked;
        minus.onclick = (e) => {
          e.stopPropagation();
          b.times = Math.max(1, (b.times || 2) - 1);
          value.textContent = `${b.times}×`;
          value.ariaLabel = `Кількість повторень ${b.times}`;
          this.notifyChange();
        };
        plus.onclick = (e) => {
          e.stopPropagation();
          b.times = Math.min(10, (b.times || 2) + 1);
          value.textContent = `${b.times}×`;
          value.ariaLabel = `Кількість повторень ${b.times}`;
          this.notifyChange();
        };
        times.append(minus, value, plus);
        head.append(times);
      }

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'block-remove';
      remove.setAttribute('aria-label', `Видалити команду ${name}`);
      remove.title = 'Видалити команду';
      remove.textContent = '×';
      remove.disabled = this.locked;

      head.append(remove);
      row.append(head);

      this.dnd.attachBlock(row, head, b, list);

      row.onkeydown = (e) => {
        if (this.locked) return;
        if (e.key === 'ArrowUp' && index > 0) {
          e.preventDefault();
          list.splice(index - 1, 0, list.splice(index, 1)[0]);
          this.draw();
          this.notifyChange();
          this.focus(b.id);
        }
        if (e.key === 'ArrowDown' && index < list.length - 1) {
          e.preventDefault();
          list.splice(index + 1, 0, list.splice(index, 1)[0]);
          this.draw();
          this.notifyChange();
          this.focus(b.id);
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          list.splice(index, 1);
          this.draw();
          this.notifyChange();
        }
      };

      remove.onclick = (e) => {
        e.stopPropagation();
        if (this.locked) return;
        list.splice(list.indexOf(b), 1);
        if (this.selected === b.id) this.selected = null;
        this.draw();
        this.notifyChange();
      };

      this.renderRow(b, row, list);
      host.append(row);
    }
  }

  focus(id) {
    this.host.querySelector(`[data-block="${id}"]`)?.focus();
  }

  button(text, action) {
    return createButton(text, () => {
      action();
      this.notifyChange();
    }, this.locked);
  }

  select(options, value, onChange, label) {
    return createSelect(options, value, (v) => {
      onChange(v);
      this.notifyChange();
    }, label, this.locked);
  }

  number(value, onChange, label) {
    return createNumberInput(value, (v) => {
      onChange(v);
      this.notifyChange();
    }, label, this.locked);
  }

  valueEditor(expr, onChange) {
    return createValueEditor({
      expr,
      onChange: (v) => {
        onChange?.(v);
        this.notifyChange();
      },
      allowed: this.level.allowed,
      onRedraw: () => {
        this.draw();
        this.notifyChange();
      },
      locked: this.locked
    });
  }

  conditionEditor(condition) {
    return createConditionEditor({
      condition,
      allowed: this.level.allowed,
      allowedSensors: this.level.allowedSensors,
      onRedraw: () => {
        this.draw();
        this.notifyChange();
      },
      onChange: () => this.notifyChange(),
      locked: this.locked
    });
  }

  bodyZone(parent, list, className = 'code-body', blockId = null) {
    const body = document.createElement('div');
    body.className = className;
    if (blockId && this.selected === blockId) {
      body.classList.add('selected');
    }
    this.zone(body, list);
    if (!list.length) body.classList.add('empty');
    this.renderList(list, body);
    if (blockId) {
      body.onclick = (e) => {
        if (e.target === body) {
          e.stopPropagation();
          this.selected = this.selected === blockId ? null : blockId;
          this.draw();
        }
      };
    }
    parent.append(body);
  }

  renderRow(b, row, list) {
    if (b.type === 'loop') {
      this.bodyZone(row, b.body, 'loop-body', b.id);
    }

    if (b.type === 'while') {
      this.bodyZone(row, b.body, 'code-body', b.id);
    }

    if (b.type === 'if') {
      const branches = b.branches || [{ condition: b.condition, body: b.body || [] }];
      b.branches = branches;
      delete b.condition;
      delete b.body;

      this.bodyZone(row, branches[0].body, 'code-body', `${b.id}:branch:0`);

      for (let i = 1; i < branches.length; i++) {
        const branch = branches[i];
        const branchKey = `${b.id}:branch:${i}`;
        const branchBox = document.createElement('div');
        branchBox.className = 'if-branch elif-branch elif-section';

        const bHead = document.createElement('div');
        bHead.className = 'elif-title branch-head';
        const elifLabelSpan = document.createElement('span');
        elifLabelSpan.className = 'branch-badge';
        elifLabelSpan.textContent = t('elifLabel');
        bHead.append(elifLabelSpan);
        bHead.append(this.conditionEditor(branch.condition));

        const removeBranchBtn = document.createElement('button');
        removeBranchBtn.type = 'button';
        removeBranchBtn.className = 'remove-else-btn';
        removeBranchBtn.textContent = '×';
        removeBranchBtn.title = t('removeBranch');
        removeBranchBtn.setAttribute('aria-label', t('removeBranch'));
        removeBranchBtn.disabled = this.locked;
        removeBranchBtn.onclick = () => {
          branches.splice(i, 1);
          if (this.selected === branchKey) this.selected = null;
          this.draw();
          this.notifyChange();
        };
        bHead.append(removeBranchBtn);

        branchBox.append(bHead);
        this.bodyZone(branchBox, branch.body, 'code-body', branchKey);
        row.append(branchBox);
      }

      if (b.elseBody) {
        const elseKey = `${b.id}:else`;
        const elseBox = document.createElement('div');
        elseBox.className = 'if-branch else-branch else-section';
        const head = document.createElement('div');
        head.className = 'else-title branch-head';
        const elseLabelSpan = document.createElement('span');
        elseLabelSpan.className = 'branch-badge';
        elseLabelSpan.textContent = t('elseLabel');
        const removeElseBtn = document.createElement('button');
        removeElseBtn.type = 'button';
        removeElseBtn.className = 'remove-else-btn';
        removeElseBtn.textContent = '×';
        removeElseBtn.title = t('removeElse');
        removeElseBtn.setAttribute('aria-label', t('removeElse'));
        removeElseBtn.disabled = this.locked;
        removeElseBtn.onclick = () => {
          delete b.elseBody;
          if (this.selected === elseKey) this.selected = null;
          this.draw();
          this.notifyChange();
        };
        head.append(elseLabelSpan, removeElseBtn);
        elseBox.append(head);
        this.bodyZone(elseBox, b.elseBody, 'code-body', elseKey);
        row.append(elseBox);
      }

      const canElif = this.level.allowElif !== false;
      const canElse = this.level.allowElse !== false;

      const actions = document.createElement('div');
      actions.className = 'branch-actions';

      if (canElif) {
        const addElifBtn = document.createElement('button');
        addElifBtn.type = 'button';
        addElifBtn.className = 'add-elif-btn';
        addElifBtn.textContent = `＋ ${t('elifLabel').toLowerCase()}`;
        addElifBtn.disabled = this.locked;
        addElifBtn.onclick = () => {
          branches.push({ condition: defaultCondition(this.level.allowedSensors), body: [] });
          this.selected = `${b.id}:branch:${branches.length - 1}`;
          this.draw();
          this.scrollToBlock(b.id);
          this.notifyChange();
        };
        actions.append(addElifBtn);
      }

      if (canElse && !b.elseBody) {
        const addElseBtn = document.createElement('button');
        addElseBtn.type = 'button';
        addElseBtn.className = 'add-else-btn';
        addElseBtn.textContent = `＋ ${t('elseLabel').toLowerCase()}`;
        addElseBtn.disabled = this.locked;
        addElseBtn.onclick = () => {
          b.elseBody = [];
          this.selected = `${b.id}:else`;
          this.draw();
          this.scrollToBlock(b.id);
          this.notifyChange();
        };
        actions.append(addElseBtn);
      }
      if (actions.children.length > 0) {
        row.append(actions);
      }
    }

    if (b.type === 'call') {
      const options = Object.fromEntries([
        ['', t('chooseFunction')],
        ...this.functions.map((f) => [f.id, f.name])
      ]);
      row.append(this.select(options, b.functionId, (v) => { b.functionId = v; }, t('callFunctionLabel')));
    }
  }

  renderLibrary() {
    this.library.replaceChildren();
    if (!this.level.allowed.includes('call')) return;

    const addSection = (title, onAdd) => {
      const section = document.createElement('div');
      section.className = 'library-section';
      const header = document.createElement('div');
      header.className = 'section-header';
      const h3 = document.createElement('h3');
      h3.textContent = title;
      header.append(h3, this.button(t('createBtn'), onAdd));
      section.append(header);
      this.library.append(section);
      return section;
    };

    if (this.level.allowed.includes('call')) {
      const section = addSection(t('functionsHeading'), () => {
        this.addFunction();
        this.draw();
      });
      for (const fn of this.functions) {
        const card = document.createElement('div');
        card.className = 'function-card';
        const input = document.createElement('input');
        input.value = fn.name;
        input.maxLength = 40;
        input.ariaLabel = 'Назва функції';
        input.disabled = this.locked;
        input.onchange = () => {
          fn.name = input.value.trim() || 'Назва функції';
          this.draw();
          this.notifyChange();
        };
        card.append(input, this.button('Видалити функцію', () => {
          this.functions.splice(this.functions.indexOf(fn), 1);
          this.draw();
          this.notifyChange();
        }));
        this.bodyZone(card, fn.body);
        section.append(card);
      }
    }
  }

  lock(value) {
    this.dnd.endDrag();
    this.locked = value;
    this.draw();
  }

  highlight(id) {
    this.active = id;
    this.palette.parentElement
      ?.querySelectorAll('.block')
      .forEach((e) => {
        const isActive = e.dataset.block === id;
        e.classList.toggle('active', isActive);
        if (isActive && typeof e.scrollIntoView === 'function') {
          try {
            e.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
          } catch (_) {
            e.scrollIntoView(false);
          }
        }
      });
  }
}
