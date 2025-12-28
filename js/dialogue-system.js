export class DialogueSystem {
  constructor(hudRoot = null) {
    this.hudRoot = hudRoot || (typeof document !== 'undefined' ? document.body : null);

    this.dialogueBox = null;
    this.textElement = null;

    this.currentText = '';
    this.isDisplaying = false;

    this._typeInterval = null;
    this._hideTimeout = null;

    this._ensureDom();
  }

  _ensureDom() {
    if (typeof document === 'undefined' || this.dialogueBox) return;

    this.dialogueBox = document.createElement('div');
    this.dialogueBox.id = 'bossDialogueBox';
    this.dialogueBox.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: 8%;
      transform: translateX(-50%);
      min-width: 320px;
      max-width: 720px;
      padding: 14px 18px;
      border: 2px solid rgba(255,255,255,0.15);
      background: rgba(0,0,0,0.65);
      color: #fff;
      font-family: Roboto, Arial, sans-serif;
      font-size: 18px;
      letter-spacing: 0.2px;
      border-radius: 10px;
      backdrop-filter: blur(8px);
      opacity: 0;
      transition: opacity 120ms ease;
      z-index: 1200;
      pointer-events: none;
    `;

    this.textElement = document.createElement('div');
    this.textElement.style.cssText = 'white-space: pre-wrap; line-height: 1.3;';

    this.dialogueBox.appendChild(this.textElement);
    (this.hudRoot || document.body).appendChild(this.dialogueBox);
  }

  showDialogue(speaker, text, duration = 3) {
    this._ensureDom();
    this.isDisplaying = true;
    this.currentText = `${speaker}: ${text}`;

    console.log(`[Dialogue] ${speaker}: ${text}`);

    if (!this.dialogueBox || !this.textElement) return;

    this.dialogueBox.style.opacity = '1';

    if (this._typeInterval) clearInterval(this._typeInterval);
    if (this._hideTimeout) clearTimeout(this._hideTimeout);

    this.typeWriter(this.currentText, 24);

    this._hideTimeout = setTimeout(() => {
      this.hideDialogue();
    }, duration * 1000);
  }

  typeWriter(text, speed) {
    if (!this.textElement) return;

    let index = 0;
    this.textElement.textContent = '';

    this._typeInterval = setInterval(() => {
      if (index <= text.length) {
        this.textElement.textContent = text.substring(0, index);
        index++;
      } else {
        clearInterval(this._typeInterval);
        this._typeInterval = null;
      }
    }, speed);
  }

  hideDialogue() {
    this.isDisplaying = false;
    if (this.dialogueBox) {
      this.dialogueBox.style.opacity = '0';
    }
  }
}
