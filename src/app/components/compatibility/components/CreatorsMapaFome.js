import React from 'react';
import { t, useLocale } from './ux/strings';

const CreatorsMapaFome = () => {
  useLocale(); // re-render on locale change so t() re-reads
  return (
    <div>
      <h1>{t('page.creators.heading')}</h1>
      <iframe
        src="http://creators.mapafome.com.br/"
        title={t('page.creators.iframe_title')}
        style={{ width: '100%', height: '500px' }}
        frameBorder="0"
        scrolling="no"
      />
    </div>
  );
};

export default CreatorsMapaFome;
