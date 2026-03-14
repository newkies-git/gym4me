import en from './en.json';
import fr from './fr.json';
import ro from './ro.json';
import zhHans from './zhHans.json';

export const messages = {
  en: {
    ...en,
    $vuetify: {
      ...en,
      open: 'Open',
      close: 'Close'
    }
  },
  ro: {
    ...ro,
    $vuetify: {
      ...ro,
      open: 'Deschide',
      close: 'Închide'
    }
  },
  fr: {
    ...fr,
    $vuetify: {
      ...fr,
      open: 'Ouvrir',
      close: 'Fermer'
    }
  },
  zhHans: {
    ...zhHans,
    $vuetify: {
      ...zhHans,
      open: '打开',
      close: '关闭'
    }
  }
};
