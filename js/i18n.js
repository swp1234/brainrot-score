class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko','en','ja','es','pt','zh','id','tr','de','fr','hi','ru'];
        this.currentLang = this.detectLanguage();
    }
    detectLanguage() {
        const saved = localStorage.getItem('app_language');
        if (saved && this.supportedLanguages.includes(saved)) return saved;
        const browser = (navigator.language || navigator.userLanguage).split('-')[0];
        if (this.supportedLanguages.includes(browser)) return browser;
        return 'en';
    }
    async loadTranslations(lang) {
        try {
            const r = await fetch(`js/locales/${lang}.json`);
            if (!r.ok) throw new Error('Not found');
            this.translations[lang] = await r.json();
            return true;
        } catch (e) {
            if (lang !== 'en') return this.loadTranslations('en');
            return false;
        }
    }
    t(key) {
        const keys = key.split('.');
        let v = this.translations[this.currentLang];
        for (const k of keys) { if (v && v[k] !== undefined) v = v[k]; else return key; }
        return v;
    }
    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) return false;
        if (!this.translations[lang]) await this.loadTranslations(lang);
        this.currentLang = lang;
        localStorage.setItem('app_language', lang);
        document.documentElement.lang = lang;
        this.updateUI();
        return true;
    }
    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = this.t(el.getAttribute('data-i18n'));
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = this.t(el.getAttribute('data-i18n-placeholder'));
        });
        const titleKey = this.t('meta.title');
        if (titleKey !== 'meta.title') document.title = titleKey;
        const meta = document.querySelector('meta[name="description"]');
        if (meta) { const d = this.t('meta.description'); if (d !== 'meta.description') meta.content = d; }
    }
    getCurrentLanguage() { return this.currentLang; }
}
const i18n = new I18n();
