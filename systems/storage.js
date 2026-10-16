'use strict';

const validateState = require('./model').validateState;
const PRIMARY_KEY = 'the-lens.save.v1';
const BACKUP_KEY = 'the-lens.save.v1.backup';

// FNV-1a 检测传输/写入损坏，不是防作弊签名；无需 Node 专属模块。
function checksum(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193); }
  return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
}
function pack(state) {
  const payload = JSON.stringify(state);
  return JSON.stringify({ format: 1, payload: payload, checksum: checksum(payload) });
}
function unpack(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') throw new Error('存档格式异常');
  const envelope = JSON.parse(raw);
  if (!envelope || envelope.format !== 1 || typeof envelope.payload !== 'string' || envelope.checksum !== checksum(envelope.payload)) throw new Error('存档校验失败');
  const state = JSON.parse(envelope.payload);
  if (!validateState(state)) throw new Error('存档版本或进度数据不兼容');
  return state;
}

class SaveStore {
  constructor(adapter) {
    if (!adapter || typeof adapter.get !== 'function' || typeof adapter.set !== 'function' || typeof adapter.remove !== 'function') throw new TypeError('Storage adapter requires get, set and remove');
    this.adapter = adapter;
  }
  load() {
    let primary = null;
    let backup = null;
    let primaryError = null;
    let backupError = null;
    try { primary = unpack(this.adapter.get(PRIMARY_KEY)); } catch (error) { primaryError = error; }
    try { backup = unpack(this.adapter.get(BACKUP_KEY)); } catch (error) { backupError = error; }
    if (primary) {
      // 写主槽途中被中断时，校验完成的备份候选可能更新。
      if (backup && Date.parse(backup.updatedAt) > Date.parse(primary.updatedAt)) return { state: backup, warning: '上次主存档写入可能中断，已从较新的校验备份恢复。请继续游戏后重试保存。' };
      return { state: primary, warning: null };
    }
    if (backup) return { state: backup, warning: '主存档不可用，已从校验通过的备份恢复。请继续游戏后重试保存。' };
    if (primaryError && backupError) return { state: null, warning: '本地存档和备份均无法读取。可以开始新旅程；原数据未被自动删除。' };
    if (primaryError || backupError) return { state: null, warning: '本地存档无法读取，且没有可用备份。可以开始新旅程；原数据未被自动删除。' };
    return { state: null, warning: null };
  }
  save(state) {
    if (!validateState(state)) return { ok: false, error: '进度数据校验失败，未写入存档。' };
    try {
      const encoded = pack(state);
      // 先写备份候选并读回。主槽写入失败时，下次仍能恢复已校验候选。
      this.adapter.set(BACKUP_KEY, encoded);
      const candidateRaw = this.adapter.get(BACKUP_KEY);
      if (candidateRaw !== encoded || !unpack(candidateRaw)) throw new Error('备份写入校验失败');
      this.adapter.set(PRIMARY_KEY, encoded);
      const primaryRaw = this.adapter.get(PRIMARY_KEY);
      if (primaryRaw !== encoded || !unpack(primaryRaw)) throw new Error('主存档写入校验失败');
      return { ok: true };
    } catch (error) {
      return { ok: false, error: '本次本地保存未完成：' + (error && error.message ? error.message : String(error)) + '。当前游戏进度仍保留在内存中。' };
    }
  }
}

module.exports = { SaveStore: SaveStore };
